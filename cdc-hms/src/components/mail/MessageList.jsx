import { Paperclip, Loader2, ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { shortDate, personName } from './mailFormat';

/**
 * The message list for one folder page. Unread rows are bold; in Sent and
 * Drafts the row shows who it went TO. External senders get a small tag.
 */
const MessageList = ({ data, loading, activeUid, onOpen, onPage, special, query }) => {
  const messages = data?.messages || [];
  const total = data?.total || 0;
  const page = data?.page || 1;
  const size = data?.pageSize || 50;
  const from = total ? (page - 1) * size + 1 : 0;
  const to = Math.min(page * size, total);
  const outgoing = special === 'sent' || special === 'drafts';

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && !messages.length && (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
        )}
        {!loading && !messages.length && (
          <p className="px-4 py-10 text-center text-sm text-gray-400">{query ? 'Nothing matches that search.' : 'This folder is empty.'}</p>
        )}
        {messages.map((m) => {
          const on = m.uid === activeUid;
          const who = outgoing
            ? `To: ${(m.to || []).map(personName).join(', ') || '—'}`
            : (personName(m.from) || '(no sender)');
          return (
            <button
              key={m.uid} type="button" onClick={() => onOpen(m)}
              className={`block w-full border-b px-3 py-2.5 text-left text-sm ${on ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className={`truncate ${m.seen ? 'text-gray-600' : 'font-bold text-gray-900'}`}>
                  {!m.seen && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-primary align-middle" aria-label="Unread" />}
                  {who}
                </span>
                <span className="flex-shrink-0 text-xs text-gray-400">{shortDate(m.date)}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className={`min-w-0 flex-1 truncate ${m.seen ? 'text-gray-500' : 'font-semibold text-gray-800'}`}>{m.subject || '(no subject)'}</span>
                {m.flagged && <Flag className="h-3.5 w-3.5 flex-shrink-0 text-red-500" aria-label="Flagged" />}
                {m.hasAttachments && <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" aria-label="Has attachments" />}
                {m.external && !outgoing && (
                  <span className="flex-shrink-0 rounded bg-amber-50 px-1.5 text-[10px] font-semibold text-amber-800">External</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {total > size && (
        <div className="flex items-center justify-between border-t px-3 py-1.5 text-xs text-gray-500">
          <span>{from}–{to} of {total}</span>
          <span className="flex gap-1">
            <button type="button" disabled={page <= 1 || loading} onClick={() => onPage(page - 1)} className="rounded p-1 hover:bg-gray-100 disabled:opacity-40" aria-label="Newer">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" disabled={to >= total || loading} onClick={() => onPage(page + 1)} className="rounded p-1 hover:bg-gray-100 disabled:opacity-40" aria-label="Older">
              <ChevronRight className="h-4 w-4" />
            </button>
          </span>
        </div>
      )}
    </div>
  );
};

export default MessageList;
