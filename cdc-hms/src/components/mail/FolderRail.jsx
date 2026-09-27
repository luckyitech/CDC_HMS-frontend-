import { useState, useEffect, useRef } from 'react';
import { Inbox, Send, FileText, Archive, AlertOctagon, Trash2, Folder, Plus, MoreHorizontal, Pencil } from 'lucide-react';

const ICONS = { inbox: Inbox, sent: Send, drafts: FileText, archive: Archive, junk: AlertOctagon, trash: Trash2 };

/** Rename / Delete for one of the person's own folders. */
const FolderMenu = ({ folder, onManage }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const item = 'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50';
  return (
    <div className="relative" ref={ref}>
      <button
        type="button" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700" aria-label={`Folder options: ${folder.name}`} title="Folder options"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border bg-white py-1 shadow-lg">
          <button type="button" className={item} onClick={() => { setOpen(false); onManage('rename', folder); }}>
            <Pencil className="h-4 w-4" /> Rename
          </button>
          <button type="button" className={item} onClick={() => { setOpen(false); onManage('delete', folder); }}>
            <Trash2 className="h-4 w-4" /> Delete folder
          </button>
          {folder.messages > 0 && (
            <p className="px-3 pb-1 text-[11px] text-gray-500">Has {folder.messages} message{folder.messages === 1 ? '' : 's'} — move them out to delete it</p>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Folder list. A rail on wide screens; a <select> on phones and tablets so the
 * message list gets the width. The person's own folders (not Inbox or the
 * mailbox's special folders) can be created, renamed and — when empty —
 * deleted: `onManage(mode, folder)` opens FolderDialog (held by MailTab).
 */
const FolderRail = ({ folders, active, onSelect, onManage = null }) => {
  const standard = folders.filter((f) => f.special);
  const own = folders.filter((f) => !f.special);
  const activeOwn = own.find((f) => f.path === active);

  // A sub-folder ("Parent.Kid" / "Parent/Kid") is indented under its parent.
  const depth = (f) => {
    if (f.special) return 0;
    const parts = String(f.path).split(f.delimiter || '/');
    return Math.max(0, parts.length - 1 - (/^inbox$/i.test(parts[0]) && parts.length > 1 ? 1 : 0));
  };

  const item = (f) => {
    const Icon = ICONS[f.special] || Folder;
    const on = f.path === active;
    const indent = Math.min(depth(f), 4);
    return (
      <div
        key={f.path}
        className={`group flex w-full items-center justify-between gap-1 rounded-md pr-1 text-sm ${
          on ? 'bg-blue-50 font-semibold text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
      >
        <button
          type="button" onClick={() => onSelect(f.path)} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-2.5 text-left"
          style={{ paddingLeft: `${10 + indent * 14}px` }}
        >
          <Icon className="h-4 w-4 flex-shrink-0" /><span className="truncate">{f.name}</span>
        </button>
        {f.unseen > 0 && f.special !== 'sent' && f.special !== 'drafts' && (
          <span className="text-xs font-bold">{f.unseen}</span>
        )}
        {onManage && !f.special && (
          <span className={on ? '' : 'opacity-0 focus-within:opacity-100 group-hover:opacity-100'}>
            <FolderMenu folder={f} onManage={onManage} />
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      <nav className="hidden w-44 flex-shrink-0 overflow-y-auto border-r p-2 lg:block" aria-label="Mail folders">
        {standard.map(item)}
        {(own.length > 0 || onManage) && (
          <div className="mb-1 mt-3 flex items-center justify-between px-2.5">
            <p className="text-[11px] font-semibold text-gray-400">Your folders</p>
            {onManage && (
              <button type="button" onClick={() => onManage('create')} className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:underline" title="New folder">
                <Plus className="h-3 w-3" /> New
              </button>
            )}
          </div>
        )}
        {own.map(item)}
      </nav>
      <div className="flex items-center gap-1 border-b p-2 lg:hidden">
        <select
          value={active} onChange={(e) => onSelect(e.target.value)} aria-label="Mail folder"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {folders.map((f) => <option key={f.path} value={f.path}>{f.name}{f.unseen ? ` (${f.unseen})` : ''}</option>)}
        </select>
        {onManage && activeOwn && <FolderMenu folder={activeOwn} onManage={onManage} />}
        {onManage && (
          <button type="button" onClick={() => onManage('create')} className="rounded p-2 text-gray-500 hover:bg-gray-100" aria-label="New folder" title="New folder">
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
    </>
  );
};

export default FolderRail;
