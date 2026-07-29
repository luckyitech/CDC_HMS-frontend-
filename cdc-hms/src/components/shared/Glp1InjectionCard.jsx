import { useState, useEffect, useCallback } from 'react';
import { Syringe, AlertCircle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGlp1Context } from '../../contexts/Glp1Context';
import Glp1DoseSchedule from '../doctor/Glp1DoseSchedule';
import Glp1ReviewDueBanner from './Glp1ReviewDueBanner';

/**
 * Glp1InjectionCard — the nurse's view in triage.
 *
 * Renders the SAME dose ladder the doctor uses (Glp1DoseSchedule), with plan
 * editing locked off but week-by-week recording open. One component, one set of
 * endpoints — a week the nurse records is the same row the doctor sees, so
 * there is no second place for injections to live and nothing to reconcile.
 *
 * Renders nothing when the patient has no live course, which is what gates the
 * injection-only path in triage: the doctor starting a course is what turns
 * this on.
 *
 * Also carries the review warning. A course marks certain weeks as ones the
 * doctor means to SEE the patient on; the nurse is the one deciding whether a
 * doctor is involved, so that has to be visible here and not only in the
 * doctor's tracker.
 *
 * onTherapyChange(therapy, reviewStatus) reports both up to triage, which uses
 * them to qualify the "patient won't see doctor" option.
 */

const Glp1InjectionCard = ({ patient, onTherapyChange }) => {
  const { loadActiveTherapy, recordAdministration, removeAdministration } = useGlp1Context();

  const [therapy, setTherapy] = useState(null);
  const [detail, setDetail]   = useState(null);
  // First paint only. Never set back to true: load() also runs after every week
  // the nurse records, and blanking the card each time would collapse the dose
  // ladder they are working in.
  const [loading, setLoading] = useState(true);
  const [failed, setFailed]   = useState(false);
  const [busy, setBusy]       = useState(false);

  const uhid = patient?.uhid;

  const load = useCallback(async () => {
    if (!uhid) return;

    const { ok, therapy: live, detail: full } = await loadActiveTherapy(uhid);

    setFailed(!ok);
    setTherapy(ok ? live : null);
    setDetail(ok ? full : null);
    setLoading(false);

    // Tell triage whether this patient is on a GLP-1 and whether a review is
    // outstanding — drives the "patient won't see doctor" option and its
    // warning. A failed load reports null, which hides the option entirely and
    // leaves the nurse on the ordinary assign-a-doctor path: the safe way to be
    // wrong is to send the patient to a doctor, never to skip one.
    onTherapyChange?.(ok ? live : null, ok ? full?.reviewStatus ?? null : null);
  }, [uhid, loadActiveTherapy, onTherapyChange]);

  useEffect(() => { load(); }, [load]);

  // Retry is the only place that shows progress. load() itself stays free of
  // synchronous setState so the mount effect above cannot cascade renders.
  const handleRetry = async () => {
    setBusy(true);
    await load();
    setBusy(false);
  };

  if (loading) return null;

  // Silence here would read as "this patient has no GLP-1 course", which is the
  // one thing a failed load must not be mistaken for.
  if (failed) {
    return (
      <div className="flex items-start gap-3 bg-red-50 border border-red-300 rounded-xl px-4 py-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-900">
            Could not load this patient's GLP-1 record
          </p>
          <p className="text-xs text-red-800 mt-0.5">
            If they are on a weekly injection it cannot be recorded or checked until
            this loads. Try again, and assign a doctor if it keeps failing.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRetry}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-red-300 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100 disabled:opacity-50 transition-colors whitespace-nowrap flex-shrink-0"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
          {busy ? 'Trying…' : 'Try again'}
        </button>
      </div>
    );
  }

  if (!therapy) return null;

  const administrations = detail?.administrations || [];
  const lastGiven = [...administrations].reverse().find(a => a.status === 'given');

  // Same handlers the doctor's tracker uses, so both write identically
  const handleRecordWeek = async (payload) => {
    const result = await recordAdministration({ therapyId: therapy.id, ...payload });
    if (result.success) await load();
    else toast.error(result.message || 'Could not record the injection');
    return result;
  };

  const handleClearWeek = async (administration) => {
    const result = await removeAdministration(administration.id);
    if (result.success) {
      toast.success(`Week ${administration.weekNumber} cleared`);
      await load();
    } else {
      toast.error(result.message || 'Could not clear the week');
    }
    return result;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Syringe className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-gray-800">GLP-1 injection due</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
          {therapy.medication?.genericName}
        </span>
      </div>

      {/* Above the week tiles on purpose: the nurse should meet this before
          reading "week 8, 1.0 mg" and treating it as a routine injection. */}
      <Glp1ReviewDueBanner reviewStatus={detail?.reviewStatus} className="mb-4" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {[
          ['Week',       therapy.currentWeek ?? '—'],
          ['Dose due',   therapy.currentStep ? `${therapy.currentStep.dose} mg` : '—'],
          ['Started',    therapy.startDate],
          ['Last given', lastGiven ? `Week ${lastGiven.weekNumber}` : 'Not yet'],
        ].map(([label, value]) => (
          <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-sm text-gray-800">{value}</p>
          </div>
        ))}
      </div>

      {/* readOnly locks the plan (doctor's job); weeksReadOnly={false} opens
          week-by-week recording, including back-filling missed weeks */}
      <Glp1DoseSchedule
        schedule={therapy.doseSchedule || []}
        currentWeek={therapy.currentWeek}
        startDate={therapy.startDate}
        administrations={administrations}
        readOnly
        weeksReadOnly={false}
        onRecordWeek={handleRecordWeek}
        onClearWeek={handleClearWeek}
      />

      <p className="text-xs text-gray-400 mt-2">
        Click a step to open its weeks. Each week is assumed given — mark a week missed or omitted (a reason is asked) if it was not.
      </p>
    </div>
  );
};

export default Glp1InjectionCard;
