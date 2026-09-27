import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import Modal from '../shared/Modal';
import mailService from '../../services/mailService';

const RESERVED = ['inbox', 'sent', 'sent items', 'sent messages', 'drafts', 'trash', 'deleted items', 'deleted messages', 'junk', 'spam', 'archive', 'archives'];

/** Same rules the server enforces — shown as you type, so a refusal is rare. */
const nameProblem = (name, folders, currentPath = null) => {
  const n = name.replace(/\s+/g, ' ').trim();
  if (!n) return 'Give the folder a name.';
  if (n.length > 60) return 'Keep folder names to 60 characters.';
  if (/[/\\*%]/.test(n)) return "A folder name can't contain / \\ * %";
  if (RESERVED.includes(n.toLowerCase())) return `"${n}" is kept for the mailbox's own folders.`;
  const clash = folders.find((f) => f.path !== currentPath && (f.name || '').toLowerCase() === n.toLowerCase());
  if (clash) return `You already have a folder called "${clash.name}".`;
  return null;
};

/**
 * New / rename / delete one of the person's OWN mail folders (never Inbox,
 * Sent, Drafts, Trash, Junk or Archive). Delete works only on an empty folder:
 * on a mail server, deleting a folder destroys what is in it, and one.com
 * keeps no backup — the server re-checks emptiness at the moment of deleting.
 *
 * mode: 'create' | 'rename' | 'delete'; folder: the rail row for rename/delete.
 */
const FolderDialog = ({ mode, folder = null, folders = [], onClose, onDone }) => {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setName(mode === 'rename' && folder ? folder.name : '');
    setProblem(null); setTouched(false); setBusy(false);
  }, [mode, folder]);

  if (!mode) return null;
  const typedProblem = mode !== 'delete' ? nameProblem(name, folders, folder?.path) : null;
  const count = folder?.messages;
  const notEmpty = mode === 'delete' && count > 0;

  const submit = async (e) => {
    e?.preventDefault();
    setTouched(true);
    if (busy || typedProblem || notEmpty) return;
    setBusy(true); setProblem(null);
    try {
      let res;
      if (mode === 'create') res = await mailService.createFolder(name.trim());
      else if (mode === 'rename') res = await mailService.renameFolder(folder.path, name.trim());
      else res = await mailService.deleteFolder(folder.path);
      onDone(mode, res?.data || {});
    } catch (err) {
      setProblem(err?.message || 'That didn\'t work. Your folders are unchanged.');
      setBusy(false);
    }
  };

  const title = mode === 'create' ? 'New folder' : mode === 'rename' ? `Rename "${folder?.name}"` : `Delete "${folder?.name}"?`;
  const btn = 'rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50';

  return (
    <Modal isOpen onClose={busy ? () => {} : onClose} title={title}>
      <form onSubmit={submit} className="space-y-3">
        {mode === 'delete' ? (
          notEmpty ? (
            <p className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>"{folder.name}" still has {count} message{count === 1 ? '' : 's'}. Move {count === 1 ? 'it' : 'them'} to another folder first — deleting a folder on the mail server would destroy what is in it.</span>
            </p>
          ) : (
            <p className="text-sm text-gray-600">The folder is empty. It will be removed from your mailbox — on your phone and in webmail too.</p>
          )
        ) : (
          <div>
            <input
              autoFocus value={name} onChange={(e) => { setName(e.target.value); setProblem(null); }} maxLength={80}
              placeholder="Referrals" aria-label="Folder name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {touched && typedProblem ? (
              <p className="mt-1 text-xs text-red-600">{typedProblem}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">{mode === 'create' ? 'Made at the top level of your mailbox, so it shows on your phone and in webmail too.' : 'The messages inside stay where they are.'}</p>
            )}
          </div>
        )}
        {problem && <p className="text-sm text-red-600">{problem}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className={`${btn} border border-gray-300 text-gray-700 hover:bg-gray-50`}>
            {notEmpty ? 'Close' : 'Cancel'}
          </button>
          {!notEmpty && (
            <button type="submit" disabled={busy} className={`${btn} inline-flex items-center gap-1.5 text-white ${mode === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'}`}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Create' : mode === 'rename' ? 'Rename' : 'Delete folder'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default FolderDialog;
