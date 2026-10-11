import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { Save } from "lucide-react";
import Button from "../shared/Button";
import VoiceInput from "../shared/VoiceInput";
import { parseDiagnoses } from "../shared/DiagnosisInput";
import { useTreatmentPlanContext } from "../../contexts/TreatmentPlanContext";
import { localToday, findThisVisitsRecord } from "../../utils/dateUtils";
import useDraft from "../../hooks/useDraft";
import { DraftStatus, DraftRestoreBanner } from "../shared/DraftStatus";
import { LEGACY_PLAN_RESTORE, takeLegacyPlan } from "../../utils/legacyNotesDraft";

/**
 * TreatmentPlanModule — the "Treatment plan" module of Today's Consultation
 * (split from the old combined notes + plan section, 10 Oct 2026, plan M5).
 *
 * Its own Save and its own autosave draft ('treatment-plan' = { plan }). Save
 * creates or updates THIS VISIT's treatment plan (this doctor, today, at/after
 * this queue row's check-in). The patient's ACTIVE diagnoses from Diagnosis &
 * differentials are attached on save — the backend requires a diagnosis on
 * every plan — and are named under the box so the doctor sees what the plan
 * hangs on.
 *
 * Props: patient, currentUser, activeDiagnoses, visitStartedAt,
 *        onSuccess()          — a plan was saved this visit
 *        onSavedChange(bool)  — this visit has a saved plan
 */
const TreatmentPlanModule = ({ patient, currentUser, activeDiagnoses = [], visitStartedAt = null, onSuccess = () => {}, onSavedChange = () => {} }) => {
  const { getPlansByPatient, addTreatmentPlan, updateTreatmentPlan } = useTreatmentPlanContext();

  const [planText, setPlanText] = useState("");
  const livePlan = useRef("");
  useEffect(() => { livePlan.current = planText; }, [planText]);
  const [todayPlan, setTodayPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [recordLoaded, setRecordLoaded] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => { onSavedChange(!!todayPlan); }, [todayPlan, onSavedChange]);

  const diagnosisPayload = activeDiagnoses.map((d) => ({ code: d.code || "", description: d.diagnosis }));
  const today = localToday();

  useEffect(() => {
    if (!patient?.uhid) return;
    let live = true;
    setRecordLoaded(false);
    (async () => {
      try {
        const plans = await getPlansByPatient(patient.uhid);
        const plan = findThisVisitsRecord(plans, { today, doctorId: currentUser?.id, visitStartedAt });
        if (live && plan) {
          setTodayPlan(plan);
          if (!livePlan.current.trim()) setPlanText(plan.plan || "");
        } else if (live) {
          setTodayPlan(null);
        }
      } catch { /* empty form */ }
      if (live) setRecordLoaded(true);
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.uhid, visitStartedAt]);

  // Plan text from an old combined notes + plan draft (restored by the notes
  // module) — added after what is already here, never saved by itself.
  useEffect(() => {
    if (!patient?.uhid) return undefined;
    const take = () => {
      const t = takeLegacyPlan(patient.uhid);
      if (t) setPlanText((cur) => (cur.trim() ? `${cur.replace(/\s+$/, "")}\n\n${t}` : t));
    };
    take();
    const onRestore = (e) => { if (e.detail?.uhid === patient.uhid) take(); };
    window.addEventListener(LEGACY_PLAN_RESTORE, onRestore);
    return () => window.removeEventListener(LEGACY_PLAN_RESTORE, onRestore);
  }, [patient?.uhid]);

  const draft = useDraft({
    uhid: patient?.uhid,
    formKey: "treatment-plan",
    value: { plan: planText },
    baseline: { plan: todayPlan?.plan || "" },
    enabled: recordLoaded,
    onRestore: (p) => setPlanText(p?.plan || ""),
    onDiscard: () => setPlanText(todayPlan?.plan || ""),
    saveNow: () => handleSave(),
    open: () => rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
  });

  const handleSave = async () => {
    if (!planText.trim()) {
      toast.error("Nothing to save yet — write the treatment plan first.", { duration: 3000, position: "top-right" });
      return false;
    }
    if (diagnosisPayload.length === 0) {
      toast.error("Add a diagnosis in Diagnosis & differentials first — the plan attaches to it.", { duration: 4000, position: "top-right" });
      return false;
    }
    setSaving(true);
    try {
      let savedSomething = false;
      const payload = { diagnosis: JSON.stringify(diagnosisPayload), plan: planText };
      if (todayPlan) {
        const changed =
          JSON.stringify(parseDiagnoses(todayPlan.diagnosis)) !== payload.diagnosis ||
          (todayPlan.plan || "").trim() !== planText.trim();
        if (changed) {
          const updated = await updateTreatmentPlan(todayPlan.id, payload);
          if (updated?.success) { setTodayPlan(updated.treatmentPlan || { ...todayPlan, ...payload }); savedSomething = true; }
          else throw new Error("Failed to update the treatment plan.");
        }
      } else {
        const created = await addTreatmentPlan({
          uhid: patient.uhid,
          patientName: patient.name,
          doctorName: currentUser?.name || "Doctor",
          ...payload,
        });
        if (created) { setTodayPlan(created); savedSomething = true; }
        else throw new Error("Failed to save the treatment plan.");
      }
      onSuccess();
      toast.success(savedSomething ? "✅ Plan saved" : "Already up to date", { duration: 2000, position: "top-right" });
      draft.markSaved();
      return true;
    } catch (e) {
      toast.error(e.message || "Save failed. Please try again.", { duration: 3000, position: "top-right" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4" ref={rootRef}>
      <DraftRestoreBanner draft={draft} />
      <VoiceInput
        value={planText}
        onChange={(e) => setPlanText(e.target.value)}
        placeholder="Medications, lifestyle guidance, titration, follow-up interval..."
        rows={5}
      />
      <p className={`m-0 text-xs ${diagnosisPayload.length ? "text-gray-500" : "text-amber-700"}`}>
        {diagnosisPayload.length
          ? <>Attaches to: {activeDiagnoses.map((d) => d.diagnosis).join(" · ")}</>
          : "No active diagnosis yet — add one in Diagnosis & differentials before saving the plan."}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <DraftStatus draft={draft} />
          {todayPlan && <p className="text-xs text-gray-400">Plan saved this visit — saving again updates it.</p>}
        </div>
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          <Save size={16} />
          {saving ? "Saving…" : "Save plan"}
        </Button>
      </div>
    </div>
  );
};

export default TreatmentPlanModule;
