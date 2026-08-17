import { useState, Fragment } from 'react';
import { Check, X, Ban, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { impliedWeekStatus, groupNotesByWeek } from '../../utils/glp1Weeks';
import Glp1WeekNotes from '../shared/Glp1WeekNotes';

/**
 * Glp1WeekRows — the individual weeks inside one dose step.
 *
 * A step covering weeks 0–4 expands into weeks 0, 1, 2, 3, each with its own
 * control. This is what a weekly injection clinic needs: the ladder stays the
 * plan, and these rows record what happened.
 *
 * Assume-given, but only once a week is over. A past week with no record is
 * shown as Given (assumed) — the clinician acts only on the exceptions, marking
 * a week Missed or Omitted (each asks a reason and is stored). The current week
 * is Due: the injection may not have happened yet, and the clinic has the rest
 * of the week to log a miss before the week is presumed given. A future week is
 * Upcoming. Nothing is written for an assumed week; only a real event becomes a
 * row.
 *
 * A bounded step shows every one of its weeks, so a step labelled 52–58 lists
 * 52, 53 … 58 in full. Only the open-ended maintenance step, which would
 * otherwise run a year deep, folds its distant weeks away.
 */

const STATUS_STYLES = {
  given:   { label: 'Given',   className: 'bg-green-100 text-green-800 border-green-300' },
  missed:  { label: 'Missed',  className: 'bg-red-100 text-red-800 border-red-300' },
  omitted: { label: 'Omitted', className: 'bg-amber-100 text-amber-800 border-amber-300' },
};

// How many weeks to show before collapsing the rest into a summary line, for the
// open-ended maintenance step only. A bounded step is shown in full.
const RECENT_WEEKS = 6;

const Glp1WeekRows = ({
  step, startDate, currentWeek,
  administrations = [], readOnly, onRecord, onUndo,
  weekNotes = [], onAddNote, onRemoveNote,
}) => {
  const [pending, setPending] = useState(null);   // { week, status } awaiting a reason
  const [note, setNote]       = useState('');
  const [saving, setSaving]   = useState(false);
  const [showAll, setShowAll] = useState(false);

  const byWeek = new Map(administrations.map(a => [a.weekNumber, a]));
  // A week has one administration but any number of notes — hence a Map of lists
  const notesByWeek = groupNotesByWeek(weekNotes);

  const isOpenEnded = step.toWeek === null;
  // An open-ended final step has no natural end; show a year's worth
  const lastWeek = isOpenEnded ? step.fromWeek + 52 : step.toWeek;
  const allWeeks = [];
  for (let w = step.fromWeek; w < lastWeek; w += 1) allWeeks.push(w);

  // A bounded step is shown whole. Only the open-ended step collapses its
  // distant weeks, so recording today's injection needs no scrolling.
  const collapsible = isOpenEnded;

  let weeks = allWeeks;
  let earlier = [];
  if (collapsible) {
    const upToNow = currentWeek == null ? allWeeks : allWeeks.filter(w => w <= currentWeek + 1);
    const hidden  = Math.max(0, upToNow.length - RECENT_WEEKS);
    weeks   = showAll ? allWeeks : upToNow.slice(-RECENT_WEEKS);
    earlier = upToNow.slice(0, hidden);
  }

  // Summary of the folded-away weeks — read through the same status helper as
  // the visible rows, so an un-recorded past week counts as given here too
  const tally = earlier.reduce((acc, w) => {
    const status = impliedWeekStatus(w, currentWeek, byWeek.get(w));
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
      // The actual day it was given — not the week's scheduled date. weekNumber
      // already records which week this is; administeredDate is what the visit
      // history dates the injection by, so it must be today.
      administeredDate: status === 'given' ? new Date().toISOString().slice(0, 10) : null,
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
      {/* Earlier weeks of an open-ended step, folded away with their outcome */}
      {collapsible && !showAll && earlier.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full flex flex-wrap items-center gap-2 px-1 py-1.5 mb-1 text-xs text-gray-500 hover:text-gray-700 border-b border-gray-200"
        >
          <span className="font-medium">
            Weeks {earlier[0]}–{earlier[earlier.length - 1]}
          </span>
          {tally.given   > 0 && <span className="text-green-700">{tally.given} given</span>}
          {tally.missed  > 0 && <span className="text-red-600">{tally.missed} missed</span>}
          {tally.omitted > 0 && <span className="text-amber-700">{tally.omitted} omitted</span>}
          <span className="ml-auto underline">Show all</span>
        </button>
      )}

      <table className="w-full text-sm">
        <tbody>
          {weeks.map(week => {
            const record    = byWeek.get(week);
            const status    = impliedWeekStatus(week, currentWeek, record);
            const assumed   = !record && status === 'given';   // past, no record
            const due       = !record && status === 'due';     // this week, awaiting
            const isPending = pending?.week === week;
            const isNow     = currentWeek != null && week === currentWeek;
            const style     = record ? STATUS_STYLES[record.status] : null;
            const canAct    = assumed || due;                  // recordable weeks

            const notes = notesByWeek.get(week) || [];
            // Notes appear wherever they were written; the composer is offered
            // on the current week only — that is the visit the clinician is in,
            // and an Add button on all six rows of a step is just noise.
            const showThread = notes.length > 0 || (!readOnly && isNow);

            return (
              <Fragment key={week}>
              <tr className={`${showThread ? '' : 'border-b border-gray-100 last:border-0'} ${isNow ? 'bg-blue-50' : ''}`}>
                <td className={`py-1.5 pr-3 w-20 ${isNow ? 'text-primary font-medium' : 'text-gray-600'}`}>
                  Week {week}
                </td>
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
                        placeholder={pending.status === 'missed' ? 'Why was it missed?' : 'Why was it omitted?'}
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
                  ) : due ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-blue-50 text-primary border-blue-200">
                        Due
                      </span>
                      {isNow && <span className="text-xs text-gray-400">this week</span>}
                    </div>
                  ) : assumed ? (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES.given.className}`}>
                        Given
                      </span>
                      <span className="text-xs text-gray-400 italic">assumed</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300">Upcoming</span>
                  )}
                </td>

                <td className="py-1.5 text-right whitespace-nowrap w-44">
                  {readOnly ? null : record ? (
                    <button type="button"
                      onClick={() => onUndo(record)}
                      className="p-1 text-gray-300 hover:text-gray-600 hover:bg-blue-50 rounded"
                      title="Clear this week"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                  ) : canAct && !isPending ? (
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => handleClick(week, 'given')} disabled={saving}
                        className="p-1 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded"
                        title={due ? 'Given' : 'Confirm given'}>
                        <Check className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => handleClick(week, 'missed')}
                        className="p-1 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded" title="Missed">
                        <X className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => handleClick(week, 'omitted')}
                        className="p-1 text-gray-400 hover:text-amber-700 hover:bg-amber-50 rounded" title="Omitted">
                        <Ban className="w-4 h-4" />
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>

              {showThread && (
                <tr className={`border-b border-gray-100 last:border-0 ${isNow ? 'bg-blue-50' : ''}`}>
                  <td colSpan={4} className="pb-2 pl-1">
                    <Glp1WeekNotes
                      weekNumber={week}
                      notes={notes}
                      readOnly={readOnly}
                      onAdd={onAddNote}
                      onRemove={onRemoveNote}
                    />
                  </td>
                </tr>
              )}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      {collapsible && showAll && (
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
