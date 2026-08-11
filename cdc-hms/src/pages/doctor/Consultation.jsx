import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Check,
  AlertCircle,
  FileEdit,
  Stethoscope,
  MessageSquare,
  Target,
  User,
  Pill,
  LineChart,
  UserCircle,
  FileText,
  Calendar,
  X,
  Pencil,
  Wrench,
  Syringe,
  ChevronUp,
  ChevronDown,
  Menu as MenuIcon,
  Package,
  BedDouble,
} from "lucide-react";
import toast from "react-hot-toast";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import EditVitalsModal from "../../components/doctor/EditVitalsModal";
import { usePatientContext } from "../../contexts/PatientContext";
import { useQueueContext } from "../../contexts/QueueContext";
import { useUserContext } from "../../contexts/UserContext";
import { usePrescriptionContext } from "../../contexts/PrescriptionContext";
import { useAppointmentContext } from "../../contexts/AppointmentContext";
import ReferPatientModal from "../../components/doctor/ReferPatientModal";
import RecordUseModal from "../../components/stock/RecordUseModal";
import AdmitPatientModal from "../../components/doctor/AdmitPatientModal";
import { CHARGE_OPTIONS, PROCEDURE_OPTIONS } from "../../constants/billingOptions";
import { INJECTION_REASON, PENDING_INJECTION } from "../../utils/queueStatus";
import patientService from "../../services/patientService";
import ConsultationNotesPlan from "../../components/doctor/ConsultationNotesPlan";
import PrescriptionManagement from "../../components/doctor/PrescriptionManagement";
import MedicalDocumentsTab from "../../components/shared/MedicalDocumentsTab";
import GlycemicChartPanel from "../../components/doctor/GlycemicChartPanel";
import AccordionPanel from "../../components/shared/AccordionPanel";
import Glp1Tracker from "../../components/doctor/Glp1Tracker";
import PatientSummaryCard from "../../components/shared/PatientSummaryCard";
import ConsultationSummaryContainer from "../../components/doctor/ConsultationSummaryContainer";
import VisitHistoryPanel from "../../components/shared/VisitHistoryPanel";
import { formatDOB } from "../../utils/dateUtils";

