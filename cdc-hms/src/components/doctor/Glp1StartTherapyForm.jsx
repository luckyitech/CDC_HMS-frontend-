import { useState } from 'react';
import { ShieldAlert, X, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { numericVital, bpVital } from '../../utils/vitalsValues';

/**
 * Glp1StartTherapyForm — initiation, with the safety screen as a hard gate.
 *
 * The screen is not a formality. The API returns 422 unless every
 * contraindication question carries an explicit yes or no, and any positive
 * finding needs a written override reason. Its message names the finding, so it
 * is shown to the doctor verbatim rather than replaced with something generic.
 *
 * The client mirrors those rules only to disable the button early. The server
 * remains the authority.
 */

const QUESTIONS = [
  { key: 'pancreatitis', label: 'History of pancreatitis' },
  { key: 'mtcMen2',      label: 'Personal or family history of medullary thyroid carcinoma / MEN2' },
  { key: 'giHistory',    label: 'Significant GI disease (gastroparesis, IBD, prior GI surgery)' },
];

const YesNo = ({ value, onChange }) => (
  <div className="flex gap-1 flex-shrink-0">
    {[false, true].map(option => (
      <button
        key={String(option)}
        type="button"
        onClick={() => onChange(option)}
        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
          value === option
            ? option
              ? 'bg-red-100 text-red-800 border-red-300'
              : 'bg-green-100 text-green-800 border-green-300'
            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
        }`}
      >
        {option ? 'Yes' : 'No'}
      </button>
    ))}
  </div>
);

const ageFrom = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
};

const Glp1StartTherapyForm = ({ medication, patient, vitals, onStart, onCancel }) => {
  const age = ageFrom(patient?.dateOfBirth);

  // Mirrors utils/glp1Safety: unknown age errs towards asking
  const needsPregnancyTest =
    patient?.gender === 'Female' && (age === null || (age >= 12 && age <= 55));

  const [screen, setScreen] = useState({
    pancreatitis: null,
    mtcMen2: null,
    giHistory: null,
    pregnancyTest: needsPregnancyTest ? '' : 'not applicable',
    overrideReason: '',
  });

  const [form, setForm] = useState({
    indication:      'T2DM',
    startDate:       new Date().toISOString().slice(0, 10),
    startingDose:    '',
    targetDose:      '',
    otherConditions: '',
  });

  const [submitting, setSubmitting] = useState(false);

  /**
   * The dose ladder is built here at initiation — there is no stored clinic
   * default. The doctor states each dose, how many weeks the patient stays on
   * it, and which week the course starts at (non-zero when the patient
   * transferred in already on treatment).
   */
  const [startWeek, setStartWeek] = useState(0);
  const [rungs, setRungs] = useState([{ dose: '', weeks: 4, note: '' }]);

  const setRung = (i, key, value) =>
    setRungs(rs => rs.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  const addRung    = () => setRungs(rs => [...rs, { dose: '', weeks: 4, note: '' }]);
  const removeRung = (i) => setRungs(rs => rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs);

  // Preview of the ladder the rungs will produce — mirrors buildCustomSchedule
  // on the server, so the doctor sees the weeks before committing
  const rungPreview = (() => {
    let cursor = Number(startWeek) || 0;
    return rungs.map((r, i) => {
      const isLast  = i === rungs.length - 1;
      const weeks   = Number(r.weeks);
      const hasSpan = Number.isInteger(weeks) && weeks > 0;
      const from    = cursor;
      const to      = isLast && !hasSpan ? null : from + (hasSpan ? weeks : 4);
      if (to !== null) cursor = to;
      return { from, to, dose: r.dose };
    });
  })();

  const scheduleIncomplete = rungs.some(r => r.dose === '' || Number(r.dose) <= 0);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const answered = QUESTIONS.every(q => typeof screen[q.key] === 'boolean')
    && (!needsPregnancyTest || screen.pregnancyTest !== '');

  const concerns = [
    ...QUESTIONS.filter(q => screen[q.key] === true).map(q => q.label),
    ...(screen.pregnancyTest === 'positive' ? ['Positive pregnancy test'] : []),
    ...(age !== null && age < 18 ? [`Patient is under 18 (age ${age})`] : []),
  ];

  const overrideNeeded = concerns.length > 0;
  const canSubmit = answered
    && (!overrideNeeded || screen.overrideReason.trim())
    && !scheduleIncomplete;

  const handleSubmit = async () => {
    setSubmitting(true);

    const result = await onStart({
      // The agent is identified by name — it comes from the clinic catalogue
      medicationName:  medication.genericName,
      medicationBrand: medication.brandName || null,
      indication:   form.indication,
      startDate:    form.startDate,
      // The server builds a contiguous ladder from these rungs and derives the
      // monitoring weeks to match
      startWeek: Number(startWeek) || 0,
      rungs: rungs.map(r => ({
        dose:  Number(r.dose),
        weeks: Number(r.weeks) || null,
        note:  r.note?.trim() || null,
      })),
      startingDose: form.startingDose === '' ? null : Number(form.startingDose),
      targetDose:   form.targetDose === '' ? null : Number(form.targetDose),
      otherConditions: form.otherConditions || null,
      // Captured once at initiation and never recomputed.
      // Stored as numbers, not the unit-suffixed display strings triage returns.
      baseline: {
        weight:             numericVital(vitals?.weight) || null,
        bmi:                numericVital(vitals?.bmi) || null,
        waistCircumference: numericVital(vitals?.waistCircumference) || null,
        bp:                 bpVital(vitals?.bp) || null,
        heartRate:          numericVital(vitals?.heartRate) || null,
        hba1c:              numericVital(vitals?.hba1c) || null,
      },
      safetyScreen: {
        pancreatitis:   screen.pancreatitis,
        mtcMen2:        screen.mtcMen2,
        giHistory:      screen.giHistory,
        pregnancyTest:  screen.pregnancyTest || undefined,
        overrideReason: screen.overrideReason.trim() || undefined,
      },
    });

    setSubmitting(false);

    // A 422 is the safety screen refusing — show its message as written
    if (!result.success) toast.error(result.message || 'Could not start therapy');
  };

  return (
    <div className="space-y-5">
      <div className="border border-gray-200 rounded-lg p-4">
        {/* Back out without saving — a doctor who picked the wrong agent or
            the wrong regimen needs a way out that is visible before they have
            scrolled through the safety screen */}
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-800">
            Start {medication?.genericName}
            {medication?.brandName && <span className="text-gray-400 font-normal"> · {medication.brandName}</span>}
          </h4>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 px-2 py-1 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Indication</label>
            <select value={form.indication} onChange={set('indication')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option>T2DM</option>
              <option>Obesity</option>
              <option>Both</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start date</label>
            <input type="date" value={form.startDate} onChange={set('startDate')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Starting dose <span className="text-gray-400">(mg)</span></label>
            <input type="number" step="0.25" value={form.startingDose} onChange={set('startingDose')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Target dose <span className="text-gray-400">(mg)</span></label>
            <input type="number" step="0.25" value={form.targetDose} onChange={set('targetDose')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>

        {/* ── Dose ladder — built here; there is no stored clinic default ── */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <label className="block text-xs text-gray-500 mb-2">Dose ladder</label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Course starts at week</label>
              <input
                type="number" min="0" value={startWeek}
                onChange={e => setStartWeek(e.target.value)}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <span className="text-xs text-gray-400">
                Non-zero if the patient is continuing therapy started elsewhere
              </span>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400">
                  <th className="font-medium pb-1">Dose (mg)</th>
                  <th className="font-medium pb-1">Weeks at this dose</th>
                  <th className="font-medium pb-1">Note</th>
                  <th className="pb-1 w-8" />
                  <th className="font-medium pb-1 text-right">Covers</th>
                </tr>
              </thead>
              <tbody>
                {rungs.map((r, i) => (
                  <tr key={i}>
                    <td className="pr-2 py-0.5">
                      <input
                        type="number" step="0.05" min="0" value={r.dose}
                        onChange={e => setRung(i, 'dose', e.target.value)}
                        placeholder="mg"
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </td>
                    <td className="pr-2 py-0.5">
                      <input
                        type="number" min="1" value={r.weeks}
                        onChange={e => setRung(i, 'weeks', e.target.value)}
                        placeholder={i === rungs.length - 1 ? 'ongoing' : '4'}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </td>
                    <td className="pr-2 py-0.5">
                      <input
                        type="text" value={r.note}
                        onChange={e => setRung(i, 'note', e.target.value)}
                        placeholder="optional"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </td>
                    <td className="py-0.5">
                      {rungs.length > 1 && (
                        <button type="button" onClick={() => removeRung(i)}
                          className="p-1 text-gray-300 hover:text-red-600 rounded" title="Remove">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                    <td className="py-0.5 text-right text-xs text-gray-400 whitespace-nowrap">
                      {rungPreview[i]?.to === null
                        ? `wk ${rungPreview[i]?.from} onward`
                        : `wk ${rungPreview[i]?.from}–${rungPreview[i]?.to - 1}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button type="button" onClick={addRung}
              className="text-sm text-primary hover:underline">
              + Add dose step
            </button>

            <p className="text-xs text-gray-500">
              Leave the last step's weeks blank for an ongoing maintenance dose.
              Monitoring visits are set from these dose changes.
            </p>
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-xs text-gray-500 mb-1">Other conditions</label>
          <input type="text" value={form.otherConditions} onChange={set('otherConditions')}
            placeholder="Hypertension, dyslipidaemia"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>

        {vitals && (
          <p className="text-xs text-gray-500 mt-3">
            Baseline captured from triage: {vitals.weight ? `${vitals.weight} kg` : 'no weight'}
            {vitals.bmi ? `, BMI ${vitals.bmi}` : ''}
            {vitals.bp ? `, BP ${vitals.bp}` : ''}
            {vitals.hba1c ? `, HbA1c ${vitals.hba1c}%` : ''}
          </p>
        )}
      </div>

      {/* Safety screen — the hard gate */}
      <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <h4 className="font-semibold text-gray-800">Safety screen</h4>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Required</span>
        </div>

        <div className="space-y-2">
          {QUESTIONS.map(q => (
            <div key={q.key} className="flex items-start justify-between gap-3">
              <span className="text-sm text-gray-700">{q.label}</span>
              <YesNo value={screen[q.key]} onChange={v => setScreen({ ...screen, [q.key]: v })} />
            </div>
          ))}

          {needsPregnancyTest && (
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-amber-200">
              <span className="text-sm text-gray-700">Pregnancy test</span>
              <select
                value={screen.pregnancyTest}
                onChange={e => setScreen({ ...screen, pregnancyTest: e.target.value })}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">Select…</option>
                <option value="negative">Negative</option>
                <option value="positive">Positive</option>
                <option value="not applicable">Not applicable</option>
              </select>
            </div>
          )}
        </div>

        {overrideNeeded && (
          <div className="mt-3 pt-3 border-t border-amber-200">
            <p className="text-sm text-red-700 mb-2">
              This patient has {concerns.length === 1 ? 'a finding' : 'findings'} that {concerns.length === 1 ? 'requires' : 'require'} an explicit reason before therapy can be recorded:
            </p>
            <ul className="text-sm text-red-700 list-disc list-inside mb-2">
              {concerns.map(c => <li key={c}>{c}</li>)}
            </ul>
            <input
              type="text"
              value={screen.overrideReason}
              onChange={e => setScreen({ ...screen, overrideReason: e.target.value })}
              placeholder="Reason for proceeding"
              className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Stored with the therapy against your name, as answered today.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          title={!canSubmit ? 'Complete the safety screen first' : undefined}
        >
          {submitting ? 'Starting…' : 'Start therapy'}
        </button>
      </div>
    </div>
  );
};

export default Glp1StartTherapyForm;
