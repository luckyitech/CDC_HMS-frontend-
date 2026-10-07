import { History, Check, CloudOff, Trash2 } from 'lucide-react';
import { draftTime, draftWhen, isEarlierDay } from '../../utils/draftFormat';

/**
 * Autosave status for one form — the pill is about the RECORD, the grey line
 * about the DRAFT. Pass the object useDraft() returns.
 *
 *   saving   grey   "Saving draft…"
 *   draft    amber  "Draft · not in the record yet"  + "Draft saved 19:42 · autosaves as you type"
 *   offline  red    "No connection — kept on this device"
 *   local    red    "Too large for the server — kept on this device"
 *   recorded green  "Saved to record 19:31"
 */
export const DraftStatus = ({ draft, className = '', showLine = true }) => {
  if (!draft) return null;
  const { status, savedAt, recordedAt } = draft;
  const pill = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold';

  if (status === 'pending' || status === 'saving') {
    return <span className={`text-xs text-gray-500 ${className}`} role="status">Saving draft…</span>;
  }
  if (status === 'draft') {
    return (
      <span className={`inline-flex flex-wrap items-center gap-2 ${className}`} role="status">
        <span className={`${pill} bg-orange-50 border-orange-300 text-orange-800`}>
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" aria-hidden="true" />
          Draft · not in the record yet
        </span>
        {showLine && savedAt && (
          <span className="text-xs text-gray-500">Draft saved {draftTime(savedAt)} · autosaves as you type</span>
        )}
      </span>
    );
  }
  if (status === 'offline' || status === 'local') {
    return (
      <span className={`${pill} bg-red-50 border-red-300 text-red-800 ${className}`} role="status">
        <CloudOff className="w-3.5 h-3.5" aria-hidden="true" />
        {status === 'offline' ? 'No connection — kept on this device' : 'Too large for the server — kept on this device'}
      </span>
    );
  }
  if (status === 'recorded' && recordedAt) {
    return (
      <span className={`${pill} bg-green-50 border-green-300 text-green-800 ${className}`} role="status">
        <Check className="w-3.5 h-3.5" aria-hidden="true" />
        Saved to record {draftTime(recordedAt)}
      </span>
    );
  }
  return null;
};

/** Small orange dot for a section header that holds an unsaved draft. */
export const DraftDot = ({ title = 'Unsaved draft' }) => (
  <span className="w-2 h-2 bg-orange-500 rounded-full inline-block" title={title} aria-label={title} />
);

/**
 * "Restored your unsaved draft …  Keep · Discard draft". Shown while
 * draft.restored is set. A draft from an earlier day is flagged — it may
 * belong to a previous visit.
 */
export const DraftRestoreBanner = ({ draft, className = '' }) => {
  if (!draft?.restored) return null;
  const { updatedAt, device } = draft.restored;
  const old = isEarlierDay(updatedAt);
  return (
    <div
      role="status"
      className={`flex flex-wrap items-center gap-3 px-4 py-3 rounded-lg border ${old ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-blue-50 border-blue-200 text-blue-900'} ${className}`}
    >
      <History className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      <span className="flex-1 min-w-[16rem] text-sm">
        <strong>Restored your unsaved draft</strong> of {draft.label} from {draftWhen(updatedAt)}
        {device ? `, saved on ${device === 'iPad' ? 'an iPad' : `a ${device}`}` : ''}.
        {old && <> It is from an earlier day — check it belongs to this visit before keeping it.</>}
      </span>
      <button
        type="button"
        onClick={draft.keep}
        className="px-3 py-1.5 rounded-lg border border-blue-300 bg-white text-sm font-semibold text-blue-900 hover:bg-blue-50 min-h-[36px]"
      >
        Keep
      </button>
      <button
        type="button"
        onClick={draft.discard}
        className="px-3 py-1.5 rounded-lg border border-red-300 bg-white text-sm font-semibold text-red-700 hover:bg-red-50 min-h-[36px] inline-flex items-center gap-1.5"
      >
        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
        Discard draft
      </button>
    </div>
  );
};

export default DraftStatus;
