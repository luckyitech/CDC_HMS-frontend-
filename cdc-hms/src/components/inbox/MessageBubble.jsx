import { useState } from 'react';
import { FileText, Image as ImageIcon, CheckCircle, RotateCcw, Paperclip } from 'lucide-react';
import { fmtTime, STATUS_TICK, RESOLUTION_KINDS } from './inboxHelpers';

// One message in a thread. Inbound = left/grey, outbound = right/green,
// internal = centred amber note (never sent to the patient). An inbound message
// is a query: it carries a Complete control with a required resolution note.
const MessageBubble = ({ message, onOpenMedia, onComplete, onReopen, onFile, canWrite }) => {
  const [showResolve, setShowResolve] = useState(false);
  const [kind, setKind] = useState('answered');
  const [note, setNote] = useState('');
  const internal = message.direction === 'internal';
  const out = message.direction === 'out';

  if (internal) {
    return (
      <div className="my-2 flex justify-center">
        <div className="max-w-[80%] rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
          <span className="font-medium">🔒 Internal note</span>
          {message.sentBy ? ` · ${message.sentBy.name}` : ''}
          <div className="whitespace-pre-wrap">{message.body}</div>
          <div className="text-[11px] text-amber-600 mt-1">{fmtTime(message.createdAt)}</div>
        </div>
      </div>
    );
  }

  const media = message.media;
  return (
    <div className={`my-1.5 flex ${out ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${out ? 'bg-emerald-100 text-emerald-950 rounded-br-sm' : 'bg-white border border-gray-200 rounded-bl-sm'}`}>
        {media && (
          <button type="button" onClick={() => onOpenMedia(message)} className="mb-1 flex items-center gap-2 rounded-md bg-black/5 px-2 py-1.5 hover:bg-black/10 w-full text-left">
            {(media.mime || '').startsWith('image/') ? <ImageIcon size={16} /> : <FileText size={16} />}
            <span className="truncate">{media.fileName || 'Attachment'}</span>
            {media.encrypted && <span className="text-[10px] rounded bg-amber-200 px-1 text-amber-800">🔒 locked</span>}
          </button>
        )}
        {message.body && <div className="whitespace-pre-wrap break-words">{message.body}</div>}
        {message.caption && <div className="whitespace-pre-wrap break-words text-gray-700">{message.caption}</div>}
        {message.type === 'template' && <div className="text-[11px] italic text-emerald-700">Template: {message.templateName}</div>}

        <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-gray-500">
          {message.medicalDocumentId && <span title="Filed to the patient record"><Paperclip size={11} className="inline" /> filed</span>}
          <span>{fmtTime(message.createdAt)}</span>
          {out && <span title={message.status}>{STATUS_TICK[message.status] || ''}</span>}
          {out && message.status === 'failed' && <span className="text-red-500" title={message.errorMessage}>failed</span>}
        </div>

        {message.query && (
          <div className="mt-1 border-t border-black/5 pt-1">
            {message.query.status === 'open' ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] rounded-full bg-blue-100 text-blue-700 px-2 py-0.5">Query open</span>
                {canWrite && media && <button type="button" onClick={() => onFile(message)} className="text-[11px] text-blue-600 hover:underline">File to record</button>}
                {canWrite && <button type="button" onClick={() => setShowResolve((s) => !s)} className="text-[11px] text-emerald-700 hover:underline inline-flex items-center gap-0.5"><CheckCircle size={12} /> Complete</button>}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5">Completed</span>
                {message.query.resolvedBy && <span>by {message.query.resolvedBy.name}</span>}
                {canWrite && <button type="button" onClick={() => onReopen(message)} className="text-blue-600 hover:underline inline-flex items-center gap-0.5"><RotateCcw size={11} /> Reopen</button>}
              </div>
            )}
            {message.query.resolutionNote && message.query.status === 'completed' && (
              <div className="text-[11px] text-gray-600 mt-0.5 italic">“{message.query.resolutionNote}”</div>
            )}
            {showResolve && message.query.status === 'open' && (
              <div className="mt-2 space-y-1">
                <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full rounded border-gray-300 text-xs">
                  {RESOLUTION_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Resolution note (required)…" className="w-full rounded border-gray-300 text-xs" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowResolve(false)} className="text-[11px] text-gray-500">Cancel</button>
                  <button type="button" disabled={!note.trim()} onClick={() => { onComplete(message, { resolutionKind: kind, resolutionNote: note.trim() }); setShowResolve(false); setNote(''); }} className="text-[11px] rounded bg-emerald-600 text-white px-2 py-0.5 disabled:opacity-40">Complete query</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
