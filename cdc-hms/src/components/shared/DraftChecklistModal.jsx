import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { useDraftContext } from '../../contexts/DraftContext';
import { draftTime } from '../../utils/draftFormat';

/**
 * The unsaved-drafts list shown before something final happens — completing
 * the consultation, or leaving the patient file. It WARNS, never blocks
 * (Emu, 6 Oct): every row can be opened, saved (when the form allows it) or
 * discarded, and the doctor can always carry on and keep the drafts.
 *
 *   drafts       entries from DraftContext.draftsFor(uhid)
 *   title        e.g. "Before you complete — 2 unsaved drafts"
 *   intro        one line under the title
 *   continueLabel / onContinue   the way on ("Complete anyway — keep drafts");
 *                  leave onContinue out for a plain list (the file's draft chip)
 *   onOpen(entry)  bring that form into view (the caller knows where it lives)
 *   onClose        "Go back" / "Stay and review"
 */
const DraftChecklistModal = ({
  isOpen, drafts = [], title, intro, continueLabel, onContinue, onOpen, onClose, backLabel = 'Go back',
}) => {
  const ctx = useDraftContext();
  const [busy, setBusy] = useState(null);

  if (!isOpen) return null;

  const save = async (entry) => {
    setBusy(entry.key);
    try {
      const ok = await ctx.quickSave(entry);
      if (!ok) toast.error(`${entry.label} was not saved — open it to finish.`);
    } finally { setBusy(null); }
  };
  const discard = async (entry) => {
    setBusy(entry.key);
    try { await ctx.discard(entry); } finally { setBusy(null); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="space-y-3">
        {intro && <p className="text-sm text-gray-600">{intro}</p>}
        {drafts.length === 0 && (
          <p className="text-sm text-green-700 font-medium">Nothing left unsaved.</p>
        )}
        <ul className="space-y-2">
          {drafts.map((d) => (
            <li key={d.key} className="flex flex-wrap items-center gap-2 p-3 border border-gray-200 rounded-lg">
              <div className="flex-1 min-w-[12rem]">
                <p className="font-semibold text-gray-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500" aria-hidden="true" />
                  {d.label}
                </p>
                <p className="text-xs text-gray-500">
                  Last typed {draftTime(d.updatedAt)}
                  {!ctx.canQuickSave(d) && ' · open it to check before saving'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpen?.(d)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-semibold hover:bg-blue-50 min-h-[40px]"
              >
                Open
              </button>
              {ctx.canQuickSave(d) && (
                <button
                  type="button"
                  disabled={busy === d.key}
                  onClick={() => save(d)}
                  className="px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold min-h-[40px] disabled:opacity-50"
                >
                  Save
                </button>
              )}
              <button
                type="button"
                disabled={busy === d.key}
                onClick={() => discard(d)}
                className="px-3 py-1.5 rounded-lg border border-red-300 text-red-700 text-sm font-semibold hover:bg-red-50 min-h-[40px] disabled:opacity-50"
              >
                Discard
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold hover:bg-gray-50 min-h-[44px]"
          >
            {backLabel}
          </button>
          {onContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-bold min-h-[44px]"
            >
              {drafts.length === 0 ? continueLabel.replace(/ — keep (the )?drafts?$/, '') : continueLabel}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default DraftChecklistModal;
