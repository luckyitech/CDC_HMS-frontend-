import { useState } from 'react';
import { Check, X, Clock, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Glp1WeekRows — the individual weeks inside one dose step.
 *
 * A step covering weeks 0–4 expands into weeks 0, 1, 2, 3, each with its own
 * given / missed / deferred control. This is what a weekly injection clinic
 * needs: the ladder stays the plan, and these rows record what happened.
 *
 * A week with no record is simply blank — not yet recorded is a different thing
 * from missed, and the difference matters.
 */

const STATUS_STYLES = {
  given:    { label: 'Given',    className: 'bg-green-100 text-green-800 border-green-300' },
  missed:   { label: 'Missed',   className: 'bg-red-100 text-red-800 border-red-300' },
  deferred: { label: 'Deferred', className: 'bg-amber-100 text-amber-800 border-amber-300' },
};

// How many weeks to show before collapsing the rest into a summary line. An
// open-ended step spans a year, and a nurse recording today's injection should
// not have to scroll past 50 future weeks to reach it.
const RECENT_WEEKS = 6;

const Glp1WeekRows = ({ step, startDate, currentWeek, administrations = [], readOnly, onRecord, onUndo }) => {
  const [pending, setPending] = useState(null);   // { week, status } awaiting a reason
  const [note, setNote]       = useState('');
  const [saving, setSaving]   = useState(false);
  const [showAll, setShowAll] = useState(false);

  const byWeek = new Map(administrations.map(a => [a.weekNumber, a]));

  // An open-ended final step has no natural end; show a year's worth
  const lastWeek = step.toWeek === null ? step.fromWeek + 52 : step.toWeek;
  const allWeeks = [];
  for (let w = step.fromWeek; w < lastWeek; w += 1) allWeeks.push(w);

  // Weeks that have actually come around — anything past next week is not yet
  // relevant and only gets in the way
  const upToNow = currentWeek == null
    ? allWeeks
    : allWeeks.filter(w => w <= currentWeek + 1);

  const hidden  = Math.max(0, upToNow.length - RECENT_WEEKS);
  const weeks   = showAll ? allWeeks : upToNow.slice(-RECENT_WEEKS);

  // Summary of the weeks folded away above
  const earlier = upToNow.slice(0, hidden);
  const tally   = earlier.reduce((acc, w) => {
    const status = byWeek.get(w)?.status || 'unrecorded';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // The date this week's injection was due, derived from the course start
  const dueDate = (week) => {
    if (!startDate) return null;
    const d = new Date(startDate);
    if (Number.isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + week * 7);
    return d.toISOString().slice(0, 10);
  };

  const submit = async (week, status, reason) => {
    setSaving(true);
    const result = await onRecord({
      weekNumber:       week,
      status,
      administeredDate: status === 'given' ? dueDate(week) : null,
      dose:             step.dose,
      note:             reason || null,
    });
    setSaving(false);

    if (result.success) {
      toast.success(`Week ${week} marked ${status}`);
      setPending(null);
      setNote('');
    } else {
      toast.error(result.message || 'Could not record the week');
    }
  };

  // 'given' saves immediately; anything else needs a reason first
  const handleClick = (week, status) => {
    if (status === 'given') return submit(week, 'given');
    setPending({ week, status });
    setNote('');
  };

  return (
    <div className="bg-gray-50 border-t border-gray-200 px-3 py-2">
      {/* Earlier weeks, folded away with their outcome preserved */}
      {!showAll && hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full flex flex-wrap items-center gap-2 px-1 py-1.5 mb-1 text-xs text-gray-500 hover:text-gray-700 border-b border-gray-200"
        >
          <span className="font-medium">
            Weeks {earlier[0]}–{earlier[earlier.length - 1]}
          </span>
          {tally.given      > 0 && <span className="text-green-700">{tally.given} given</span>}
          {tally.missed     > 0 && <span className="text-red-600">{tally.missed} missed</span>}
          {tally.deferred   > 0 && <span className="text-amber-700">{tally.deferred} deferred</span>}
          {tally.unrecorded > 0 && <span className="text-gray-400">{tally.unrecorded} not recorded</span>}
          <span className="ml-auto underline">Show all</span>
        </button>
      )}

      <table className="w-full text-sm">
        <tbody>
          {weeks.map(week => {
            const record = byWeek.get(week);
            const style  = record ? STATUS_STYLES[record.status] : null;
            const isPending = pending?.week === week;

            return (
              <tr key={week} className="border-b border-gray-100 last:border-0">
                <td className="py-1.5 pr-3 w-20 text-gray-600">Week {week}</td>
                <td className="py-1.5 pr-3 w-28 text-gray-400 text-xs">{dueDate(week) || ''}</td>

                <td className="py-1.5 pr-3">
                  {record ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${style.className}`}>
                        {style.label}
                      </span>
                      {record.dose && <span className="text-xs text-gray-500">{record.dose} mg</span>}
                      {record.clinicianName && (
                        <span className="text-xs text-gray-400">{record.clinicianName}</span>
                      )}
                      {record.note && (
                        <span className="text-xs text-gray-500 italic">{record.note}</span>
                      )}
                    </div>
                  ) : isPending ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && note.trim() && submit(pending.week, pending.status, note.trim())}
                        placeholder={pending.status === 'missed' ? 'Why was it missed?' : 'Why deferred?'}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        autoFocus
                      />
                      <button type="button"
                        onClick={() => note.trim() ? submit(pending.week, pending.status, note.trim()) : toast.error('A reason is required')}
                        disabled={saving}
                        className="text-xs text-primary hover:underline"
                      >
                        Save
                      </button>
                      <button type="button" onClick={() => { setPending(null); setNote(''); }}
                        className="text-xs text-gray-400 hover:underline">Cancel</button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300">Not recorded</span>
                  )}
                </td>

                <td className="py-1.5 text-right whitespace-nowrap w-44">
                  {readOnly ? null : record ? (
                    <button type="button"
                      onClick={() => onUndo(record)}
                      className="p-1 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded"
                      title="Clear this week"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                  ) : !isPending && (
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => handleClick(week, 'given')} disabled={saving}
                        className="p-1 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded" title="Given">
                        <Check className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => handleClick(week, 'missed')}
                        className="p-1 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded" title="Missed">
                        <X className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => handleClick(week, 'deferred')}
                        className="p-1 text-gray-400 hover:text-amber-700 hover:bg-amber-50 rounded" title="Deferred">
                        <Clock className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {showAll && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="w-full pt-1.5 mt-1 text-xs text-gray-500 hover:text-gray-700 underline border-t border-gray-200"
        >
          Show recent weeks only
        </button>
      )}
    </div>
  );
};

export default Glp1WeekRows;
