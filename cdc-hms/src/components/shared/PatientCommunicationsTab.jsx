import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MessageCircle, ExternalLink, Paperclip, Mail, FileText, FileDown, ChevronDown, ChevronUp, ChevronRight, Link2, Lock, Trash2, Calendar } from 'lucide-react';
import commsService from '../../services/commsService';
import { fmtDay, fmtTime } from '../inbox/inboxHelpers';
import SwitcherTabs from './SwitcherTabs';
import DocumentViewerModal from './DocumentViewerModal';
import SaveEmailAttachmentDialog from './SaveEmailAttachmentDialog';
import FileToRecordModal from '../inbox/FileToRecordModal';
import { PATIENT_MAIL_SENT_EVENT } from '../mail/PatientEmailPanel';
import { useUserContext } from '../../contexts/UserContext';
import { canViewPatientEmail, canWriteComms, hasPermission, PERMISSIONS } from '../../utils/permissions';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const DAYS_PER_PAGE = 10;
// The calendar day of a timestamp, in the viewer's own time zone.
const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
// Same long date as Visit History ("Sunday, September 27, 2026").
const formatDateLong = (key) => new Date(`${key}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

/**
 * Split an email's text into what the sender wrote and the quoted earlier
 * message ("On … wrote:", "-----Original Message-----", Outlook's "From: …
 * Sent:", or a run of "> " lines). Only the first part is shown by default.
 */
export const splitQuoted = (text) => {
  const t = String(text || '');
  const marks = [
    /\n[ \t]*On [^\n]{0,250}(?:\n[^\n]{0,250})?wrote:[ \t]*(?:\n|$)/i,
    /\n[ \t]*-{2,}[ \t]*Original Message[ \t]*-{2,}/i,
    /\n[ \t]*From:[^\n]*\n[ \t]*(?:Sent|Date):/i,
    /\n[ \t]*>[^\n]*\n[ \t]*>/,
  ];
  let cut = -1;
  for (const re of marks) {
    const m = re.exec(t);
    if (m && m.index > 0 && (cut === -1 || m.index < cut)) cut = m.index;
  }
  if (cut === -1) return { main: t.trim(), quoted: '' };
  const main = t.slice(0, cut).trim();
  return main ? { main, quoted: t.slice(cut).trim() } : { main: t.trim(), quoted: '' };
};

// Patient file → Communications: this patient's full messaging trail
// (merge-aware on the server), with date / channel / query filters, resolution
// notes shown inline, and a way to open the thread in the Inbox or start a new
// WhatsApp message.
//
// Phase 4 (Staff Email): the EMAIL side of the trail sits in the same
// timeline — the patient was emailed (subject + the file's documents that
// went with it; never the message text), the file's documents were emailed to
// someone else, an email attachment was saved to the file — and "Email
// patient" opens the Composer over the file (`onEmailPatient`, shown only to
// people who can use My mail).
//
// Phase 5: the patient's email THREADS — messages sent to them, their replies
// (picked up every 5 minutes, also when answered from a phone), and emails a
// colleague linked to the file — shown in full to holders of
// patientemail.view (doctors, nurses, admins by role; others by grant). Everyone
// else sees that an email was sent, not what it said. Admins can take a message
// off the trail (soft delete, with a reason).
const PatientCommunicationsTab = ({ uhid, patientName = '', portal = 'doctor', onEmailPatient = null }) => {
  const navigate = useNavigate();
  const { currentUser } = useUserContext();
  const canReadEmail = canViewPatientEmail(currentUser);
  const canRemoveEmail = currentUser?.role === 'admin' || hasPermission(currentUser, PERMISSIONS.ADMIN_ACCESS);
  const [data, setData] = useState({ messages: [], conversations: [], emails: [] });
  const [threads, setThreads] = useState([]);
  // Phase 5b: attachments are view-only here and come from the patient's
  // Documents; anything not yet there is saved into Documents first.
  const [viewing, setViewing] = useState(null);        // a Document to show
  const [savingEmail, setSavingEmail] = useState(null); // [{ messageRowId, index, name }]
  const [filingWa, setFilingWa] = useState(null);       // a WhatsApp message to file
  const canFileWa = canWriteComms(currentUser);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const serverShow = show === 'queries' || show === 'internal' ? show : undefined;
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { from: from || undefined, to: to || undefined };
      const [trail, mail] = await Promise.allSettled([
        commsService.patientTrail(uhid, { ...params, show: serverShow }),
        canReadEmail && !serverShow ? commsService.patientEmailThreads(uhid, params) : Promise.resolve(null),
      ]);
      if (trail.status === 'fulfilled') setData(trail.value.data);
      setThreads(mail.status === 'fulfilled' && mail.value ? (mail.value.data.threads || []) : []);
    } catch { /* interceptor */ } finally { setLoading(false); }
  }, [uhid, serverShow, from, to, canReadEmail]);
  useEffect(() => { load(); }, [load]);

  // A message sent from the email panel shows here straight away.
  useEffect(() => {
    const onSent = (e) => { if (!e.detail?.uhid || e.detail.uhid === uhid) load(); };
    window.addEventListener(PATIENT_MAIL_SENT_EVENT, onSent);
    return () => window.removeEventListener(PATIENT_MAIL_SENT_EVENT, onSent);
  }, [uhid, load]);

  const startMessage = async () => {
    try {
      await commsService.startForPatient(uhid);
      navigate(`/${portal}/inbox?tab=whatsapp`);
    } catch (e) { toast.error(e.message || 'Could not start a conversation.'); }
  };

  // ---- arranged BY DAY, like Visit History (Emu, 27 Sep) ------------------
  // Every WhatsApp message, internal note, email event and email thread is
  // put on its calendar day. An email conversation sits WHOLE on the day of
  // its latest message; earlier days where it had messages show a reference to
  // it. Each day card carries tags for what is inside and who was involved.
  const days = (() => {
    const map = new Map();
    const day = (k) => {
      if (!map.has(k)) map.set(k, { key: k, wa: [], notes: [], emailNotes: [], threads: [], refs: [], attachments: [], staff: new Set(), emailCount: 0, toFile: 0 });
      return map.get(k);
    };
    if (show !== 'email') {
      for (const m of data.messages || []) {
        const d = day(dayKey(m.createdAt));
        if (m.direction === 'internal') d.notes.push(m); else d.wa.push(m);
        if (m.direction !== 'in' && m.sentBy?.name) d.staff.add(m.sentBy.name);
        if (m.query?.resolvedBy?.name) d.staff.add(m.query.resolvedBy.name);
        if (m.media) {
          d.attachments.push({ kind: 'wa', key: `wa${m.id}`, at: m.createdAt, m, doc: m.document || null });
          if (!m.document && !m.medicalDocumentId) d.toFile += 1;
        }
      }
    }
    if (show !== 'whatsapp' && !serverShow) {
      for (const e of data.emails || []) {
        const d = day(dayKey(e.createdAt));
        d.emailNotes.push(e); d.emailCount += 1;
        if (e.by?.name) d.staff.add(e.by.name);
      }
      for (const t of threads) {
        const last = dayKey(t.lastAt);
        day(last).threads.push(t);
        const perDay = new Map();
        for (const msg of t.messages) {
          const k = dayKey(msg.sentAt);
          perDay.set(k, (perDay.get(k) || 0) + 1);
          const d = day(k);
          d.emailCount += 1;
          if (msg.direction === 'out' && msg.staff?.name) d.staff.add(msg.staff.name);
          if (msg.linkedBy?.name) d.staff.add(msg.linkedBy.name);
          (msg.documents || []).filter((doc) => !doc.missing).forEach((doc) => d.attachments.push({ kind: 'doc', key: `d${msg.id}-${doc.id}`, at: msg.sentAt, doc, msg }));
          const atts = msg.attachments || (msg.attachmentNames || []).map((name, index) => ({ index, name, saveable: false }));
          atts.forEach((a) => {
            if (a.onFile && !a.onFile.missing) d.attachments.push({ kind: 'doc', key: `a${msg.id}-${a.index}`, at: msg.sentAt, doc: a.onFile, msg });
            else {
              d.attachments.push({ kind: 'pending', key: `p${msg.id}-${a.index}`, at: msg.sentAt, a, msg });
              if (a.saveable) d.toFile += 1;
            }
          });
        }
        perDay.forEach((count, k) => { if (k !== last) day(k).refs.push({ t, count, lastDay: last }); });
      }
    }
    return [...map.values()]
      .filter((d) => d.wa.length || d.notes.length || d.emailNotes.length || d.threads.length || d.refs.length)
      .sort((a, b) => b.key.localeCompare(a.key));
  })();
  const [page, setPage] = useState(1);
  const [openDay, setOpenDay] = useState(null);          // null = the newest day
  const [dayTab, setDayTab] = useState({});              // dayKey → tab id
  const totalPages = Math.max(1, Math.ceil(days.length / DAYS_PER_PAGE));
  const safePage = Math.min(page, totalPages);   // a filter can shrink the list under the current page
  const pageDays = days.slice((safePage - 1) * DAYS_PER_PAGE, safePage * DAYS_PER_PAGE);
  const openKey = openDay === null ? days[0]?.key : openDay;
  const goToDay = (key, tab) => {
    const idx = days.findIndex((d) => d.key === key);
    if (idx === -1) return;
    setPage(Math.floor(idx / DAYS_PER_PAGE) + 1);
    setOpenDay(key);
    if (tab) setDayTab((t) => ({ ...t, [key]: tab }));
  };

  const actions = {
    view: (doc) => setViewing(doc),
    saveEmail: (items) => setSavingEmail(items),
    saveWa: (m) => setFilingWa(m),
    canFileWa,
  };

  const FILTERS = [['all', 'All'], ['whatsapp', 'WhatsApp'], ['email', 'Email'], ['queries', 'Queries'], ['internal', 'Internal notes']];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map(([k, l]) => (
            <button key={k} type="button" onClick={() => setShow(k)} className={`rounded-full px-3 py-1 text-xs ${show === k ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{l}</button>
          ))}
        </div>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded border-gray-300 text-xs" aria-label="From date" />
        <span className="text-xs text-gray-400">to</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded border-gray-300 text-xs" aria-label="To date" />
        <span className="ml-auto flex flex-wrap gap-2">
          {onEmailPatient && (
            <button type="button" onClick={() => onEmailPatient()} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary/90"><Mail size={15} /> Email patient</button>
          )}
          <button type="button" onClick={startMessage} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"><MessageCircle size={15} /> Message on WhatsApp</button>
        </span>
      </div>

      {loading && <div className="py-6 text-center text-sm text-gray-400">Loading…</div>}
      {!loading && days.length === 0 && (
        <div className="py-8 text-center text-sm text-gray-400">
          {show === 'email' ? 'No emails for this patient yet.' : show === 'whatsapp' ? 'No WhatsApp messages for this patient yet.' : 'No messages for this patient yet.'}
        </div>
      )}

      <div className="space-y-3">
        {!loading && pageDays.map((d) => (
          <DayCard
            key={d.key} d={d} open={openKey === d.key}
            onToggle={() => setOpenDay(openKey === d.key ? '' : d.key)}
            tab={dayTab[d.key]} onTab={(t) => setDayTab((x) => ({ ...x, [d.key]: t }))}
            uhid={uhid} canRemove={canRemoveEmail} onChanged={load} onGoToDay={goToDay} actions={actions}
          />
        ))}
      </div>

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-sm text-gray-500">Page {safePage} of {totalPages} · {days.length} day{days.length === 1 ? '' : 's'}</p>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage === 1} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-blue-50">Previous</button>
            <button type="button" onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-blue-50">Next</button>
          </div>
        </div>
      )}

      {days.some((d) => d.emailCount > 0) && (
        canReadEmail
          ? <p className="text-[11px] text-gray-400">Email threads show messages sent to the patient, their replies (checked every 5 minutes) and emails a colleague linked to this file. Other mail stays in each person’s own mailbox.</p>
          : <p className="flex items-center gap-1 text-[11px] text-gray-400"><Lock size={11} /> Email text is shown to doctors, nurses and anyone given “Patient email threads”. You can see that an email was sent.</p>
      )}

      {viewing && <DocumentViewerModal doc={viewing} onClose={() => setViewing(null)} />}
      {savingEmail && (
        <SaveEmailAttachmentDialog uhid={uhid} patientName={patientName} items={savingEmail} onClose={() => setSavingEmail(null)} onSaved={() => load()} />
      )}
      {filingWa && (
        <FileToRecordModal isOpen onClose={() => setFilingWa(null)} message={filingWa} defaultPatient={{ uhid, name: patientName }} onFiled={() => { setFilingWa(null); load(); }} />
      )}

      {data.conversations?.length > 0 && show !== 'email' && (
        <button type="button" onClick={() => navigate(`/${portal}/inbox?tab=whatsapp`)} className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:underline"><ExternalLink size={14} /> Open in Inbox</button>
      )}
    </div>
  );
};

