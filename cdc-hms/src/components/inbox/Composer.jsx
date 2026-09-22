import { useState, useRef } from 'react';
import { Send, Paperclip, Lock, StickyNote } from 'lucide-react';

// The message composer. Free-form text while the 24 h window is open; when it is
// closed only approved templates may be sent, so the composer swaps to a
// template picker. An internal-note toggle writes a staff-only note that is
// never sent to the patient.
const Composer = ({ conversation, templates = [], onSendText, onSendTemplate, onSendMedia, onInternalNote, sending }) => {
  const [text, setText] = useState('');
  const [internal, setInternal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const fileRef = useRef(null);
  const windowOpen = conversation?.windowOpen;
  // Only WhatsApp has approved templates and media send. On Messenger/Instagram
  // a closed 24 h window means no reply is possible until the person writes
  // again — offering a template picker there would only produce a server error,
  // so we show a plain notice instead, and hide the attach control.
  const isWhatsApp = (conversation?.channel?.channel || 'whatsapp') === 'whatsapp';

  const submit = (e) => {
    e.preventDefault();
    if (internal) {
      if (!text.trim()) return;
      onInternalNote(text.trim());
      setText('');
      return;
    }
    if (windowOpen) {
      if (!text.trim()) return;
      onSendText(text.trim());
      setText('');
    } else if (templateName) {
      const tpl = templates.find((t) => t.name === templateName);
      onSendTemplate({ templateName, language: tpl?.language || 'en', preview: templateName });
      setTemplateName('');
    }
  };

  const pickFile = (e) => {
    const file = e.target.files?.[0];
    if (file) onSendMedia(file);
    e.target.value = '';
  };

  return (
    <form onSubmit={submit} className="border-t bg-white p-2">
      <div className="mb-1 flex items-center gap-3 text-xs">
        <label className="inline-flex items-center gap-1 text-gray-600">
          <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
          <StickyNote size={13} /> Internal note
        </label>
        {!windowOpen && !internal && (
          <span className="inline-flex items-center gap-1 text-amber-600">
            <Lock size={12} /> {isWhatsApp ? 'Window closed — templates only' : 'Window closed — reply once they message again'}
          </span>
        )}
      </div>

      {(!windowOpen && !internal && isWhatsApp) ? (
        <div className="flex items-center gap-2">
          <select value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="flex-1 rounded-lg border-gray-300 text-sm">
            <option value="">Choose an approved template…</option>
            {templates.filter((t) => (t.status || '').toUpperCase() === 'APPROVED' || !t.status).map((t) => (
              <option key={`${t.name}-${t.language}`} value={t.name}>{t.name} ({t.language})</option>
            ))}
          </select>
          <button type="submit" disabled={!templateName || sending} className="rounded-lg bg-emerald-600 px-3 py-2 text-white disabled:opacity-40"><Send size={16} /></button>
        </div>
      ) : (!windowOpen && !internal && !isWhatsApp) ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          The 24-hour reply window has closed. You can reply again once this person sends a new message.
        </div>
      ) : (
        <div className="flex items-end gap-2">
          {!internal && isWhatsApp && (
            <>
              <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" title="Attach a file"><Paperclip size={18} /></button>
              <input ref={fileRef} type="file" className="hidden" onChange={pickFile} />
            </>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(e); }}
            rows={1}
            placeholder={internal ? 'Write an internal note…' : 'Type a message…'}
            className={`flex-1 resize-none rounded-lg text-sm ${internal ? 'border-amber-300 bg-amber-50' : 'border-gray-300'}`}
          />
          <button type="submit" disabled={!text.trim() || sending} className={`rounded-lg px-3 py-2 text-white disabled:opacity-40 ${internal ? 'bg-amber-500' : 'bg-emerald-600'}`}><Send size={16} /></button>
        </div>
      )}
    </form>
  );
};

export default Composer;