// ---------------------------------------------------------------------------
// Accordion section definitions for "Today's Consultation" tab
// ---------------------------------------------------------------------------
const ACCORDION_SECTIONS = [
  // Notes + Assessment + Physical Exam + Diagnosis & Treatment Plan merged into
  // ONE section. Assessment, exam and plan are optional click-to-add blocks
  // inside it. Keeps the id 'diagnosis' so completion gating, drafts and jumps
  // are unchanged.
  { id: 'diagnosis',     label: 'Consultation',   icon: MessageSquare, required: true  },
  { id: 'prescriptions', label: 'Prescriptions',  icon: Pill,          required: false },
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
// Main component
// ---------------------------------------------------------------------------
const Consultation = () => {
  const { uhid } = useParams();
  const navigate  = useNavigate();
  const DRAFT_KEY = `consultation_progress_${uhid}`;

  const { currentUser }                               = useUserContext();
  const { fetchPatientByUHID }                        = usePatientContext();
  const { queue, sendToBilling, updateQueueStatus }   = useQueueContext();
  const { getPrescriptionsByPatient, addPrescription } = usePrescriptionContext();
  const { getAvailableSlots, addAppointment }         = useAppointmentContext();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [patient, setPatient]           = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(true);

  // Which of the 5 top-level tabs is active
  const [activeTab, setActiveTab] = useState("consultation");
  // Patient bar dropdown — slides the full Overview details open under the bar
  const [overviewOpen, setOverviewOpen] = useState(false);
  const overviewScrollRef = useRef(null);
  // Always open at the top, and freeze the page behind it while expanded
  // (MainLayout's <main> is the app scroll container; the overview scrolls itself)
  useEffect(() => {
    if (!overviewOpen) return undefined;
    if (overviewScrollRef.current) overviewScrollRef.current.scrollTop = 0;
    const main = document.querySelector('main');
    const prev = main?.style.overflowY;
    if (main) main.style.overflowY = 'hidden';
    return () => { if (main) main.style.overflowY = prev || ''; };
  }, [overviewOpen]);
  // Patient summary drawer — mobile/tablet only (always visible ≥ xl)
  const [summaryOpen, setSummaryOpen] = useState(false);
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
  const [showAdmitModal, setShowAdmitModal]         = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showBillingModal, setShowBillingModal]     = useState(false);
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

  // Load patient from UHID
  useEffect(() => {
    fetchPatientByUHID(uhid).then(p => {
      setPatient(p || null);
      setLoadingPatient(false);
    });
  }, [uhid, fetchPatientByUHID]);

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
      setActiveTab("consultation");
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
      if (sendForInjection) {
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

      if (bookFollowUp && followUpDate && followUpSlot) {
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
      setShowBillingModal(false);
      setShowSuccessMessage(true);
      setTimeout(() => navigate("/doctor/dashboard"), 3000);
    } catch {
      toast.error('Something went wrong. Please try again.', { duration: 5000, position: 'top-right' });
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

  if (loadingPatient) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500">
        <svg className="animate-spin w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Loading patient data...
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <div className="text-center py-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Patient Not Found</h2>
            <p className="text-gray-600 mb-4">Unable to find patient with UHID: {uhid}</p>
            <Button onClick={() => navigate("/doctor/dashboard")}>Back to Dashboard</Button>
          </div>
        </Card>
      </div>
    );
  }

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
  // Tab configuration (5 tabs)
  // ---------------------------------------------------------------------------
  // Overview is no longer a tab — its content opens from the patient bar dropdown.
  const tabs = [
    { id: "consultation",  label: "Today's Consultation", icon: Stethoscope   },
    { id: "history",       label: "Visit History",        icon: Calendar      },
    { id: "documents",     label: "Diagnostics",          icon: FileText      },
    { id: "charts",        label: "Charts",               icon: LineChart     },
  ];

  // getRecordsForDate — moved to VisitHistoryPanel (shared component)

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------
  return (
    <div className="pb-12">

      {/* ===== Sticky Header ===== */}
      <div className="sticky top-0 z-10 bg-gray-50 pb-3">

        {/* Patient info bar — click to slide the full patient overview open.
            While open it takes the active-tab treatment (blue, white text). */}
        <div
          onClick={() => setOverviewOpen((o) => !o)}
          className={`mb-1 px-4 py-1.5 rounded-lg shadow-sm border flex items-center justify-between gap-4 cursor-pointer transition-colors ${
            overviewOpen
              ? "bg-primary border-primary text-white"
              : "bg-white border-gray-200 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <ChevronDown
              className={`w-4 h-4 flex-shrink-0 transition-transform ${
                overviewOpen ? "rotate-180 text-white" : "text-gray-400"
              }`}
            />
            <h2 className={`text-base font-bold truncate ${overviewOpen ? "text-white" : "text-gray-800"}`}>
              {patient.name}
            </h2>
            <div className="hidden sm:flex sm:flex-col">
              <span className={`text-sm ${overviewOpen ? "text-blue-100" : "text-gray-400"}`}>
                {patient.uhid} · {patient.age} yrs · {patient.gender}
              </span>
              {patient.dateOfBirth && (
                <span className={`text-xs ${overviewOpen ? "text-blue-100" : "text-gray-400"}`}>
                  DOB: {formatDOB(patient.dateOfBirth)}
                </span>
              )}
            </div>
          </div>
          {/* Patient Summary toggle — mobile/tablet, Today's Consultation tab only
              (the panel is scoped to that tab; always visible there ≥ xl).
              Replaces the old "← Dashboard" back button (sidebar covers navigation). */}
          {activeTab === "consultation" && !overviewOpen && (
            <button
              onClick={(e) => { e.stopPropagation(); setSummaryOpen(true); }}
              className={`xl:hidden flex-shrink-0 flex items-center gap-1.5 text-sm font-semibold border rounded-lg px-3 py-1.5 transition-colors ${
                overviewOpen
                  ? "text-white border-white/60 hover:bg-white/10"
                  : "text-primary border-primary hover:bg-blue-50"
              }`}
            >
              <MenuIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Patient Summary</span>
              <span className="sm:hidden">Summary</span>
            </button>
          )}
        </div>


        {/* Overview panel — expands in flow with a smooth slide, pushing the
            tabs and all content below it down (65vh cap, scrolls internally) */}
        <div
          className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            overviewOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden min-h-0">
            <div
              ref={overviewScrollRef}
              className="h-[calc(100dvh-16rem)] md:h-[calc(100dvh-11rem)] overflow-y-auto no-scrollbar overscroll-contain py-2 mb-1 space-y-6"
            >
          <PatientSummaryCard patient={patient} shadow={false} />

          <Card shadow={false} title={<span className="flex items-center gap-2"><User className="w-6 h-6" />Patient Information</span>}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Age</p>
                <p className="font-semibold">{patient.age ? `${patient.age} years` : '—'}</p>
                {patient.dateOfBirth && (
                  <p className="text-xs text-gray-400 mt-0.5">DOB: {formatDOB(patient.dateOfBirth)}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600">Gender</p>
                <p className="font-semibold">{patient.gender || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date of Birth</p>
                <p className="font-semibold">
                  {patient.dateOfBirth
                    ? new Date(patient.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">ID Number</p>
                <p className="font-semibold">{patient.idNumber || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-semibold">{patient.phone || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold">{patient.email || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-600">Address</p>
                <p className="font-semibold">{patient.address || '—'}</p>
              </div>
              {patient.primaryDoctor && (
                <div>
                  <p className="text-sm text-gray-600">Primary Doctor</p>
                  <p className="font-semibold">{patient.primaryDoctor}</p>
                </div>
              )}
              {patient.referredBy && (
                <div>
                  <p className="text-sm text-gray-600">Referred By</p>
                  <p className="font-semibold">{patient.referredBy}</p>
                </div>
              )}
            </div>

            {/* Emergency Contact */}
            {patient.emergencyContact && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-2">Emergency Contact</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="text-sm font-semibold">{patient.emergencyContact.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Relationship</p>
                    <p className="text-sm font-semibold">{patient.emergencyContact.relationship || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm font-semibold">{patient.emergencyContact.phone || '—'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Insurance */}
            {patient.insurance && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-2">Insurance</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Provider</p>
                    <p className="text-sm font-semibold">{patient.insurance.provider || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Policy No.</p>
                    <p className="text-sm font-semibold">{patient.insurance.policyNumber || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Expiry</p>
                    <p className="text-sm font-semibold">{patient.insurance.expiryDate || '—'}</p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Allergies — safety-critical, kept; the rest of the old Medical
              Information grid (dx/risk/HbA1c/comorbidities) is covered by the
              summary panel and removed. */}
          {patient.allergies && (
            <Card shadow={false} title={<span className="flex items-center gap-2"><AlertCircle className="w-6 h-6 text-red-500" />Allergies</span>}>
              <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
                <p className="text-sm text-gray-800 font-medium">{patient.allergies}</p>
              </div>
            </Card>
          )}

          {/* Medical Equipment */}
          {patient.medicalEquipment?.insulinPump?.hasPump && (
            <Card shadow={false} title={<span className="flex items-center gap-2"><span className="text-2xl">🔋</span>Medical Equipment</span>}>
              <div className="space-y-3">
                {patient.medicalEquipment.insulinPump.current && (
                  <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <p className="text-sm font-bold text-gray-800 mb-1">⚡ Insulin Pump</p>
                    <p className="text-sm text-gray-700">
                      {patient.medicalEquipment.insulinPump.current.model || "Not specified"}{" "}
                      ({patient.medicalEquipment.insulinPump.current.serialNo})
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Active since {new Date(patient.medicalEquipment.insulinPump.current.startDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {patient.medicalEquipment.insulinPump.transmitter?.hasTransmitter && (
                  <div className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                    <p className="text-sm font-bold text-gray-800 mb-1">📡 Transmitter</p>
                    <p className="text-sm text-gray-700">
                      Serial: {patient.medicalEquipment.insulinPump.transmitter.serialNo}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Active since {new Date(patient.medicalEquipment.insulinPump.transmitter.startDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setOverviewOpen(false); }}
                className={`flex-1 min-w-max px-4 py-2.5 text-sm font-medium transition-all ${
                  activeTab === tab.id && !overviewOpen
                    ? "bg-primary text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.id === 'consultation' && tabsCompleted.diagnosis && (
                    <Check className="w-4 h-4 text-green-500 bg-white rounded-full p-0.5" />
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* ===== End Sticky Header ===== */}


      {/* ===== Tab Content =====
          Two-column layout: main tab content + right summary panel.
          The panel lives OUTSIDE the accordion grid, so ACCORDION_SECTIONS
          parity is untouched. */}
      <div className="flex flex-col xl:flex-row xl:items-start gap-4">
      <div className="flex-1 min-w-0">

      {/* ── Today's Consultation (accordion) ── */}
      {activeTab === "consultation" && (
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
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
              >
                <div className="flex items-center gap-2">
                  <Syringe className={`w-4 h-4 ${openTool === 'glp1' ? 'text-primary' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${openTool === 'glp1' ? 'text-primary' : 'text-gray-700'}`}>
                    GLP-1 / GIP agonist monitoring
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {openTool === 'glp1' ? 'Hide' : 'Open'}
                </span>
              </button>
              {openTool === 'glp1' && (
                <div className="border-t border-gray-100 p-4">
                  <Glp1Tracker
                    patient={patient}
                    onDirtyChange={setToolsDirty}
                  />
                </div>
              )}
            </div>
          </AccordionPanel>

          {/* Prescriptions — full width at the bottom */}
          {(() => {
            const section = ACCORDION_SECTIONS.find(s => s.id === 'prescriptions');
            const isCompleted = !!tabsCompleted['prescriptions'];
            return (
              <AccordionPanel
                icon={section.icon}
                label={section.label}
                badge={isCompleted && (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <Check className="w-3.5 h-3.5" /> Done
                  </span>
                )}
                isOpen={openSections === 'prescriptions'}
                onToggle={() => toggleSection('prescriptions')}
              >
                <PrescriptionManagement
                  patient={patient}
                  patientPrescriptions={patientPrescriptions}
                  addPrescription={addPrescription}
                  currentUser={currentUser}
                  onSuccess={handlePrescriptionSuccess}
                  hideCurrentStrip
                />
              </AccordionPanel>
            );
          })()}
        </div>
      )}

      {/* ── Visit History ── */}
      {activeTab === "history" && <VisitHistoryPanel patient={patient} excludeToday />}

      {/* ── Diagnostics ── */}
      {activeTab === "documents" && <MedicalDocumentsTab patient={patient} />}

      {/* ── Charts ── */}
      {activeTab === "charts" && (
        <GlycemicChartPanel patient={patient} />
      )}

      {/* ===== Action Buttons — Today's Consultation only, in flow at the very
             end of the content column: visible after scrolling past the last
             section (never obscure the summary panel or page content) ===== */}
      {activeTab === "consultation" && (
      <div className="mt-6 flex items-center justify-end gap-2">
        <button
          onClick={() => setShowRecordUse(true)}
          className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg transition-colors"
        >
          <Package className="w-3.5 h-3.5" />
          Record Use
        </button>

        <button
          onClick={() => setShowRecordUse(true)}
          className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg transition-colors"
        >
          <Package className="w-3.5 h-3.5" />
          Record Use
        </button>

        <button
          onClick={() => setShowReferModal(true)}
          className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <UserCircle className="w-3.5 h-3.5" />
          Refer Patient
        </button>

        {showRecordUse && (
          <RecordUseModal
            patient={{ uhid: patient.uhid, name: patient.name }}
            onClose={() => setShowRecordUse(false)}
          />
        )}

        <button
          onClick={() => setShowAdmitModal(true)}
          className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <BedDouble className="w-3.5 h-3.5" />
          Admit Patient
        </button>

        <button
          onClick={handleCompleteConsultation}
          disabled={!tabsCompleted.diagnosis && !hasActiveDx}
          className="flex items-center gap-1.5 bg-primary hover:opacity-90 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="w-3.5 h-3.5" />
          Complete Consultation
        </button>
      </div>
      )}

      </div>

      {/* ── Right summary panel ──
          ≥ xl: always-visible, FIXED to the viewport — main scrolling can never
          move it (sticky still travels once its flex parent runs out; fixed
          cannot). The spacer below reserves its column in the layout.
          < xl: right-side floating drawer opened by the "Patient Summary" button. */}

      {/* Summary panel — Today's Consultation tab only (not a global feature) */}
      {activeTab === "consultation" && (
      <>
      {/* Drawer backdrop — mobile/tablet only (toggle lives in the patient info bar) */}
      {summaryOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 xl:hidden" onClick={() => setSummaryOpen(false)} />
      )}

      <aside
        className={`
          fixed inset-y-4 right-4 z-40 w-[320px] max-w-[88vw] md:w-[50vw] overflow-y-auto no-scrollbar overscroll-contain rounded-[20px] bg-gray-50 shadow-2xl p-3
          transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${summaryOpen ? "translate-x-0" : "translate-x-[calc(100%+1.5rem)]"}
          xl:inset-auto xl:top-[7.5rem] xl:right-8 xl:z-[5] xl:w-[340px] xl:max-w-none xl:translate-x-0
          xl:max-h-[calc(100dvh-8.5rem)] xl:rounded-none xl:bg-transparent xl:shadow-none xl:p-0
        `}
      >
        {/* Drawer header — mobile/tablet only */}
        <div className="xl:hidden flex items-center justify-between mb-2 px-1">
          <span className="text-sm font-bold text-gray-700">Patient Summary</span>
          <button onClick={() => setSummaryOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
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
            setActiveTab("consultation");
            setOpenSections("prescriptions");
            setSummaryOpen(false);
          }}
          onEditVitals={() => setShowVitalsModal(true)}
          onDiagnosesChange={setTrackedDiagnoses}
        />
      </aside>

      {/* Spacer — reserves the fixed panel's column in the xl layout */}
      <div className="hidden xl:block w-[340px] flex-shrink-0" aria-hidden="true" />
      </>
      )}
      </div>


      {/* ===== Billing Checklist Modal ===== */}
      {showBillingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Complete Consultation</h2>
                <p className="text-sm text-gray-500 mt-0.5">Select charges and procedures for this visit</p>
              </div>
              <button
                onClick={() => setShowBillingModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
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
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
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
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
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

              {/* Send for injection — routes to the nurse instead of billing */}
              <div>
                <label
                  className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                    sendForInjection
                      ? 'bg-green-50 border-green-400 text-gray-800'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
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
            </div>

            <div className="px-6 py-4 border-t flex-shrink-0">
              {!hasBillingSelection && (
                <p className="text-xs text-red-600 mb-2.5">
                  Select at least one charge or procedure. Use "No Charge" if the visit is free.
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBillingModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBillingSubmit}
                  disabled={billingSubmitting || !hasBillingSelection || (bookFollowUp && (!followUpDate || !followUpSlot))}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {billingSubmitting
                    ? 'Submitting…'
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
          onSaved={() => fetchPatientByUHID(uhid).then(p => setPatient(p || null))}
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
            onClose={() => setShowReferModal(false)}
            onSuccess={() => {
              sessionStorage.removeItem(DRAFT_KEY);
              setShowReferModal(false);
              navigate('/doctor/dashboard');
            }}
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
            onClose={() => setShowAdmitModal(false)}
            onSuccess={() => {
              sessionStorage.removeItem(DRAFT_KEY);
              setShowAdmitModal(false);
              navigate('/doctor/dashboard');
            }}
          />
        );
      })()}

    </div>
  );
};

export default Consultation;