const Tag = ({ className, Icon, children }) => (
  <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}>{Icon && <Icon size={11} aria-hidden="true" />}{children}</span>
);

// One day of communications — the Visit History accordion pattern: a header
// with the date, tags for what is inside and who was involved; opened, a tab
// per kind (WhatsApp / Email / Attachments / Internal notes), only those with
// something in them.
const DayCard = ({ d, open, onToggle, tab, onTab, uhid, canRemove, onChanged, onGoToDay, actions }) => {
  const tabs = [
    d.wa.length && { id: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle, count: d.wa.length },
    d.emailCount && { id: 'email', label: 'Email', Icon: Mail, count: d.emailCount },
    d.attachments.length && { id: 'attachments', label: 'Attachments', Icon: Paperclip, count: d.attachments.length },
    d.notes.length && { id: 'notes', label: 'Internal notes', Icon: Lock, count: d.notes.length },
  ].filter(Boolean);
  const active = tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id;
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" data-testid="comms-day">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-blue-50">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Calendar className={`h-5 w-5 flex-shrink-0 ${open ? 'text-primary' : 'text-gray-400'}`} />
          <span className={`font-semibold ${open ? 'text-primary' : 'text-gray-800'}`}>{formatDateLong(d.key)}</span>
          {d.wa.length > 0 && <Tag className="border border-emerald-200 bg-emerald-50 text-emerald-700" Icon={MessageCircle}>WhatsApp {d.wa.length}</Tag>}
          {d.emailCount > 0 && <Tag className="border border-blue-200 bg-blue-50 text-blue-700" Icon={Mail}>Email {d.emailCount}</Tag>}
          {d.attachments.length > 0 && <Tag className="border border-amber-200 bg-amber-50 text-amber-800" Icon={Paperclip}>Attachments {d.attachments.length}</Tag>}
          {d.notes.length > 0 && <Tag className="border border-amber-200 bg-amber-50 text-amber-800" Icon={Lock}>Internal note{d.notes.length === 1 ? '' : 's'} {d.notes.length}</Tag>}
          {d.toFile > 0 && <Tag className="border border-red-200 bg-red-50 text-red-700" Icon={FileDown}>{d.toFile} to save to Documents</Tag>}
          {[...d.staff].map((n) => <Tag key={n} className="bg-gray-100 text-gray-600">{n}</Tag>)}
        </div>
        {open ? <ChevronDown className="h-5 w-5 flex-shrink-0 text-gray-400" /> : <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400" />}
      </button>
      {open && (
        <div className="border-t border-gray-100 p-4">
          {tabs.length > 1 && <SwitcherTabs className="mb-3" tabs={tabs} active={active} onChange={onTab} />}
          {active === 'whatsapp' && (
            <div className="space-y-1">{d.wa.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map((m) => <WhatsAppRow key={m.id} m={m} />)}</div>
          )}
          {active === 'notes' && (
            <div className="space-y-1">{d.notes.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map((m) => <WhatsAppRow key={m.id} m={m} />)}</div>
          )}
          {active === 'email' && (
            <div className="space-y-2">
              {d.threads.map((t) => <ThreadCard key={t.key} t={t} uhid={uhid} canRemove={canRemove} onChanged={onChanged} defaultOpen={d.threads.length === 1} actions={actions} />)}
              {d.refs.map((r) => (
                <button key={`r${r.t.key}`} type="button" onClick={() => onGoToDay(r.lastDay, 'email')} className="flex w-full items-center gap-2 rounded-lg border border-dashed border-blue-200 px-2 py-1.5 text-left text-sm text-gray-600 hover:bg-blue-50">
                  <Mail size={13} className="text-blue-600" aria-hidden="true" />
                  <span className="font-medium text-gray-800">{r.t.subject || '(no subject)'}</span>
                  <span className="text-[11px] text-gray-400">{plural(r.count, 'message')} this day · whole conversation on {formatDateLong(r.lastDay)}</span>
                  <ChevronRight size={14} className="ml-auto text-gray-400" />
                </button>
              ))}
              {d.emailNotes.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map((e) => <EmailRow key={e.id} e={e} />)}
            </div>
          )}
          {active === 'attachments' && <AttachmentList items={d.attachments} actions={actions} />}
        </div>
      )}
    </div>
  );
};

