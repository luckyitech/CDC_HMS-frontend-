import { useState } from 'react';
import { MessageSquareReply } from 'lucide-react';
import { hhmmOf } from '../hrFormat';
import { EVENT_LABELS } from './leaveFormat';
import { inputCls, primaryButtonCls } from '../hrUi';

/**
 * A request's timeline and message thread (LeaveEvents — never deleted), with
 * a reply box while an approver's question is open.
 *
 * props:
 *   application  formatApplication() shape
 *   onReply      async (note) => void   — shown only when application.can.reply
 */
const dayOf = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' });

const LeaveThread = ({ application, onReply }) => {
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const events = application.events || [];

  const send = async () => {
    if (!note.trim()) return;
    setSending(true);
    try {
      await onReply(note.trim());
      setNote('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <ol className="space-y-2" data-testid="leave-thread">
        {events.map((e) => (
          <li key={e.id} className="text-sm">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold text-gray-800">{e.actorName || 'CDC HMS'}</span>
              <span className="text-gray-600">{EVENT_LABELS[e.type] || e.type}</span>
              <span className="text-[11px] text-gray-400">{dayOf(e.createdAt)} {hhmmOf(e.createdAt)}</span>
            </div>
            {e.note && (
              <p className={`mt-0.5 whitespace-pre-line rounded-md px-2.5 py-1.5 text-sm ${e.type === 'info_requested' ? 'bg-amber-50 text-amber-900' : 'bg-gray-50 text-gray-700'}`}>
                {e.note}
              </p>
            )}
          </li>
        ))}
      </ol>

      {application.can?.reply && onReply && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
          <label className="block text-xs font-semibold text-amber-900 mb-1" htmlFor={`reply-${application.id}`}>
            {application.openQuestion?.by || 'An approver'} asked a question — your answer
          </label>
          <textarea id={`reply-${application.id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="Write your answer" />
          <div className="flex justify-end mt-2">
            <button type="button" onClick={send} disabled={sending || !note.trim()} className={`${primaryButtonCls} inline-flex items-center gap-1.5`}>
              <MessageSquareReply className="w-4 h-4" /> {sending ? 'Sending…' : 'Send answer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveThread;
