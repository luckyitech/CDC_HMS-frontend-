import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import VitalsGrid from '../../components/shared/VitalsGrid';
import { useParams, useNavigate } from "react-router-dom";
import {
  Check,
  AlertCircle,
  ClipboardList,
  FileEdit,
  Stethoscope,
  MessageSquare,
  Target,
  User,
  Activity,
  Pill,
  // FlaskConical, // Order Lab — hidden, not in use yet
  LineChart,
  UserCircle,
  FileText,
  Calendar,
  ClipboardCheck,
  X,
  Pencil,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import EditVitalsModal from "../../components/doctor/EditVitalsModal";
import { usePatientContext } from "../../contexts/PatientContext";
import { useQueueContext } from "../../contexts/QueueContext";
import { useUserContext } from "../../contexts/UserContext";
import { useInitialAssessmentContext } from "../../contexts/InitialAssessmentContext";
import { usePhysicalExamContext } from "../../contexts/PhysicalExamContext";
import { useTreatmentPlanContext } from "../../contexts/TreatmentPlanContext";
import { usePrescriptionContext } from "../../contexts/PrescriptionContext";
import { useConsultationNotesContext } from "../../contexts/ConsultationNotesContext";
import OrderLabTestModal from "../../components/doctor/OrderLabTestModal";
import ReferPatientModal from "../../components/doctor/ReferPatientModal";
import { CHARGE_OPTIONS, PROCEDURE_OPTIONS } from "../../constants/billingOptions";
import patientService from "../../services/patientService";
import InitialAssessment from "./InitialAssessment";
import PhysicalExamList from "../../components/doctor/PhysicalExamList";
import PhysicalExamFindings from "./PhysicalExamFindings";
import TreatmentPlansList from "../../components/doctor/TreatmentPlansList";
import ConsultationNotesList from "../../components/doctor/ConsultationNotesList";
import PrescriptionManagement from "../../components/doctor/PrescriptionManagement";
import MedicalDocumentsTab from "../../components/shared/MedicalDocumentsTab";
import GlycemicChartPanel from "../../components/doctor/GlycemicChartPanel";

// ---------------------------------------------------------------------------
// Accordion section definitions for "Today's Consultation" tab
// ---------------------------------------------------------------------------
const ACCORDION_SECTIONS = [
  { id: 'assessment',    label: 'Assessment',                 icon: FileEdit,      required: false },
  { id: 'exam',          label: 'Physical Exam',              icon: Stethoscope,   required: false },
  { id: 'notes',         label: 'Consultation Notes',         icon: MessageSquare, required: false },
  { id: 'diagnosis',     label: 'Diagnosis & Treatment Plan', icon: Target,        required: true  },
  { id: 'prescriptions', label: 'Prescriptions',              icon: Pill,          required: false },
];

// ---------------------------------------------------------------------------
// Reusable accordion panel — shared by Vitals, each consultation section, Prescriptions
// ---------------------------------------------------------------------------

/**
 * AccordionPanel
 * Props:
 *   icon      — Lucide component (the class, not an element)
 *   label     — string header text
 *   badge     — optional pre-rendered JSX shown after the label (status chips, etc.)
 *   isOpen    — boolean
 *   onToggle  — () => void
 *   padding   — Tailwind padding class for the body (default "p-4")
 *   children  — body content
 */
const AccordionPanel = ({ icon, label, badge, isOpen, onToggle, padding = 'p-4', children }) => {
  const Icon = icon; // alias so ESLint recognises JSX usage
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${isOpen ? 'text-primary' : 'text-gray-400'}`} />
          <span className={`font-semibold ${isOpen ? 'text-primary' : 'text-gray-800'}`}>{label}</span>
          {badge}
        </div>
        {isOpen
          ? <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
          : <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
        }
      </button>
      <div className={isOpen ? 'block' : 'hidden'}>
        <div className={`border-t border-gray-100 ${padding}`}>{children}</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Read-only history helpers (used inside Visit History tab)
// ---------------------------------------------------------------------------

// Maps a list of [label, value] pairs into labeled text blocks, skipping empty ones
const HistoryField = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="p-2 bg-white rounded border border-gray-100">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{value}</p>
    </div>
  );
};

// Accepts a pre-rendered `icon` element so ESLint doesn't flag a component-as-variable
const VisitSectionHeader = ({ icon, label }) => (
  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
    {icon}
    {label}
  </h4>
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
  const { queue, sendToBilling }                      = useQueueContext();
  const { getLatestAssessment, getAssessmentsByPatient } = useInitialAssessmentContext();
  const { getLatestExamination, getExaminationsByPatient, getExaminationById } = usePhysicalExamContext();
  const { getLatestPlan, getPlansByPatient }           = useTreatmentPlanContext();
  const { getPrescriptionsByPatient, addPrescription } = usePrescriptionContext();
  const { getNotesByPatient }                         = useConsultationNotesContext();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [patient, setPatient]           = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(true);

  // Which of the 5 top-level tabs is active
  const [activeTab, setActiveTab] = useState("overview");

  // Which accordion sections inside "Today's Consultation" are open
  const [openSections, setOpenSections] = useState(new Set());

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

  // Data loaded for the Overview tab
  const [previousPlan, setPreviousPlan]             = useState(null);
  const [patientPrescriptions, setPatientPrescriptions] = useState([]);

  // Unsaved form state for Assessment section (pre-populated from last visit)
  const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState("");
  const [reviewOfSystems, setReviewOfSystems]                 = useState("");
  const [pastMedicalHistory, setPastMedicalHistory]           = useState("");
  const [familyHistory, setFamilyHistory]                     = useState("");
  const [socialHistory, setSocialHistory]                     = useState("");

  // Unsaved form state for Exam section
  const [generalAppearance, setGeneralAppearance] = useState("");
  const [cardiovascular, setCardiovascular]       = useState("");
  const [respiratory, setRespiratory]             = useState("");
  const [gastrointestinal, setGastrointestinal]   = useState("");
  const [neurological, setNeurological]           = useState("");
  const [musculoskeletal, setMusculoskeletal]     = useState("");
  const [skin, setSkin]                           = useState("");
  const [examFindings, setExamFindings]           = useState("");

  // Visit History tab
  const [historyData, setHistoryData]           = useState(null);  // null = not yet fetched
  const [historyLoading, setHistoryLoading]     = useState(false);
  const [openHistoryDates, setOpenHistoryDates] = useState({});    // { 'YYYY-MM-DD': true }
  const [historyFromDate, setHistoryFromDate]   = useState('');
  const [historyToDate, setHistoryToDate]       = useState('');
  const [historyPage, setHistoryPage]           = useState(1);
  const HISTORY_PAGE_SIZE = 10;
  // Cache of full exam objects keyed by exam id (fetched on demand when a date is expanded)
  const [fullExamCache, setFullExamCache]       = useState({});

  // Refs so toggleHistoryDate can read latest state without stale closures
  const historyDataRef   = useRef(historyData);
  const fullExamCacheRef = useRef(fullExamCache);
  useEffect(() => { historyDataRef.current   = historyData;   }, [historyData]);
  useEffect(() => { fullExamCacheRef.current = fullExamCache; }, [fullExamCache]);

  // Modals
  const [showVitalsModal, setShowVitalsModal]       = useState(false);
  const [showReferModal, setShowReferModal]         = useState(false);
  const [showOrderLabModal, setShowOrderLabModal]   = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showBillingModal, setShowBillingModal]     = useState(false);
  const [selectedCharges, setSelectedCharges]       = useState([]);
  const [selectedProcedures, setSelectedProcedures] = useState([]);
  const [billingSubmitting, setBillingSubmitting]   = useState(false);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  // Orange dot shown on accordion section headers when fields are dirty
  const tabsUnsaved = useMemo(() => ({
    assessment:
      historyOfPresentIllness !== "" || reviewOfSystems !== "" ||
      pastMedicalHistory !== ""      || familyHistory !== ""   ||
      socialHistory !== "",
    exam:
      generalAppearance !== "" || cardiovascular !== ""  ||
      respiratory !== ""       || gastrointestinal !== "" ||
      neurological !== ""      || musculoskeletal !== ""  ||
      skin !== ""              || examFindings !== "",
  }), [
    historyOfPresentIllness, reviewOfSystems, pastMedicalHistory,
    familyHistory, socialHistory,
    generalAppearance, cardiovascular, respiratory,
    gastrointestinal, neurological, musculoskeletal, skin, examFindings,
  ]);

  // Unique visit dates (YYYY-MM-DD), newest first, excluding today, filtered by date range
  const visitDates = useMemo(() => {
    if (!historyData) return [];
    const today   = new Date().toISOString().slice(0, 10);
    const dateSet = new Set();

    const addDates = (records, field = 'createdAt') => {
      (records || []).forEach(r => {
        const day = (r[field] || r.createdAt || '').slice(0, 10);
        if (day && day !== today) dateSet.add(day);
      });
    };

    addDates(historyData.assessments);
    addDates(historyData.exams, 'date');
    addDates(historyData.plans, 'date');
    addDates(historyData.prescriptions);
    addDates(historyData.notes, 'date');
    addDates(historyData.vitals, 'recordedAt');

    return [...dateSet]
      .sort((a, b) => b.localeCompare(a))
      .filter(d => (!historyFromDate || d >= historyFromDate) && (!historyToDate || d <= historyToDate));
  }, [historyData, historyFromDate, historyToDate]);

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

  // Load overview data (prescriptions, latest plan, last assessment/exam values)
  useEffect(() => {
    if (!patient) return;
    let isMounted = true;

    const loadData = async () => {
      const [prescriptions, latestPlan, prevAssessment, prevExam] = await Promise.all([
        getPrescriptionsByPatient(uhid),
        getLatestPlan(uhid),
        getLatestAssessment(uhid),
        getLatestExamination(uhid),
      ]);
      if (!isMounted) return;

      setPatientPrescriptions(Array.isArray(prescriptions) ? prescriptions : []);
      setPreviousPlan(latestPlan || null);

      if (prevAssessment) {
        setHistoryOfPresentIllness(prevAssessment.historyOfPresentIllness || "");
        setReviewOfSystems(prevAssessment.reviewOfSystems   || "");
        setPastMedicalHistory(prevAssessment.pastMedicalHistory || "");
        setFamilyHistory(prevAssessment.familyHistory       || "");
        setSocialHistory(prevAssessment.socialHistory       || "");
      }
      if (prevExam) {
        setGeneralAppearance(prevExam.generalAppearance || "");
        setCardiovascular(prevExam.cardiovascular       || "");
        setRespiratory(prevExam.respiratory             || "");
        setGastrointestinal(prevExam.gastrointestinal   || "");
        setNeurological(prevExam.neurological           || "");
        setMusculoskeletal(prevExam.musculoskeletal     || "");
        setSkin(prevExam.skin                           || "");
        setExamFindings(prevExam.examFindings           || "");
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [
    uhid, patient,
    getPrescriptionsByPatient, getLatestPlan, getLatestAssessment, getLatestExamination,
  ]);

  // Lazy-fetch all history records when the Visit History tab is first opened
  useEffect(() => {
    if (activeTab !== 'history' || historyData !== null || !patient) return;

    let isMounted = true;
    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const [assessments, exams, plans, prescriptions, { notes }, vitalsRes] = await Promise.all([
          getAssessmentsByPatient(uhid),
          getExaminationsByPatient(uhid),
          getPlansByPatient(uhid),
          getPrescriptionsByPatient(uhid),
          getNotesByPatient(uhid),
          // Isolated so a vitals failure doesn't abort the entire history fetch
          patientService.getVitalsHistory(uhid).catch(() => ({ success: false, data: [] })),
        ]);
        if (isMounted) {
          const vitals = vitalsRes?.success ? (vitalsRes.data || []) : [];
          setHistoryData({
            assessments:   Array.isArray(assessments)   ? assessments   : [],
            exams:         Array.isArray(exams)         ? exams         : [],
            plans:         Array.isArray(plans)         ? plans         : [],
            prescriptions: Array.isArray(prescriptions) ? prescriptions : [],
            notes:         Array.isArray(notes)         ? notes         : [],
            vitals:        Array.isArray(vitals)        ? vitals        : [],
          });
        }
      } finally {
        if (isMounted) setHistoryLoading(false);
      }
    };

    fetchHistory();
    return () => { isMounted = false; };
  }, [
    activeTab, historyData, patient, uhid,
    getAssessmentsByPatient, getExaminationsByPatient,
    getPlansByPatient, getPrescriptionsByPatient, getNotesByPatient,
  ]);

  // Reset to page 1 whenever date filters change
  useEffect(() => {
    setHistoryPage(1);
  }, [historyFromDate, historyToDate]);

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
    if (!tabsCompleted.diagnosis) {
      toast.error(
        "Please complete Diagnosis & Treatment Plan before completing consultation",
        { duration: 4000, position: "top-right", icon: "❌",
          style: { background: "#EF4444", color: "#FFFFFF", fontWeight: "bold", padding: "16px" } }
      );
      // Navigate to Today's Consultation and open the Diagnosis section
      setActiveTab("consultation");
      setOpenSections(prev => new Set([...prev, 'diagnosis']));
      return;
    }
    setSelectedCharges([]);
    setSelectedProcedures([]);
    setShowBillingModal(true);
  };

  const handleBillingSubmit = async () => {
    const queueItem = queue.find(q => q.uhid === patient.uhid && q.status === 'With Doctor');
    if (!queueItem) {
      toast.error('Could not find an active queue entry for this patient. Please refresh and try again.', {
        duration: 5000, position: 'top-right',
      });
      setBillingSubmitting(false);
      return;
    }
    setBillingSubmitting(true);
    await sendToBilling(queueItem.id, selectedCharges, selectedProcedures);
    sessionStorage.removeItem(DRAFT_KEY);
    setBillingSubmitting(false);
    setShowBillingModal(false);
    setShowSuccessMessage(true);
    setTimeout(() => navigate("/doctor/dashboard"), 3000);
  };

  const toggleCharge    = (item) =>
    setSelectedCharges(prev => prev.includes(item) ? prev.filter(c => c !== item) : [...prev, item]);

  const toggleProcedure = (item) =>
    setSelectedProcedures(prev => prev.includes(item) ? prev.filter(p => p !== item) : [...prev, item]);

  const toggleSection = useCallback((id) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleHistoryDate = useCallback((date) => {
    setOpenHistoryDates(prev => {
      const isOpening = !prev[date];
      // When opening a date, fetch full exam data for any exams on that date
      if (isOpening && historyDataRef.current) {
        const examsOnDate = (historyDataRef.current.exams || [])
          .filter(e => (e.date || e.createdAt || '').slice(0, 10) === date);
        examsOnDate.forEach(exam => {
          if (!fullExamCacheRef.current[exam.id]) {
            getExaminationById(exam.id)
              .then(full => setFullExamCache(c => ({ ...c, [exam.id]: full || 'error' })))
              .catch(() => setFullExamCache(c => ({ ...c, [exam.id]: 'error' })));
          }
        });
      }
      return { ...prev, [date]: isOpening };
    });
  }, [getExaminationById]);

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
  const tabs = [
    { id: "overview",      label: "Overview",             icon: ClipboardList },
    { id: "consultation",  label: "Today's Consultation", icon: Stethoscope   },
    { id: "history",       label: "Visit History",        icon: Calendar      },
    { id: "documents",     label: "Documents",            icon: FileText      },
    { id: "charts",        label: "Charts",               icon: LineChart     },
  ];

  // Helper: get all records for a specific date from historyData
  const getRecordsForDate = (date) => ({
    assessments:   (historyData?.assessments   || []).filter(r => r.createdAt?.slice(0, 10) === date),
    exams:         (historyData?.exams         || []).filter(r => (r.date || r.createdAt || '').slice(0, 10) === date),
    plans:         (historyData?.plans         || []).filter(r => (r.date || r.createdAt || '').slice(0, 10) === date),
    prescriptions: (historyData?.prescriptions || []).filter(r => r.createdAt?.slice(0, 10) === date),
    notes:         (historyData?.notes         || []).filter(r => (r.date || r.createdAt || '').slice(0, 10) === date),
    vitals:        (historyData?.vitals        || []).filter(r => (r.recordedAt || '').slice(0, 10) === date),
  });

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------
  return (
    <div className="pb-12">

      {/* ===== Sticky Header ===== */}
      <div className="sticky top-0 z-10 bg-gray-50 pb-1">

        {/* Patient info bar */}
        <div className="mb-1 bg-white px-4 py-1.5 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-bold text-gray-800 truncate">{patient.name}</h2>
            <span className="hidden sm:inline text-sm text-gray-400">
              {patient.uhid} · {patient.age} yrs · {patient.gender}
            </span>
          </div>
          <button
            onClick={() => navigate("/doctor/dashboard")}
            className="flex-shrink-0 text-sm font-medium text-gray-600 hover:text-primary transition-colors"
          >
            ← Dashboard
          </button>
        </div>

        {/* Tab navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-max px-4 py-2.5 text-sm font-medium transition-all ${
                  activeTab === tab.id ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-50"
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


      {/* ===== Tab Content ===== */}

      {/* ── Overview ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <Card title={<span className="flex items-center gap-2"><User className="w-6 h-6" />Patient Information</span>}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Age</p>
                <p className="font-semibold">{patient.age} years</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Gender</p>
                <p className="font-semibold">{patient.gender}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Diagnosis</p>
                <p className="font-semibold">{patient.diagnosis}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last HbA1c</p>
                <p className="font-semibold text-red-600">{patient.hba1c}</p>
              </div>
            </div>
          </Card>

          {/* Vitals / Triage */}
          {!patient.vitals && (
            <Card title="Vitals">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">No vitals recorded yet.</p>
                <Button variant="outline" onClick={() => setShowVitalsModal(true)} className="flex items-center gap-2 text-sm">
                  <Pencil size={14} /> Record Vitals
                </Button>
              </div>
            </Card>
          )}
          {patient.vitals && (
            <Card title={<span className="flex items-center gap-2"><ClipboardList className="w-6 h-6" />Today's Triage</span>}>
              <div className="mb-4 pb-4 border-b">
                <p className="text-sm text-gray-600">
                  Triaged on:{" "}
                  {patient.vitals.recordedAt ? new Date(patient.vitals.recordedAt).toLocaleString() : "Today"}
                </p>
              </div>
              {patient.vitals.chiefComplaint && (
                <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Reason for visit:</p>
                  <p className="text-gray-800">{patient.vitals.chiefComplaint}</p>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Activity className="w-5 h-5" /> Vital Signs
                  </h4>
                  <Button variant="outline" onClick={() => setShowVitalsModal(true)} className="flex items-center gap-2 text-sm">
                    <Pencil size={14} /> Edit Vitals
                  </Button>
                </div>
                <VitalsGrid vitals={patient.vitals} />
              </div>
            </Card>
          )}

          {/* Medical Info */}
          <Card title={<span className="flex items-center gap-2"><Activity className="w-6 h-6" />Medical Information</span>}>
            <div className="space-y-4">
              {patient.medications && patient.medications.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Current Medications:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {patient.medications.map((med, i) => (
                      <li key={i} className="text-sm text-gray-600">{med}</li>
                    ))}
                  </ul>
                </div>
              )}
              {patient.allergies && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
                  <p className="text-sm font-semibold text-red-700 mb-1 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Allergies:
                  </p>
                  <p className="text-sm text-gray-800 font-medium">{patient.allergies}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Previous Treatment Plan */}
          {previousPlan && (
            <Card title={<span className="flex items-center gap-2"><ClipboardCheck className="w-6 h-6" />Previous Treatment Plan</span>}>
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{previousPlan.diagnosis}</p>
                    <p className="text-xs text-gray-600 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(previousPlan.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {" "}&mdash; By {previousPlan.doctorName}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    previousPlan.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                  }`}>
                    {previousPlan.status}
                  </span>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Plan:</p>
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">{previousPlan.plan}</pre>
                </div>
              </div>
            </Card>
          )}

          {/* Medical Equipment */}
          {patient.medicalEquipment?.insulinPump?.hasPump && (
            <Card title={<span className="flex items-center gap-2"><span className="text-2xl">🔋</span>Medical Equipment</span>}>
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
      )}

      {/* ── Today's Consultation (accordion) ── */}
      {activeTab === "consultation" && (
        <div className="space-y-3">
          {/* Reminder banner when diagnosis hasn't been completed */}
          {!tabsCompleted.diagnosis && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                Complete <strong>Diagnosis &amp; Treatment Plan</strong> before sending the patient to billing.
              </p>
            </div>
          )}

          {/* Triage Vitals — full width */}
          <AccordionPanel
            icon={Activity}
            label="Today's Triage Vitals"
            badge={!patient.vitals && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Not recorded</span>
            )}
            isOpen={openSections.has('vitals')}
            onToggle={() => toggleSection('vitals')}
            padding="p-5 space-y-4"
          >
            {patient.vitals ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Recorded: {patient.vitals.recordedAt
                      ? new Date(patient.vitals.recordedAt).toLocaleString()
                      : 'Today'}
                  </p>
                  <button
                    onClick={() => setShowVitalsModal(true)}
                    className="flex items-center gap-1.5 text-xs font-medium text-primary border border-primary rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit Vitals
                  </button>
                </div>
                {patient.vitals.chiefComplaint && (
                  <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
                    <p className="text-xs font-semibold text-gray-600 mb-0.5">Reason for Visit</p>
                    <p className="text-sm text-gray-800">{patient.vitals.chiefComplaint}</p>
                  </div>
                )}
                <VitalsGrid vitals={patient.vitals} />
              </>
            ) : (
              <div className="flex items-center justify-between py-2">
                <p className="text-sm text-gray-500">No triage vitals recorded for today&apos;s visit.</p>
                <button
                  onClick={() => setShowVitalsModal(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary border border-primary rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Record Vitals
                </button>
              </div>
            )}
          </AccordionPanel>

          {/* Two independent columns for the first 4 sections, Prescriptions full-width below.
              Left column: even-indexed sections (0, 2) — Assessment, Notes
              Right column: odd-indexed sections (1, 3)  — Physical Exam, Diagnosis */}
          <div className="flex flex-col lg:flex-row gap-3 lg:items-start">
            {[0, 1].map((colIdx) => (
              <div key={colIdx} className="flex-1 flex flex-col gap-3">
                {ACCORDION_SECTIONS.filter((s) => s.id !== 'prescriptions').filter((_, i) => i % 2 === colIdx).map((section) => {
                  const isOpen      = openSections.has(section.id);
                  const isCompleted = !!tabsCompleted[section.id];
                  const isUnsaved   = !!(tabsUnsaved[section.id] && !isCompleted);

                  const badge = (
                    <>
                      {section.required && (
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
                      {section.id === 'assessment' && <InitialAssessment uhid={uhid} embedded={true} />}
                      {section.id === 'exam'       && <PhysicalExamList patient={patient} embedded={true} />}
                      {section.id === 'notes'      && <ConsultationNotesList patient={patient} />}
                      {section.id === 'diagnosis'  && (
                        <TreatmentPlansList
                          patient={patient}
                          showStatistics={false}
                          showCreateForm={true}
                          currentUser={currentUser}
                          onSuccess={handleDiagnosisSuccess}
                        />
                      )}
                    </AccordionPanel>
                  );
                })}
              </div>
            ))}
          </div>

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
                isOpen={openSections.has('prescriptions')}
                onToggle={() => toggleSection('prescriptions')}
              >
                <PrescriptionManagement
                  patient={patient}
                  patientPrescriptions={patientPrescriptions}
                  addPrescription={addPrescription}
                  currentUser={currentUser}
                  onSuccess={handlePrescriptionSuccess}
                />
              </AccordionPanel>
            );
          })()}
        </div>
      )}

      {/* ── Visit History ── */}
      {activeTab === "history" && (
        <div className="space-y-4">

          {/* Filters */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={historyFromDate}
                  onChange={e => setHistoryFromDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={historyToDate}
                  onChange={e => setHistoryToDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              {(historyFromDate || historyToDate) && (
                <button
                  onClick={() => { setHistoryFromDate(''); setHistoryToDate(''); }}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
              )}
              {historyData && (
                <p className="text-xs text-gray-400 ml-auto self-center">
                  {visitDates.length} visit{visitDates.length !== 1 ? 's' : ''} found
                </p>
              )}
            </div>
          </div>

          {historyLoading && (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <svg className="animate-spin w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Loading visit history...
            </div>
          )}

          {!historyLoading && historyData && visitDates.length === 0 && (
            <div className="text-center py-16">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              {(historyFromDate || historyToDate) ? (
                <>
                  <p className="text-gray-500 text-lg font-medium">No visits found</p>
                  <p className="text-sm text-gray-400 mt-1">No visits match the selected date range.</p>
                </>
              ) : (
                <>
                  <p className="text-gray-500 text-lg font-medium">No past visits found</p>
                  <p className="text-sm text-gray-400 mt-1">This is the patient&apos;s first visit.</p>
                </>
              )}
            </div>
          )}

          {!historyLoading && (() => {
            const totalPages     = Math.ceil(visitDates.length / HISTORY_PAGE_SIZE);
            const paginatedDates = visitDates.slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE);
            return (
              <>
                {paginatedDates.map((date) => {
            const records  = getRecordsForDate(date);
            const isOpen   = !!openHistoryDates[date];
            const total    = records.assessments.length + records.exams.length +
                             records.plans.length + records.prescriptions.length +
                             records.notes.length + records.vitals.length;
            const formatted = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            });

            return (
              <div key={date} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {/* Date row */}
                <button
                  onClick={() => toggleHistoryDate(date)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className={`w-5 h-5 ${isOpen ? 'text-primary' : 'text-gray-400'}`} />
                    <span className={`font-semibold ${isOpen ? 'text-primary' : 'text-gray-800'}`}>
                      {formatted}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {total} record{total !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {isOpen
                    ? <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    : <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  }
                </button>

                {/* Expanded visit records */}
                {isOpen && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">

                    {/* Triage Vitals */}
                    {records.vitals.length > 0 && (
                      <div className="p-5 space-y-4">
                        <VisitSectionHeader icon={<Activity className="w-3.5 h-3.5" />} label="Triage Vitals" />
                        {records.vitals.map((v, idx) => (
                          <div key={idx} className="space-y-3">
                            {v.chiefComplaint && (
                              <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
                                <p className="text-xs font-semibold text-gray-600 mb-0.5">Reason for Visit</p>
                                <p className="text-sm text-gray-800">{v.chiefComplaint}</p>
                              </div>
                            )}
                            <VitalsGrid vitals={v} />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Treatment Plans */}
                    {records.plans.length > 0 && (
                      <div className="p-5 space-y-3">
                        <VisitSectionHeader icon={<Target className="w-3.5 h-3.5" />} label="Diagnosis & Treatment Plan" />
                        {records.plans.map(plan => (
                          <div key={plan.id} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                            <div className="flex justify-between items-start mb-1">
                              <p className="font-semibold text-gray-800 text-sm">{plan.diagnosis}</p>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                plan.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                              }`}>{plan.status}</span>
                            </div>
                            {plan.doctorName && (
                              <p className="text-xs text-gray-500 mb-2">By {plan.doctorName}</p>
                            )}
                            {plan.plan && (
                              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans bg-white rounded p-2 border border-blue-100">
                                {plan.plan}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Assessments */}
                    {records.assessments.length > 0 && (
                      <div className="p-5 space-y-3">
                        <VisitSectionHeader icon={<FileEdit className="w-3.5 h-3.5" />} label="Assessment" />
                        {records.assessments.map(a => (
                          <div key={a.id} className="space-y-2">
                            <HistoryField label="History of Present Illness" value={a.historyOfPresentIllness} />
                            <HistoryField label="Past Medical History"       value={a.pastMedicalHistory} />
                            <HistoryField label="Family History"             value={a.familyHistory} />
                            <HistoryField label="Social History"             value={a.socialHistory} />
                            <HistoryField label="Review of Systems"          value={a.reviewOfSystems} />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Physical Exams — rendered using the full PhysicalExamFindings component */}
                    {records.exams.length > 0 && (
                      <div className="p-5 space-y-4">
                        <VisitSectionHeader icon={<Stethoscope className="w-3.5 h-3.5" />} label="Physical Exam" />
                        {records.exams.map(e => {
                          const full = fullExamCache[e.id];
                          if (full === 'error') {
                            return (
                              <div key={e.id} className="py-3 px-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                Failed to load exam details. Please try closing and reopening this date.
                              </div>
                            );
                          }
                          if (!full) {
                            return (
                              <div key={e.id} className="flex items-center gap-2 py-4 text-sm text-gray-400">
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                Loading exam details…
                              </div>
                            );
                          }
                          return (
                            <PhysicalExamFindings
                              key={e.id}
                              examinationData={full}
                              onEdit={null}
                              onPrint={() => window.print()}
                              onClose={null}
                            />
                          );
                        })}
                      </div>
                    )}

                    {/* Consultation Notes */}
                    {records.notes.length > 0 && (
                      <div className="p-5 space-y-3">
                        <VisitSectionHeader icon={<MessageSquare className="w-3.5 h-3.5" />} label="Consultation Notes" />
                        {records.notes.map(note => (
                          <div key={note.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            {note.doctorName && (
                              <p className="text-xs text-gray-500 mb-1">By {note.doctorName}</p>
                            )}
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.notes}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Prescriptions */}
                    {records.prescriptions.length > 0 && (
                      <div className="p-5 space-y-3">
                        <VisitSectionHeader icon={<Pill className="w-3.5 h-3.5" />} label="Prescriptions" />
                        {records.prescriptions.map(rx => (
                          <div key={rx.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            {(rx.prescribedBy || rx.doctorName) && (
                              <p className="text-xs text-gray-500 mb-2">
                                By {rx.prescribedBy || rx.doctorName}
                                {rx.status && ` · ${rx.status}`}
                              </p>
                            )}
                            <ul className="space-y-1.5">
                              {(rx.medications || []).map((med, i) => (
                                <li key={i}>
                                  <span className="font-medium text-gray-800 text-sm">{med.name}</span>
                                  <span className="text-gray-500 text-sm">
                                    {med.dosage    ? ` · ${med.dosage}`    : ''}
                                    {med.frequency ? ` · ${med.frequency}` : ''}
                                    {med.duration  ? ` · ${med.duration}`  : ''}
                                  </span>
                                  {med.instructions && (
                                    <p className="text-xs text-gray-400 mt-0.5">{med.instructions}</p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
                })}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-gray-500">
                      Page {historyPage} of {totalPages} · {visitDates.length} visit{visitDates.length !== 1 ? 's' : ''}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                        disabled={historyPage === 1}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Prev
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - historyPage) <= 1)
                        .map((p, idx, arr) => (
                          <div key={p} className="flex items-center gap-1">
                            {idx > 0 && arr[idx - 1] !== p - 1 && (
                              <span className="px-2 text-gray-400">…</span>
                            )}
                            <button
                              onClick={() => setHistoryPage(p)}
                              className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${
                                p === historyPage ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {p}
                            </button>
                          </div>
                        ))
                      }
                      <button
                        onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                        disabled={historyPage === totalPages}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ── Documents ── */}
      {activeTab === "documents" && (
        <div className="space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>ℹ️ Optional:</strong> Upload external medical documents, lab reports, or imaging results
              during consultation. This step is not required to complete the consultation.
            </p>
          </div>
          <MedicalDocumentsTab patient={patient} />
        </div>
      )}

      {/* ── Charts ── */}
      {activeTab === "charts" && (
        <GlycemicChartPanel patient={patient} />
      )}


      {/* ===== Floating Action Buttons ===== */}
      <div className="fixed bottom-3 right-4 z-20 flex items-center gap-2">
        {/* Order Lab button hidden — not in use yet */}
        {/* <button
          onClick={() => setShowOrderLabModal(true)}
          className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg transition-colors"
        >
          <FlaskConical className="w-3.5 h-3.5" />
          Order Lab
        </button> */}

        <button
          onClick={() => setShowReferModal(true)}
          className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg transition-colors"
        >
          <UserCircle className="w-3.5 h-3.5" />
          Refer Patient
        </button>

        <button
          onClick={handleCompleteConsultation}
          disabled={!tabsCompleted.diagnosis}
          className="flex items-center gap-1.5 bg-primary hover:opacity-90 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="w-3.5 h-3.5" />
          Complete Consultation
        </button>
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

              <div>
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 pb-1 border-b">Procedures</h3>
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
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0">
              <button
                onClick={() => setShowBillingModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBillingSubmit}
                disabled={billingSubmitting}
                className="flex-1 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-bold disabled:opacity-60"
              >
                {billingSubmitting ? 'Submitting…' : 'Confirm & Send to Billing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Order Lab Test Modal — hidden, not in use yet ===== */}
      {/* {showOrderLabModal && (
        <OrderLabTestModal
          patient={patient}
          onClose={() => setShowOrderLabModal(false)}
          onSuccess={() => {}}
        />
      )} */}

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
        const activeQueueItem = queue.find(q => q.uhid === patient.uhid && q.status === 'With Doctor');
        if (!activeQueueItem) {
          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full text-center space-y-4">
                <p className="text-gray-700 font-medium">Unable to load queue data.</p>
                <p className="text-sm text-gray-500">Please refresh the page and try again.</p>
                <button
                  onClick={() => setShowReferModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          );
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

    </div>
  );
};

export default Consultation;
