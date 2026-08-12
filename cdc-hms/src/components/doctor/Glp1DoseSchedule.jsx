import { useState, Fragment } from 'react';
import { Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronRight, ArrowLeftRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Glp1WeekRows from './Glp1WeekRows';
import { formatStepRange, lastWeekOf, toWeekFromLast, impliedWeekStatus, rechainFrom } from '../../utils/glp1Weeks';

/**
 * Glp1DoseSchedule — the patient's editable dose ladder.
 *
 * The whole ladder is sent to the server on every change, because a step is only
 * meaningful next to its neighbours: the API rejects gaps and overlaps as a set.
 * Edits here never touch the clinic default on the formulary row.
 *
 * Stored half-open (toWeek exclusive); displayed and edited closed (last
 * week inclusive). See utils/glp1Weeks — the only place that ±1 lives.
 */

const emptyStep = { fromWeek: '', toWeek: '', dose: '', note: '' };

const Glp1DoseSchedule = ({
  schedule = [],
  currentWeek,
  startDate,
  administrations = [],
  readOnly,          // plan editing — doctors only
  weeksReadOnly,     // week-by-week recording AND notes — nurses too
  onSave,
  onRecordWeek,
  onClearWeek,
  onSwitch,
  weekNotes = [],
  onAddNote,
  onRemoveNote,
}) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const [draft, setDraft]     = useState(emptyStep);
  const [adding, setAdding]   = useState(false);
  const [saving, setSaving]   = useState(false);
  // Which step is broken down into its individual weeks
  const [expanded, setExpanded] = useState(null);

  const isCurrent = (step) =>
    currentWeek !== null && currentWeek !== undefined &&
    currentWeek >= step.fromWeek && (step.toWeek === null || currentWeek < step.toWeek);

  const toPayload = (step) => ({
    fromWeek: Number(step.fromWeek),
    toWeek:   step.toWeek === '' || step.toWeek === null ? null : Number(step.toWeek),
    dose:     Number(step.dose),
    note:     step.note?.trim() ? step.note.trim() : null,
  });

  /**
   * The draft holds an INCLUSIVE last week, because that is how a clinician
   * reads a ladder. Convert to the exclusive toWeek the API stores as the draft
   * leaves the editor, so everything downstream is one consistent shape.
   */
  const draftToStep = () => ({
    fromWeek: draft.fromWeek,
    toWeek:   toWeekFromLast(draft.toWeek),
    dose:     draft.dose,
    note:     draft.note,
  });

  // Every mutation goes through the same path — one function, three callers.
  const commit = async (nextSchedule) => {
    setSaving(true);
    const result = await onSave(nextSchedule.map(toPayload));
    setSaving(false);

    if (!result.success) {
      // The server's message names the offending step — show it as written
      toast.error(result.message || 'Could not save the dose schedule');
      return false;
    }
    toast.success('Dose schedule updated');
    setEditingIndex(null);
    setAdding(false);
    setDraft(emptyStep);
    return true;
  };

  // Editing a step's range ripples through the later steps so they stay
  // contiguous — extend week 0–4 to 0–6 and the next step moves to 7 rather
  // than colliding at week 4. Steps before the edited one are left untouched.
  const handleSaveEdit = (index) => {
    const next = schedule.map((s, i) => (i === index ? draftToStep() : s));
    commit(rechainFrom(next, index));
  };

  const handleAdd = () => commit([...schedule, draftToStep()]);

  const handleDelete = (index) => {
    if (schedule.length === 1) {
      toast.error('A course needs at least one dose step');
      return;
    }
    // Close the gap the removed step leaves by re-chaining from the step before it
    const filtered = schedule.filter((_, i) => i !== index);
    commit(rechainFrom(filtered, Math.max(0, index - 1)));
  };

  const startEdit = (index) => {
    const step = schedule[index];
    setAdding(false);
    setEditingIndex(index);
    setDraft({
      fromWeek: step.fromWeek,
      // Inclusive last week for editing; converted back by draftToStep
      toWeek:   lastWeekOf(step) ?? '',
      dose:     step.dose,
      note:     step.note || '',
    });
  };

  const cancel = () => {
    setEditingIndex(null);
    setAdding(false);
    setDraft(emptyStep);
  };

  /**
   * The editable cells for a step.
   *
   * Deliberately a plain function called as {stepFields()}, NOT a component
   * declared here and rendered as a JSX tag. Declaring a component inline
   * gives it a new identity on every render, so React unmounts and remounts the
   * inputs on each keystroke — which drops focus after a single character.
   */
  const stepFields = () => (
    <>
      <td className="py-2 pr-2">
        <div className="flex items-center gap-1">
          <input
            type="number" min="0" value={draft.fromWeek}
            onChange={e => setDraft({ ...draft, fromWeek: e.target.value })}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
            placeholder="first"
            title="First week at this dose"
          />
          <span className="text-gray-400 text-xs">–</span>
          {/* Inclusive: the last week the patient is on this dose. The next
              step starts the week after. */}
          <input
            type="number" min="0" value={draft.toWeek}
            onChange={e => setDraft({ ...draft, toWeek: e.target.value })}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
            placeholder="last"
            title="Last week at this dose — leave blank to continue indefinitely"
          />
        </div>
      </td>
      <td className="py-2 pr-2">
        <input
          type="number" step="0.25" min="0" value={draft.dose}
          onChange={e => setDraft({ ...draft, dose: e.target.value })}
          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
          placeholder="mg"
        />
      </td>
      <td className="py-2 pr-2">
        <input
          type="text" value={draft.note}
          onChange={e => setDraft({ ...draft, note: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          placeholder="Note (optional)"
        />
      </td>
    </>
  );

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="font-medium py-2 pr-2 w-[30%]">Weeks <span className="font-normal text-gray-400">(inclusive)</span></th>
            <th className="font-medium py-2 pr-2 w-[18%]">Dose</th>
            <th className="font-medium py-2 pr-2">Note</th>
            {!readOnly && <th className="w-20" />}
          </tr>
        </thead>
        <tbody>
          {schedule.map((step, index) => {
            const current = isCurrent(step);

            if (editingIndex === index) {
              return (
                <tr key={index} className="border-b border-gray-100 bg-blue-50">
                  {stepFields()}
                  <td className="py-2 text-right whitespace-nowrap">
                    <button type="button" onClick={() => handleSaveEdit(index)} disabled={saving}
                      className="p-1 text-green-600 hover:bg-green-100 rounded" title="Save">
                      <Check className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={cancel} className="p-1 text-gray-400 hover:bg-gray-100 rounded" title="Cancel">
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            }

            const isExpanded = expanded === index;

            // Adherence for this step, read through the same week-status helper
            // as the expanded rows. A fully-elapsed week with no record counts
            // as given; the current week is still 'due' and is not counted until
            // it is over or explicitly recorded.
            const stepEnd = step.toWeek === null ? step.fromWeek + 52 : step.toWeek;
            const recByWeek = new Map(
              administrations
                .filter(a => a.weekNumber >= step.fromWeek && a.weekNumber < stepEnd)
                .map(a => [a.weekNumber, a])
            );
            let countedWeeks = 0;
            let givenCount = 0;
            for (let w = step.fromWeek; w < stepEnd; w += 1) {
              const st = impliedWeekStatus(w, currentWeek, recByWeek.get(w));
              if (st === 'upcoming' || st === 'due') continue;
              countedWeeks += 1;
              if (st === 'given') givenCount += 1;
            }
            const notGivenCount = countedWeeks - givenCount;

            return (
              <Fragment key={index}>
              <tr className={`border-b border-gray-100 ${current ? 'bg-blue-50' : ''}`}>
                <td className={`py-2 pr-2 ${current ? 'text-primary font-medium' : 'text-gray-700'}`}>
                  <button type="button"
                    onClick={() => setExpanded(isExpanded ? null : index)}
                    className="inline-flex items-center gap-1 hover:underline"
                    title="Show each week"
                  >
                    {isExpanded
                      ? <ChevronDown className="w-3.5 h-3.5" />
                      : <ChevronRight className="w-3.5 h-3.5" />}
                    {formatStepRange(step)}
                  </button>
                  {current && <span className="ml-2 text-xs font-normal">current</span>}
                  {countedWeeks > 0 && (
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      {givenCount}/{countedWeeks} given
                      {notGivenCount > 0 && <span className="text-red-600"> · {notGivenCount} not</span>}
                    </span>
                  )}
                </td>
                <td className={`py-2 pr-2 ${current ? 'text-primary font-medium' : 'text-gray-700'}`}>
                  {step.dose} mg
                </td>
                <td className="py-2 pr-2 text-gray-500">{step.note || ''}</td>
                {!readOnly && (
                  <td className="py-2 text-right whitespace-nowrap">
                    <button type="button" onClick={() => startEdit(index)}
                      className="p-1 text-gray-400 hover:text-primary hover:bg-gray-100 rounded" title="Edit step">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => handleDelete(index)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded" title="Remove step">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>

              {isExpanded && (
                <tr>
                  <td colSpan={readOnly ? 3 : 4} className="p-0">
                    <Glp1WeekRows
                      step={step}
                      startDate={startDate}
                      currentWeek={currentWeek}
                      administrations={administrations}
                      readOnly={weeksReadOnly ?? readOnly}
                      onRecord={onRecordWeek}
                      onUndo={onClearWeek}
                      weekNotes={weekNotes}
                      onAddNote={onAddNote}
                      onRemoveNote={onRemoveNote}
                    />
                  </td>
                </tr>
              )}
              </Fragment>
            );
          })}

          {adding && (
            <tr className="border-b border-gray-100 bg-blue-50">
              {stepFields()}
              <td className="py-2 text-right whitespace-nowrap">
                <button type="button" onClick={handleAdd} disabled={saving}
                  className="p-1 text-green-600 hover:bg-green-100 rounded" title="Add">
                  <Check className="w-4 h-4" />
                </button>
                <button type="button" onClick={cancel} className="p-1 text-gray-400 hover:bg-gray-100 rounded" title="Cancel">
                  <X className="w-4 h-4" />
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {!readOnly && !adding && editingIndex === null && (
        <div className="mt-2 flex items-center gap-4">
          <button type="button"
            onClick={() => { setAdding(true); setDraft(emptyStep); }}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Plus className="w-4 h-4" /> Add step
          </button>
          {onSwitch && (
            <button type="button"
              onClick={onSwitch}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary hover:underline"
            >
              <ArrowLeftRight className="w-4 h-4" /> Switch agent
            </button>
          )}
          <span className="text-xs text-gray-400">
            Click a step to record each week's injection
          </span>
        </div>
      )}
    </div>
  );
};

export default Glp1DoseSchedule;
