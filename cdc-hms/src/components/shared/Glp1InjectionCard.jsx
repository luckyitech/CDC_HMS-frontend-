import { useState, useEffect, useCallback } from 'react';
import { Syringe } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGlp1Context } from '../../contexts/Glp1Context';
import Glp1DoseSchedule from '../doctor/Glp1DoseSchedule';

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
 */

const Glp1InjectionCard = ({ patient, onTherapyChange }) => {
  const {
    getTherapiesByPatient, getFullTherapy,
    recordAdministration, removeAdministration,
  } = useGlp1Context();

  const [therapy, setTherapy] = useState(null);
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(true);

  const uhid = patient?.uhid;

  const load = useCallback(async () => {
    if (!uhid) return;
    const list = await getTherapiesByPatient(uhid, { status: 'Active' });
    const live = list[0] || null;
    setTherapy(live);
    setDetail(live ? await getFullTherapy(live.id) : null);
    setLoading(false);
    // Tell triage whether this patient is on a GLP-1 — drives the
    // "patient won't see doctor" option
    onTherapyChange?.(live);
  }, [uhid, getTherapiesByPatient, getFullTherapy, onTherapyChange]);

  useEffect(() => { load(); }, [load]);

  if (loading || !therapy) return null;

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
