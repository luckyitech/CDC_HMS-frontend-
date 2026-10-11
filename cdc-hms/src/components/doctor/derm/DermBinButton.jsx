import { useState } from 'react';
import { Trash2, Archive, XCircle } from 'lucide-react';
import Modal from '../../shared/Modal';
import ReasonModal from '../../shared/ReasonModal';
import { useDermContext } from '../../../contexts/DermContext';
import { blankLook, lookFrom, lookPayload } from './dermFormat';

/**
 * DermBinButton — the red bin beside a saved finding (10 Oct 2026, Emu: "once
 * saved we can retire / delete"). A finding's name and type are not edited
 * after saving; a wrong one is deleted and recorded again.
 *
 *   Retire — the finding is resolved / no longer active: today's look is
 *            saved with status Resolved (the rest of today's look is kept).
 *            It stays in the record and its history; recording it again as
 *            worsened or recurrence makes it active again.
 *   Delete — entered in error (wrong name or type, wrong patient, duplicate):
 *            it leaves the skin record and the visit note but is kept, with
 *            the reason, for the audit trail. Never hard-deleted.
 *
 * Props: finding (a board row: id, label, title, today), currentUserId,
 *        onDone(kind) — 'retired' | 'deleted', size ('sm' default | 'md')
 */
const DermBinButton = ({ finding, currentUserId, onDone = () => {}, size = 'sm' }) => {
  const { saveToday, amendObservation, findingInError } = useDermContext();
  const [open, setOpen] = useState(false);
  const [ask, setAsk] = useState(null);   // 'delete' | 'retire-amend'
  const [busy, setBusy] = useState(false);
  if (!finding) return null;
  const name = `${finding.label} ${finding.title}`;
  const today = finding.today && finding.today.status !== 'entered_in_error' ? finding.today : null;
  const othersToday = !!today && today.doctorId !== currentUserId;

  const retire = async (reason) => {
    setBusy(true);
    try {
      if (othersToday) await amendObservation(today.id, { statusToday: 'resolved', reason });
      else await saveToday(finding.id, lookPayload({ ...(today ? lookFrom(today) : blankLook()), statusToday: 'resolved' }));
      setOpen(false);
      onDone('retired');
    } catch { /* the toast says why */ } finally { setBusy(false); }
  };
  const remove = async (reason) => {
    try { await findingInError(finding.id, reason); setOpen(false); onDone('deleted'); } catch { /* toast shown */ }
  };

  const icon = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  return (
    <>
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title={`Retire or delete ${name}`} aria-label={`Retire or delete ${name}`}
        className="inline-flex shrink-0 items-center justify-center rounded-md p-1 text-red-600 hover:bg-red-50 hover:text-red-700">
        <Trash2 className={icon} />
      </button>

      <Modal isOpen={open && !ask} onClose={() => setOpen(false)} title={`Retire or delete ${finding.label}`}>
        <p className="m-0 mb-3 text-sm text-gray-600"><b className="text-gray-800">{finding.title}</b> — what should happen to it?</p>
        <div className="flex flex-col gap-2">
          <button type="button" disabled={busy} onClick={() => (othersToday ? setAsk('retire-amend') : retire(null))}
            className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 text-left hover:border-primary ui-hover disabled:opacity-60">
            <Archive className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <span className="flex flex-col">
              <b className="text-sm text-gray-800">{busy ? 'Retiring…' : 'Retire — resolved, no longer active'}</b>
              <span className="text-xs text-gray-600">Saved as Resolved today. It stays in the record and its history; recording it again later makes it active.{othersToday && ' Today\'s entry is another doctor\'s, so a reason is asked.'}</span>
            </span>
          </button>
          <button type="button" disabled={busy} onClick={() => setAsk('delete')}
            className="flex items-start gap-3 rounded-lg border border-red-200 p-3 text-left hover:bg-red-50 disabled:opacity-60">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <span className="flex flex-col">
              <b className="text-sm text-red-700">Delete — entered in error</b>
              <span className="text-xs text-gray-600">Wrong name or type, duplicate, wrong patient. It leaves the skin record and the visit note; kept with your reason for the audit trail. Record it again with the right name.</span>
            </span>
          </button>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
        </div>
      </Modal>

      <ReasonModal
        isOpen={!!ask}
        onClose={() => setAsk(null)}
        title={ask === 'delete' ? `Delete ${finding.label} — entered in error` : `Retire ${finding.label}`}
        message={ask === 'delete'
          ? 'It leaves the skin record and the visit note but is kept, with your reason, for the audit trail. This cannot be undone here.'
          : "Today's entry was recorded by another doctor; it is amended to Resolved and your reason is kept in the trail."}
        placeholder={ask === 'delete' ? 'e.g. Wrong name — recorded again as #00x' : 'Reason…'}
        confirmLabel={ask === 'delete' ? 'Delete' : 'Retire'}
        destructive={ask === 'delete'}
        onConfirm={async (reason) => { const job = ask; setAsk(null); if (job === 'delete') await remove(reason); else await retire(reason); }}
      />
    </>
  );
};

export default DermBinButton;
