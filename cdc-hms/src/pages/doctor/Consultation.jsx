import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import VoiceInput from "../../components/shared/VoiceInput";
import { usePatientContext } from "../../contexts/PatientContext";
import { useQueueContext } from "../../contexts/QueueContext";
import { useUserContext } from "../../contexts/UserContext";
import { useInitialAssessmentContext } from "../../contexts/InitialAssessmentContext";
import { usePhysicalExamContext } from "../../contexts/PhysicalExamContext";
import { useTreatmentPlanContext } from "../../contexts/TreatmentPlanContext";
import { usePrescriptionContext } from "../../contexts/PrescriptionContext";
import { useConsultationNotesContext } from "../../contexts/ConsultationNotesContext";
import OrderLabTestModal from "../../components/doctor/OrderLabTestModal";
import InitialAssessment from "./InitialAssessment";
import PhysicalExamination from "./PhysicalExamination";
import PhysicalExamList from "../../components/doctor/PhysicalExamList";
import TreatmentPlansList from "../../components/doctor/TreatmentPlansList";
import ConsultationNotesList from "../../components/doctor/ConsultationNotesList";
import PrescriptionManagement from "../../components/doctor/PrescriptionManagement";

const Consultation = () => {
  const { uhid } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useUserContext();
  const { getPatientByUHID } = usePatientContext();
  const { updateQueueStatus } = useQueueContext();
  const { saveAssessment, getLatestAssessment } = useInitialAssessmentContext();
  const { saveExamination, getLatestExamination } = usePhysicalExamContext();
  const { addTreatmentPlan, getLatestPlan } = useTreatmentPlanContext();
  const { getPrescriptionsByPatient, addPrescription } =
    usePrescriptionContext();
  const { getNotesByPatient, searchNotes, addNote } =
    useConsultationNotesContext();

  // Get patient data
  const patient = getPatientByUHID(uhid);

  // Tab state
  const [activeTab, setActiveTab] = useState("overview");

  // Tab completion tracking
  const [tabsCompleted, setTabsCompleted] = useState({
    overview: true, // Always true (read-only)
    assessment: false,
    exam: false,
    notes: false,
    diagnosis: false,
    prescriptions: false,
    actions: true, // Always true (just navigation)
  });

  // Tab unsaved changes tracking
  const [tabsUnsaved, setTabsUnsaved] = useState({
    assessment: false,
    exam: false,
    notes: false,
    diagnosis: false,
    prescriptions: false,
  });

  // Overview tab data (read-only)
  const previousPlan = getLatestPlan(uhid);

  // Get patient prescriptions
  const patientPrescriptions = getPrescriptionsByPatient(uhid);

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

  // Modal state
  const [showOrderLabModal, setShowOrderLabModal] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Load existing data if available
  useEffect(() => {
    if (!patient) return;

    // Load previous assessment
    const prevAssessment = getLatestAssessment(uhid);
    if (prevAssessment) {
      setHistoryOfPresentIllness(prevAssessment.historyOfPresentIllness || "");
      setReviewOfSystems(prevAssessment.reviewOfSystems || "");
      setPastMedicalHistory(prevAssessment.pastMedicalHistory || "");
      setFamilyHistory(prevAssessment.familyHistory || "");
      setSocialHistory(prevAssessment.socialHistory || "");
    }

    // Load previous exam
    const prevExam = getLatestExamination(uhid);
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
  }, [uhid, patient]);

  // Track unsaved changes
  useEffect(() => {
    setTabsUnsaved({
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
      prescriptions: false, // Handled by component
    });
  }, [
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

  // Save handlers
  const handleSaveAssessment = () => {
    saveAssessment({
      uhid: patient.uhid,
      patientName: patient.name,
      doctorName: currentUser?.name || "Doctor",
      historyOfPresentIllness,
      reviewOfSystems,
      pastMedicalHistory,
      familyHistory,
      socialHistory,
    });

    setTabsCompleted({ ...tabsCompleted, assessment: true });
    setTabsUnsaved({ ...tabsUnsaved, assessment: false });

    // Show success toast
    const toast = document.createElement("div");
    toast.className =
      "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce";
    toast.innerHTML = "âœ… Assessment Saved";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  const handleSaveExam = () => {
    saveExamination({
      uhid: patient.uhid,
      patientName: patient.name,
      doctorName: currentUser?.name || "Doctor",
      generalAppearance,
      cardiovascular,
      respiratory,
      gastrointestinal,
      neurological,
      musculoskeletal,
      skin,
      examFindings,
    });

    setTabsCompleted({ ...tabsCompleted, exam: true });
    setTabsUnsaved({ ...tabsUnsaved, exam: false });

    // Show success toast
    const toast = document.createElement("div");
    toast.className =
      "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce";
    toast.innerHTML = "âœ… Physical Exam Saved";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  const handleDiagnosisSuccess = () => {
    setTabsCompleted({ ...tabsCompleted, diagnosis: true });
  };

  const handlePrescriptionSuccess = () => {
    setTabsCompleted({ ...tabsCompleted, prescriptions: true });
  };

  const handleCompleteConsultation = () => {
    // Validate required fields - check if diagnosis tab is completed
    if (!tabsCompleted.diagnosis) {
      alert(
        "Please complete Diagnosis & Treatment Plan tab before completing consultation"
      );
      setActiveTab("diagnosis");
      return;
    }

    // Update queue status to "Completed"
    updateQueueStatus(patient.uhid, "Completed");

    // Show success message
    setShowSuccessMessage(true);

    // Navigate back after 3 seconds
    setTimeout(() => {
      navigate("/doctor/dashboard");
    }, 3000);
  };

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
    { id: "actions", label: "Actions", icon: Zap },
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
      <div className="sticky top-0 z-30 bg-gray-50 pb-4">
        {/* Header */}
        <div className="mb-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">
                Consultation - {patient.name}
              </h2>
              <p className="text-gray-600 mt-1">
                UHID: {patient.uhid} â€¢ {patient.age} yrs â€¢ {patient.gender}
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
                  <p className="text-sm text-gray-600">Diabetes Type</p>
                  <p className="font-semibold">{patient.diabetesType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last HbA1c</p>
                  <p className="font-semibold text-red-600">{patient.hba1c}</p>
                </div>
              </div>
            </Card>

            {/* Today's Triage Data */}
            {patient.lastTriageDate && (
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
                    {new Date(patient.lastTriageDate).toLocaleString()}
                  </p>
                  {patient.triageBy && (
                    <p className="text-sm text-gray-600">
                      Triaged by: {patient.triageBy}
                    </p>
                  )}
                </div>

                {/* Chief Complaint */}
                {patient.chiefComplaint && (
                  <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                    <p className="text-sm font-semibold text-gray-700 mb-1">
                      Reason for visit:
                    </p>
                    <p className="text-gray-800">{patient.chiefComplaint}</p>
                  </div>
                )}

                {/* Vital Signs */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Vital Signs
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {patient.vitals?.bp && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600">Blood Pressure</p>
                        <p className="font-semibold text-lg">
                          {patient.vitals.bp}
                        </p>
                      </div>
                    )}
                    {patient.vitals?.heartRate && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600">Heart Rate</p>
                        <p className="font-semibold text-lg">
                          {patient.vitals.heartRate}
                        </p>
                      </div>
                    )}
                    {patient.vitals?.temperature && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600">Temperature</p>
                        <p className="font-semibold text-lg">
                          {patient.vitals.temperature}
                        </p>
                      </div>
                    )}
                    {patient.vitals?.weight && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600">Weight</p>
                        <p className="font-semibold text-lg">
                          {patient.vitals.weight}
                        </p>
                      </div>
                    )}
                    {patient.vitals?.height && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600">Height</p>
                        <p className="font-semibold text-lg">
                          {patient.vitals.height}
                        </p>
                      </div>
                    )}
                    {patient.vitals?.bmi && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-gray-600">BMI</p>
                        <p className="font-semibold text-lg text-blue-700">
                          {patient.vitals.bmi}
                        </p>
                      </div>
                    )}
                    {patient.vitals?.oxygenSaturation && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600">O2 Saturation</p>
                        <p className="font-semibold text-lg">
                          {patient.vitals.oxygenSaturation}
                        </p>
                      </div>
                    )}
                    {patient.vitals?.rbs && (
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-xs text-gray-600">RBS</p>
                        <p className="font-semibold text-lg text-red-700">
                          {patient.vitals.rbs}
                        </p>
                      </div>
                    )}
                    {patient.vitals?.hba1c && (
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-xs text-gray-600">HbA1c</p>
                        <p className="font-semibold text-lg text-red-700">
                          {patient.vitals.hba1c}
                        </p>
                      </div>
                    )}
                    {patient.vitals?.ketones && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600">Ketones</p>
                        <p className="font-semibold text-lg">
                          {patient.vitals.ketones}
                        </p>
                      </div>
                    )}

                    {/*Waist Circumference */}
                    {patient.vitals?.waistCircumference && (
                      <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-xs text-gray-600">
                          Waist Circumference
                        </p>
                        <p className="font-semibold text-lg text-purple-700">
                          {patient.vitals.waistCircumference}
                        </p>
                      </div>
                    )}

                    {/* Waist-to-Height Ratio */}
                    {patient.vitals?.waistHeightRatio && (
                      <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <p className="text-xs text-gray-600">
                          Waist-to-Height Ratio
                        </p>
                        <p className="font-semibold text-lg text-orange-700">
                          {patient.vitals.waistHeightRatio}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {parseFloat(patient.vitals.waistHeightRatio) < 0.5
                            ? "(Healthy)"
                            : parseFloat(patient.vitals.waistHeightRatio) < 0.6
                            ? "(Increased Risk)"
                            : "(High Risk)"}
                        </p>
                      </div>
                    )}
                  </div>
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

                {patient.comorbidities && patient.comorbidities.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Comorbidities:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      {patient.comorbidities.map((condition, index) => (
                        <li key={index} className="text-sm text-gray-600">
                          {condition}
                        </li>
                      ))}
                    </ul>
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
                        â€¢ {previousPlan.time} â€¢ By {previousPlan.doctorName}
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
      <div className="fixed bottom-6 right-6 z-40">
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
    </div>
  );
};

export default Consultation;
