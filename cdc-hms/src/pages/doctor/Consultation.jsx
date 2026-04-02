import { useState, useEffect, useMemo } from "react";
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
  Zap,
  User,
  Activity,
  Pill,
  FlaskConical,
  LineChart,
  UserCircle,
  FileText,
  Calendar,
  ClipboardCheck,
  X,
  Pencil,
} from "lucide-react";
import toast from "react-hot-toast";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import EditVitalsModal from "../../components/doctor/EditVitalsModal";
import VoiceInput from "../../components/shared/VoiceInput";
import { usePatientContext } from "../../contexts/PatientContext";
import { useQueueContext } from "../../contexts/QueueContext";
import { useUserContext } from "../../contexts/UserContext";
import { useInitialAssessmentContext } from "../../contexts/InitialAssessmentContext";
import { usePhysicalExamContext } from "../../contexts/PhysicalExamContext";
import { useTreatmentPlanContext } from "../../contexts/TreatmentPlanContext";
import { usePrescriptionContext } from "../../contexts/PrescriptionContext";
import OrderLabTestModal from "../../components/doctor/OrderLabTestModal";
import InitialAssessment from "./InitialAssessment";
import PhysicalExamination from "./PhysicalExamination";
import PhysicalExamList from "../../components/doctor/PhysicalExamList";
import TreatmentPlansList from "../../components/doctor/TreatmentPlansList";
import ConsultationNotesList from "../../components/doctor/ConsultationNotesList";
import PrescriptionManagement from "../../components/doctor/PrescriptionManagement";
import MedicalDocumentsTab from "../../components/shared/MedicalDocumentsTab";
import GlycemicChartPanel from "../../components/doctor/GlycemicChartPanel";

