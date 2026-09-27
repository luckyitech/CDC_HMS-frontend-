import { Paperclip, Loader2, ChevronLeft, ChevronRight, Flag, Archive, Trash2, MailOpen, Mail as MailIcon, Undo2, Check, Minus, X } from 'lucide-react';
import { shortDate, personName } from './mailFormat';
import MoveMenu from './MoveMenu';

const Box = ({ state, onClick, label }) => (
  <button
    type="button" onClick={onClick} role="checkbox" aria-checked={state === 'mixed' ? 'mixed' : !!state} aria-label={label}
    className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
      state ? 'border-primary bg-primary text-white' : 'border-gray-400 bg-white hover:border-gray-600'}`}
  >
    {state === 'mixed' ? <Minus className="h-3 w-3" /> : state ? <Check className="h-3 w-3" /> : null}
  </button>
);

/**
 * The message list for one folder page. Unread rows are bold; in Sent and
 * Drafts the row shows who it went TO. External senders get a small tag.
 * Phase 3b: a preview line under the subject, and checkboxes — ticking any
 * row turns the header into the bulk bar. With the whole page ticked, a banner
 * offers "Select all N in <folder>" (debt pass): the server then acts on those
 * messages only — never on mail that arrives while it runs.
 */
const MessageList = ({
  data, loading, activeUid, onOpen, onPage, special, query,
  selected, onToggle, onToggleAll, onClearSelection, onBulk, folders, folder, busy,
  allSelected = false, onSelectAllInFolder = null, folderName = 'this folder',
}) => {
  const messages = data?.messages || [];
  const total = data?.total || 0;
  const page = data?.page || 1;
  const size = data?.pageSize || 50;
  const from = total ? (page - 1) * size + 1 : 0;
  const to = Math.min(page * size, total);
  const outgoing = special === 'sent' || special === 'drafts';
  const inTrash = special === 'trash';

  const picked = messages.filter((m) => selected.has(m.uid));
  const count = allSelected ? total : picked.length;
  const allState = count === 0 ? false : (allSelected || picked.length === messages.length) ? true : 'mixed';
  // Across a whole folder we can't see every row: Flag and Mark read are the
  // actions offered (the page's own mix decides only for a page selection).
  const allFlagged = !allSelected && count > 0 && picked.every((m) => m.flagged);
  const anyUnread = allSelected || picked.some((m) => !m.seen);
  const where = query ? `matching "${query}"` : `in ${folderName}`;
  const offerAll = !allSelected && onSelectAllInFolder && picked.length > 0 && picked.length === messages.length && total > messages.length;
  const act = 'rounded p-1.5 hover:bg-white/60 disabled:opacity-40';

  return (
    <div className="flex h-full flex-col">
      {messages.length > 0 && (
        <div className={`flex min-h-[2.5rem] items-center gap-2 border-b px-3 py-1.5 text-sm ${count ? 'bg-blue-50 text-primary' : 'text-gray-500'}`}>
          <Box state={allState} onClick={onToggleAll} label={count ? 'Clear selection' : 'Select all on this page'} />
          {count === 0 ? (
            <span className="text-xs">Select</span>
          ) : (
            <>
              <span className="flex-1 font-semibold">{allSelected ? `All ${count}` : count} selected</span>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {inTrash ? (
                <button type="button" disabled={busy} onClick={() => onBulk('restore')} className={act} aria-label="Restore to Inbox" title="Restore to Inbox">
                  <Undo2 className="h-4 w-4" />
                </button>
              ) : (
                <>
                  {special !== 'archive' && (
                    <button type="button" disabled={busy} onClick={() => onBulk('archive')} className={act} aria-label="Archive" title="Archive">
                      <Archive className="h-4 w-4" />
                    </button>
                  )}
                  <MoveMenu compact folders={folders} current={folder} disabled={busy} onMove={(to, name) => onBulk('move', { to, name })} />
                  <button type="button" disabled={busy} onClick={() => onBulk('trash')} className={act} aria-label="Delete (move to Trash)" title="Delete (move to Trash)">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
              <button type="button" disabled={busy} onClick={() => onBulk('flag', { flagged: !allFlagged })} className={act}
                aria-label={allFlagged ? 'Remove flag' : 'Flag'} title={allFlagged ? 'Remove flag' : 'Flag'}>
                <Flag className={`h-4 w-4 ${allFlagged ? 'fill-current' : ''}`} />
              </button>
              <button type="button" disabled={busy} onClick={() => onBulk('seen', { seen: anyUnread })} className={act}
                aria-label={anyUnread ? 'Mark read' : 'Mark unread'} title={anyUnread ? 'Mark read' : 'Mark unread'}>
                {anyUnread ? <MailOpen className="h-4 w-4" /> : <MailIcon className="h-4 w-4" />}
              </button>
              <button type="button" onClick={onClearSelection} className={act} aria-label="Clear selection" title="Clear selection">
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      )}
      {(offerAll || allSelected) && (
        <div className="border-b bg-blue-50 px-3 py-1.5 text-center text-xs text-primary">
          {allSelected ? (
            <>All {total} {where} are selected. <button type="button" onClick={onClearSelection} className="font-semibold underline">Clear selection</button></>
          ) : (
            <>All {picked.length} on this page are selected. <button type="button" onClick={onSelectAllInFolder} className="font-semibold underline">Select all {total} {where}</button></>
          )}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && !messages.length && (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
        )}
        {!loading && !messages.length && (
          <p className="px-4 py-10 text-center text-sm text-gray-400">{query ? 'Nothing matches that search.' : 'This folder is empty.'}</p>
        )}
        {messages.map((m) => {
          const on = m.uid === activeUid;
          const ticked = selected.has(m.uid);
          const who = outgoing
            ? `To: ${(m.to || []).map(personName).join(', ') || '—'}`
            : (personName(m.from) || '(no sender)');
          return (
            <div key={m.uid} className={`flex gap-2 border-b px-3 py-2.5 text-sm ${on ? 'bg-blue-50' : ticked ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
              <div className="pt-0.5">
                <Box state={ticked} onClick={() => onToggle(m.uid)} label={`Select message: ${m.subject || '(no subject)'}`} />
              </div>
              <button type="button" onClick={() => onOpen(m)} className="block min-w-0 flex-1 text-left">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`truncate ${m.seen ? 'text-gray-600' : 'font-bold text-gray-900'}`}>
                    {!m.seen && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-primary align-middle" aria-label="Unread" />}
                    {who}
                  </span>
                  <span className="flex-shrink-0 text-xs text-gray-400">{shortDate(m.date)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className={`min-w-0 flex-1 truncate ${m.seen ? 'text-gray-500' : 'font-semibold text-gray-800'}`}>{m.subject || '(no subject)'}</span>
                  {m.flagged && <Flag className="h-3.5 w-3.5 flex-shrink-0 fill-current text-red-500" aria-label="Flagged" />}
                  {m.hasAttachments && <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" aria-label="Has attachments" />}
                  {m.external && !outgoing && (
                    <span className="flex-shrink-0 rounded bg-amber-50 px-1.5 text-[10px] font-semibold text-amber-800">External</span>
                  )}
                </div>
                {m.snippet && <p className="mt-0.5 truncate text-xs text-gray-500">{m.snippet}</p>}
              </button>
            </div>
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
