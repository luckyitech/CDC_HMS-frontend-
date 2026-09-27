import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MessageCircle, ExternalLink, Paperclip, Mail, FileText, FileDown } from 'lucide-react';
import commsService from '../../services/commsService';
import { fmtDay, fmtTime } from '../inbox/inboxHelpers';
import { PATIENT_MAIL_SENT_EVENT } from '../mail/PatientEmailPanel';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

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
const PatientCommunicationsTab = ({ uhid, portal = 'doctor', onEmailPatient = null }) => {
  const navigate = useNavigate();
  const [data, setData] = useState({ messages: [], conversations: [], emails: [] });
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const serverShow = show === 'queries' || show === 'internal' ? show : undefined;
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await commsService.patientTrail(uhid, { show: serverShow, from: from || undefined, to: to || undefined });
      setData(r.data);
    } catch { /* interceptor */ } finally { setLoading(false); }
  }, [uhid, serverShow, from, to]);
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

  // One timeline, oldest first: WhatsApp messages and email events together.
  const items = [
    ...(show === 'email' ? [] : (data.messages || []).map((m) => ({ kind: 'wa', at: m.createdAt, key: `m${m.id}`, m }))),
    ...(show === 'whatsapp' ? [] : (data.emails || []).map((e) => ({ kind: 'email', at: e.createdAt, key: `e${e.id}`, e }))),
  ].sort((a, b) => new Date(a.at) - new Date(b.at));
  let lastDay = '';

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
      {!loading && items.length === 0 && (
        <div className="py-8 text-center text-sm text-gray-400">
          {show === 'email' ? 'No emails for this patient yet.' : show === 'whatsapp' ? 'No WhatsApp messages for this patient yet.' : 'No messages for this patient yet.'}
        </div>
      )}

      <div className="space-y-1">
        {items.map((it) => {
          const day = fmtDay(it.at);
          const showDay = day !== lastDay; lastDay = day;
          return (
            <div key={it.key}>
              {showDay && <div className="my-2 text-center text-[11px] text-gray-400">{day}</div>}
              {it.kind === 'wa' ? <WhatsAppRow m={it.m} /> : <EmailRow e={it.e} />}
            </div>
          );
        })}
      </div>

      {items.some((it) => it.kind === 'email') && (
        <p className="text-[11px] text-gray-400">Emails themselves stay in the sender’s own mailbox — the HMS keeps only who, when, the subject of a message to the patient, and which documents went with it.</p>
      )}

      {data.conversations?.length > 0 && show !== 'email' && (
        <button type="button" onClick={() => navigate(`/${portal}/inbox?tab=whatsapp`)} className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:underline"><ExternalLink size={14} /> Open in Inbox</button>
      )}
    </div>
  );
};

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

export default PatientCommunicationsTab;
