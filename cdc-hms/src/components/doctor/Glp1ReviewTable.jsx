import { useState } from 'react';
import ReasonModal from '../shared/ReasonModal';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Glp1ReviewTable — the monitoring visits table.
 *
 * Only visits that were actually recorded appear as rows. The planned review
 * weeks are not listed as empty "due" placeholders — instead, "Add monitoring
 * visit" opens the review form with the week the regimen expects next already
 * filled in, which the doctor can change. The Doctor column shows the author,
 * who never changes; an amendment adds a second name beside it.
 *
 * Renders a table above lg: and a card list below — same data, same components.
 */

const Glp1ReviewTable = ({
  reviews = [],
  reviewWeeks = [],   // the regimen's planned weeks — used to suggest the next visit
  currentWeek,
  readOnly,
  onRecord,
  onAmend,
  onRemove,
  onAddWeek,
}) => {
  const [addingWeek, setAddingWeek] = useState(false);
  const [newWeek, setNewWeek]       = useState('');
  // Review awaiting a removal reason
  const [removing, setRemoving]     = useState(null);

  // Only recorded visits are shown, in week order
  const recorded = [...reviews].sort((a, b) => a.weekNumber - b.weekNumber);

  // The week to open a new visit on: the planned review week nearest to where
  // the patient is now that has not been recorded yet, so the regimen does the
  // guessing and the doctor only edits when a patient attends off-schedule.
  const suggestNextWeek = () => {
    const done    = new Set(reviews.map(r => r.weekNumber));
    const pending = (reviewWeeks || []).filter(w => !done.has(w));
    if (!pending.length) return currentWeek ?? '';
    if (currentWeek == null) return pending[0];
    return pending.reduce(
      (best, w) => (Math.abs(w - currentWeek) < Math.abs(best - currentWeek) ? w : best),
      pending[0],
    );
  };

  const handleAddWeek = async () => {
    const week = Number(newWeek);
    if (!Number.isInteger(week) || week <= 0) {
      toast.error('Enter a whole number of weeks');
      return;
    }

    const result = await onAddWeek(week);
    if (result.success) {
      toast.success(`Week ${week} added to this patient's schedule`);
      setNewWeek('');
      setAddingWeek(false);
    } else {
      toast.error(result.message || 'Could not add the week');
    }
  };

  const handleRemove = async (reason) => {
    const result = await onRemove(removing.id, reason);
    if (result.success) {
      toast.success('Review removed from the record');
      setRemoving(null);
    } else {
      toast.error(result.message || 'Could not remove the review');
    }
  };

  return (
    <div>
      {recorded.length === 0 ? (
        <p className="text-sm text-gray-500">
          No monitoring visits recorded yet.
        </p>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="font-medium py-2 pr-3">Week</th>
                  <th className="font-medium py-2 pr-3">Date</th>
                  <th className="font-medium py-2 pr-3">Weight</th>
                  <th className="font-medium py-2 pr-3">FBS</th>
                  <th className="font-medium py-2 pr-3">HbA1c</th>
                  <th className="font-medium py-2 pr-3">Dose</th>
                  <th className="font-medium py-2 pr-3">Adherence</th>
                  <th className="font-medium py-2 pr-3">Clinician</th>
                  {!readOnly && <th className="w-20" />}
                </tr>
              </thead>
              <tbody>
                {recorded.map(review => (
                  <tr key={review.weekNumber} className="border-b border-gray-100">
                    <td className="py-2 pr-3 text-gray-800">{review.weekNumber}</td>
                    <td className="py-2 pr-3 text-gray-600">{review.reviewDate}</td>
                    <td className="py-2 pr-3 text-gray-600">{review.weight ? `${review.weight} kg` : '—'}</td>
                    <td className="py-2 pr-3 text-gray-600">{review.fpg ?? '—'}</td>
                    <td className="py-2 pr-3 text-gray-600">{review.hba1c ?? '—'}</td>
                    <td className="py-2 pr-3 text-gray-600">{review.doseAtReview ? `${review.doseAtReview} mg` : '—'}</td>
                    <td className="py-2 pr-3 text-gray-600">{review.adherence || '—'}</td>
                    <td className="py-2 pr-3 text-gray-600">
                      {review.clinicianName || '—'}
                      {review.amendedByName && (
                        <span className="block text-xs text-gray-400" title={review.amendmentReason || ''}>
                          amended by {review.amendedByName}
                        </span>
                      )}
                    </td>
                    {!readOnly && (
                      <td className="py-2 text-right whitespace-nowrap">
                        <button onClick={() => onAmend(review)}
                          className="p-1 text-gray-400 hover:text-primary hover:bg-blue-50 rounded" title="Amend review">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setRemoving(review)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-blue-50 rounded" title="Remove review">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile — same rows as cards */}
          <div className="lg:hidden space-y-2">
            {recorded.map(review => (
              <div key={review.weekNumber} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-800">Week {review.weekNumber}</span>
                  <span className="text-xs text-gray-500">{review.reviewDate}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
                  <span>Weight: {review.weight ? `${review.weight} kg` : '—'}</span>
                  <span>Dose: {review.doseAtReview ? `${review.doseAtReview} mg` : '—'}</span>
                  <span>FBS: {review.fpg ?? '—'}</span>
                  <span>HbA1c: {review.hba1c ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-500">{review.clinicianName}</span>
                  {!readOnly && (
                    <div>
                      <button onClick={() => onAmend(review)} className="p-1 text-gray-400" title="Amend">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => setRemoving(review)} className="p-1 text-gray-400" title="Remove">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!readOnly && (
        addingWeek ? (
          <div className="flex items-center gap-2 mt-3">
            <input
              type="number" min="1" value={newWeek}
              onChange={e => setNewWeek(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddWeek()}
              placeholder="Week"
              className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              autoFocus
            />
            <button onClick={handleAddWeek} className="text-sm text-primary hover:underline">Add</button>
            <button onClick={() => { setAddingWeek(false); setNewWeek(''); }}
              className="text-sm text-gray-400 hover:underline">Cancel</button>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {/* Opens the review form on the week the regimen expects next; the
                doctor edits it if the patient attended off-schedule */}
            <button type="button" onClick={() => onRecord(suggestNextWeek())}
              className="flex items-center gap-1 text-sm text-primary hover:underline">
              <Plus className="w-4 h-4" /> Add monitoring visit
            </button>
            <button type="button" onClick={() => setAddingWeek(true)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:underline">
              <Plus className="w-4 h-4" /> Add review week
            </button>
          </div>
        )
      )}

      <ReasonModal
        isOpen={!!removing}
        onClose={() => setRemoving(null)}
        title={`Remove week ${removing?.weekNumber ?? ''} review`}
        message="The review is withdrawn from the record but never deleted — the reason is kept in the audit trail."
        placeholder="e.g. Recorded against the wrong patient, duplicate entry…"
        confirmLabel="Remove review"
        destructive
        onConfirm={handleRemove}
      />
    </div>
  );
};

export default Glp1ReviewTable;
