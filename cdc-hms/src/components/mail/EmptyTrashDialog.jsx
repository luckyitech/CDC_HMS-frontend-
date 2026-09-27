import { useState, useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Modal from '../shared/Modal';
import mailService from '../../services/mailService';
import { errorCode } from './mailFormat';

const WORD = 'EMPTY';

/**
 * Empty Trash — the ONE permanent action in My mail (one.com keeps no
 * backups). Asks the server how many messages are in Trash right now, says
 * plainly that they also vanish from the phone and webmail, and only lets the
 * button work once the person has typed EMPTY. The server re-checks both the
 * word and the count; if something landed in Trash meanwhile it refuses and
 * this dialog shows the new number to confirm again.
 */
const EmptyTrashDialog = ({ isOpen, onClose, onEmptied }) => {
  const [count, setCount] = useState(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    let live = true;
    setTyped(''); setProblem(null); setCount(null);
    mailService.trashInfo()
      .then((r) => { if (live) setCount(r.data?.count ?? 0); })
      .catch((err) => { if (live) setProblem(err?.message || 'Could not check your Trash.'); });
    return () => { live = false; };
  }, [isOpen]);

  const ready = typed === WORD && count > 0 && !busy;
  const n = count ?? 0;
  const plural = n === 1 ? 'message' : 'messages';

  const confirm = async () => {
    if (!ready) return;
    setBusy(true); setProblem(null);
    try {
      const res = await mailService.emptyTrash(count);
      onEmptied(res.data?.emptied ?? count);
    } catch (err) {
      if (errorCode(err) === 'TRASH_CHANGED') {
        setCount(err?.data?.count ?? null);
        setTyped('');
      }
      setProblem(err?.message || 'Could not empty Trash.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={busy ? () => {} : onClose} title="Empty Trash for good?">
      {count === null && !problem && (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
      )}
      {count === 0 && <p className="text-sm text-gray-600">Your Trash is already empty.</p>}
      {count > 0 && (
        <>
          <p className="flex gap-2 text-sm text-gray-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" aria-hidden="true" />
            <span>
              {n} {plural} will be deleted from your mailbox — on your phone and webmail too.
              Your mailbox keeps no backup, so they can&apos;t be recovered.
            </span>
          </p>
          <label className="mt-4 block text-sm text-gray-600" htmlFor="empty-trash-word">Type {WORD} to confirm</label>
          <input
            id="empty-trash-word" value={typed} onChange={(e) => setTyped(e.target.value)}
            autoComplete="off" autoCapitalize="characters" spellCheck={false} disabled={busy}
            onKeyDown={(e) => { if (e.key === 'Enter') confirm(); }}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
          />
        </>
      )}
      {problem && <p className="mt-3 text-sm text-red-700" role="alert">{problem}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          Cancel
        </button>
        {count > 0 && (
          <button
            type="button" onClick={confirm} disabled={!ready}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Delete {n} {plural}
          </button>
        )}
      </div>
    </Modal>
  );
};

export default EmptyTrashDialog;
