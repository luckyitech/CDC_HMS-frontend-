import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, ShieldAlert, StopCircle, Plus, ArrowLeftRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGlp1Context } from '../../contexts/Glp1Context';
import { useUserContext } from '../../contexts/UserContext';
import Glp1DoseSchedule from './Glp1DoseSchedule';
import Glp1ReviewTable from './Glp1ReviewTable';
import ReasonModal from '../shared/ReasonModal';
import Glp1ReviewForm from './Glp1ReviewForm';
import Glp1SideEffectsPanel from './Glp1SideEffectsPanel';
import Glp1StartTherapyForm from './Glp1StartTherapyForm';
import Glp1SwitchModal from './Glp1SwitchModal';

/**
 * Glp1Tracker — container for the GLP-1 monitoring tool.
 *
 * Medication tabs come from the clinic formulary, not a hardcoded list, so an
 * agent added by an admin appears here for every patient without a code change.
 *
 * Opening a course costs ONE request: /glp1-therapies/:id/full returns the
 * therapy, its reviews and the weekly summary together.
 */

const Glp1Tracker = ({ patient, readOnly = false, onDirtyChange }) => {
  const {
    medications, symptoms,
    fetchMedications, fetchSymptoms, addSymptom,
    getTherapiesByPatient, getFullTherapy,
    startTherapy, updateSchedule, addReviewWeek, stopTherapy, switchMedication,
    recordAdministration, removeAdministration,
    addReview, amendReview, removeReview,
  } = useGlp1Context();

  const { currentUser } = useUserContext();

  const uhid   = patient?.uhid;
  const vitals = patient?.vitals || null;

  // Nurses record injections and monitoring visits. Starting, stopping,
  // switching agents and editing the ladder are prescribing decisions.
  const isDoctor = currentUser?.role === 'doctor';

  const [therapies, setTherapies]       = useState([]);
  const [activeMedName, setActiveMedName] = useState(null);
  const [detail, setDetail]             = useState(null);   // { therapy, reviews, summary }
  const [loading, setLoading]           = useState(true);
  const [starting, setStarting]         = useState(false);
  const [recordingWeek, setRecordingWeek] = useState(null);
  const [amending, setAmending]         = useState(null);
  const [switching, setSwitching]       = useState(false);
  const [stopping, setStopping]         = useState(false);

  // The course for the medication whose tab is selected. Agents are matched by
  // name — a therapy records its agent name, not a formulary id.
  const activeTherapy = therapies.find(
    t => t.medication?.genericName === activeMedName && ['Active', 'Paused'].includes(t.status)
  ) || therapies.find(t => t.medication?.genericName === activeMedName) || null;

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  const loadTherapies = useCallback(async () => {
    if (!uhid) return [];
    const list = await getTherapiesByPatient(uhid);
    setTherapies(list);
    return list;
  }, [uhid, getTherapiesByPatient]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const [meds, , list] = await Promise.all([
        fetchMedications(),
        fetchSymptoms(),
        uhid ? getTherapiesByPatient(uhid) : Promise.resolve([]),
      ]);
      if (cancelled) return;

      setTherapies(list);
      // Open on the agent the patient is actually on, else the first tab
      const live = list.find(t => ['Active', 'Paused'].includes(t.status));
      setActiveMedName(live?.medication?.genericName ?? meds[0]?.genericName ?? null);
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [uhid, fetchMedications, fetchSymptoms, getTherapiesByPatient]);

  // Pull the full record whenever the selected course changes
  useEffect(() => {
    let cancelled = false;

    if (!activeTherapy) {
      setDetail(null);
      return;
    }

    getFullTherapy(activeTherapy.id).then(data => {
      if (!cancelled) setDetail(data);
    });

    return () => { cancelled = true; };
  }, [activeTherapy?.id, getFullTherapy]);

  const refresh = async () => {
    const list = await loadTherapies();
    const current = list.find(t => t.id === activeTherapy?.id) || list.find(
      t => t.medication?.genericName === activeMedName
    );
    if (current) setDetail(await getFullTherapy(current.id));
  };

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleStart = async (payload) => {
    const result = await startTherapy({ uhid, ...payload });
    if (result.success) {
      toast.success('Therapy started');
      setStarting(false);
      await refresh();
    }
    return result;
  };

  const handleSaveSchedule = async (doseSchedule) => {
    const result = await updateSchedule(activeTherapy.id, doseSchedule);
    if (result.success) await refresh();
    return result;
  };

  const handleAddWeek = async (week) => {
    const result = await addReviewWeek(activeTherapy.id, week);
    if (result.success) await refresh();
    return result;
  };

  // One week's injection — given, missed or omitted
  const handleRecordWeek = async (payload) => {
    const result = await recordAdministration({ therapyId: activeTherapy.id, ...payload });
    if (result.success) await refresh();
    return result;
  };

  const handleClearWeek = async (administration) => {
    const result = await removeAdministration(administration.id);
    if (result.success) {
      toast.success(`Week ${administration.weekNumber} cleared`);
      await refresh();
    } else {
      toast.error(result.message || 'Could not clear the week');
    }
    return result;
  };

  const handleSwitch = async (payload) => {
    const result = await switchMedication(activeTherapy.id, payload);
    if (result.success) {
      toast.success(`Switched to ${result.therapy.medication?.genericName}`);
      setSwitching(false);
      // Follow the patient onto the new agent's tab
      setActiveMedName(result.therapy.medication?.genericName ?? activeMedName);
      await loadTherapies();
      setDetail(await getFullTherapy(result.therapy.id));
    }
    return result;
  };

  const handleRecord = async (payload) => {
    const result = await addReview({ therapyId: activeTherapy.id, ...payload });
    if (result.success) {
      toast.success(`Week ${payload.weekNumber} review recorded`);
      setRecordingWeek(null);
      onDirtyChange?.(false);
      await refresh();
    }
    return result;
  };

  const handleAmend = async (payload) => {
    const result = await amendReview(amending.id, payload);
    if (result.success) {
      toast.success('Review amended');
      setAmending(null);
      await refresh();
    }
    return result;
  };

  const handleRemoveReview = async (id, reason) => {
    const result = await removeReview(id, reason);
    if (result.success) await refresh();
    return result;
  };

  const handleStop = async (reason) => {
    const result = await stopTherapy(activeTherapy.id, reason);
    if (result.success) {
      toast.success('Course stopped');
      setStopping(false);
      await refresh();
    } else {
      toast.error(result.message || 'Could not stop the course');
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  if (!medications.length) {
    return (
      <p className="text-sm text-gray-500">
        No GLP-1 agents in the clinic catalogue yet. An administrator can add a
        medication tagged “GLP-1” or “GIP” on the Clinical Catalog page.
      </p>
    );
  }

  const activeMedication = medications.find(m => m.genericName === activeMedName);
  const therapy = detail?.therapy || activeTherapy;
  const courseLive = therapy && ['Active', 'Paused'].includes(therapy.status);
  // Recording what happened — open to nurses
  const canRecord = !readOnly && courseLive;
  // Changing the plan — doctors only
  const canPrescribe = canRecord && isDoctor;
  const canSwitch = canPrescribe;

  /**
   * Where this course actually begins, taken from the first rung of the ladder.
   *
   * A patient continuing treatment started elsewhere gets a ladder beginning at
   * the week they joined us — say week 16. Weeks before that belong to a
   * clinic we have no records from, so offering "record this visit" for week 4
   * invites a review of a period nobody here witnessed. Anything already
   * recorded is still shown: a real review is never hidden by a later edit.
   */
  const courseStartWeek = therapy?.doseSchedule?.[0]?.fromWeek ?? 0;

  const recordedWeeks = new Set((detail?.reviews || []).map(r => r.weekNumber));
  const visibleReviewWeeks = (therapy?.reviewWeeks || [])
    .filter(w => w >= courseStartWeek || recordedWeeks.has(w));

  return (
    <div className="space-y-5">
      {/* Medication tabs — GLP-1 agents from the clinic catalogue */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        {medications.map(med => {
          const selected = med.genericName === activeMedName;
          const onThis = therapies.some(
            t => t.medication?.genericName === med.genericName && ['Active', 'Paused'].includes(t.status)
          );
          return (
            <button
              key={med.id}
              onClick={() => { setActiveMedName(med.genericName); setStarting(false); setRecordingWeek(null); setAmending(null); }}
              className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
                selected
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {med.genericName}
              {onThis && <span className="ml-1.5 w-1.5 h-1.5 bg-green-500 rounded-full inline-block align-middle" title="Active course" />}
            </button>
          );
        })}
      </div>

      {/* No course on this agent yet */}
      {!therapy && !starting && (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500 mb-3">
            {patient?.firstName} is not on {activeMedication?.genericName}.
          </p>
          {!readOnly && isDoctor && (
            <button
              onClick={() => setStarting(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90"
            >
              <Plus className="w-4 h-4" /> Start {activeMedication?.genericName}
            </button>
          )}
        </div>
      )}

      {starting && (
        <Glp1StartTherapyForm
          medication={activeMedication}
          patient={patient}
          vitals={vitals}
          onStart={handleStart}
          onCancel={() => setStarting(false)}
        />
      )}

      {therapy && !starting && (
        <>
          {/* Course summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              ['Indication', therapy.indication],
              ['Started', therapy.startDate],
              ['Current week', therapy.currentWeek ?? '—'],
              ['Current dose', therapy.currentStep ? `${therapy.currentStep.dose} mg` : '—'],
            ].map(([label, value]) => (
              <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm text-gray-800">{value}</p>
              </div>
            ))}
          </div>

          {/* Safety screen — a fact about the record once cleared */}
          {therapy.safetyScreen && (
            <div className={`flex items-start gap-2 px-4 py-3 rounded-lg border ${
              therapy.safetyScreen.overrideReason
                ? 'bg-amber-50 border-amber-200'
                : 'bg-green-50 border-green-200'
            }`}>
              {therapy.safetyScreen.overrideReason
                ? <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                : <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />}
              <div className="text-sm min-w-0">
                {therapy.safetyScreen.overrideReason ? (
                  <>
                    <p className="text-amber-900">
                      Started despite: {(therapy.safetyScreen.concerns || []).join('; ')}
                    </p>
                    <p className="text-amber-800 mt-0.5">Reason: {therapy.safetyScreen.overrideReason}</p>
                  </>
                ) : (
                  <p className="text-green-800">
                    Safety screen cleared — no pancreatitis, no MTC/MEN2, no significant GI history.
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-0.5">
                  Screened {therapy.safetyScreen.screenedAt?.slice(0, 10)} · recorded by {therapy.doctorName}
                </p>
              </div>
            </div>
          )}

          {/* Switched from another agent — when it happened and why */}
          {therapy.switchedFrom && (
            <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
              <ArrowLeftRight className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm min-w-0">
                <p className="text-blue-900">
                  Switched from {therapy.switchedFrom.genericName} on {therapy.startDate}
                </p>
                {therapy.switchReason && (
                  <p className="text-blue-800 mt-0.5">{therapy.switchReason}</p>
                )}
                <p className="text-xs text-gray-500 mt-0.5">
                  That course ran from {therapy.switchedFrom.startedOn} and keeps its own history.
                </p>
              </div>
            </div>
          )}

          {/* Stopped course — what happened, and the ways back from here.
              The record below stays visible and read-only; restarting opens a
              fresh course rather than reviving this one, so the stopped period
              is preserved rather than written over. */}
          {therapy.status === 'Stopped' && (
            <div className="px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg">
              <div className="flex items-start gap-2">
                <StopCircle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm min-w-0 flex-1">
                  <p className="text-gray-800 font-medium">
                    Course stopped {therapy.stoppedAt?.slice(0, 10)}
                    {therapy.stoppedByName && ` by ${therapy.stoppedByName}`}
                  </p>
                  <p className="text-gray-600 mt-0.5">Reason: {therapy.stopReason}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Ran from {therapy.startDate}. The history below is kept and cannot be edited.
                  </p>
                </div>
              </div>

              {isDoctor && !readOnly && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setStarting(true)}
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:bg-blue-50 px-3 py-1.5 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                    Restart {therapy.medication?.genericName}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStarting(true)}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:bg-gray-200 px-3 py-1.5 rounded-lg"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    Start a different agent
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Dose schedule */}
          <section>
            <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              Dose schedule
              {therapy.regimenType === 'custom' && (
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  Custom regimen
                  {courseStartWeek > 0 && ` · from week ${courseStartWeek}`}
                </span>
              )}
            </h4>
            <Glp1DoseSchedule
              schedule={therapy.doseSchedule || []}
              currentWeek={therapy.currentWeek}
              startDate={therapy.startDate}
              administrations={detail?.administrations || []}
              readOnly={!canPrescribe}
              weeksReadOnly={!canRecord}
              onSave={handleSaveSchedule}
              onRecordWeek={handleRecordWeek}
              onClearWeek={handleClearWeek}
              onSwitch={canSwitch ? () => setSwitching(true) : null}
            />
          </section>

          {/* Monitoring visits */}
          <section>
            <h4 className="font-semibold text-gray-800 mb-2">Monitoring visits</h4>

            {recordingWeek !== null ? (
              <Glp1ReviewForm
                weekNumber={recordingWeek}
                plannedWeeks={visibleReviewWeeks}
                suggestedDose={therapy.currentStep?.dose}
                vitals={vitals}
                symptoms={symptoms}
                onSubmit={handleRecord}
                onCancel={() => { setRecordingWeek(null); onDirtyChange?.(false); }}
                onAddSymptom={addSymptom}
              />
            ) : amending ? (
              <Glp1ReviewForm
                existingReview={amending}
                symptoms={symptoms}
                onSubmit={handleAmend}
                onCancel={() => setAmending(null)}
                onAddSymptom={addSymptom}
              />
            ) : (
              <Glp1ReviewTable
                reviews={detail?.reviews || []}
                reviewWeeks={visibleReviewWeeks}
                currentWeek={therapy.currentWeek}
                readOnly={!canRecord}
                onRecord={(week) => { setRecordingWeek(week); onDirtyChange?.(true); }}
                onAmend={setAmending}
                onRemove={handleRemoveReview}
                onAddWeek={handleAddWeek}
              />
            )}
          </section>

          {/* Side effects — summary above, grading happens in the review form */}
          <section>
            <h4 className="font-semibold text-gray-800 mb-2">Side effects</h4>
            <Glp1SideEffectsPanel summary={detail?.summary} />
          </section>

          {canPrescribe && (
            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-gray-100">
              {/* Sending the patient for their injection is a routing decision,
                  so it lives in the Complete Consultation modal — not here,
                  where it would move the patient out of the doctor's queue
                  mid-consultation and block completion. */}
              <button
                type="button"
                onClick={() => setSwitching(true)}
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded-lg"
              >
                <ArrowLeftRight className="w-4 h-4" /> Switch agent
              </button>
              <button
                type="button"
                onClick={() => setStopping(true)}
                className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg"
              >
                <StopCircle className="w-4 h-4" /> Stop this course
              </button>
            </div>
          )}
        </>
      )}

      {switching && (
        <Glp1SwitchModal
          currentTherapy={therapy}
          medications={medications}
          onSwitch={handleSwitch}
          onClose={() => setSwitching(false)}
        />
      )}

      <ReasonModal
        isOpen={stopping}
        onClose={() => setStopping(false)}
        title={`Stop ${therapy?.medication?.genericName || 'this course'}`}
        message="The course stays in the record with everything already logged against it. You can start a new course afterwards."
        placeholder="e.g. Target weight reached, intolerable nausea, patient choice…"
        confirmLabel="Stop course"
        destructive
        onConfirm={handleStop}
      />
    </div>
  );
};

export default Glp1Tracker;