const Consultation = () => {
  const { uhid } = useParams();
  const navigate = useNavigate();
  const DRAFT_KEY = `consultation_progress_${uhid}`;
  const { currentUser } = useUserContext();
  const { fetchPatientByUHID } = usePatientContext();
  const { queue, sendToBilling } = useQueueContext();
  const { getLatestAssessment } = useInitialAssessmentContext();
  const { getLatestExamination } = usePhysicalExamContext();
  const { getLatestPlan } = useTreatmentPlanContext();
  const { getPrescriptionsByPatient, addPrescription } =
    usePrescriptionContext();

  // Get patient data async
  const [patient, setPatient] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(true);

  useEffect(() => {
    fetchPatientByUHID(uhid).then(p => {
      setPatient(p || null);
      setLoadingPatient(false);
    });
  }, [uhid, fetchPatientByUHID]);

  // Tab state
  const [activeTab, setActiveTab] = useState("overview");

  // Tab completion tracking — restored from sessionStorage so navigating away
  // and coming back doesn't lose the doctor's progress.
  const [tabsCompleted, setTabsCompleted] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(`consultation_progress_${uhid}`) || '{}');
      return {
        overview:      true,
        assessment:    false,
        exam:          false,
        notes:         false,
        diagnosis:     saved.diagnosis     || false,
        prescriptions: saved.prescriptions || false,
        actions:       true,
      };
    } catch {
      return { overview: true, assessment: false, exam: false, notes: false, diagnosis: false, prescriptions: false, actions: true };
    }
  });

  // Tab unsaved changes tracking (derived state using useMemo)
  // Note: This will be computed below after form state is declared

  // Overview tab data (loaded async)
  const [previousPlan, setPreviousPlan] = useState(null);
  const [patientPrescriptions, setPatientPrescriptions] = useState([]);

  // Assessment tab data
  const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState("");
  const [reviewOfSystems, setReviewOfSystems] = useState("");
  const [pastMedicalHistory, setPastMedicalHistory] = useState("");
  const [familyHistory, setFamilyHistory] = useState("");
  const [socialHistory, setSocialHistory] = useState("");

  // Physical Exam tab data
  const [generalAppearance, setGeneralAppearance] = useState("");
  const [cardiovascular, setCardiovascular] = useState("");
  const [respiratory, setRespiratory] = useState("");
  const [gastrointestinal, setGastrointestinal] = useState("");
  const [neurological, setNeurological] = useState("");
  const [musculoskeletal, setMusculoskeletal] = useState("");
  const [skin, setSkin] = useState("");
  const [examFindings, setExamFindings] = useState("");

  // Vitals modal
  const [showVitalsModal, setShowVitalsModal] = useState(false);

  // Modal state
  const [showOrderLabModal, setShowOrderLabModal] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [selectedCharges, setSelectedCharges] = useState([]);
  const [selectedProcedures, setSelectedProcedures] = useState([]);
  const [billingSubmitting, setBillingSubmitting] = useState(false);

  const CHARGE_OPTIONS = [
    'Consultation Fee',
    'Random Blood Sugar',
    'Ketones',
    'HbA1c',
    'Thyroid Ultrasound',
    'ECG',
    'Insulin Shot',
  ];
  const PROCEDURE_OPTIONS = [
    'PNS',
    'ABI',
    'ANS',
    'Dressing Major',
    'Dressing Minor',
    'IV',
    'CGM',
    'Thyroid Nodule Radiofrequency Ablation (RFA)',
    'Thyroid Percutaneous Ethanol Injection (PEI)',
    'Ultrasound-Guided Thyroid Fine Needle Aspiration (FNA)',
    'Ultrasound-Guided Core Needle Biopsy (CNB)',
    'Foot Pressure Measurement',
  ];

  // Tab unsaved changes tracking (derived state)
  const tabsUnsaved = useMemo(() => ({
    assessment:
      historyOfPresentIllness !== "" ||
      reviewOfSystems !== "" ||
      pastMedicalHistory !== "" ||
      familyHistory !== "" ||
      socialHistory !== "",
    exam:
      generalAppearance !== "" ||
      cardiovascular !== "" ||
      respiratory !== "" ||
      gastrointestinal !== "" ||
      neurological !== "" ||
      musculoskeletal !== "" ||
      skin !== "" ||
      examFindings !== "",
    notes: false,
    diagnosis: false,
    prescriptions: false,
  }), [
    historyOfPresentIllness,
    reviewOfSystems,
    pastMedicalHistory,
    familyHistory,
    socialHistory,
    generalAppearance,
    cardiovascular,
    respiratory,
    gastrointestinal,
    neurological,
    musculoskeletal,
    skin,
    examFindings,
  ]);

  // Load existing data if available (async)
  useEffect(() => {
    if (!patient) return;
    let isMounted = true;

    const loadData = async () => {
      // Load prescriptions and previous plan
      const [prescriptions, latestPlan, prevAssessment, prevExam] = await Promise.all([
        getPrescriptionsByPatient(uhid),
        getLatestPlan(uhid),
        getLatestAssessment(uhid),
        getLatestExamination(uhid),
      ]);

      if (!isMounted) return;

      // Set prescriptions and plan
      setPatientPrescriptions(Array.isArray(prescriptions) ? prescriptions : []);
      setPreviousPlan(latestPlan || null);

      // Load previous assessment data
      if (prevAssessment) {
        setHistoryOfPresentIllness(prevAssessment.historyOfPresentIllness || "");
        setReviewOfSystems(prevAssessment.reviewOfSystems || "");
        setPastMedicalHistory(prevAssessment.pastMedicalHistory || "");
        setFamilyHistory(prevAssessment.familyHistory || "");
        setSocialHistory(prevAssessment.socialHistory || "");
      }

      // Load previous exam data
      if (prevExam) {
        setGeneralAppearance(prevExam.generalAppearance || "");
        setCardiovascular(prevExam.cardiovascular || "");
        setRespiratory(prevExam.respiratory || "");
        setGastrointestinal(prevExam.gastrointestinal || "");
        setNeurological(prevExam.neurological || "");
        setMusculoskeletal(prevExam.musculoskeletal || "");
        setSkin(prevExam.skin || "");
        setExamFindings(prevExam.examFindings || "");
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [uhid, patient, getPrescriptionsByPatient, getLatestPlan, getLatestAssessment, getLatestExamination]);

  // Loading state
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

  // Redirect if patient not found
  if (!patient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <div className="text-center py-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Patient Not Found
            </h2>
            <p className="text-gray-600 mb-4">
              Unable to find patient with UHID: {uhid}
            </p>
            <Button onClick={() => navigate("/doctor/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Tab completion handlers
  const saveDraftProgress = (updates) => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...saved, ...updates }));
    } catch (e) { void e; /* sessionStorage unavailable — progress won't persist across navigation */ }
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
    // Validate required fields - check if diagnosis tab is completed
    if (!tabsCompleted.diagnosis) {
      toast.error(
        "Please complete Diagnosis & Treatment Plan tab before completing consultation",
        {
          duration: 4000,
          position: "top-right",
          icon: "❌",
          style: {
            background: "#EF4444",
            color: "#FFFFFF",
            fontWeight: "bold",
            padding: "16px",
          },
        }
      );
      setActiveTab("diagnosis");
      return;
    }
    // Open billing checklist modal
    setSelectedCharges([]);
    setSelectedProcedures([]);
    setShowBillingModal(true);
  };

  const handleBillingSubmit = async () => {
    setBillingSubmitting(true);
    const queueItem = queue.find(q => q.uhid === patient.uhid && q.status === 'With Doctor');
    if (queueItem) {
      await sendToBilling(queueItem.id, selectedCharges, selectedProcedures);
    }
    sessionStorage.removeItem(DRAFT_KEY);
    setBillingSubmitting(false);
    setShowBillingModal(false);
    setShowSuccessMessage(true);
    setTimeout(() => navigate("/doctor/dashboard"), 3000);
  };

  const toggleCharge = (item) =>
    setSelectedCharges(prev =>
      prev.includes(item) ? prev.filter(c => c !== item) : [...prev, item]
    );

  const toggleProcedure = (item) =>
    setSelectedProcedures(prev =>
      prev.includes(item) ? prev.filter(p => p !== item) : [...prev, item]
    );

  const handleNavigateWithPatient = (path) => {
    navigate(path, {
      state: {
        patientUHID: patient.uhid,
        patientName: patient.name,
        fromConsultation: true,
      },
    });
  };

  // Tab configuration
  const tabs = [
    { id: "overview", label: "Overview", icon: ClipboardList },
    { id: "assessment", label: "Assessment", icon: FileEdit },
    { id: "exam", label: "Exam", icon: Stethoscope },
    { id: "notes", label: "Notes", icon: MessageSquare },
    { id: "diagnosis", label: "Diagnosis & Plan", icon: Target },
    { id: "prescriptions", label: "Prescriptions", icon: Pill },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "charts", label: "Charts", icon: LineChart },
    // { id: "actions", label: "Actions", icon: Zap },
  ];

  // Success message overlay
  if (showSuccessMessage) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="max-w-lg">
          <div className="text-center py-8 px-6">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Check className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Consultation Completed!
            </h2>
            <p className="text-gray-600 mb-4">
              Patient: {patient.name} ({patient.uhid})
            </p>
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Sticky Header Container */}
      <div className="sticky top-0 z-10 bg-gray-50 pb-4">
        {/* Header */}
        <div className="mb-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">
                Consultation - {patient.name}
              </h2>
              <p className="text-gray-600 mt-1">
                UHID: {patient.uhid}- {patient.age} yrs {patient.gender}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/doctor/dashboard")}
              className="w-full sm:w-auto"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-max px-6 py-4 text-sm font-semibold transition-all relative ${
                  activeTab === tab.id
                    ? "bg-primary text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tabsCompleted[tab.id] && (
                    <Check className="w-4 h-4 text-green-500 bg-white rounded-full p-0.5" />
                  )}
                  {tabsUnsaved[tab.id] && !tabsCompleted[tab.id] && (
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* End Sticky Container */}

      {/* Tab Content */}
      <div>
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Patient Info Card */}
            <Card
              title={
                <span className="flex items-center gap-2">
                  <User className="w-6 h-6" />
                  Patient Information
                </span>
              }
            >
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

            {/* Today's Triage Data */}
            {!patient.vitals && (
              <Card title="Vitals">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">No vitals recorded yet.</p>
                  <Button variant="outline" onClick={() => setShowVitalsModal(true)} className="flex items-center gap-2 text-sm">
                    <Pencil size={14} />
                    Record Vitals
                  </Button>
                </div>
              </Card>
            )}
            {patient.vitals && (
              <Card
                title={
                  <span className="flex items-center gap-2">
                    <ClipboardList className="w-6 h-6" />
                    Today's Triage
                  </span>
                }
              >
                <div className="mb-4 pb-4 border-b">
                  <p className="text-sm text-gray-600">
                    Triaged on:{" "}
                    {patient.vitals.recordedAt
                      ? new Date(patient.vitals.recordedAt).toLocaleString()
                      : "Today"}
                  </p>
                </div>

                {/* Chief Complaint */}
                {patient.vitals.chiefComplaint && (
                  <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                    <p className="text-sm font-semibold text-gray-700 mb-1">
                      Reason for visit:
                    </p>
                    <p className="text-gray-800">{patient.vitals.chiefComplaint}</p>
                  </div>
                )}

                {/* Vital Signs */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Vital Signs
                    </h4>
                    <Button variant="outline" onClick={() => setShowVitalsModal(true)} className="flex items-center gap-2 text-sm">
                      <Pencil size={14} />
                      Edit Vitals
                    </Button>
                  </div>
                  <VitalsGrid vitals={patient.vitals} />
                </div>
              </Card>
            )}

            {/* Medical History */}
            <Card
              title={
                <span className="flex items-center gap-2">
                  <Activity className="w-6 h-6" />
                  Medical Information
                </span>
              }
            >
              <div className="space-y-4">
                {patient.medications && patient.medications.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Current Medications:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      {patient.medications.map((med, index) => (
                        <li key={index} className="text-sm text-gray-600">
                          {med}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {patient.allergies && (
                  <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
                    <p className="text-sm font-semibold text-red-700 mb-1 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Allergies:
                    </p>
                    <p className="text-sm text-gray-800 font-medium">
                      {patient.allergies}
                    </p>
                  </div>
                )}

              </div>
            </Card>

            {/* Previous Treatment Plan */}
            {previousPlan && (
              <Card
                title={
                  <span className="flex items-center gap-2">
                    <ClipboardCheck className="w-6 h-6" />
                    Previous Treatment Plan
                  </span>
                }
              >
                <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm font-bold text-gray-800">
                        {previousPlan.diagnosis}
                      </p>
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(previousPlan.date).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}{" "}
                        -{previousPlan.time} - By {previousPlan.doctorName}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        previousPlan.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {previousPlan.status}
                    </span>
                  </div>
                  <div className="bg-white rounded p-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Plan:
                    </p>
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
                      {previousPlan.plan}
                    </pre>
                  </div>
                </div>
              </Card>
            )}
            {/* NEW: Medical Equipment Summary (if exists) */}
            {patient.medicalEquipment?.insulinPump?.hasPump && (
              <Card
                title={
                  <span className="flex items-center gap-2">
                    <span className="text-2xl">🔋</span>
                    Medical Equipment
                  </span>
                }
              >
                <div className="space-y-3">
                  {/* Pump Info */}
                  {patient.medicalEquipment.insulinPump.current && (
                    <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <p className="text-sm font-bold text-gray-800 mb-1">
                        ⚡ Insulin Pump
                      </p>
                      <p className="text-sm text-gray-700">
                        {patient.medicalEquipment.insulinPump.current.model ||
                          "Not specified"}{" "}
                        ({patient.medicalEquipment.insulinPump.current.serialNo}
                        )
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Active since{" "}
                        {new Date(
                          patient.medicalEquipment.insulinPump.current.startDate
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {/* Transmitter Info */}
                  {patient.medicalEquipment.insulinPump.transmitter
                    ?.hasTransmitter && (
                    <div className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                      <p className="text-sm font-bold text-gray-800 mb-1">
                        📡 Transmitter
                      </p>
                      <p className="text-sm text-gray-700">
                        Serial:{" "}
                        {
                          patient.medicalEquipment.insulinPump.transmitter
                            .serialNo
                        }
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Active since{" "}
                        {new Date(
                          patient.medicalEquipment.insulinPump.transmitter.startDate
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Assessment Tab */}
        {activeTab === "assessment" && (
          <InitialAssessment uhid={uhid} embedded={true} />
        )}

        {/* Physical Exam Tab */}
        {activeTab === "exam" && (
          <PhysicalExamList patient={patient} embedded={true} />
        )}
        {/* Consultation Notes Tab */}
        {activeTab === "notes" && <ConsultationNotesList patient={patient} />}

        {/* Diagnosis & Treatment Plan Tab */}
        {activeTab === "diagnosis" && (
          <TreatmentPlansList
            patient={patient}
            showStatistics={false}
            showCreateForm={true}
            currentUser={currentUser}
            onSuccess={handleDiagnosisSuccess}
          />
        )}

        {/* Prescriptions Tab */}
        {activeTab === "prescriptions" && (
          <PrescriptionManagement
            patient={patient}
            patientPrescriptions={patientPrescriptions}
            addPrescription={addPrescription}
            currentUser={currentUser}
            onSuccess={handlePrescriptionSuccess}
          />
        )}

        {/* Medical Documents Tab - OPTIONAL */}
        {activeTab === "documents" && (
          <div className="space-y-4">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>ℹ️ Optional:</strong> Upload external medical documents,
                lab reports, or imaging results during consultation. This step
                is not required to complete the consultation.
              </p>
            </div>
            <MedicalDocumentsTab patient={patient} />
          </div>
        )} 

        {/* Glycemic Charts Tab */}
        {activeTab === "charts" && (
          <GlycemicChartPanel patient={patient} />
        )}

        {/* Quick Actions Tab */}
        {activeTab === "actions" && (
          <Card
            title={
              <span className="flex items-center gap-2">
                <Zap className="w-6 h-6" />
                Quick Actions
              </span>
            }
          >
            <div className="space-y-6">
              <p className="text-gray-600">
                Quick access to common actions during consultation:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={() =>
                    handleNavigateWithPatient("/doctor/prescriptions")
                  }
                  className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg border-2 border-blue-300 transition-all text-left"
                >
                  <div className="mb-2">
                    <Pill className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="font-bold text-gray-800">Write Prescription</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Prescribe medications for this patient
                  </p>
                </button>

                <button
                  onClick={() => setShowOrderLabModal(true)}
                  className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-lg border-2 border-purple-300 transition-all text-left"
                >
                  <div className="mb-2">
                    <FlaskConical className="w-8 h-8 text-purple-600" />
                  </div>
                  <p className="font-bold text-gray-800">Order Lab Test</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Order laboratory investigations
                  </p>
                </button>

                <button
                  onClick={() =>
                    handleNavigateWithPatient("/doctor/glycemic-charts")
                  }
                  className="p-6 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-lg border-2 border-green-300 transition-all text-left"
                >
                  <div className="mb-2">
                    <LineChart className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="font-bold text-gray-800">View Charts</p>
                  <p className="text-xs text-gray-600 mt-1">
                    View glycemic trends and charts
                  </p>
                </button>

                <button
                  onClick={() =>
                    navigate(`/doctor/patient-profile/${patient.uhid}`, {
                      state: { fromConsultation: true },
                    })
                  }
                  className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-lg border-2 border-orange-300 transition-all text-left"
                >
                  <div className="mb-2">
                    <UserCircle className="w-8 h-8 text-orange-600" />
                  </div>
                  <p className="font-bold text-gray-800">Patient Profile</p>
                  <p className="text-xs text-gray-600 mt-1">
                    View full patient profile and history
                  </p>
                </button>

                <button
                  onClick={() =>
                    handleNavigateWithPatient("/doctor/initial-assessment")
                  }
                  className="p-6 bg-gradient-to-br from-cyan-50 to-cyan-100 hover:from-cyan-100 hover:to-cyan-200 rounded-lg border-2 border-cyan-300 transition-all text-left"
                >
                  <div className="mb-2">
                    <FileEdit className="w-8 h-8 text-cyan-600" />
                  </div>
                  <p className="font-bold text-gray-800">Full Assessment</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Go to detailed assessment page
                  </p>
                </button>

                <button
                  onClick={() =>
                    handleNavigateWithPatient("/doctor/physical-exam")
                  }
                  className="p-6 bg-gradient-to-br from-pink-50 to-pink-100 hover:from-pink-100 hover:to-pink-200 rounded-lg border-2 border-pink-300 transition-all text-left"
                >
                  <div className="mb-2">
                    <Stethoscope className="w-8 h-8 text-pink-600" />
                  </div>
                  <p className="font-bold text-gray-800">Full Physical Exam</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Go to detailed physical exam page
                  </p>
                </button>

                <button
                  onClick={() => handleNavigateWithPatient("/doctor/reports")}
                  className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 rounded-lg border-2 border-yellow-300 transition-all text-left"
                >
                  <div className="mb-2">
                    <FileText className="w-8 h-8 text-yellow-600" />
                  </div>
                  <p className="font-bold text-gray-800">Generate Report</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Create patient reports
                  </p>
                </button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Floating Complete Button */}
      <div className="fixed bottom-6 right-6 z-20">
        <Button
          onClick={handleCompleteConsultation}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-4 text-base font-bold shadow-2xl"
          disabled={!tabsCompleted.diagnosis}
        >
          <span className="flex items-center gap-2">
            <Check className="w-5 h-5" />
            Complete Consultation
          </span>
        </Button>
      </div>

      {/* Billing Checklist Modal */}
      {showBillingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
            {/* Header */}
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

            {/* Scrollable Body */}
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

              {/* Procedures */}
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

            {/* Footer */}
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

      {/* Order Lab Test Modal */}
      {showOrderLabModal && (
        <OrderLabTestModal
          patient={patient}
          onClose={() => setShowOrderLabModal(false)}
          onSuccess={() => {
            console.log("Lab test ordered successfully");
          }}
        />
      )}

      {/* Edit Vitals Modal */}
      {showVitalsModal && (
        <EditVitalsModal
          vitals={patient?.vitals}
          uhid={uhid}
          onClose={() => setShowVitalsModal(false)}
          onSaved={() => fetchPatientByUHID(uhid).then(p => setPatient(p || null))}
        />
      )}
    </div>
  );
};

export default Consultation;
