import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Save, Plus, ChevronUp, Stethoscope, Target, FileEdit } from "lucide-react";
import Button from "../shared/Button";
import VoiceInput from "../shared/VoiceInput";
import { parseDiagnoses } from "../shared/DiagnosisInput";
import PhysicalExamList from "./PhysicalExamList";
import InitialAssessment from "../../pages/doctor/InitialAssessment";
import { useConsultationNotesContext } from "../../contexts/ConsultationNotesContext";
import { useTreatmentPlanContext } from "../../contexts/TreatmentPlanContext";

/**
 * ConsultationNotesPlan — the merged "Consultation Notes & Treatment Plan"
 * section of Today's Consultation.
 *
 * One inline form, one Save:
 *   - notes (VoiceInput)   → creates/updates TODAY's consultation note
 *   - treatment plan       → creates/updates TODAY's treatment plan
 * Diagnoses are NOT entered here — the summary panel's Diagnoses card is their
 * single home. The patient's ACTIVE tracked diagnoses (activeDiagnoses prop)
 * are shown read-only and auto-attached to the plan on save (the backend
 * requires a diagnosis on every plan).
 *
 * onSuccess() fires when a treatment plan is saved — the parent uses it to mark
 * the required step complete.
 */
const ConsultationNotesPlan = ({ patient, currentUser, activeDiagnoses = [], onSuccess = () => {}, notesRef = null }) => {
  const { getNotesByPatient, addNote, updateNote } = useConsultationNotesContext();
  const { getPlansByPatient, addTreatmentPlan, updateTreatmentPlan } = useTreatmentPlanContext();

  const [notesText, setNotesText]   = useState("");
  // Expose the live (unsaved) note text to the parent so the Admit modal can
  // pre-fill the admission note without lifting this component's state.
  useEffect(() => { if (notesRef) notesRef.current = notesText; }, [notesText, notesRef]);
  const [todayNote, setTodayNote]   = useState(null);
  const [planText, setPlanText]     = useState("");
  const [todayPlan, setTodayPlan]   = useState(null);
  const [saving, setSaving]         = useState(false);
  // Optional blocks — single-open accordion: opening one collapses the other
  // two. Collapsed work is never lost: the assessment stays MOUNTED (only
  // CSS-hidden) so its form state survives, the physical exam auto-drafts to
  // localStorage, and the plan text lives right here in this component.
  // The plan block auto-opens when today's plan already exists.
  const [openTool, setOpenTool] = useState(null); // 'assessment' | 'exam' | 'plan' | null
  const [assessmentTouched, setAssessmentTouched] = useState(false);
  const showAssessment = openTool === "assessment";
  const showExam       = openTool === "exam";
  const showPlan       = openTool === "plan";
  const toggleTool = (tool) => {
    if (tool === "assessment") setAssessmentTouched(true);
    setOpenTool((t) => (t === tool ? null : tool));
  };

  // Active tracked diagnoses → the plan's diagnosis payload ({code, description}[])
  const diagnosisPayload = activeDiagnoses.map((d) => ({
    code: d.code || "",
    description: d.diagnosis,
  }));

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Prefill from today's existing note + plan
  useEffect(() => {
    if (!patient?.uhid) return;
    let live = true;

    (async () => {
      try {
        const { notes } = await getNotesByPatient(patient.uhid);
        const note = (Array.isArray(notes) ? notes : []).find((n) => n.date === today);
        if (live && note) {
          setTodayNote(note);
          setNotesText(note.notes);
        }
      } catch { /* empty editor */ }

      try {
        const plans = await getPlansByPatient(patient.uhid);
        const plan = (Array.isArray(plans) ? plans : []).find(
          (p) => (p.date || p.createdAt || "").slice(0, 10) === today
        );
        if (live && plan) {
          setTodayPlan(plan);
          setPlanText(plan.plan || "");
          setOpenTool("plan");
        }
      } catch { /* empty form */ }
    })();

    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.uhid]);

  const handleSave = async () => {
    const hasNotes = notesText.trim().length > 0;
    // NOT gated on showPlan — with the single-open accordion the plan block may
    // be collapsed (e.g. exam open) while its text is written and unsaved.
    const hasPlan  = planText.trim().length > 0;

    if (!hasNotes && !hasPlan) {
      toast.error("Nothing to save yet — write notes or a treatment plan.", { duration: 3000, position: "top-right" });
      return;
    }
    // The backend requires a diagnosis on every plan — it comes from the
    // tracked list, so a plan needs at least one ACTIVE diagnosis there.
    if (hasPlan && diagnosisPayload.length === 0) {
      toast.error("Add a diagnosis in the Patient Summary panel first — the plan attaches to it.", {
        duration: 4000, position: "top-right",
      });
      return;
    }

    setSaving(true);
    try {
      let savedSomething = false;

      // ── Notes: create or update today's ─────────────────────────────────
      if (hasNotes) {
        if (todayNote) {
          if (notesText.trim() !== todayNote.notes.trim()) {
            const result = await updateNote(todayNote.id, { notes: notesText });
            if (result?.success) { setTodayNote(result.consultationNote); savedSomething = true; }
            else throw new Error("Failed to update the consultation note.");
          }
        } else {
          const newNote = await addNote({ uhid: patient.uhid, notes: notesText });
          if (newNote) { setTodayNote(newNote); savedSomething = true; }
          else throw new Error("Failed to save the consultation note.");
        }
      }

      // ── Plan: create or update today's (diagnoses auto-attached) ─────────
      if (hasPlan) {
        const payload = {
          diagnosis: JSON.stringify(diagnosisPayload),
          plan: planText,
        };
        if (todayPlan) {
          const changed =
            JSON.stringify(parseDiagnoses(todayPlan.diagnosis)) !== payload.diagnosis ||
            (todayPlan.plan || "").trim() !== planText.trim();
          if (changed) {
            const updated = await updateTreatmentPlan(todayPlan.id, payload);
            if (updated?.success) { setTodayPlan(updated.treatmentPlan || { ...todayPlan, ...payload }); savedSomething = true; }
            else throw new Error("Failed to update the treatment plan.");
          }
          onSuccess();
        } else {
          const created = await addTreatmentPlan({
            uhid: patient.uhid,
            patientName: patient.name,
            doctorName: currentUser?.name || "Doctor",
            ...payload,
          });
          if (created) { setTodayPlan(created); savedSomething = true; onSuccess(); }
          else throw new Error("Failed to save the treatment plan.");
        }
      }

      toast.success(savedSomething ? "✅ Saved" : "Already up to date", { duration: 2000, position: "top-right" });
    } catch (e) {
      toast.error(e.message || "Save failed. Please try again.", { duration: 3000, position: "top-right" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* Consultation notes */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Consultation Notes
        </label>
        <VoiceInput
          value={notesText}
          onChange={(e) => setNotesText(e.target.value)}
          placeholder="Document your clinical impression, reasoning, differential diagnoses, concerns about compliance, or any other observations..."
          rows={6}
        />
      </div>

      {/* Diagnoses are neither entered nor shown here — the summary panel's
          Diagnoses card is their home. Active ones still auto-attach to the
          plan on save (backend requires a diagnosis per plan). */}

      {/* Optional blocks — click to add. Order: Assessment | Physical Exam | Treatment Plan */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => toggleTool("assessment")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg border transition-colors ${
            showAssessment
              ? "bg-primary text-white border-primary"
              : "text-primary border-primary hover:bg-blue-50"
          }`}
        >
          {showAssessment ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <FileEdit className="w-4 h-4" />
          {showAssessment ? "Hide Assessment" : "Add Assessment"}
        </button>
        <button
          onClick={() => toggleTool("exam")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg border transition-colors ${
            showExam
              ? "bg-primary text-white border-primary"
              : "text-primary border-primary hover:bg-blue-50"
          }`}
        >
          {showExam ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <Stethoscope className="w-4 h-4" />
          {showExam ? "Hide Physical Exam" : "Add Physical Exam"}
        </button>
        <button
          onClick={() => toggleTool("plan")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg border transition-colors ${
            showPlan
              ? "bg-primary text-white border-primary"
              : "text-primary border-primary hover:bg-blue-50"
          }`}
        >
          {showPlan ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <Target className="w-4 h-4" />
          {showPlan ? "Hide Treatment Plan" : "Add Treatment Plan"}
        </button>
      </div>

      {/* Assessment — optional; opens straight into its form (own save flow).
          Once opened it stays mounted, only CSS-hidden when another tool is
          open — so half-written history is preserved across switches. */}
      {assessmentTouched && (
        <div className={`border-t border-gray-100 pt-4 ${showAssessment ? "" : "hidden"}`}>
          <InitialAssessment uhid={patient.uhid} embedded={true} />
        </div>
      )}

      {/* Physical exam — optional; has its own structured entry + save flow.
          Unmounts on collapse — safe, it auto-drafts to localStorage. */}
      {showExam && (
        <div className="border-t border-gray-100 pt-4">
          <PhysicalExamList
            patient={patient}
            embedded={true}
            autoStart
            onSaved={() => setOpenTool(null)}
          />
        </div>
      )}

      {/* Treatment plan — optional */}
      {showPlan && (
        <div className="border-t border-gray-100 pt-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Treatment Plan
          </label>
          <VoiceInput
            value={planText}
            onChange={(e) => setPlanText(e.target.value)}
            placeholder="Medications, lifestyle guidance, titration, follow-up interval..."
            rows={5}
          />
        </div>
      )}

      {/* One save for everything */}
      <div className="flex items-center justify-between gap-3 pt-1">
        {(todayNote || todayPlan) ? (
          <p className="text-xs text-gray-400">
            {todayPlan ? "Plan" : ""}{todayPlan && todayNote ? " & " : ""}{todayNote ? "note" : ""} saved today — saving again updates them.
          </p>
        ) : <span />}
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          <Save size={16} />
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

    </div>
  );
};

export default ConsultationNotesPlan;
