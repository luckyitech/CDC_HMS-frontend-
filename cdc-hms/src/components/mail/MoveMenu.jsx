import { useState, useRef, useEffect } from 'react';
import { FolderInput, Inbox, Send, FileText, Archive, AlertOctagon, Trash2, Folder } from 'lucide-react';

const ICONS = { inbox: Inbox, sent: Send, drafts: FileText, archive: Archive, junk: AlertOctagon, trash: Trash2 };

/**
 * "Move to…" — the person's own folders (standard ones first), minus the one
 * the messages are already in. Trash is left out on purpose: Delete is the way
 * there, so there is exactly one path into Trash. Folder create/rename is not
 * in phase 3b (Emu, 26 Sep).
 */
const MoveMenu = ({ folders, current, onMove, disabled, compact = false }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const targets = (folders || []).filter((f) => f.path !== current && f.special !== 'trash' && f.special !== 'drafts');

  return (
    <div className="relative" ref={ref}>
      <button
        type="button" disabled={disabled} onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu" aria-expanded={open} aria-label="Move to folder" title="Move to…"
        className={compact
          ? 'rounded p-1.5 hover:bg-white/60 disabled:opacity-40'
          : 'inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40'}
      >
        <FolderInput className="h-4 w-4" />{!compact && <span className="hidden sm:inline">Move</span>}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 max-h-72 w-52 overflow-y-auto rounded-lg border bg-white py-1 shadow-lg">
          <p className="px-3 py-1 text-[11px] font-semibold text-gray-400">Move to</p>
          {targets.length === 0 && <p className="px-3 py-2 text-sm text-gray-400">No other folders</p>}
          {targets.map((f) => {
            const Icon = ICONS[f.special] || Folder;
            return (
              <button
                key={f.path} type="button" role="menuitem"
                onClick={() => { setOpen(false); onMove(f.path, f.name); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <Icon className="h-4 w-4 flex-shrink-0 text-gray-400" /><span className="truncate">{f.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MoveMenu;