// Everything attached on one day — VIEW ONLY, from the patient's Documents
// (Emu, 27 Sep: the Communications tab never holds files). A row already in
// Documents opens the viewer (the whole row is the button). A row not yet there
// prompts to save it into Documents first: a WhatsApp attachment through "File
// to record" (comms.write), an email attachment by the owner of the mailbox it
// sits in (nobody can open another person's mailbox). Others see whose it is.
const AttachmentList = ({ items, actions }) => (
  <ul className="divide-y rounded-lg border" data-testid="comms-attachments">
    {items.slice().sort((a, b) => new Date(a.at) - new Date(b.at)).map((it) => {
      const doc = it.doc;
      const name = doc ? `${doc.testType || doc.fileName}${doc.date ? ` · ${doc.date}` : ''}`
        : it.kind === 'wa' ? (it.m.media.fileName || it.m.caption || `WhatsApp ${String(it.m.media.mime || 'file').split('/')[0]}`)
          : it.a.name;
      const via = it.kind === 'wa' ? `WhatsApp · ${it.m.direction === 'in' ? 'from the patient' : (it.m.sentBy?.name || 'Clinic')}` : 'Email';
      const Icon = it.kind === 'wa' ? MessageCircle : FileText;
      if (doc) {
        return (
          <li key={it.key}>
            <button type="button" onClick={() => actions.view(doc)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50" title="Open from the patient’s Documents">
              <Icon size={14} className={it.kind === 'wa' ? 'text-emerald-600' : 'text-blue-600'} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-medium text-blue-700" title={name}>{name}</span>
              <span className="hidden text-[11px] text-gray-400 sm:inline">{via} · in Documents{doc.status ? ` (${doc.status})` : ''}{doc.archived ? ' · archived' : ''} · {fmtTime(it.at)}</span>
              <span className="text-xs font-semibold text-primary">View</span>
            </button>
          </li>
        );
      }
      // Not in Documents yet.
      let action = null;
      let note = 'not in Documents yet';
      if (it.kind === 'wa') {
        if (actions.canFileWa) action = () => actions.saveWa(it.m);
        else note = 'not in Documents yet — someone with Inbox access can file it';
      } else if (!it.a.saveable) {
        note = 'not a PDF, JPEG or PNG — stays in the mailbox';
      } else if (it.a.canSave) {
        action = () => actions.saveEmail([{ messageRowId: it.msg.id, index: it.a.index, name: it.a.name }]);
      } else {
        note = `in ${it.msg.staff?.name || 'another person'}’s mailbox — only they can save it to Documents`;
      }
      return (
        <li key={it.key} className="flex items-center gap-2 bg-amber-50/40 px-3 py-2 text-sm">
          <Icon size={14} className="text-gray-400" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-gray-700" title={name}>{name}</span>
          <span className="hidden text-[11px] text-gray-500 sm:inline">{via} · {note} · {fmtTime(it.at)}</span>
          {action && (
            <button type="button" onClick={action} className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-semibold text-white hover:bg-primary/90">
              <FileDown size={12} aria-hidden="true" /> Save to Documents
            </button>
          )}
        </li>
      );
    })}
  </ul>
);

const WhatsAppRow = ({ m }) => {
  const dir = m.direction;
  return (
    <div className={`rounded-lg border p-2 text-sm ${dir === 'internal' ? 'border-amber-200 bg-amber-50' : dir === 'out' ? 'border-emerald-100 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center gap-2 text-[11px] text-gray-400">
        <span className="font-medium text-gray-600">{dir === 'in' ? 'Patient' : dir === 'internal' ? '🔒 Internal note' : (m.sentBy?.name || 'Clinic')}</span>
        <span>{fmtTime(m.createdAt)}</span>
        {m.media && <Paperclip size={11} />}
        {m.medicalDocumentId && <span className="text-emerald-600">filed</span>}
      </div>
      {m.body && <div className="whitespace-pre-wrap">{m.body}</div>}
      {m.caption && <div className="text-gray-600">{m.caption}</div>}
      {m.query && m.query.status === 'completed' && m.query.resolutionNote && (
        <div className="mt-1 border-t border-black/5 pt-1 text-[11px] text-gray-500">✓ {m.query.resolutionKind} — “{m.query.resolutionNote}”{m.query.resolvedBy ? ` (${m.query.resolvedBy.name})` : ''}</div>
      )}
      {m.query && m.query.status === 'open' && <div className="mt-1 text-[11px] text-blue-600">Query open</div>}
    </div>
  );
};

// An email event. Only what the HMS keeps is shown: who, when, the subject of
// a message to the patient, and which of the file's documents went with it.
const EmailRow = ({ e }) => {
  const domains = e.domains?.length ? ` (${e.domains.join(', ')})` : '';
  let line;
  let Icon = Mail;
  if (e.kind === 'emailed') {
    const extra = [
      e.documents?.length ? plural(e.documents.length, 'document') + ' from the file' : null,
      e.otherAttachments ? plural(e.otherAttachments, 'other attachment') : null,
      e.recipients > 1 ? `${e.recipients} recipients${domains}` : null,
    ].filter(Boolean).join(' · ');
    line = <>Emailed the patient{extra ? <span className="text-gray-500"> · {extra}</span> : null}</>;
  } else if (e.kind === 'docs_sent') {
    Icon = FileText;
    line = <>Emailed {plural(e.documentCount || 0, 'document')} from this file to {plural(e.recipients || 0, 'recipient')}<span className="text-gray-500">{domains}</span></>;
  } else {
    Icon = FileDown;
    line = <>Saved an email attachment to the file{e.senderDomain ? <span className="text-gray-500"> · from {e.senderDomain}</span> : null} <span className="rounded bg-amber-100 px-1.5 text-[11px] text-amber-800">Filed as Pending review</span></>;
  }
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-2 text-sm">
      <div className="flex items-center gap-2 text-[11px] text-gray-400">
        <Icon size={12} className="text-blue-600" aria-hidden="true" />
        <span className="font-medium text-gray-600">{e.by?.name || 'Staff'}</span>
        <span>{fmtTime(e.createdAt)}</span>
        <span className="text-blue-700">Email</span>
      </div>
      <div>{line}</div>
      {e.kind === 'emailed' && (
        <div className="mt-0.5 text-gray-700">
          <span className="text-[11px] text-gray-400">Subject: </span>{e.subject ? e.subject : <span className="italic text-gray-400">(no subject)</span>}
        </div>
      )}
      {e.kind === 'emailed' && e.documents?.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {e.documents.map((d) => (
            <span key={d.id} className="inline-flex items-center gap-1 rounded border border-blue-100 bg-white px-1.5 py-0.5 text-[11px] text-gray-600">
              <FileText size={11} aria-hidden="true" />
              {d.missing ? 'A document no longer on file' : `${d.fileName}${d.date ? ` · ${d.date}` : ''}${d.archived ? ' (archived)' : ''}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const SOURCE_LABEL = {
  hms_send: 'Sent from the HMS',
  reply: 'Reply — picked up automatically',
  sent_elsewhere: 'Sent from phone / webmail — picked up',
  linked: 'Linked to this file',
};
const who = (p) => (p ? (p.name ? `${p.name}` : p.address) : '');
const recipients = (list) => (list || []).map((r) => r.name || r.address).join(', ');

// One email thread on the patient file (phase 5). Collapsed: the latest message
// in two lines. Open: every message, oldest first, with its text; documents
// from the file open from the file (never a copy).
const ThreadCard = ({ t, uhid, canRemove, onChanged, defaultOpen = false, actions }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [showQuoted, setShowQuoted] = useState(() => new Set());
  const [removing, setRemoving] = useState(null);   // { id, reason }
  const last = t.messages[t.messages.length - 1];
  const linked = t.messages.some((m) => m.source === 'linked');
  const staff = [...new Set(t.messages.map((m) => m.staff?.name).filter(Boolean))];

  const remove = async () => {
    try {
      await commsService.removePatientEmail(uhid, removing.id, removing.reason);
      toast.success('Taken off the patient’s trail');
      setRemoving(null);
      onChanged();
    } catch (e) { toast.error(e.message || 'Could not remove it.'); }
  };

  return (
    <div className="rounded-lg border border-blue-100 bg-white text-sm" data-testid="email-thread">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-2 p-2 text-left hover:bg-blue-50/50" aria-expanded={open}>
        <Mail size={14} className="mt-0.5 flex-shrink-0 text-blue-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2">
            <span className="font-medium text-gray-800">{t.subject || '(no subject)'}</span>
            <span className="text-[11px] text-gray-400">{t.count} message{t.count === 1 ? '' : 's'}{staff.length ? ` · ${staff.join(', ')}` : ''}</span>
            {linked && <span className="inline-flex items-center gap-0.5 rounded bg-violet-50 px-1 text-[10px] font-semibold text-violet-800"><Link2 size={10} /> Linked</span>}
          </div>
          {!open && (
            <div className="mt-0.5 line-clamp-2 text-gray-600">
              <span className="text-[11px] text-gray-400">{last.direction === 'in' ? who(last.from) : `${last.staff?.name || who(last.from)} → ${recipients(last.to)}`} · {fmtTime(last.sentAt)}: </span>
              {splitQuoted(last.text).main || <span className="italic text-gray-400">(no text)</span>}
            </div>
          )}
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && (
        <div className="space-y-2 border-t border-blue-50 p-2">
          {t.messages.map((m) => (
            <div key={m.id} className={`rounded-md border p-2 ${m.direction === 'out' ? 'border-blue-100 bg-blue-50/60' : 'border-gray-200 bg-white'}`}>
              <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-gray-400">
                <span className="font-medium text-gray-600">{m.direction === 'out' ? (m.staff?.name || who(m.from)) : who(m.from)}</span>
                <span>→ {recipients(m.to) || '—'}{m.cc?.length ? ` · cc ${recipients(m.cc)}` : ''}</span>
                <span>{fmtDay(m.sentAt)} {fmtTime(m.sentAt)}</span>
                <span className="text-blue-700">{SOURCE_LABEL[m.source] || ''}{m.source === 'linked' && m.linkedBy ? ` by ${m.linkedBy.name}` : ''}</span>
                {canRemove && (
                  <button type="button" onClick={() => setRemoving({ id: m.id, reason: '' })} className="ml-auto inline-flex items-center gap-0.5 text-red-600 hover:underline" title="Take this email off the patient’s trail (kept in the audit)">
                    <Trash2 size={11} /> Remove
                  </button>
                )}
              </div>
              {(() => {
                const { main, quoted } = splitQuoted(m.text);
                const shown = showQuoted.has(m.id);
                return (
                  <>
                    <div className="mt-1 max-h-72 overflow-y-auto whitespace-pre-wrap break-words text-gray-800">{main || <span className="italic text-gray-400">(no text)</span>}</div>
                    {quoted && (
                      <>
                        <button type="button" onClick={() => setShowQuoted((s) => { const n = new Set(s); if (n.has(m.id)) n.delete(m.id); else n.add(m.id); return n; })} className="mt-1 text-[11px] font-semibold text-primary hover:underline">
                          {shown ? 'Hide quoted text' : 'Show quoted text'}
                        </button>
                        {shown && <div className="mt-1 max-h-60 overflow-y-auto whitespace-pre-wrap break-words border-l-2 border-gray-200 pl-2 text-xs text-gray-500">{quoted}</div>}
                      </>
                    )}
                  </>
                );
              })()}
              {(m.documents?.length > 0 || (m.attachments || m.attachmentNames || []).length > 0) && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {m.documents.map((d) => (d.missing
                    ? <span key={d.id} className="rounded border px-1.5 py-0.5 text-[11px] text-gray-400">A document no longer on file</span>
                    : (
                      <button key={d.id} type="button" onClick={() => actions.view(d)} className="inline-flex items-center gap-1 rounded border border-blue-100 bg-white px-1.5 py-0.5 text-[11px] text-blue-700 hover:bg-blue-50" title="Open from the patient’s Documents">
                        <FileText size={11} aria-hidden="true" /> {d.testType || d.fileName}{d.date ? ` · ${d.date}` : ''}{d.archived ? ' (archived)' : ''}
                      </button>
                    )))}
                  {(m.attachments || (m.attachmentNames || []).map((name, index) => ({ index, name }))).map((a) => (a.onFile && !a.onFile.missing
                    ? (
                      <button key={`a${a.index}`} type="button" onClick={() => actions.view(a.onFile)} className="inline-flex items-center gap-1 rounded border border-blue-100 bg-white px-1.5 py-0.5 text-[11px] text-blue-700 hover:bg-blue-50" title="Open from the patient’s Documents">
                        <FileText size={11} aria-hidden="true" /> {a.onFile.testType || a.onFile.fileName}
                      </button>
                    ) : (
                      <span key={`a${a.index}`} className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-900" title={a.canSave ? 'Not in Documents yet' : a.saveable ? `In ${m.staff?.name || 'another person'}’s mailbox — only they can save it` : 'Not a PDF, JPEG or PNG'}>
                        <Paperclip size={11} aria-hidden="true" /> {a.name}
                        {a.canSave && (
                          <button type="button" onClick={() => actions.saveEmail([{ messageRowId: m.id, index: a.index, name: a.name }])} className="ml-1 font-semibold text-primary hover:underline">Save to Documents</button>
                        )}
                      </span>
                    )))}
                </div>
              )}
              {removing?.id === m.id && (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded bg-red-50 p-2">
                  <input
                    autoFocus value={removing.reason} onChange={(e) => setRemoving({ ...removing, reason: e.target.value })}
                    placeholder="Reason (kept in the audit)" aria-label="Reason for removing"
                    className="min-w-0 flex-1 rounded border-gray-300 text-xs"
                  />
                  <button type="button" disabled={removing.reason.trim().length < 3} onClick={remove} className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">Remove from trail</button>
                  <button type="button" onClick={() => setRemoving(null)} className="text-xs text-gray-600 hover:underline">Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientCommunicationsTab;
