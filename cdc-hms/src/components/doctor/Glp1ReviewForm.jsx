import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { numericVital, bpVital } from '../../utils/vitalsValues';

/**
 * Glp1ReviewForm — records or amends one monitoring visit.
 *
 * Opens in place inside the monitoring table rather than as a modal, so the
 * previous weeks stay visible while the doctor types.
 *
 * On amendment a reason is required by the API every time, including on the day
 * the review was written. The original author is never overwritten.
 */

const SEVERITIES = ['none', 'mild', 'moderate', 'severe'];

const SEVERITY_STYLES = {
  none:     'bg-gray-100 text-gray-700 border-gray-300',
  mild:     'bg-amber-100 text-amber-800 border-amber-300',
  moderate: 'bg-orange-100 text-orange-800 border-orange-300',
  severe:   'bg-red-100 text-red-800 border-red-300',
};

const Field = ({ label, unit, ...props }) => (
  <div>
    <label className="block text-xs text-gray-500 mb-1">
      {label}{unit && <span className="text-gray-400"> ({unit})</span>}
    </label>
    <input {...props} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
  </div>
);

const Glp1ReviewForm = ({
  weekNumber,
  plannedWeeks = [],   // offered as suggestions in the week picker
  suggestedDose,
  vitals,            // triage vitals, used to prefill
  symptoms = [],
  existingReview,    // present when amending
  onSubmit,
  onCancel,
  onAddSymptom,
}) => {
  const isAmendment = !!existingReview;

  const [form, setForm] = useState(() => ({
    reviewDate:         existingReview?.reviewDate || new Date().toISOString().slice(0, 10),
    // Editable: patients rarely attend on the exact planned week, so the
    // doctor records the date they actually came and states which review
    // week it counts as.
    weekNumber:         existingReview?.weekNumber ?? weekNumber ?? '',
    // Auto-fill from triage on a new review; never overwrite what was recorded.
    // Triage values carry their units as text ("94.1 kg"), so they are stripped.
    weight:             existingReview?.weight             ?? numericVital(vitals?.weight),
    bmi:                existingReview?.bmi                ?? numericVital(vitals?.bmi),
    waistCircumference: existingReview?.waistCircumference ?? numericVital(vitals?.waistCircumference),
    bp:                 existingReview?.bp                 ?? bpVital(vitals?.bp),
    heartRate:          existingReview?.heartRate          ?? numericVital(vitals?.heartRate),
    // FPG has no home in PatientVital, so it is typed here
    fpg:                existingReview?.fpg   ?? '',
    hba1c:              existingReview?.hba1c ?? numericVital(vitals?.hba1c),
    doseAtReview:       existingReview?.doseAtReview ?? suggestedDose ?? '',
    adherence:          existingReview?.adherence  || 'Good',
    actionPlan:         existingReview?.actionPlan || '',
  }));

  const [gradings, setGradings] = useState(() => {
    const initial = {};
    (existingReview?.sideEffects || []).forEach(se => {
      initial[se.symptomId] = { severity: se.severity, note: se.note || '' };
    });
    return initial;
  });

  const [amendmentReason, setAmendmentReason] = useState('');
  const [newSymptom, setNewSymptom]           = useState('');
  const [addingSymptom, setAddingSymptom]     = useState(false);
  const [submitting, setSubmitting]           = useState(false);

  // Height is not recorded per review — it comes from triage and does not change
  const height = numericVital(vitals?.height);

  /**
   * BMI = weight / (height in metres)², the same calculation the triage
   * controller uses. Recomputed whenever weight changes so the two can never
   * disagree; typing over it by hand still wins.
   */
  const set = (key) => (e) => {
    const value = e.target.value;
    const next  = { ...form, [key]: value };

    if (key === 'weight' && height) {
      const weight = parseFloat(value);
      const metres = height / 100;
      next.bmi = Number.isFinite(weight) && weight > 0
        ? (weight / (metres * metres)).toFixed(1)
        : '';
    }

    setForm(next);
  };

  const grade = (symptomId, severity) => {
    setGradings(prev => ({
      ...prev,
      [symptomId]: { ...(prev[symptomId] || {}), severity },
    }));
  };

  /**
   * Accepts several symptoms at once — one per line, or comma separated.
   * A doctor describing what a patient reported rarely has exactly one thing to
   * add, and adding them one at a time is the kind of friction that stops people
   * recording anything at all.
   */
  const handleAddSymptom = async () => {
    const names = newSymptom
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(Boolean);

    if (!names.length) return;

    setAddingSymptom(true);

    const added = [];
    const failed = [];

    for (const name of names) {
      const result = await onAddSymptom(name);
      if (result.success) added.push(result.symptom.name);
      else failed.push(`${name} (${result.message})`);
    }

    if (added.length) {
      toast.success(
        added.length === 1
          ? `${added[0]} added to the symptom list`
          : `${added.length} symptoms added to the list`
      );
      setNewSymptom('');
      setAddingSymptom(false);
    }
    if (failed.length) toast.error(`Not added: ${failed.join('; ')}`);
  };

  const handleSubmit = async () => {
    if (isAmendment && !amendmentReason.trim()) {
      toast.error('A reason is required to amend a review');
      return;
    }
    if (!isAmendment && !Number.isInteger(Number(form.weekNumber))) {
      toast.error('Select which review week this visit counts as');
      return;
    }

    // Only send fields that carry a value — the API treats undefined as "leave alone"
    const numeric = (v) => (v === '' || v === null ? null : Number(v));

    const payload = {
      reviewDate:         form.reviewDate,
      weight:             numeric(form.weight),
      bmi:                numeric(form.bmi),
      waistCircumference: numeric(form.waistCircumference),
      bp:                 form.bp || null,
      heartRate:          numeric(form.heartRate),
      fpg:                numeric(form.fpg),
      hba1c:              numeric(form.hba1c),
      doseAtReview:       numeric(form.doseAtReview),
      adherence:          form.adherence,
      actionPlan:         form.actionPlan || null,
      sideEffects: Object.entries(gradings)
        .filter(([, g]) => g.severity)
        .map(([symptomId, g]) => ({
          symptomId: Number(symptomId),
          severity:  g.severity,
          note:      g.note?.trim() || null,
        })),
    };

    if (isAmendment) payload.amendmentReason = amendmentReason.trim();
    else payload.weekNumber = Number(form.weekNumber);

    setSubmitting(true);
    const result = await onSubmit(payload);
    setSubmitting(false);

    if (!result.success) toast.error(result.message || 'Could not save the review');
  };

  return (
    <div className="border border-blue-200 bg-blue-50/40 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-800">
          {isAmendment
            ? `Amend week ${existingReview.weekNumber} review`
            : 'Record a monitoring visit'}
        </h4>
        <button onClick={onCancel} className="p-1 text-gray-400 hover:bg-blue-50 rounded" title="Cancel">
          <X className="w-4 h-4" />
        </button>
      </div>

      {isAmendment && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Reason for amendment <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={amendmentReason}
            onChange={e => setAmendmentReason(e.target.value)}
            placeholder="Weight mistyped at the visit"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Recorded against your name alongside the original author. {existingReview.clinicianName} wrote this entry.
          </p>
        </div>
      )}

      {/* Date the patient actually attended, and which planned week it counts
          as — the two come apart whenever someone attends late or early */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Visit date" type="date" value={form.reviewDate} onChange={set('reviewDate')} />
        {!isAmendment && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Counts as week <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={form.weekNumber}
              onChange={set('weekNumber')}
              list="glp1-review-weeks"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <datalist id="glp1-review-weeks">
              {(plannedWeeks || []).map(w => <option key={w} value={w} />)}
            </datalist>
          </div>
        )}
        <Field label="Dose at review" unit="mg" type="number" step="0.25" value={form.doseAtReview} onChange={set('doseAtReview')} />
        <Field label="Weight" unit="kg" type="number" step="0.1" value={form.weight} onChange={set('weight')} />
        <Field
          label={height ? 'BMI (auto)' : 'BMI'}
          type="number" step="0.1" value={form.bmi} onChange={set('bmi')}
          title={height ? `Calculated from weight and height ${height} cm` : 'No height on record — type it in'}
        />
        <Field label="Waist" unit="cm" type="number" step="0.1" value={form.waistCircumference} onChange={set('waistCircumference')} />
        <Field label="BP" unit="mmHg" type="text" placeholder="128/80" value={form.bp} onChange={set('bp')} />
        <Field label="Heart rate" unit="bpm" type="number" value={form.heartRate} onChange={set('heartRate')} />
        <Field label="FBS" unit="mmol/L" type="number" step="0.1" value={form.fpg} onChange={set('fpg')} />
        <Field label="HbA1c" unit="%" type="number" step="0.1" value={form.hba1c} onChange={set('hba1c')} />
        <div>
          <label className="block text-xs text-gray-500 mb-1">Adherence</label>
          <select value={form.adherence} onChange={set('adherence')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option>Good</option>
            <option>Missed doses</option>
            <option>Stopped</option>
          </select>
        </div>
      </div>

      {/* Side effect grading — four buttons per symptom, same layout on mobile */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Side effects this visit</p>
        <div className="space-y-2">
          {symptoms.map(symptom => (
            <div key={symptom.id} className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-700 w-32 flex-shrink-0">{symptom.name}</span>
              <div className="flex gap-1">
                {SEVERITIES.map(severity => {
                  const selected = gradings[symptom.id]?.severity === severity;
                  return (
                    <button
                      key={severity}
                      type="button"
                      onClick={() => grade(symptom.id, severity)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        selected ? SEVERITY_STYLES[severity] : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {severity}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {addingSymptom ? (
          <div className="mt-3">
            <textarea
              rows={4}
              value={newSymptom}
              onChange={e => setNewSymptom(e.target.value)}
              placeholder={'Describe any other symptoms — one per line, or separated by commas.\n\nFatigue in the afternoons\nMetallic taste\nBurping'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              autoFocus
            />
            <div className="flex items-center gap-3 mt-2">
              <button onClick={handleAddSymptom}
                className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:opacity-90">
                Add to list
              </button>
              <button onClick={() => { setAddingSymptom(false); setNewSymptom(''); }}
                className="text-sm text-gray-400 hover:underline">Cancel</button>
              <span className="text-xs text-gray-400">
                Each one becomes gradeable here and for every other patient.
              </span>
            </div>
          </div>
        ) : (
          <>
            <button onClick={() => setAddingSymptom(true)}
              className="mt-3 flex items-center gap-1 text-sm text-primary hover:underline">
              <Plus className="w-4 h-4" /> Add symptom
            </button>
            <p className="text-xs text-gray-400 mt-1">Added symptoms become available for every patient.</p>
          </>
        )}
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Action plan</label>
        <textarea
          rows={2}
          value={form.actionPlan}
          onChange={set('actionPlan')}
          placeholder="Continue titration; review in 4 weeks"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-blue-50 rounded-lg">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : isAmendment ? 'Save amendment' : 'Save review'}
        </button>
      </div>
    </div>
  );
};

export default Glp1ReviewForm;
