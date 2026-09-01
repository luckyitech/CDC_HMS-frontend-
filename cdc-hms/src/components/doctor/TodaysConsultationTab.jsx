import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  AlertCircle,
  MessageSquare,
  Pill,
  UserCircle,
  X,
  Wrench,
  Syringe,
  ChevronUp,
  ChevronDown,
  Package,
  BedDouble,
  FlaskConical,
} from "lucide-react";
import toast from "react-hot-toast";
import Card from "../shared/Card";
import EditVitalsModal from "./EditVitalsModal";
import { useQueueContext } from "../../contexts/QueueContext";
import { useUserContext } from "../../contexts/UserContext";
import { usePrescriptionContext } from "../../contexts/PrescriptionContext";
import { useAppointmentContext } from "../../contexts/AppointmentContext";
import { useGlp1Context } from "../../contexts/Glp1Context";
import ReferPatientModal from "./ReferPatientModal";
import RecordUseModal from "../stock/RecordUseModal";
import AdmitPatientModal from "./AdmitPatientModal";
import { CHARGE_OPTIONS, PROCEDURE_OPTIONS } from "../../constants/billingOptions";
import { INJECTION_REASON, PENDING_INJECTION } from "../../utils/queueStatus";
import patientService from "../../services/patientService";
import inpatientService from "../../services/inpatientService";
import ConsultationNotesPlan from "./ConsultationNotesPlan";
import PrescriptionManagement from "./PrescriptionManagement";
import AccordionPanel from "../shared/AccordionPanel";
import SwitcherTabs from "../shared/SwitcherTabs";
import Glp1Kardex from "../shared/Glp1Kardex";
import LabRequest from "../shared/LabRequest";
import ConsultationSummaryContainer from "./ConsultationSummaryContainer";
import SummaryDock from "../shared/SummaryDock";
import { isToday } from "../../utils/dateUtils";

// ---------------------------------------------------------------------------
// Accordion section definitions for "Today's Consultation" tab
// ---------------------------------------------------------------------------
const ACCORDION_SECTIONS = [
  // Notes + Assessment + Physical Exam + Diagnosis & Treatment Plan merged into
  // ONE section. Assessment, exam and plan are optional click-to-add blocks
  // inside it. Keeps the id 'diagnosis' so completion gating, drafts and jumps
  // are unchanged.
  { id: 'diagnosis',     label: 'Notes',          icon: MessageSquare, required: true  },
  // 'prescriptions' is the Orders panel — a Prescriptions / Laboratory switcher.
  // Keeps the id so completion gating, the summary panel's "open meds" jump and
  // drafts are unchanged.
  { id: 'prescriptions', label: 'Orders',         icon: Pill,          required: false },
];

// NOTE: 'tools' is deliberately NOT in ACCORDION_SECTIONS — it renders as its
// own full-width panel between Consultation and Prescriptions.

// AccordionPanel, HistoryField, VisitSectionHeader — moved to shared components

// ---------------------------------------------------------------------------
// No open visit
// ---------------------------------------------------------------------------
// Refer, Admit and Complete all write to the patient's queue row, so all three
// need a visit that is still open (findQueueItem only matches OPEN_QUEUE_STATUSES).
// Once billing has taken over, the visit is 'Pending Billing' or 'Completed'
// and none of them can proceed.
//
// The copy used to read "Unable to load queue data — please refresh the page
// and try again", which described a loading failure that wasn't happening and
// sent people round a refresh loop that could never clear it. One message, one
// notice, stated as the rule it actually is.
const NO_OPEN_VISIT_MESSAGE =
  'This visit is already closed. Referral and admission can only be recorded during an open consultation.';

const NoOpenVisitNotice = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full text-center space-y-4">
      <p className="text-gray-700 font-medium">This visit is already closed.</p>
      <p className="text-sm text-gray-500">
        Referral and admission can only be recorded during an open consultation.
      </p>
      <button
        onClick={onClose}
        className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200"
      >
        Close
      </button>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// TodaysConsultationTab — the doctor's live "Today's Consultation" workspace,
