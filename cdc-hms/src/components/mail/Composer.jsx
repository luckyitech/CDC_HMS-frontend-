import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Send, Loader2, Paperclip, Bold, Italic, Underline, List, ListOrdered, Link2, RemoveFormatting,
  AlertTriangle, Check, ArrowLeft, FileText, Image as ImageIcon, ChevronDown, ChevronUp, PenLine, FolderOpen,
} from 'lucide-react';
import mailService, { announceMailChange } from '../../services/mailService';
import { notify } from '../../utils/notify';
import ConfirmActionModal from '../shared/ConfirmActionModal';
import RecipientField from './RecipientField';
import SafeHtmlFrame from './SafeHtmlFrame';
import AttachFromPatientModal from './AttachFromPatientModal';
import { formatBytes, isExternalAddress, errorCode } from './mailFormat';

const MAX_TOTAL = 25 * 1024 * 1024;
const MAX_FILES = 20;
const AUTOSAVE_MS = 5000;

const TITLES = { new: 'New message', reply: 'Reply', replyAll: 'Reply all', forward: 'Forward', draft: 'Draft' };

const hasText = (html) => !!String(html || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
const refKey = (r) => `${r.folder}:${r.uid}:${r.part}`;

/**
 * The Composer (Staff Email phase 2). Opens in place of the reading pane.
 *
 * - What the user writes is an editable area; the ORIGINAL message (reply /
 *   forward) is shown read-only below it in the same sandboxed frame the
 *   reading pane uses, and the server attaches it when the message goes out.
 *   Email HTML is never put into the HMS page itself.
 * - Drafts save to the user's own Drafts folder a few seconds after they stop
 *   typing. A file is uploaded once: after the first draft save it lives in
 *   the draft, and later saves / the send carry it from there.
 * - Send goes through the user's own mailbox. The server says whether a copy
 *   reached the Sent folder; nothing is ever sent twice.
 */
const Composer = ({ account, domains, init, onClose, onSent }) => {
  const [to, setTo] = useState(() => (init.to || []).map((r) => ({ ...r, valid: true })));
  const [cc, setCc] = useState(() => (init.cc || []).map((r) => ({ ...r, valid: true })));
  const [bcc, setBcc] = useState(() => (init.bcc || []).map((r) => ({ ...r, valid: true })));
  const [showCcBcc, setShowCcBcc] = useState(!!((init.cc || []).length || (init.bcc || []).length));
  const [subject, setSubject] = useState(init.subject || '');
  const [files, setFiles] = useState([]);                  // new uploads: { id, file }
  const [refs, setRefs] = useState(init.attachments || []); // carried parts: { folder, uid, part, filename, type, size }
  // Documents from a patient file (phase 3a): references only — the server reads
  // each file from the HMS at send time and a draft stores just their ids.
  const [patientDocs, setPatientDocs] = useState(init.patientDocuments || []); // { documentId, fileName, type, size, uhid, patientName }
  const [pickingFromFile, setPickingFromFile] = useState(false);
  const [includeQuote, setIncludeQuote] = useState(true);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [draftUid, setDraftUid] = useState(init.draftUid || null);
  const [savedAt, setSavedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [tick, setTick] = useState(0);                      // bumps on every edit, so autosave waits for a pause
  const [problem, setProblem] = useState(null);
  const [confirm, setConfirm] = useState(null);             // 'discard' | 'noSubject'
  const [linkBox, setLinkBox] = useState(null);             // { url }
  const [dragOver, setDragOver] = useState(false);
  const [signatureHtml, setSignatureHtml] = useState(null);  // preview of what the server adds on send
  const [sigOpen, setSigOpen] = useState(false);

  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const savingRef = useRef(null);                           // the in-flight draft save (a promise)
  const selectionRef = useRef(null);
  const nextFileId = useRef(1);
  const stateRef = useRef({});
  const touchedRef = useRef(false);                         // has the user put the caret in the body yet?

  const quotedHtml = init.quotedHtml || '';
  const isForward = init.mode === 'forward';
  stateRef.current = { to, cc, bcc, subject, files, refs, patientDocs, includeQuote, draftUid };

  // The editable body is set ONCE; after that it belongs to the user.
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = init.mode === 'draft' ? (init.html || '<p><br></p>') : '<p><br></p>';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** True once — the first time the user enters the body of a fresh (non-draft) message. */
  const startFresh = () => {
    if (touchedRef.current || init.mode === 'draft') return false;
    touchedRef.current = true;
    return true;
  };
  const caretToStart = () => {
    const first = editorRef.current?.firstElementChild;
    if (!first) return;
    const range = document.createRange();
    range.setStart(first, 0);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };

  // The signature is added by the server when the message is sent (your lines
  // from Email settings + the clinic block). Shown here as a preview only.
  useEffect(() => {
    let live = true;
    mailService.signature().then((res) => { if (live) setSignatureHtml(res.data.html || ''); }).catch(() => { if (live) setSignatureHtml(''); });
    return () => { live = false; };
  }, []);

  // A reopened draft whose patient documents have since gone (archived, file
  // missing, or no longer yours to open) — say so rather than failing quietly.
  useEffect(() => {
    const n = init.patientDocumentsDropped || 0;
    if (n) notify('warning', `${n} document${n === 1 ? '' : 's'} from a patient file ${n === 1 ? 'is' : 'are'} no longer available and ${n === 1 ? 'was' : 'were'} removed from this draft.`, { duration: 9000 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markDirty = () => { setDirty(true); setTick((n) => n + 1); setProblem(null); };

  const addPatientDocs = (list) => {
    setPatientDocs((ds) => {
      const have = new Set(ds.map((d) => d.documentId));
      return [...ds, ...list.filter((d) => !have.has(d.documentId))];
    });
    markDirty();
  };

  const payload = useCallback(() => {
    const s = stateRef.current;
    const strip = (list) => list.filter((r) => r.valid !== false).map(({ name, address }) => ({ name, address }));
    return {
      to: strip(s.to), cc: strip(s.cc), bcc: strip(s.bcc),
      subject: s.subject,
      html: editorRef.current ? editorRef.current.innerHTML : '',
      quotedHtml: (isForward || s.includeQuote) ? quotedHtml : '',
      inReplyTo: init.inReplyTo || null,
      references: init.references || [],
      attachments: s.refs.map(({ folder, uid, part }) => ({ folder, uid, part })),
      patientDocuments: s.patientDocs.map((d) => d.documentId),
      draftUid: s.draftUid,
      source: init.source || null,
    };
  }, [init, isForward, quotedHtml]);

  const hasContent = () => {
    const s = stateRef.current;
    return s.to.length || s.cc.length || s.bcc.length || s.subject.trim() || s.files.length || s.refs.length || s.patientDocs.length
      || hasText(editorRef.current?.innerHTML);
  };

  /** Save the draft now. Resolves to true when saved. One save at a time. */
  const saveDraft = useCallback(async () => {
    if (savingRef.current) await savingRef.current.catch(() => {});
    const sentFiles = stateRef.current.files;
    const sentDocIds = new Set(stateRef.current.patientDocs.map((d) => d.documentId));
    const run = (async () => {
      setSaving(true);
      try {
        const res = await mailService.saveDraft(payload(), sentFiles.map((f) => f.file));
        const d = res.data;
        setDraftUid(d.draftUid);
        stateRef.current.draftUid = d.draftUid;
        // The uploaded files now live in the draft: carry them from there.
        const sentIds = new Set(sentFiles.map((f) => f.id));
        setFiles((fs) => fs.filter((f) => !sentIds.has(f.id)));
        setRefs(d.attachments || []);
        // Merge, don't replace: a document attached WHILE this save was in
        // flight isn't in the reply and must stay; one the server dropped goes.
        if (Array.isArray(d.patientDocuments)) {
          const fresh = new Map(d.patientDocuments.map((x) => [x.documentId, x]));
          setPatientDocs((ds) => ds
            .filter((x) => !sentDocIds.has(x.documentId) || fresh.has(x.documentId))
            .map((x) => fresh.get(x.documentId) || x));
        }
        setSavedAt(new Date(d.savedAt));
        setDirty(false);
        announceMailChange();
        return true;
      } catch (err) {
        if (errorCode(err) === 'NEEDS_PASSWORD' || errorCode(err) === 'NOT_CONNECTED') setProblem('Your mailbox needs its password again — the draft could not be saved.');
        else setProblem(err?.message || 'Draft not saved.');
        return false;
      } finally {
        setSaving(false);
      }
    })();
    savingRef.current = run;
    const ok = await run;
    if (savingRef.current === run) savingRef.current = null;
    return ok;
  }, [payload]);

  // Autosave a few seconds after the last change.
  useEffect(() => {
    if (!dirty || sending) return undefined;
    const t = setTimeout(() => { if (hasContent()) saveDraft(); }, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [dirty, tick, sending, saveDraft]);

  // Leaving the page with unsaved changes — the browser asks first.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // ---- attachments -------------------------------------------------------
  const totalBytes = files.reduce((n, f) => n + f.file.size, 0) + refs.reduce((n, r) => n + (r.size || 0), 0)
    + patientDocs.reduce((n, d) => n + (d.size || 0), 0);
  const attachmentCount = files.length + refs.length + patientDocs.length;

  const addFiles = (list) => {
    const incoming = [...(list || [])];
    if (!incoming.length) return;
    let total = totalBytes;
    const accepted = [];
    for (const file of incoming) {
      if (attachmentCount + accepted.length >= MAX_FILES) { notify('error', `At most ${MAX_FILES} attachments.`); break; }
      if (total + file.size > MAX_TOTAL) { notify('error', `${file.name} would take the message over 25 MB.`); continue; }
      total += file.size;
      accepted.push({ id: nextFileId.current++, file });
    }
    if (accepted.length) { setFiles((fs) => [...fs, ...accepted]); markDirty(); }
  };

  // ---- formatting --------------------------------------------------------
  const keepSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && editorRef.current?.contains(sel.anchorNode)) selectionRef.current = sel.getRangeAt(0).cloneRange();
  };
  const restoreSelection = () => {
    const sel = window.getSelection();
    if (selectionRef.current && sel) { sel.removeAllRanges(); sel.addRange(selectionRef.current); }
  };
  const format = (cmd, value) => {
    editorRef.current?.focus();
    restoreSelection();
    // execCommand is deprecated but universally supported and needs no editor
    // library (decision D7: no new dependency).
    document.execCommand(cmd, false, value);
    markDirty();
  };
  const addLink = () => {
    let url = String(linkBox?.url || '').trim();
    if (!url) { setLinkBox(null); return; }
    if (!/^(https?:|mailto:)/i.test(url)) url = /@/.test(url) && !/\//.test(url) ? `mailto:${url}` : `https://${url}`;
    setLinkBox(null);
    format('createLink', url);
  };

  // ---- send / discard / close -------------------------------------------
  const allRecipients = [...to, ...cc, ...bcc];
  const invalid = allRecipients.filter((r) => r.valid === false);
  const externalCount = new Set(allRecipients.filter((r) => r.valid !== false && isExternalAddress(r.address, domains)).map((r) => r.address)).size;

  const doSend = async () => {
    setConfirm(null);
    if (savingRef.current) await savingRef.current.catch(() => {});
    setSending(true);
    setProblem(null);
    try {
      const s = stateRef.current;
      const res = await mailService.send(payload(), s.files.map((f) => f.file));
      const r = res.data;
      setDirty(false);
      if (r.sentCopy) {
        notify('success', 'Sent');
      } else {
        const why = r.sentCopyReason === 'full'
          ? 'Sent, but your Sent folder is full, so no copy was saved.'
          : 'Sent, but a copy could not be saved in your Sent folder.';
        notify('warning', `${why}${r.draftKept ? ' Your draft was kept.' : ''}`, { duration: 9000 });
      }
      announceMailChange();
      onSent();
    } catch (err) {
      const code = errorCode(err);
      if (code === 'NEEDS_PASSWORD' || code === 'NOT_CONNECTED') setProblem('Not sent: your mailbox needs its password again. Your message is kept here.');
      else setProblem(err?.message || 'Not sent. Your message is kept here — try again.');
    } finally {
      setSending(false);
    }
  };

  const trySend = () => {
    if (!allRecipients.length) { setProblem('Add at least one recipient.'); return; }
    if (invalid.length) { setProblem(`Check ${invalid.length === 1 ? 'the address in red' : 'the addresses in red'} before sending.`); return; }
    if (totalBytes > MAX_TOTAL) { setProblem('Attachments come to more than 25 MB.'); return; }
    if (!subject.trim()) { setConfirm('noSubject'); return; }
    doSend();
  };

  const discard = async () => {
    setConfirm(null);
    if (savingRef.current) await savingRef.current.catch(() => {});
    const uid = stateRef.current.draftUid;
    setDirty(false);
    if (uid) {
      try { await mailService.discardDraft(uid); announceMailChange(); } catch (err) { notify('error', err?.message || 'Could not discard the draft.'); }
    }
    onClose(true);
  };

  /** Close: keep the work as a draft if there is any, then leave. */
  const close = async () => {
    if (dirty && hasContent()) {
      const ok = await saveDraft();
      if (!ok) return;   // the problem bar explains; the composer stays open
      notify('success', 'Saved to Drafts');
    }
    onClose(!!stateRef.current.draftUid);
  };

  const busy = saving || sending;
  const toolBtn = 'rounded p-1.5 text-gray-600 hover:bg-gray-100';

  return (
    <div
      className={`flex h-full w-full min-w-0 flex-col ${dragOver ? 'ring-2 ring-inset ring-primary/40' : ''}`}
      onDragOver={(e) => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); setDragOver(true); } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { if (e.dataTransfer?.files?.length) { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); } }}
    >
      <div className="flex items-center gap-2 border-b bg-gray-50 px-3 py-2">
        <button type="button" onClick={close} className="-ml-1 rounded p-1 text-gray-500 hover:bg-gray-100 md:hidden" aria-label="Close and keep as draft">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800">{subject.trim() || TITLES[init.mode] || 'New message'}</h2>
        <span className="flex items-center gap-1 text-xs text-gray-500" aria-live="polite">
          {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
            : savedAt && !dirty ? <><Check className="h-3.5 w-3.5" /> Draft saved {savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</> : null}
        </span>
        <button type="button" onClick={close} disabled={sending} className="hidden rounded p-1 text-gray-500 hover:bg-gray-100 md:block" aria-label="Close and keep as draft" title="Close (kept in Drafts)">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex items-center gap-2 border-b px-3 py-2 text-sm">
          <span className="w-14 flex-shrink-0 text-xs text-gray-500">From</span>
          <span className="truncate text-gray-700">{account.displayName ? `${account.displayName} <${account.emailAddress}>` : account.emailAddress}</span>
        </div>
        <div className="relative">
          <RecipientField id="mail-to" label="To" value={to} onChange={(v) => { setTo(v); markDirty(); }} domains={domains} autoFocus={!to.length && init.mode !== 'draft'} />
          {!showCcBcc && (
            <button type="button" onClick={() => setShowCcBcc(true)} className="absolute right-3 top-2 text-xs font-semibold text-primary hover:underline">Cc · Bcc</button>
          )}
        </div>
        {showCcBcc && (
          <>
            <RecipientField id="mail-cc" label="Cc" value={cc} onChange={(v) => { setCc(v); markDirty(); }} domains={domains} />
            <RecipientField id="mail-bcc" label="Bcc" value={bcc} onChange={(v) => { setBcc(v); markDirty(); }} domains={domains} />
          </>
        )}
        <div className="flex items-center gap-2 border-b px-3 py-1.5">
          <label htmlFor="mail-subject" className="w-14 flex-shrink-0 text-xs text-gray-500">Subject</label>
          <input
            id="mail-subject" value={subject} maxLength={500}
            onChange={(e) => { setSubject(e.target.value); markDirty(); }}
            className="min-w-0 flex-1 border-0 bg-transparent py-1 text-sm focus:outline-none focus:ring-0"
          />
        </div>

        <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1" onMouseDown={keepSelection}>
          <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => format('bold')} aria-label="Bold" title="Bold"><Bold className="h-4 w-4" /></button>
          <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => format('italic')} aria-label="Italic" title="Italic"><Italic className="h-4 w-4" /></button>
          <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => format('underline')} aria-label="Underline" title="Underline"><Underline className="h-4 w-4" /></button>
          <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => format('insertUnorderedList')} aria-label="Bulleted list" title="Bulleted list"><List className="h-4 w-4" /></button>
          <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => format('insertOrderedList')} aria-label="Numbered list" title="Numbered list"><ListOrdered className="h-4 w-4" /></button>
          <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => { keepSelection(); setLinkBox({ url: '' }); }} aria-label="Add link" title="Add link"><Link2 className="h-4 w-4" /></button>
          <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => format('removeFormat')} aria-label="Clear formatting" title="Clear formatting"><RemoveFormatting className="h-4 w-4" /></button>
          <button
            type="button" onClick={() => fileInputRef.current?.click()} disabled={sending}
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Paperclip className="h-3.5 w-3.5" /> Attach
          </button>
          <button
            type="button" onClick={() => setPickingFromFile(true)} disabled={sending}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <FolderOpen className="h-3.5 w-3.5" /> From patient file
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        </div>
        {linkBox && (
          <div className="flex items-center gap-2 border-b bg-gray-50 px-3 py-1.5">
            <input
              autoFocus value={linkBox.url} onChange={(e) => setLinkBox({ url: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } if (e.key === 'Escape') setLinkBox(null); }}
              placeholder="https://example.com" aria-label="Link address"
              className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary focus:outline-none"
            />
            <button type="button" onClick={addLink} className="text-xs font-semibold text-primary hover:underline">Add link</button>
            <button type="button" onClick={() => setLinkBox(null)} className="text-xs text-gray-500 hover:underline">Cancel</button>
          </div>
        )}

        <div
          ref={editorRef}
          contentEditable={!sending}
          suppressContentEditableWarning
          role="textbox" aria-multiline="true" aria-label="Message"
          onInput={markDirty}
          onMouseDown={(e) => {
            // First click into a fresh message: start writing on the empty
            // first line — not wherever the click landed.
            if (!startFresh()) return;
            e.preventDefault();
            editorRef.current.focus();
            caretToStart();
          }}
          onFocus={() => { if (startFresh()) caretToStart(); }}
          onKeyUp={keepSelection} onMouseUp={keepSelection}
          className="min-h-[12rem] px-4 py-3 text-sm leading-relaxed text-gray-900 focus:outline-none [&_a]:text-blue-700 [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
        />

        {signatureHtml && (
          <div className="border-t px-3 py-2">
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1.5"><PenLine className="h-3.5 w-3.5" /> Your signature and the clinic details are added when you send</span>
              <button type="button" onClick={() => setSigOpen((o) => !o)} className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline">
                {sigOpen ? <>Hide <ChevronUp className="h-3.5 w-3.5" /></> : <>Show <ChevronDown className="h-3.5 w-3.5" /></>}
              </button>
            </div>
            {sigOpen && (
              <div className="mt-2 h-44 overflow-hidden rounded border">
                <SafeHtmlFrame html={signatureHtml} title="Signature preview" />
              </div>
            )}
          </div>
        )}

        {quotedHtml && (
          <div className="border-t px-3 py-2">
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
              {isForward ? <span className="font-semibold">Forwarded message</span> : (
                <label className="inline-flex items-center gap-1.5">
                  <input type="checkbox" checked={includeQuote} onChange={(e) => { setIncludeQuote(e.target.checked); markDirty(); }} className="rounded border-gray-300" />
                  Include the original message
                </label>
              )}
              <button type="button" onClick={() => setQuoteOpen((o) => !o)} className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline">
                {quoteOpen ? <>Hide <ChevronUp className="h-3.5 w-3.5" /></> : <>Show <ChevronDown className="h-3.5 w-3.5" /></>}
              </button>
            </div>
            {quoteOpen && (isForward || includeQuote) && (
              <div className="mt-2 h-64 overflow-hidden rounded border">
                <SafeHtmlFrame html={quotedHtml} title="Original message" />
              </div>
            )}
          </div>
        )}

        {attachmentCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t px-3 py-2">
            {patientDocs.map((d) => (
              <AttachmentChip key={`p${d.documentId}`} name={d.fileName} size={d.size} type={d.type} disabled={busy}
                badge={d.uhid} badgeTitle={d.patientName ? `From ${d.patientName}’s file (${d.uhid})` : d.uhid}
                onRemove={() => { setPatientDocs((ds) => ds.filter((x) => x.documentId !== d.documentId)); markDirty(); }} />
            ))}
            {refs.map((r) => (
              <AttachmentChip key={refKey(r)} name={r.filename} size={r.size} type={r.type} disabled={busy}
                onRemove={() => { setRefs((rs) => rs.filter((x) => refKey(x) !== refKey(r))); markDirty(); }} />
            ))}
            {files.map((f) => (
              <AttachmentChip key={`f${f.id}`} name={f.file.name} size={f.file.size} type={f.file.type} disabled={busy}
                onRemove={() => { setFiles((fs) => fs.filter((x) => x.id !== f.id)); markDirty(); }} />
            ))}
            <span className={`ml-auto text-xs ${totalBytes > MAX_TOTAL ? 'font-semibold text-red-600' : 'text-gray-500'}`}>
              {formatBytes(totalBytes)} of 25 MB
            </span>
          </div>
        )}
      </div>

      {problem && (
        <div className="border-t bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{problem}</div>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t px-3 py-2">
        {externalCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            {externalCount === 1 ? '1 recipient is outside the clinic' : `${externalCount} recipients are outside the clinic`}
          </span>
        )}
        <span className="ml-auto flex gap-2">
          <button
            type="button" disabled={sending}
            onClick={() => (hasContent() || draftUid ? setConfirm('discard') : onClose(false))}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Discard
          </button>
          <button
            type="button" onClick={trySend} disabled={sending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {sending ? 'Sending…' : 'Send'}
          </button>
        </span>
      </div>

      <AttachFromPatientModal
        isOpen={pickingFromFile}
        onClose={() => setPickingFromFile(false)}
        onAttach={addPatientDocs}
        budget={{ bytes: Math.max(0, MAX_TOTAL - totalBytes), files: Math.max(0, MAX_FILES - attachmentCount) }}
        alreadyIds={new Set(patientDocs.map((d) => d.documentId))}
      />
      <ConfirmActionModal
        isOpen={confirm === 'discard'}
        onClose={() => setConfirm(null)}
        onConfirm={discard}
        title="Discard this message?"
        message={draftUid ? 'The draft moves to your Trash folder.' : 'What you have written will be lost.'}
        confirmLabel="Discard"
        confirmVariant="danger"
      />
      <ConfirmActionModal
        isOpen={confirm === 'noSubject'}
        onClose={() => setConfirm(null)}
        onConfirm={doSend}
        title="Send without a subject?"
        message="The recipient will see “(no subject)”."
        confirmLabel="Send anyway"
      />
    </div>
  );
};

const AttachmentChip = ({ name, size, type, onRemove, disabled, badge = null, badgeTitle = '' }) => {
  const Icon = /^image\//.test(type || '') ? ImageIcon : FileText;
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
      <Icon className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
      <span className="max-w-[12rem] truncate font-medium text-gray-700" title={name}>{name}</span>
      {badge && <span className="rounded bg-violet-50 px-1 text-[10px] font-semibold text-violet-800" title={badgeTitle}>{badge}</span>}
      <span className="text-gray-400">{formatBytes(size)}</span>
      <button type="button" onClick={onRemove} disabled={disabled} aria-label={`Remove ${name}`} className="text-gray-400 hover:text-red-600 disabled:opacity-40">
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
};

export default Composer;
