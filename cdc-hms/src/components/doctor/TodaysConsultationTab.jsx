import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ModalOverlay } from '../shared/Modal';
import { useNavigate } from "react-router-dom";
import {
  Check,
  AlertCircle,
  MessageSquare,
  Pill,
  UserCircle,
  X,
  Syringe,
  ChevronUp,
  ChevronDown,
  Package,
  BedDouble,
  FlaskConical,
  Microscope,
  ScanFace,
  SlidersHorizontal,
  Stethoscope,
  Target,
  EyeOff,
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
import ConsultationNotes from "./ConsultationNotes";
import TreatmentPlanModule from "./TreatmentPlanModule";
import PhysicalExamList from "./PhysicalExamList";
import PrescriptionManagement from "./PrescriptionManagement";
import AccordionPanel from "../shared/AccordionPanel";
import SwitcherTabs from "../shared/SwitcherTabs";
import Glp1Kardex from "../shared/Glp1Kardex";
import DermatologyTool from "./derm/DermatologyTool";
import { CONSULTATION_NOTE_INSERT } from "../../utils/consultationNoteInsert";
import ConsultationLayoutModal from "./ConsultationLayoutModal";
import useClinicModules from "../../hooks/useClinicModules";
import useToolPrefs from "../../hooks/useToolPrefs";
import useTodaysWork from "../../hooks/useTodaysWork";
import { arrangeTools, toolForDraft } from "../../constants/consultationTools";
import { LEGACY_PLAN_RESTORE } from "../../utils/legacyNotesDraft";
import LabRequest from "../shared/LabRequest";
import HistologyPanel from "../histology/HistologyPanel";
import ConsultationSummaryContainer from "./ConsultationSummaryContainer";
import SummaryDock from "../shared/SummaryDock";
import ClinicalCalculator from "../shared/calculator/ClinicalCalculator";
import { isToday } from "../../utils/dateUtils";
import useDraft from "../../hooks/useDraft";
import { useDraftContext } from "../../contexts/DraftContext";
import { draftKey } from "../../constants/draftForms";
import { DraftStatus, DraftRestoreBanner, DraftDot } from "../shared/DraftStatus";
import DraftChecklistModal from "../shared/DraftChecklistModal";
import BillOnFile from "../shared/BillOnFile";

// ---------------------------------------------------------------------------
// Modules of Today's Consultation (10 Oct 2026, plan M1–M9)
// ---------------------------------------------------------------------------
// Every section is a module (constants/consultationTools): each doctor chooses
// which they see, in what order, and which open expanded ("Customise my
// consultation", saved to their account). The old ACCORDION_SECTIONS list and
// its two-column parity trap are gone — modules are one full-width column.
//
// How each module is mounted:
//   always  rendered whenever shown (holds this visit's typed text; Orders as before)
//   lazy    rendered from its first opening, then kept (typed work survives a collapse)
//   open    rendered only while open (Physical exam: restarts a fresh entry each time;
//           its own autosave draft keeps unsaved work)
const MODULE_VIEW = {
  notes:       { icon: MessageSquare, mount: 'always' },
  exam:        { icon: Stethoscope,   mount: 'open' },
  plan:        { icon: Target,        mount: 'always' },
  glp1:        { icon: Syringe,       mount: 'lazy' },
  dermatology: { icon: ScanFace,      mount: 'lazy' },
  orders:      { icon: Pill,          mount: 'always' },
};

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
  <ModalOverlay>
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
  </ModalOverlay>
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

  // Live consultation note text, handed up from ConsultationNotes so the
  // Admit modal can pre-fill the admission note.
  const notesTextRef = useRef('');
  // Patient summary drawer — mobile/tablet only (always visible ≥ xl)
  // Tracked diagnoses (summary panel is their single home). Active ones are
  // auto-attached to treatment plans; returning patients with an active
  // diagnosis don't re-enter one every visit.
  const [trackedDiagnoses, setTrackedDiagnoses] = useState([]);
  const activeDiagnoses = trackedDiagnoses.filter((d) => d.status === 'active');
  const hasActiveDx = activeDiagnoses.length > 0;

  // Modules open now (several may be), and modules rendered at least once
  // (MODULE_VIEW.mount 'lazy' keeps them rendered after a collapse).
  const [openModules, setOpenModules] = useState([]);
  const [mountedModules, setMountedModules] = useState([]);
  // Hidden modules shown for this visit — by "Show one for this visit", a
  // draft opened from the checklist, or a nurse's GLP-1 note. Per patient.
  const [shownForVisit, setShownForVisit] = useState([]);
  const isModuleOpen = (id) => openModules.includes(id);
  const openModule = useCallback((id, { forceShow = false } = {}) => {
    setOpenModules((m) => (m.includes(id) ? m : [...m, id]));
    setMountedModules((m) => (m.includes(id) ? m : [...m, id]));
    if (forceShow) setShownForVisit((m) => (m.includes(id) ? m : [...m, id]));
  }, []);
  const toggleModule = (id) => {
    setOpenModules((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
    setMountedModules((m) => (m.includes(id) ? m : [...m, id]));
  };
  const closeModule = (id) => setOpenModules((m) => m.filter((x) => x !== id));
  // Saved-this-visit flags reported by the Notes and Plan modules (header chips)
  const [notesSaved, setNotesSaved] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);
  const [examRun, setExamRun] = useState(0);   // a fresh exam entry after each save

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

  // Orders panel switcher — Prescriptions | Laboratory | Histology (the last
  // only while the clinic has the Histology / cytology module on).
  const [ordersTab, setOrdersTab] = useState('prescriptions');
  // How many GLP-1 week notes were written for this patient today — drives the
  // count on the collapsed tool header
  const [notesToday, setNotesToday] = useState(0);

  // This doctor's layout (constants/consultationTools, saved to their account
  // via useToolPrefs) and the clinic's specialist-module switches.
  const [customising, setCustomising] = useState(false);
  const { modules, loaded: modulesLoaded } = useClinicModules();
  const { prefs: toolPrefs, loaded: toolPrefsLoaded, save: saveToolPrefs } = useToolPrefs();
  const allTools = useMemo(() => arrangeTools(toolPrefs, modules), [toolPrefs, modules]);
  // Modules this doctor keeps open: opened once per patient, when both the
  // clinic's modules and their layout are known.
  const autoOpenedFor = useRef(null);

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
  // module). Open to all clinical roles.
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
  const [billOnFileCount, setBillOnFileCount]       = useState(0);
  const [selectedProcedures, setSelectedProcedures] = useState([]);
  const [billingSubmitting, setBillingSubmitting]   = useState(false);
  // When set, the patient goes back to the nurse for their injection instead of
  // straight to billing. The charges picked here ride along and are merged when
  // the nurse finally sends them to billing.
  const [sendForInjection, setSendForInjection]     = useState(false);
  // Procedures list is collapsed by default — most visits bill none
  const [proceduresOpen, setProceduresOpen]         = useState(false);
  const [doctorNotes, setDoctorNotes]               = useState('');
  // Unsaved-drafts checklist shown by Complete consultation (warns, never blocks).
  const [showDraftChecklist, setShowDraftChecklist] = useState(false);
  const [bookFollowUp, setBookFollowUp]             = useState(false);
  const [followUpDate, setFollowUpDate]             = useState('');
  const [followUpSlot, setFollowUpSlot]             = useState('');
  const [availableSlots, setAvailableSlots]         = useState([]);
  const [slotsReason,    setSlotsReason]             = useState(null);
  const [slotsLoading,   setSlotsLoading]            = useState(false);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  // Autosave drafts of this consultation (the doctor's own). Remote-request
  // drafts carry their own context and are not part of today's visit.
  const draftCtx = useDraftContext();
  const visitDrafts = useMemo(() => (draftCtx && uhid
    ? draftCtx.draftsFor(uhid, { consultationOnly: true }).filter((d) => !String(d.contextKey).startsWith('remote'))
    : []), [draftCtx, uhid]);

  // Orange dot on a module's header when it holds an autosaved draft not yet
  // saved to the record (GLP-1 also while a review is part-typed).
  const draftModules = useMemo(() => {
    const out = new Set(visitDrafts.map((d) => toolForDraft(d.formKey)).filter(Boolean));
    if (toolsDirty) out.add('glp1');
    return out;
  }, [toolsDirty, visitDrafts]);

  // Hidden modules that still show on this visit, and why (plan M6): nothing
  // typed or recorded today may disappear because a layout hides its module.
  const visitStartedAt = findQueueItem()?.createdAt || null;
  const hiddenIds = useMemo(() => allTools.filter((t) => t.hidden).map((t) => t.id), [allTools]);
  const todaysWork = useTodaysWork({ uhid, hiddenIds, doctorId: currentUser?.id, visitStartedAt, dermOn: !!modules.dermatology });
  const liveReason = useCallback((t) => {
    if (draftModules.has(t.id)) return 'you have an unsaved draft';
    if (t.id === 'glp1' && notesToday > 0) return 'a nurse left a note today';
    if (todaysWork[t.id]) return todaysWork[t.id];
    return null;
  }, [draftModules, notesToday, todaysWork]);
  // Once a hidden module is shown on this visit it stays shown until the
  // patient changes: a module must never vanish under the doctor's hands
  // (e.g. while its form reloads its own draft, or right after a save).
  const [stickyReasons, setStickyReasons] = useState({});
  useEffect(() => {
    setStickyReasons((r) => {
      const add = {};
      allTools.forEach((t) => {
        if (t.hidden && !r[t.id]) { const why = liveReason(t); if (why) add[t.id] = why; }
      });
      return Object.keys(add).length ? { ...r, ...add } : r;
    });
  }, [allTools, liveReason]);
  const shownBecause = (t) => {
    if (!t.hidden) return null;
    return liveReason(t) || stickyReasons[t.id] || (shownForVisit.includes(t.id) ? 'you chose it for this visit' : null);
  };
  const visibleModules = allTools.filter((t) => !t.hidden || shownBecause(t));
  const stillHidden = allTools.filter((t) => t.hidden && !shownBecause(t));

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
      if (written > 0) openModule('glp1');
    });

    return () => { isMounted = false; };
  }, [uhid, getWeekNotes, openModule]);

  // A new patient starts from this doctor's layout.
  useEffect(() => {
    setOpenModules([]);
    setMountedModules([]);
    setShownForVisit([]);
    setStickyReasons({});
  }, [uhid]);

  useEffect(() => {
    if (!uhid || !modulesLoaded || !toolPrefsLoaded || autoOpenedFor.current === uhid) return;
    autoOpenedFor.current = uhid;
    allTools.filter((t) => !t.hidden && t.alwaysOpen).forEach((t) => openModule(t.id));
  }, [uhid, modulesLoaded, toolPrefsLoaded, allTools, openModule]);

  // Plan text from an old combined notes + plan draft: show and open the plan.
  useEffect(() => {
    const onLegacy = (e) => { if (e.detail?.uhid === uhid) openModule('plan', { forceShow: true }); };
    window.addEventListener(LEGACY_PLAN_RESTORE, onLegacy);
    return () => window.removeEventListener(LEGACY_PLAN_RESTORE, onLegacy);
  }, [uhid, openModule]);

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

  // Doctor's instructions (the Complete-consultation modal) — one draft per visit.
  const instructionsDraft = useDraft({
    uhid,
    formKey: 'doctor-instructions',
    contextKey: billingQueueItem?.id ? `q${billingQueueItem.id}` : '',
    value: doctorNotes,
    baseline: '',
    enabled: showBillingModal && billingMode === 'complete' && !!billingQueueItem?.id,
    onRestore: (p) => setDoctorNotes(typeof p === 'string' ? p : ''),
    onDiscard: () => setDoctorNotes(''),
  });

  // A draft the checklist asked to open: show its section, then let the form
  // scroll itself into view.
  const openDraft = (entry) => {
    setShowDraftChecklist(false);
    const id = toolForDraft(entry.formKey) || 'notes';
    if (id === 'orders') {
      setOrdersTab(entry.formKey === 'lab-request' ? 'labs' : entry.formKey === 'histology-request' ? 'histology' : 'prescriptions');
    }
    openModule(id, { forceShow: true });
    setTimeout(() => draftCtx?.open(entry), 300);
  };

  const handleCompleteConsultation = ({ skipDraftCheck = false } = {}) => {
    // Completing needs at least one ACTIVE diagnosis in Diagnosis &
    // differentials (plan M4) — hiding Notes or Plan never blocks a doctor;
    // returning patients don't re-enter the same diagnosis every visit.
    if (!hasActiveDx) {
      toast.error(
        "Add a diagnosis in Diagnosis & differentials before completing the consultation",
        { duration: 4000, position: "top-right", icon: "❌",
          style: { background: "#EF4444", color: "#FFFFFF", fontWeight: "bold", padding: "16px" } }
      );
      return;
    }
    // Unsaved drafts? Warn first (Emu, 6 Oct: warn, never block).
    if (!skipDraftCheck && visitDrafts.length > 0) {
      setShowDraftChecklist(true);
      return;
    }
    setShowDraftChecklist(false);
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
  // Lines already on the bill (nurse, an earlier doctor) count too (12 Oct 2026).
  const hasBillingSelection = selectedCharges.length > 0 || selectedProcedures.length > 0 || billOnFileCount > 0;

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
      // In the record now: the drafts that fed this step are no longer needed.
      if (billingMode === 'complete') instructionsDraft.markSaved();
      const letterKey = billingMode === 'referral' ? 'referral-letter' : billingMode === 'admission' ? 'admission-note' : null;
      if (letterKey && draftCtx) {
        const contextKey = `q${queueItem.id}`;
        draftCtx.discard({ key: draftKey(uhid, letterKey, contextKey), uhid, formKey: letterKey, contextKey });
      }
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

  // Text inserted into the note from a tool — open the notes module (shown
  // for this visit even if hidden) so the doctor sees it land.
  useEffect(() => {
    const onInsert = (e) => { if (e.detail?.uhid === uhid) openModule('notes', { forceShow: true }); };
    window.addEventListener(CONSULTATION_NOTE_INSERT, onInsert);
    return () => window.removeEventListener(CONSULTATION_NOTE_INSERT, onInsert);
  }, [uhid, openModule]);

  // toggleHistoryDate — moved to VisitHistoryPanel (shared component)

  // ---------------------------------------------------------------------------
  // Early returns
  // ---------------------------------------------------------------------------

  if (showSuccessMessage) {
    return (
      <ModalOverlay>
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
      </ModalOverlay>
    );
  }

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------
  return (
    <div className="pb-12">
      {/* Two-column layout: consultation body + right summary panel. The panel
          lives OUTSIDE the column of modules. */}
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
              setOrdersTab("prescriptions");
              openModule("orders");
              closeSummary();
            }}
            onEditVitals={() => setShowVitalsModal(true)}
            onDiagnosesChange={setTrackedDiagnoses}
          />
        )}
      >
      {/* ── Today's Consultation — this doctor's modules, in their order ── */}
      <div className="space-y-3">
          {/* Reminder — only while the patient has no active diagnosis */}
          {!hasActiveDx && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                Add a diagnosis in <strong>Diagnosis &amp; differentials</strong> before completing the consultation.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">Your layout · saved to your account</span>
            <button
              type="button"
              onClick={() => setCustomising(true)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-primary bg-white px-3 py-1.5 text-xs font-semibold text-primary ui-hover"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Customise my consultation
            </button>
          </div>

          {/* One full-width column of modules (constants/consultationTools).
              A hidden module with today's work or a draft still shows, marked. */}
          {/* Nothing renders until this doctor's layout and the clinic's modules
              are known — otherwise the default layout flashes up first and a
              module the doctor hides would mount (and restore its draft) for
              a moment. */}
          {!(toolPrefsLoaded && modulesLoaded) && (
            <p className="rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-500">Loading your layout…</p>
          )}
          <div className="flex flex-col gap-3">
            {toolPrefsLoaded && modulesLoaded && visibleModules.map((tool) => {
              const view = MODULE_VIEW[tool.id] || { icon: MessageSquare, mount: 'always' };
              const isOpen = isModuleOpen(tool.id);
              const because = shownBecause(tool);
              const render = view.mount === 'always' || (view.mount === 'lazy' ? mountedModules.includes(tool.id) : isOpen);
              const saved = (tool.id === 'notes' && notesSaved) || (tool.id === 'plan' && planSaved)
                || (tool.id === 'orders' && tabsCompleted.prescriptions && ordersTab === 'prescriptions');
              const badge = (
                <>
                  {saved && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <Check className="w-3.5 h-3.5" /> Saved
                    </span>
                  )}
                  {tool.id === 'orders' && !isOpen && (
                    <span className="hidden sm:inline text-xs text-gray-500">Prescriptions · Laboratory{modules.histology ? ' · Histology' : ''}</span>
                  )}
                  {/* The nurse wrote something today — said on the closed header. */}
                  {tool.id === 'glp1' && notesToday > 0 && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 border border-teal-300">
                      {notesToday === 1 ? '1 nurse note today' : `${notesToday} nurse notes today`}
                    </span>
                  )}
                  {because && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800">
                      <EyeOff className="w-3.5 h-3.5" /> Hidden in your layout — shown because {because}
                    </span>
                  )}
                  {draftModules.has(tool.id) && <DraftDot />}
                </>
              );
              return (
                <AccordionPanel
                  key={tool.id}
                  icon={view.icon}
                  label={tool.label}
                  badge={badge}
                  isOpen={isOpen}
                  onToggle={() => toggleModule(tool.id)}
                >
                  {render && tool.id === 'notes' && (
                    <ConsultationNotes
                      patient={patient}
                      currentUser={currentUser}
                      notesRef={notesTextRef}
                      // This visit = this queue row: a second same-day check-in
                      // starts fresh instead of overwriting the earlier note.
                      visitStartedAt={visitStartedAt}
                      onSavedChange={setNotesSaved}
                    />
                  )}
                  {render && tool.id === 'exam' && (
                    <PhysicalExamList
                      key={examRun}
                      patient={patient}
                      embedded={true}
                      autoStart
                      onSaved={() => { closeModule('exam'); setExamRun((n) => n + 1); }}
                    />
                  )}
                  {render && tool.id === 'plan' && (
                    <TreatmentPlanModule
                      patient={patient}
                      currentUser={currentUser}
                      activeDiagnoses={activeDiagnoses}
                      visitStartedAt={visitStartedAt}
                      onSuccess={handleDiagnosisSuccess}
                      onSavedChange={setPlanSaved}
                    />
                  )}
                  {render && tool.id === 'glp1' && <Glp1Kardex patient={patient} onDirtyChange={setToolsDirty} />}
                  {render && tool.id === 'dermatology' && <DermatologyTool patient={patient} />}
                  {render && tool.id === 'orders' && (
                    <>
                      <div className="mb-4">
                        <SwitcherTabs
                          active={ordersTab}
                          onChange={setOrdersTab}
                          tabs={[
                            { id: 'prescriptions', label: 'Prescriptions', Icon: Pill },
                            { id: 'labs',          label: 'Laboratory',    Icon: FlaskConical },
                            ...(modules.histology ? [{ id: 'histology', label: 'Histology', Icon: Microscope }] : []),
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
                      ) : ordersTab === 'histology' && modules.histology ? (
                        <HistologyPanel patient={patient} />
                      ) : (
                        <LabRequest patient={patient} />
                      )}
                    </>
                  )}
                </AccordionPanel>
              );
            })}
          </div>

          {toolPrefsLoaded && modulesLoaded && stillHidden.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600">
              <span>Hidden in your layout:</span>
              {stillHidden.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openModule(t.id, { forceShow: true })}
                  title="Show it for this visit only"
                  className="rounded-full border border-gray-300 bg-white px-2.5 py-0.5 text-xs font-medium text-gray-700 ui-hover"
                >
                  {t.label}
                </button>
              ))}
              <span className="text-xs text-gray-500">— tap one to show it for this visit</span>
            </div>
          )}
        </div>

      <ConsultationLayoutModal
        isOpen={customising}
        onClose={() => setCustomising(false)}
        tools={allTools}
        prefs={toolPrefs}
        modules={modules}
        onSave={saveToolPrefs}
      />

      {/* ===== Action Buttons — in flow at the very end of the content column:
             visible after scrolling past the last section ===== */}
      <div className="mt-6 flex items-center justify-end gap-2">
        {/* Secondary actions collapsed into one dropdown to keep the bar uncluttered */}
        <div className="relative" ref={actionsRef}>
          <button
            onClick={() => setShowActions((o) => !o)}
            className="flex items-center gap-1.5 bg-white ui-hover text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            Actions
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showActions ? "rotate-180" : ""}`} />
          </button>

          {showActions && (
            <div className="absolute right-0 top-full mt-2 z-20 w-44 bg-white border border-gray-200 rounded-lg shadow-xl py-1">
              <button
                onClick={() => { setShowActions(false); setShowRecordUse(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 ui-hover transition-colors"
              >
                <Package className="w-3.5 h-3.5" /> Record Use
              </button>
              <button
                onClick={() => { setShowActions(false); setShowReferModal(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 ui-hover transition-colors"
              >
                <UserCircle className="w-3.5 h-3.5" /> Refer Patient
              </button>
              <button
                onClick={() => { setShowActions(false); setShowAdmitModal(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 ui-hover transition-colors"
              >
                <BedDouble className="w-3.5 h-3.5" /> Admit Patient
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleCompleteConsultation}
          disabled={!hasActiveDx}
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

      {/* Floating clinical calculator — nothing it does is saved */}
      <ClinicalCalculator patient={patient} />


      {/* ===== Billing Checklist Modal ===== */}
      {showBillingModal && (
        <ModalOverlay>
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
                className="p-1.5 rounded-lg ui-hover text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
              {/* What earlier stages put on the bill, and who (12 Oct 2026) —
                  the nurse's HbA1c shows here; ticking it again is harmless.
                  A repeat or confirmatory test is "+" on its line (13 Oct 2026). */}
              {billingQueueItem?.id && (
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Already on the bill</h3>
                  <BillOnFile queueId={billingQueueItem.id} canRemove stage="consultation" pending={[...selectedCharges, ...selectedProcedures]}
                    onChanged={(b) => setBillOnFileCount((b?.lines || []).length)} />
                </div>
              )}

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
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 ui-hover'
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
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 ui-hover'
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
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 ui-hover'
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
                <DraftRestoreBanner draft={instructionsDraft} className="mb-2" />
                <textarea
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  placeholder="e.g. Fasting labs next visit, continue metformin 500mg, watch BP…"
                  rows={3}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-primary resize-none placeholder-gray-400"
                />
                <DraftStatus draft={instructionsDraft} className="mt-1" />
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
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 ui-hover"
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
        </ModalOverlay>
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
      <DraftChecklistModal
        isOpen={showDraftChecklist}
        drafts={visitDrafts}
        title={`Before you complete — ${visitDrafts.length} unsaved draft${visitDrafts.length === 1 ? '' : 's'}`}
        intro="Drafts are not part of the record. A draft prescription does not reach the patient, the pharmacy or billing."
        continueLabel="Complete anyway — keep drafts"
        onContinue={() => handleCompleteConsultation({ skipDraftCheck: true })}
        onOpen={openDraft}
        onClose={() => setShowDraftChecklist(false)}
      />

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
