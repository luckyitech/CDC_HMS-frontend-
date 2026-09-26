import { Inbox, Send, FileText, Archive, AlertOctagon, Trash2, Folder } from 'lucide-react';

const ICONS = { inbox: Inbox, sent: Send, drafts: FileText, archive: Archive, junk: AlertOctagon, trash: Trash2 };

/**
 * Folder list. A rail on wide screens; a <select> on phones and tablets so the
 * message list gets the width.
 */
const FolderRail = ({ folders, active, onSelect }) => {
  const standard = folders.filter((f) => f.special);
  const own = folders.filter((f) => !f.special);

  const item = (f) => {
    const Icon = ICONS[f.special] || Folder;
    const on = f.path === active;
    return (
      <button
        key={f.path} type="button" onClick={() => onSelect(f.path)}
        className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm ${
          on ? 'bg-blue-50 font-semibold text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
      >
        <span className="flex min-w-0 items-center gap-2"><Icon className="h-4 w-4 flex-shrink-0" /><span className="truncate">{f.name}</span></span>
        {f.unseen > 0 && f.special !== 'sent' && f.special !== 'drafts' && (
          <span className="text-xs font-bold">{f.unseen}</span>
        )}
      </button>
    );
  };

  return (
    <>
      <nav className="hidden w-44 flex-shrink-0 overflow-y-auto border-r p-2 lg:block" aria-label="Mail folders">
        {standard.map(item)}
        {own.length > 0 && <p className="mb-1 mt-3 px-2.5 text-[11px] font-semibold text-gray-400">Your folders</p>}
        {own.map(item)}
      </nav>
      <div className="border-b p-2 lg:hidden">
        <select
          value={active} onChange={(e) => onSelect(e.target.value)} aria-label="Mail folder"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {folders.map((f) => <option key={f.path} value={f.path}>{f.name}{f.unseen ? ` (${f.unseen})` : ''}</option>)}
        </select>
      </div>
    </>
  );
};

export default FolderRail;