// extracted from the old standalone Consultation page so it can be a tab inside
// the shared PatientFile (mirrors NursingActionsTab). The outer chrome — patient
// bar, overview panel, tab bar and the History/Diagnostics/Charts tabs — now
// belongs to PatientFile; only the consultation body, its action bar, summary
// panel and modals live here.
//
// Props:
//   patient    resolved patient object (PatientFile owns loading)
//   onRefresh  re-fetch the patient in PatientFile (after a vitals edit, etc.)
// ---------------------------------------------------------------------------
const TodaysConsultationTab = ({ patient, onRefresh = () => {}, overviewOpen = false }) => {
  const uhid = patient?.uhid;
  const navigate  = useNavigate();
  const DRAFT_KEY = `consultation_progress_${uhid}`;

  const { currentUser }                               = useUserContext();
  const { queue, sendToBilling, updateQueueStatus, referPatient } = useQueueContext();
  const { getPrescriptionsByPatient, addPrescription } = usePrescriptionContext();
  const { getWeekNotes }                              = useGlp1Context();
  const { getAvailableSlots, addAppointment }         = useAppointmentContext();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  // Live consultation note text, handed up from ConsultationNotesPlan so the
  // Admit modal can pre-fill the admission note.
  const notesTextRef = useRef('');
  // Patient summary drawer — mobile/tablet only (always visible ≥ xl)
  // Tracked diagnoses (summary panel is their single home). Active ones are
  // auto-attached to treatment plans; returning patients with an active
  // diagnosis don't re-enter one every visit.
  const [trackedDiagnoses, setTrackedDiagnoses] = useState([]);
  const activeDiagnoses = trackedDiagnoses.filter((d) => d.status === 'active');
  const hasActiveDx = activeDiagnoses.length > 0;

  // Only one accordion section open at a time (stores the open section id or null)
  const [openSections, setOpenSections] = useState(null);

  // Tab completion — only tracks the fields that gate the Complete button
  const [tabsCompleted, setTabsCompleted] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(`consultation_progress_${uhid}`) || '{}');
      return {
        diagnosis:     saved.diagnosis     || false,
        prescriptions: saved.prescriptions || false,
      };
    } catch {
      return { diagnosis: false, prescriptions: false };
    }
  });

  // Prescriptions feed the summary panel's Current Medications card
  const [patientPrescriptions, setPatientPrescriptions] = useState([]);

  // Visit History state lives in VisitHistoryPanel (shared component)

  // Modals
  // True while a GLP-1 review is part-typed, so the Tools header shows the
  // orange unsaved dot like every other section. Tools never gates Complete
  // Consultation — only Diagnosis does.
  const [toolsDirty, setToolsDirty] = useState(false);

  // Which tool inside the Tools card is open. GLP-1 is the only one so far.
  const [openTool, setOpenTool] = useState(null);
  // Orders panel switcher — Prescriptions | Laboratory.
  const [ordersTab, setOrdersTab] = useState('prescriptions');
  // How many GLP-1 week notes were written for this patient today — drives the
  // count on the collapsed tool header
  const [notesToday, setNotesToday] = useState(0);

  /**
   * The patient's live queue entry for today.
   *
   * 'With Doctor' is the normal case, but a patient sent to the nurse for an
   * injection sits in a triage status while the doctor still has the chart open.
   * Matching on any open status means the consultation can always be completed
   * — one helper, every caller.
   */
  const OPEN_QUEUE_STATUSES = [
    'With Doctor', 'Awaiting Doctor', 'Awaiting Triage', 'In Triage', PENDING_INJECTION,
  ];

  const findQueueItem = useCallback(
    () => queue.find(q => q.uhid === patient?.uhid && OPEN_QUEUE_STATUSES.includes(q.status)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queue, patient?.uhid]
  );

  const [showVitalsModal, setShowVitalsModal]       = useState(false);
  const [showReferModal, setShowReferModal]         = useState(false);
  // Point-of-care stock use mid-consultation ("I used a dressing pack").
  // Floating-bar button — deliberately NOT an accordion section (see the
  // ACCORDION_SECTIONS column-parity note). Open to all clinical roles.
  const [showRecordUse, setShowRecordUse]           = useState(false);
  const [showActions, setShowActions]               = useState(false);
  const actionsRef = useRef(null);
  // Close the Actions dropdown on an outside click. Deliberately NOT a
  // fixed inset-0 overlay — that sits outside <main> (the scroll container) and
  // swallows wheel events, freezing the page.
  useEffect(() => {
    if (!showActions) return undefined;
    const onDown = (e) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) setShowActions(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showActions]);
  const [showAdmitModal, setShowAdmitModal]         = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showBillingModal, setShowBillingModal]     = useState(false);
  // Billing modal serves three flows. 'complete' is the normal end-of-visit path;
  // 'admission' and 'referral' route the admit/refer actions through the SAME
  // billing entry so neither can skip it. billingContext carries the note/payload.
  const [billingMode, setBillingMode]               = useState('complete');
  const [billingContext, setBillingContext]         = useState(null);
  const [billingQueueItem, setBillingQueueItem]     = useState(null);
  const [selectedCharges, setSelectedCharges]       = useState([]);
  const [selectedProcedures, setSelectedProcedures] = useState([]);
  const [billingSubmitting, setBillingSubmitting]   = useState(false);
  // When set, the patient goes back to the nurse for their injection instead of
  // straight to billing. The charges picked here ride along and are merged when
  // the nurse finally sends them to billing.
  const [sendForInjection, setSendForInjection]     = useState(false);
  // Procedures list is collapsed by default — most visits bill none
  const [proceduresOpen, setProceduresOpen]         = useState(false);
  const [doctorNotes, setDoctorNotes]               = useState('');
  const [bookFollowUp, setBookFollowUp]             = useState(false);
  const [followUpDate, setFollowUpDate]             = useState('');
  const [followUpSlot, setFollowUpSlot]             = useState('');
  const [availableSlots, setAvailableSlots]         = useState([]);
  const [slotsReason,    setSlotsReason]             = useState(null);
  const [slotsLoading,   setSlotsLoading]            = useState(false);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  // Orange dot shown on accordion section headers when fields are dirty
  const tabsUnsaved = useMemo(() => ({
    tools: toolsDirty,
  }), [
    toolsDirty,
  ]);

  // visitDates — moved to VisitHistoryPanel (shared component)

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  /**
   * GLP-1 week notes the nurse left for this patient today.
   *
   * The tool that shows them is collapsed inside a collapsed Tools panel, so a
   * note written in triage is four clicks from being read and would simply be
   * missed. The count surfaces it on the closed header; a note from today opens
   * the panel outright. Runs once per patient, so it seeds the initial state and
   * never fights the doctor if they close it again.
   */
  useEffect(() => {
    if (!uhid) return;
    let isMounted = true;

    getWeekNotes({ uhid }).then(notes => {
      if (!isMounted) return;
      // Nurse-authored only: the doctor's own notes are not news to them
      const written = notes.filter(
        n => n.authorRole !== 'doctor' && isToday(n.createdAt)
      ).length;
      setNotesToday(written);
      if (written > 0) {
        setOpenSections('tools');
        setOpenTool('glp1');
      }
    });

    return () => { isMounted = false; };
  }, [uhid, getWeekNotes]);

  // Does the patient already have an active tracked diagnosis?
  // (Waives the diagnosis requirement for returning patients; the summary panel
  // keeps this in sync via onDiagnosesChange after adds/retires.)
  useEffect(() => {
    if (!uhid) return;
    patientService.getDiagnoses(uhid)
      .then((res) => setTrackedDiagnoses(res.data?.diagnoses ?? []))
      .catch(() => {});
  }, [uhid]);

  // Load the patient's prescriptions (summary panel medications + Rx section)
  useEffect(() => {
    if (!patient) return;
    let isMounted = true;

    getPrescriptionsByPatient(uhid).then((prescriptions) => {
      if (isMounted) setPatientPrescriptions(Array.isArray(prescriptions) ? prescriptions : []);
    });

    return () => { isMounted = false; };
  }, [uhid, patient, getPrescriptionsByPatient]);

  // History fetch and pagination — moved to VisitHistoryPanel (shared component)

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const saveDraftProgress = (updates) => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...saved, ...updates }));
    } catch (e) { void e; }
  };

  const handleDiagnosisSuccess = () => {
    setTabsCompleted(prev => ({ ...prev, diagnosis: true }));
    saveDraftProgress({ diagnosis: true });
  };

  const handlePrescriptionSuccess = async () => {
    setTabsCompleted(prev => ({ ...prev, prescriptions: true }));
    saveDraftProgress({ prescriptions: true });
    const prescriptions = await getPrescriptionsByPatient(uhid);
    setPatientPrescriptions(Array.isArray(prescriptions) ? prescriptions : []);
  };

  const handleCompleteConsultation = () => {
    // Diagnosis is required only for patients with no active tracked diagnosis —
    // returning patients don't re-enter the same diagnosis every visit.
    if (!tabsCompleted.diagnosis && !hasActiveDx) {
      toast.error(
        "Please complete Diagnosis & Treatment Plan before completing consultation",
        { duration: 4000, position: "top-right", icon: "❌",
          style: { background: "#EF4444", color: "#FFFFFF", fontWeight: "bold", padding: "16px" } }
      );
      setOpenSections('diagnosis');
      return;
    }
    // Capture the queue item now so SSE updates during the modal don't lose it
    const queueItem = findQueueItem();
    if (!queueItem) {
      toast.error(NO_OPEN_VISIT_MESSAGE, {
        duration: 5000, position: 'top-right',
      });
      return;
    }
    // Reset all billing modal state before opening
    setBillingMode('complete');
    setBillingContext(null);
    setBillingQueueItem(queueItem);
    setSelectedCharges([]);
    setSelectedProcedures([]);
    setSendForInjection(false);
    setDoctorNotes('');
    setBookFollowUp(false);
    setFollowUpDate('');
    setFollowUpSlot('');
    setAvailableSlots([]);
    setShowBillingModal(true);
  };

  // Structured consultation summary, shared by the admission and referral notes:
  // Triage Vitals → Reason for Visit → Consultation Notes → Diagnosis & Treatment
  // Plan. Sourced from this visit's triage vitals, the live consultation note
  // (handed up via notesTextRef) and the active diagnoses. The doctor edits from there.
  const buildConsultationNote = () => {
    const v = patient?.vitals || {};
    const vitalsLine = [
      v.bp && `BP ${v.bp}`,
      v.heartRate && `HR ${v.heartRate}`,
      v.temperature && `Temp ${v.temperature}`,
      v.weight && `Weight ${v.weight}`,
      v.rbs && `RBS ${v.rbs}`,
      v.hba1c && `HbA1c ${v.hba1c}`,
    ].filter(Boolean).join(' · ');
    const reason = v.chiefComplaint;
    const noteText = (notesTextRef.current || '').trim();
    const dxLines = activeDiagnoses.map((d) => `• ${d.diagnosis}${d.code ? ` (${d.code})` : ''}`).join('\n');
    return [
      vitalsLine && `TRIAGE VITALS\n${vitalsLine}`,
      reason && `REASON FOR VISIT\n${reason}`,
      noteText && `CONSULTATION NOTES\n${noteText}`,
      dxLines && `DIAGNOSIS & TREATMENT PLAN\n${dxLines}`,
    ].filter(Boolean).join('\n\n');
  };

  // Open the shared billing modal in a non-'complete' flow (admission/referral).
  // The action's payload rides in billingContext and is finalised on billing submit.
  const openActionBilling = (mode, context, queueItem) => {
    setBillingMode(mode);
    setBillingContext(context);
    setBillingQueueItem(queueItem);
    setSelectedCharges([]);
    setSelectedProcedures([]);
    // Injection + follow-up are end-of-visit concepts — not offered for these flows.
    setSendForInjection(false);
    setDoctorNotes('');
    setBookFollowUp(false);
    setFollowUpDate('');
    setFollowUpSlot('');
    setAvailableSlots([]);
    setShowAdmitModal(false);
    setShowReferModal(false);
    setShowBillingModal(true);
  };

  // Close/reset the billing modal, always returning it to the default flow.
  const closeBilling = () => {
    setShowBillingModal(false);
    setBillingMode('complete');
    setBillingContext(null);
  };

  // Called when doctor picks a follow-up date — fetches open slots for the assigned doctor
  const handleFollowUpDateChange = async (date, assignedDoctorId) => {
    setFollowUpDate(date);
    setFollowUpSlot('');
    setAvailableSlots([]);
    if (!date || !assignedDoctorId) return;
    setSlotsLoading(true);
    const { slots, reason } = await getAvailableSlots(assignedDoctorId, date);
    setAvailableSlots(slots);
    setSlotsReason(reason);
    setSlotsLoading(false);
  };

  // Nothing ticked means nothing to bill. 'No Charge' and 'Free Review' are
  // themselves options, so an empty selection is an omission rather than a
  // deliberate zero — applies to the injection route too.
  const hasBillingSelection = selectedCharges.length > 0 || selectedProcedures.length > 0;

  const handleBillingSubmit = async () => {
    const queueItem = billingQueueItem;
    if (!queueItem) {
      toast.error('Could not find an active queue entry for this patient. Please refresh and try again.', {
        duration: 5000, position: 'top-right',
      });
      return;
    }
    if (!hasBillingSelection) {
      toast.error('Select at least one charge or procedure. Use "No Charge" if the visit is free.', {
        duration: 5000, position: 'top-right',
      });
      return;
    }
    setBillingSubmitting(true);
    try {
      if (billingMode === 'admission') {
        // Finalise the admission the doctor advised — charges entered here are
        // merged server-side; the visit moves to Pending Billing (completed).
        await inpatientService.requestAdmission({
          queueId: queueItem.id,
          admissionType:   billingContext?.admissionType,
          admissionReason: billingContext?.admissionNote,
          selectedCharges,
          selectedProcedures,
        });
      } else if (billingMode === 'referral') {
        // Finalise the referral — charges merge server-side; internal hands off
        // to the next doctor, external moves to Pending Billing.
        const result = await referPatient(queueItem.id, {
          ...billingContext,
          selectedCharges,
          selectedProcedures,
        });
        if (!result?.success) throw new Error(result?.message || 'Referral failed');
      } else if (sendForInjection) {
        // Back to the nurse. Charges ride along on the queue entry and are
        // merged by sendToBilling when the nurse finishes — no double entry.
        await updateQueueStatus(queueItem.id, PENDING_INJECTION, null, {
          selectedCharges,
          selectedProcedures,
          reason: INJECTION_REASON,
          ...(doctorNotes.trim() ? { doctorNotes: doctorNotes.trim() } : {}),
        });
      } else {
        await sendToBilling(queueItem.id, selectedCharges, selectedProcedures, doctorNotes.trim() || null);
      }

      if (billingMode === 'complete' && bookFollowUp && followUpDate && followUpSlot) {
        const apptResult = await addAppointment({
          uhid:            patient.uhid,
          doctorId:        queueItem.assignedDoctorId,
          date:            followUpDate,
          timeSlot:        followUpSlot,
          appointmentType: 'follow-up',
          reason:          'Follow-up appointment',
        });
        if (!apptResult.success) {
          toast.error(`Sent to billing, but follow-up booking failed: ${apptResult.message}`, {
            duration: 6000, position: 'top-right',
          });
        }
      }

      sessionStorage.removeItem(DRAFT_KEY);
      closeBilling();
      setShowSuccessMessage(true);
      setTimeout(() => navigate("/doctor/dashboard"), 3000);
    } catch (err) {
      toast.error(err?.message || 'Something went wrong. Please try again.', { duration: 5000, position: 'top-right' });
    } finally {
      setBillingSubmitting(false);
    }
  };

  const toggleCharge    = (item) =>
    setSelectedCharges(prev => prev.includes(item) ? prev.filter(c => c !== item) : [...prev, item]);

  const toggleProcedure = (item) =>
    setSelectedProcedures(prev => prev.includes(item) ? prev.filter(p => p !== item) : [...prev, item]);

  const toggleSection = useCallback((id) => {
    setOpenSections(prev => prev === id ? null : id);
  }, []);

  // toggleHistoryDate — moved to VisitHistoryPanel (shared component)

  // ---------------------------------------------------------------------------
  // Early returns
  // ---------------------------------------------------------------------------

  if (showSuccessMessage) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="max-w-lg">
          <div className="text-center py-8 px-6">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Check className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Consultation Completed!</h2>
            <p className="text-gray-600 mb-4">Patient: {patient.name} ({patient.uhid})</p>
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          </div>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------
  return (
    <div className="pb-12">
      {/* Two-column layout: consultation body + right summary panel. The panel
          lives OUTSIDE the accordion grid, so ACCORDION_SECTIONS parity is
          untouched. */}
      <SummaryDock
        overviewOpen={overviewOpen}
        panel={({ closeSummary }) => (
          <ConsultationSummaryContainer
            patient={patient}
            medications={patientPrescriptions.flatMap((p) =>
              (p.medications || []).map((m, i) => ({
                id: `${p.id}-${i}`,
                name: m.name,
                dose: [m.dosage, m.frequency].filter(Boolean).join(' · '),
                since: p.date || p.createdAt,
              }))
            )}
            onOpenMeds={() => {
              setOpenSections("prescriptions");
              closeSummary();
            }}
            onEditVitals={() => setShowVitalsModal(true)}
            onDiagnosesChange={setTrackedDiagnoses}
          />
        )}
      >
      {/* ── Today's Consultation (accordion) ── */}
      <div className="space-y-3">
          {/* Reminder banner — only for patients with no active tracked diagnosis */}
          {!tabsCompleted.diagnosis && !hasActiveDx && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                Complete <strong>Diagnosis &amp; Treatment Plan</strong> before sending the patient to billing.
              </p>
            </div>
          )}

          {/* Triage Vitals block removed — vitals (with reason for visit, trends and
              edit/record action) live in the summary panel's Vitals card. */}

          {/* The merged consultation section — full width (Assessment, Physical
              Exam and Treatment Plan are optional click-to-add blocks inside).
              The old two-column parity split is gone with only one section left. */}
          <div className="flex flex-col gap-3">
            {ACCORDION_SECTIONS.filter((s) => s.id !== 'prescriptions').map((section) => {
              const isOpen      = openSections === section.id;
              const isCompleted = !!tabsCompleted[section.id];
              const isUnsaved   = !!(tabsUnsaved[section.id] && !isCompleted);

              const badge = (
                <>
                  {section.required && !hasActiveDx && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Required</span>
                  )}
                  {isCompleted && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <Check className="w-3.5 h-3.5" /> Done
                    </span>
                  )}
                  {isUnsaved && (
                    <span className="w-2 h-2 bg-orange-500 rounded-full" title="Unsaved changes" />
                  )}
                </>
              );

              return (
                <AccordionPanel
                  key={section.id}
                  icon={section.icon}
                  label={section.label}
                  badge={badge}
                  isOpen={isOpen}
                  onToggle={() => toggleSection(section.id)}
                >
                  {section.id === 'diagnosis' && (
                    <ConsultationNotesPlan
                      patient={patient}
                      currentUser={currentUser}
                      activeDiagnoses={activeDiagnoses}
                      onSuccess={handleDiagnosisSuccess}
                      notesRef={notesTextRef}
                      // This visit = this queue row. Scopes the "note/plan already
                      // saved" prefill so a second same-day check-in starts fresh
                      // instead of overwriting the earlier visit's note.
                      visitStartedAt={findQueueItem()?.createdAt || null}
                    />
                  )}
                </AccordionPanel>
              );
            })}
          </div>

          {/* Tools — full width, between the grid and Prescriptions.
              Not part of ACCORDION_SECTIONS: see the note by that constant. */}
          <AccordionPanel
            icon={Wrench}
            label="Clinical Tools"
            badge={
              <>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                  1 tool
                </span>
                {tabsUnsaved.tools && (
                  <span className="w-2 h-2 bg-orange-500 rounded-full" title="Unsaved changes" />
                )}
              </>
            }
            isOpen={openSections === 'tools'}
            onToggle={() => toggleSection('tools')}
          >
            {/* Tools is a container for several clinical tools. GLP-1 monitoring
                is the only one so far; others get their own entry here. */}
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => setOpenTool(openTool === 'glp1' ? null : 'glp1')}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 text-left"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <Syringe className={`w-4 h-4 ${openTool === 'glp1' ? 'text-primary' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${openTool === 'glp1' ? 'text-primary' : 'text-gray-700'}`}>
                    GLP-1 / GIP agonist monitoring
                  </span>
                  {/* The nurse wrote something today. Said on the closed header
                      because a note nobody opens the panel to read is no use. */}
                  {notesToday > 0 && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 border border-teal-300">
                      {notesToday === 1 ? '1 nurse note today' : `${notesToday} nurse notes today`}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {openTool === 'glp1' ? 'Hide' : 'Open'}
                </span>
              </button>
              {openTool === 'glp1' && (
                <div className="border-t border-gray-100 p-4">
                  <Glp1Kardex
                    patient={patient}
                    onDirtyChange={setToolsDirty}
                  />
                </div>
              )}
            </div>
          </AccordionPanel>

          {/* Orders — full width at the bottom. A Prescriptions / Laboratory
              switcher in one panel (keeps the 'prescriptions' section id so
              completion gating and the summary panel's jump are unchanged). */}
          {(() => {
            const section = ACCORDION_SECTIONS.find(s => s.id === 'prescriptions');
            const isCompleted = !!tabsCompleted['prescriptions'];
            return (
              <AccordionPanel
                icon={section.icon}
                label={section.label}
                badge={isCompleted && ordersTab === 'prescriptions' && (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <Check className="w-3.5 h-3.5" /> Done
                  </span>
                )}
                isOpen={openSections === 'prescriptions'}
                onToggle={() => toggleSection('prescriptions')}
              >
                <div className="mb-4">
                  <SwitcherTabs
                    active={ordersTab}
                    onChange={setOrdersTab}
                    tabs={[
                      { id: 'prescriptions', label: 'Prescriptions', Icon: Pill },
                      { id: 'labs',          label: 'Laboratory',    Icon: FlaskConical },
                    ]}
                  />
                </div>
                {ordersTab === 'prescriptions' ? (
                  <PrescriptionManagement
                    patient={patient}
                    patientPrescriptions={patientPrescriptions}
                    addPrescription={addPrescription}
                    currentUser={currentUser}
                    onSuccess={handlePrescriptionSuccess}
                    hideCurrentStrip
                  />
                ) : (
                  <LabRequest patient={patient} />
                )}
              </AccordionPanel>
            );
          })()}
        </div>

      {/* ===== Action Buttons — in flow at the very end of the content column:
             visible after scrolling past the last section ===== */}
      <div className="mt-6 flex items-center justify-end gap-2">
        {/* Secondary actions collapsed into one dropdown to keep the bar uncluttered */}
        <div className="relative" ref={actionsRef}>
          <button
            onClick={() => setShowActions((o) => !o)}
            className="flex items-center gap-1.5 bg-white hover:bg-blue-50 text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            Actions
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showActions ? "rotate-180" : ""}`} />
          </button>

          {showActions && (
            <div className="absolute right-0 top-full mt-2 z-20 w-44 bg-white border border-gray-200 rounded-lg shadow-xl py-1">
              <button
                onClick={() => { setShowActions(false); setShowRecordUse(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-blue-50 transition-colors"
              >
                <Package className="w-3.5 h-3.5" /> Record Use
              </button>
              <button
                onClick={() => { setShowActions(false); setShowReferModal(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-blue-50 transition-colors"
              >
                <UserCircle className="w-3.5 h-3.5" /> Refer Patient
              </button>
              <button
                onClick={() => { setShowActions(false); setShowAdmitModal(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-blue-50 transition-colors"
              >
                <BedDouble className="w-3.5 h-3.5" /> Admit Patient
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleCompleteConsultation}
          disabled={!tabsCompleted.diagnosis && !hasActiveDx}
          className="flex items-center gap-1.5 bg-primary hover:opacity-90 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="w-3.5 h-3.5" />
          Complete Consultation
        </button>

        {showRecordUse && (
          <RecordUseModal
            patient={{ uhid: patient.uhid, name: patient.name }}
            onClose={() => setShowRecordUse(false)}
          />
        )}
      </div>

      </SummaryDock>


      {/* ===== Billing Checklist Modal ===== */}
      {showBillingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  {billingMode === 'admission' ? 'Admission Billing'
                    : billingMode === 'referral' ? 'Referral Billing'
                    : 'Complete Consultation'}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {billingMode === 'admission' ? 'Enter charges — this finalises the admission and completes the visit'
                    : billingMode === 'referral' ? 'Enter charges — this finalises the referral and completes the visit'
                    : 'Select charges and procedures for this visit'}
                </p>
              </div>
              <button
                onClick={closeBilling}
                className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
              {/* Charges */}
              <div>
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 pb-1 border-b">Charges</h3>
                <div className="grid grid-cols-2 gap-2">
                  {CHARGE_OPTIONS.map(item => (
                    <label
                      key={item}
                      className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedCharges.includes(item)
                          ? 'bg-green-50 border-green-400 text-gray-800'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-blue-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCharges.includes(item)}
                        onChange={() => toggleCharge(item)}
                        className="w-4 h-4 accent-green-600 cursor-pointer flex-shrink-0"
                      />
                      <span className="text-sm font-medium leading-tight">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Procedures — collapsed by default; most visits have none, and
                  the list only grows as the clinic adds services */}
              <div>
                <button
                  type="button"
                  onClick={() => setProceduresOpen(v => !v)}
                  className="w-full flex items-center justify-between mb-3 pb-1 border-b group"
                >
                  <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide group-hover:text-gray-800">
                    Procedures
                    {selectedProcedures.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold normal-case">
                        {selectedProcedures.length} selected
                      </span>
                    )}
                  </h3>
                  {proceduresOpen
                    ? <ChevronUp   className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />}
                </button>

                {proceduresOpen ? (
                  <div className="grid grid-cols-2 gap-2">
                    {PROCEDURE_OPTIONS.map(item => (
                      <label
                        key={item}
                        className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedProcedures.includes(item)
                            ? 'bg-green-50 border-green-400 text-gray-800'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-blue-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedProcedures.includes(item)}
                          onChange={() => toggleProcedure(item)}
                          className="w-4 h-4 accent-green-600 cursor-pointer flex-shrink-0"
                        />
                        <span className="text-sm font-medium leading-tight">{item}</span>
                      </label>
                    ))}
                  </div>
                ) : selectedProcedures.length > 0 ? (
                  /* Collapsed but non-empty — the doctor must still be able to
                     see what is being billed without reopening the list */
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProcedures.map(item => (
                      <span key={item} className="px-2 py-1 rounded-lg bg-green-50 border border-green-300 text-xs text-gray-700">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">None selected — click to add a procedure</p>
                )}
              </div>

              {/* Injection, doctor's instructions and follow-up are end-of-visit
                  concepts — only shown for the normal 'complete' flow. Admission
                  and referral billing collect charges only. */}
              {billingMode === 'complete' && (<>
              {/* Send for injection — routes to the nurse instead of billing */}
              <div>
                <label
                  className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                    sendForInjection
                      ? 'bg-green-50 border-green-400 text-gray-800'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-blue-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={sendForInjection}
                    onChange={() => setSendForInjection(v => !v)}
                    className="w-4 h-4 accent-green-600 cursor-pointer flex-shrink-0"
                  />
                  <span className="text-sm font-medium leading-tight">Send for injection</span>
                  <span className="text-xs text-gray-500 ml-auto">
                    Patient returns to the nurse before billing
                  </span>
                </label>
              </div>

              {/* Doctor's Instructions */}
              <div>
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 pb-1 border-b">Doctor's Instructions</h3>
                <textarea
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  placeholder="e.g. Fasting labs next visit, continue metformin 500mg, watch BP…"
                  rows={3}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-primary resize-none placeholder-gray-400"
                />
              </div>

              {/* Follow-up Appointment */}
              <div>
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 pb-1 border-b">Follow-up Appointment</h3>

                {/* Toggle */}
                <label className="flex items-center gap-3 cursor-pointer select-none mb-4">
                  <button
                    type="button"
                    onClick={() => { setBookFollowUp(v => !v); setFollowUpDate(''); setFollowUpSlot(''); setAvailableSlots([]); }}
                    className={`relative w-11 h-6 rounded-full transition-colors ${bookFollowUp ? 'bg-primary' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${bookFollowUp ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-sm font-medium text-gray-700">
                    {bookFollowUp ? 'Book a follow-up appointment' : 'No follow-up needed'}
                  </span>
                </label>

                {bookFollowUp && (() => {
                  const queueItem = billingQueueItem || findQueueItem();

                  if (!queueItem) {
                    return (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-700 font-medium">
                          Unable to book follow-up — queue entry not found. Please close this modal, refresh the page, and try again.
                        </p>
                      </div>
                    );
                  }

                  const minDate = new Date(); minDate.setDate(minDate.getDate() + 1);
                  const minDateStr = minDate.toISOString().slice(0, 10);
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={followUpDate}
                          min={minDateStr}
                          onChange={(e) => handleFollowUpDateChange(e.target.value, queueItem?.assignedDoctorId)}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          Time Slot <span className="text-red-500">*</span>
                        </label>
                        {!followUpDate ? (
                          <p className="text-xs text-gray-400 italic">Select a date first</p>
                        ) : slotsLoading ? (
                          <p className="text-xs text-gray-500 animate-pulse">Loading available slots…</p>
                        ) : availableSlots.length === 0 ? (
                          <p className="text-xs text-red-500 font-medium">
                            {slotsReason === 'day_blocked'
                              ? 'The doctor is not available on this date.'
                              : 'All slots are fully booked — choose another date.'}
                          </p>
                        ) : (
                          <select
                            value={followUpSlot}
                            onChange={(e) => setFollowUpSlot(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary bg-white"
                          >
                            <option value="">Select a time slot</option>
                            {availableSlots.map(slot => (
                              <option key={slot} value={slot}>{slot}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      {followUpDate && followUpSlot && (
                        <p className="text-xs text-blue-700 font-medium bg-blue-100 rounded-md px-3 py-2">
                          Appointment will be booked: {followUpDate} at {followUpSlot}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
              </>)}
            </div>

            <div className="px-6 py-4 border-t flex-shrink-0">
              {!hasBillingSelection && (
                <p className="text-xs text-red-600 mb-2.5">
                  Select at least one charge or procedure. Use "No Charge" if the visit is free.
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={closeBilling}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-blue-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBillingSubmit}
                  disabled={billingSubmitting || !hasBillingSelection || (billingMode === 'complete' && bookFollowUp && (!followUpDate || !followUpSlot))}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {billingSubmitting
                    ? 'Submitting…'
                    : billingMode === 'admission' ? 'Confirm & Send for Admission'
                    : billingMode === 'referral' ? 'Confirm Referral'
                    : sendForInjection ? 'Confirm & Send for Injection' : 'Confirm & Send to Billing'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ===== Edit Vitals Modal ===== */}
      {showVitalsModal && (
        <EditVitalsModal
          vitals={patient?.vitals}
          uhid={uhid}
          onClose={() => setShowVitalsModal(false)}
          onSaved={() => onRefresh()}
        />
      )}

      {/* ===== Refer Patient Modal ===== */}
      {showReferModal && (() => {
        const activeQueueItem = findQueueItem();
        if (!activeQueueItem) {
          return <NoOpenVisitNotice onClose={() => setShowReferModal(false)} />;
        }
        return (
          <ReferPatientModal
            patient={patient}
            queueItem={activeQueueItem}
            defaultNote={buildConsultationNote()}
            onClose={() => setShowReferModal(false)}
            onSendToBilling={(payload) => openActionBilling('referral', payload, activeQueueItem)}
          />
        );
      })()}

      {/* ===== Admit Patient Modal (HMIS V3) ===== */}
      {showAdmitModal && (() => {
        const activeQueueItem = findQueueItem();
        if (!activeQueueItem) {
          return <NoOpenVisitNotice onClose={() => setShowAdmitModal(false)} />;
        }
        return (
          <AdmitPatientModal
            patient={patient}
            queueItem={activeQueueItem}
            defaultNote={buildConsultationNote()}
            onClose={() => setShowAdmitModal(false)}
            onSendToBilling={(ctx) => openActionBilling('admission', ctx, activeQueueItem)}
          />
        );
      })()}

    </div>
  );
};

export default TodaysConsultationTab;
