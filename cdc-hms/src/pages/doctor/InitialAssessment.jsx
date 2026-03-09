import { useState, useEffect } from "react";
import { Eye } from "lucide-react";
import toast from "react-hot-toast";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import VoiceInput from "../../components/shared/VoiceInput";
import { usePatientContext } from "../../contexts/PatientContext";
import { useInitialAssessmentContext } from "../../contexts/InitialAssessmentContext";
import cdcLogo from "../../assets/cdc_web_logo1.svg";

const InitialAssessment = ({ uhid: propUHID = null, embedded = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { uhid: urlUHID } = useParams();
  const { getPatientByUHID, patients } = usePatientContext();
  const { saveAssessment, getLatestAssessment } = useInitialAssessmentContext();

  // Get patient from URL params OR navigation state (flexible!)
  const patientUHID = propUHID || urlUHID || location.state?.patientUHID;
  const fromConsultation = location.state?.fromConsultation || embedded;
  const fromProfile = location.state?.fromProfile;

  // const [selectedPatient, setSelectedPatient] = useState(null);
  // const [alreadyAssessed, setAlreadyAssessed] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [alreadyAssessed, setAlreadyAssessed] = useState(false);
  const [viewMode, setViewMode] = useState(false);

  const allPatients = patients;

  const [assessmentData, setAssessmentData] = useState({
    // Presenting Complaints
    weightLoss: false,
    visualDisturbances: false,
    increasedThirst: false,
    fatigue: false,
    nocturia: false,
    paresthesia: false,
    dizziness: false,
    legCramps: false,
    constipation: false,
    diarrhea: false,
    decreasedLibido: false,
    otherComplaints: "",

    // Diabetic Complications
    retinopathy: "",
    cerebrovascularDisease: "",
    cardiovascularDisease: "",
    nephropathy: "",
    neuropathyPeripheral: "",
    neuropathyAutonomic: "",

    // Family History
    familyHistory: "",

    // Social History
    alcoholIntake: "",
    cigaretteSmoking: "",
    dietType: "",
    exercisePlan: "",
    substanceUse: "",
  });

  // Auto-select patient if coming from Consultations
  useEffect(() => {
    if (!patientUHID) return;
    let isMounted = true;

    const loadPatientData = async () => {
      const patient = getPatientByUHID(patientUHID);
      if (!patient || !isMounted) return;

      // Check if already assessed (async)
      const existingAssessment = await getLatestAssessment(patient.uhid);
      if (!isMounted) return;

      if (existingAssessment) {
        setAlreadyAssessed(true);
        setViewMode(true);
        // Load the existing data
        setAssessmentData(existingAssessment.data || existingAssessment);
      } else if (fromConsultation) {
        // No assessment yet + coming from consultation → allow doctor to fill it out
        setAlreadyAssessed(true); // show the form (not the "No Assessment Yet" message)
        setViewMode(false);       // editable
      } else {
        // No assessment yet + viewing from patient profile → just show empty state
        setViewMode(true);
      }
      setSelectedPatient(patient);
    };

    loadPatientData();
    return () => { isMounted = false; };
  }, [patientUHID, getPatientByUHID, getLatestAssessment, fromConsultation]);

  const handleCheckboxChange = (field) => {
    setAssessmentData({ ...assessmentData, [field]: !assessmentData[field] });
  };

  const handleInputChange = (field, value) => {
    setAssessmentData({ ...assessmentData, [field]: value });
  };

  const handleSelectPatient = async (patient) => {
    // Check if patient already has an initial assessment (async)
    const existingAssessment = await getLatestAssessment(patient.uhid);

    if (existingAssessment) {
      setAlreadyAssessed(true);
      setViewMode(true);
      setSelectedPatient(patient);
      // Load existing data
      setAssessmentData(existingAssessment.data || existingAssessment);
      return;
    }

    setAlreadyAssessed(false);
    setViewMode(false);
    setSelectedPatient(patient);
    // Reset form
    setAssessmentData({
      weightLoss: false,
      visualDisturbances: false,
      increasedThirst: false,
      fatigue: false,
      nocturia: false,
      paresthesia: false,
      dizziness: false,
      legCramps: false,
      constipation: false,
      diarrhea: false,
      decreasedLibido: false,
      otherComplaints: "",
      retinopathy: "",
      cerebrovascularDisease: "",
      cardiovascularDisease: "",
      nephropathy: "",
      neuropathyPeripheral: "",
      neuropathyAutonomic: "",
      familyHistory: "",
      alcoholIntake: "",
      cigaretteSmoking: "",
      dietType: "",
      exercisePlan: "",
      substanceUse: "",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Save to backend (async)
    const savedAssessment = await saveAssessment({
      uhid: selectedPatient.uhid,
      data: assessmentData,
    });

    if (savedAssessment) {
      // Show success message
      toast.success(`Initial Assessment Completed for ${selectedPatient.name}`, {
        duration: 3000,
        position: "top-right",
        icon: "✅",
        style: {
          background: "#10B981",
          color: "#FFFFFF",
          fontWeight: "bold",
          padding: "16px",
        },
      });

      // Mark as already assessed
      setAlreadyAssessed(true);
      setViewMode(true);

      // Navigate back or clear
      if (fromConsultation && embedded) {
        // Stay in embedded tab - don't navigate
        return;
      } else if (fromConsultation) {
        navigate(`/doctor/consultation/${selectedPatient.uhid}`);
      } else {
        setSelectedPatient(null);
      }
    } else {
      toast.error("Failed to save assessment. Please try again.", {
        duration: 3000,
        position: "top-right",
        icon: "❌",
        style: {
          background: "#EF4444",
          color: "#FFFFFF",
          fontWeight: "bold",
          padding: "16px",
        },
      });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">
          Initial Diabetic Assessment
        </h2>
        {fromConsultation && !embedded && (
          <Button
            variant="outline"
            onClick={() => navigate(`/doctor/consultation/${patientUHID}`)}
          >
            Back to Consultation
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Selection (only show if NOT from consultation or profile) */}
        {!fromConsultation && !fromProfile && !embedded && !patientUHID && (
          <div className="lg:col-span-1">
            <Card title=" Select Patient">
              <div className="space-y-3">
                {allPatients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => handleSelectPatient(patient)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedPatient?.id === patient.id
                        ? "border-primary bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-primary">{patient.uhid}</p>
                        <p className="font-semibold text-gray-800 mt-1">
                          {patient.name}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {patient.age} yrs â€¢ {patient.gender}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Assessment Form */}
        <div className={fromConsultation || fromProfile ? "lg:col-span-3" : "lg:col-span-2"}>
          {!selectedPatient ? (
            <Card>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-gray-500 text-lg">
                  Select a patient to start initial assessment
                </p>
              </div>
            </Card>
          ) : !alreadyAssessed ? (
            /* No assessment exists yet — show empty state */
            <Card>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-gray-500 text-lg mb-2">
                  No Initial Assessment Yet
                </p>
                <p className="text-gray-400 text-sm">
                  The initial diabetic assessment will be completed during the patient's first consultation.
                </p>
              </div>
            </Card>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* View Mode Banner */}
              {viewMode && (
                <Card>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Eye className="w-8 h-8 text-blue-500" />
                      <div>
                        <p className="text-sm font-bold text-blue-900">
                          VIEW MODE - Initial Assessment (Read Only)
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          This assessment was completed during the patient's first visit.
                          Initial assessments cannot be edited as they are one-time comprehensive evaluations.
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Patient Header */}
              <Card>
                <h3 className="text-2xl font-bold text-gray-800">
                  {selectedPatient.name}
                </h3>
                <p className="text-gray-600 mt-1">
                  {selectedPatient.uhid} • {selectedPatient.age} yrs • {selectedPatient.gender}
                </p>
              </Card>

              {/* Presenting Complaints */}
              <Card title="Presenting Complaints">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className={`flex items-center space-x-3 p-3 border-2 rounded-lg ${viewMode ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-200 hover:border-primary cursor-pointer'} transition`}>
                    <input
                      type="checkbox"
                      checked={assessmentData.weightLoss}
                      onChange={() => handleCheckboxChange("weightLoss")}
                      disabled={viewMode}
                      className="w-5 h-5 text-primary"
                    />
                    <span className="font-medium text-gray-800">Weight Loss</span>
                  </label>

                  <label className={`flex items-center space-x-3 p-3 border-2 rounded-lg ${viewMode ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-200 hover:border-primary cursor-pointer'} transition`}>
                    <input
                      type="checkbox"
                      checked={assessmentData.visualDisturbances}
                      onChange={() => handleCheckboxChange("visualDisturbances")}
                      disabled={viewMode}
                      className="w-5 h-5 text-primary"
                    />
                    <span className="font-medium text-gray-800">Visual Disturbances</span>
                  </label>

                  <label className={`flex items-center space-x-3 p-3 border-2 rounded-lg ${viewMode ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-200 hover:border-primary cursor-pointer'} transition`}>
                    <input
                      type="checkbox"
                      checked={assessmentData.increasedThirst}
                      onChange={() => handleCheckboxChange("increasedThirst")}
                      disabled={viewMode}
                      className="w-5 h-5 text-primary"
                    />
                    <span className="font-medium text-gray-800">Increased Thirst (Polydipsia)</span>
                  </label>

                  <label className={`flex items-center space-x-3 p-3 border-2 rounded-lg ${viewMode ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-200 hover:border-primary cursor-pointer'} transition`}>
                    <input
                      type="checkbox"
                      checked={assessmentData.fatigue}
                      onChange={() => handleCheckboxChange("fatigue")}
                      disabled={viewMode}
                      className="w-5 h-5 text-primary"
                    />
                    <span className="font-medium text-gray-800">Fatigue</span>
                  </label>

                  <label className={`flex items-center space-x-3 p-3 border-2 rounded-lg ${viewMode ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-200 hover:border-primary cursor-pointer'} transition`}>
                    <input
                      type="checkbox"
                      checked={assessmentData.nocturia}
                      onChange={() => handleCheckboxChange("nocturia")}
                      disabled={viewMode}
                      className="w-5 h-5 text-primary"
                    />
                    <span className="font-medium text-gray-800">Nocturia (Frequent Nighttime Urination)</span>
                  </label>

                  <label className={`flex items-center space-x-3 p-3 border-2 rounded-lg ${viewMode ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-200 hover:border-primary cursor-pointer'} transition`}>
                    <input
                      type="checkbox"
                      checked={assessmentData.paresthesia}
                      onChange={() => handleCheckboxChange("paresthesia")}
                      disabled={viewMode}
                      className="w-5 h-5 text-primary"
                    />
                    <span className="font-medium text-gray-800">Paresthesia (Numbness/Tingling)</span>
                  </label>

                  <label className={`flex items-center space-x-3 p-3 border-2 rounded-lg ${viewMode ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-200 hover:border-primary cursor-pointer'} transition`}>
                    <input
                      type="checkbox"
                      checked={assessmentData.dizziness}
                      onChange={() => handleCheckboxChange("dizziness")}
                      disabled={viewMode}
                      className="w-5 h-5 text-primary"
                    />
                    <span className="font-medium text-gray-800">Dizziness</span>
                  </label>

                  <label className={`flex items-center space-x-3 p-3 border-2 rounded-lg ${viewMode ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-200 hover:border-primary cursor-pointer'} transition`}>
                    <input
                      type="checkbox"
                      checked={assessmentData.legCramps}
                      onChange={() => handleCheckboxChange("legCramps")}
                      disabled={viewMode}
                      className="w-5 h-5 text-primary"
                    />
                    <span className="font-medium text-gray-800">Leg Cramps</span>
                  </label>

                  <label className={`flex items-center space-x-3 p-3 border-2 rounded-lg ${viewMode ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-200 hover:border-primary cursor-pointer'} transition`}>
                    <input
                      type="checkbox"
                      checked={assessmentData.constipation}
                      onChange={() => handleCheckboxChange("constipation")}
                      disabled={viewMode}
                      className="w-5 h-5 text-primary"
                    />
                    <span className="font-medium text-gray-800">Constipation</span>
                  </label>

                  <label className={`flex items-center space-x-3 p-3 border-2 rounded-lg ${viewMode ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-200 hover:border-primary cursor-pointer'} transition`}>
                    <input
                      type="checkbox"
                      checked={assessmentData.diarrhea}
                      onChange={() => handleCheckboxChange("diarrhea")}
                      disabled={viewMode}
                      className="w-5 h-5 text-primary"
                    />
                    <span className="font-medium text-gray-800">Diarrhea</span>
                  </label>

                  <label className={`flex items-center space-x-3 p-3 border-2 rounded-lg ${viewMode ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-200 hover:border-primary cursor-pointer'} transition`}>
                    <input
                      type="checkbox"
                      checked={assessmentData.decreasedLibido}
                      onChange={() => handleCheckboxChange("decreasedLibido")}
                      disabled={viewMode}
                      className="w-5 h-5 text-primary"
                    />
                    <span className="font-medium text-gray-800">Decreased Libido</span>
                  </label>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Other Complaints
                  </label>
                  <VoiceInput
                    value={assessmentData.otherComplaints}
                    onChange={(e) => handleInputChange("otherComplaints", e.target.value)}
                    placeholder="Describe any other complaints..."
                    rows={3}
                    disabled={viewMode}
                  />
                </div>
              </Card>

              {/* Diabetic Complications */}
              <Card title="Diabetic Complications Screening">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Retinopathy
                    </label>
                    <input
                      type="text"
                      value={assessmentData.retinopathy}
                      onChange={(e) => handleInputChange("retinopathy", e.target.value)}
                      placeholder="Enter findings or 'None'"
                      disabled={viewMode}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cerebrovascular Disease
                    </label>
                    <input
                      type="text"
                      value={assessmentData.cerebrovascularDisease}
                      onChange={(e) => handleInputChange("cerebrovascularDisease", e.target.value)}
                      placeholder="Enter findings or 'None'"
                      disabled={viewMode}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cardiovascular Disease
                    </label>
                    <input
                      type="text"
                      value={assessmentData.cardiovascularDisease}
                      onChange={(e) => handleInputChange("cardiovascularDisease", e.target.value)}
                      placeholder="Enter findings or 'None'"
                      disabled={viewMode}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nephropathy
                    </label>
                    <input
                      type="text"
                      value={assessmentData.nephropathy}
                      onChange={(e) => handleInputChange("nephropathy", e.target.value)}
                      placeholder="Enter findings or 'None'"
                      disabled={viewMode}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Neuropathy - Peripheral
                    </label>
                    <input
                      type="text"
                      value={assessmentData.neuropathyPeripheral}
                      onChange={(e) => handleInputChange("neuropathyPeripheral", e.target.value)}
                      placeholder="Enter findings or 'None'"
                      disabled={viewMode}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Neuropathy - Autonomic
                    </label>
                    <input
                      type="text"
                      value={assessmentData.neuropathyAutonomic}
                      onChange={(e) => handleInputChange("neuropathyAutonomic", e.target.value)}
                      placeholder="Enter findings or 'None'"
                      disabled={viewMode}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </Card>

              {/* Family History */}
              <Card title="Family History">
                <VoiceInput
                  value={assessmentData.familyHistory}
                  onChange={(e) => handleInputChange("familyHistory", e.target.value)}
                  placeholder="Enter family history of diabetes, cardiovascular disease, etc..."
                  rows="4"
                  disabled={viewMode}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                />
              </Card>

              {/* Social History */}
              <Card title="Social History">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Alcohol Intake
                    </label>
                    <input
                      type="text"
                      value={assessmentData.alcoholIntake}
                      onChange={(e) => handleInputChange("alcoholIntake", e.target.value)}
                      placeholder="e.g., None, Occasional, Daily"
                      disabled={viewMode}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cigarette Smoking
                    </label>
                    <input
                      type="text"
                      value={assessmentData.cigaretteSmoking}
                      onChange={(e) => handleInputChange("cigaretteSmoking", e.target.value)}
                      placeholder="e.g., Non-smoker, 5 cigarettes/day, Former smoker"
                      disabled={viewMode}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Diet Type
                    </label>
                    <select
                      value={assessmentData.dietType}
                      onChange={(e) => handleInputChange("dietType", e.target.value)}
                      disabled={viewMode}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select diet type...</option>
                      <option value="Liberal Diet">Liberal Diet</option>
                      <option value="Controlled Diet">Controlled Diet</option>
                      <option value="Diabetic Diet">Diabetic Diet</option>
                      <option value="Low Carb">Low Carb</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Exercise Plan
                    </label>
                    <VoiceInput
                      value={assessmentData.exercisePlan}
                      onChange={(e) => handleInputChange("exercisePlan", e.target.value)}
                      placeholder="Describe current exercise routine..."
                      rows={3}
                      disabled={viewMode}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Substance Use
                    </label>
                    <input
                      type="text"
                      value={assessmentData.substanceUse}
                      onChange={(e) => handleInputChange("substanceUse", e.target.value)}
                      placeholder="Enter any substance use or 'None'"
                      disabled={viewMode}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </Card>

            {/* Print-only content */}
              {viewMode && (
                <div id="ia-print-content" className="hidden print:block">
                  {/* Hospital Header */}
                  <div className="flex justify-between items-center mb-8 border-b-2 border-primary pb-4">
                    <div>
                      <h1 className="text-3xl font-bold text-primary">CDC DIABETES CLINIC</h1>
                      <p className="text-sm text-gray-600 mt-2">Comprehensive Diabetes Centre • Excellence in Diabetes Care</p>
                      <p className="text-sm text-gray-600">Tel: +254 700 000 000 • Email: info@cdc-diabetes.com</p>
                    </div>
                    <img src={cdcLogo} alt="CDC Logo" className="w-40 h-40 object-contain py-4" />
                  </div>

                  {/* Document Title */}
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">INITIAL DIABETIC ASSESSMENT</h2>
                  </div>

                  {/* Patient Info */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                    <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase">Patient Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><p className="text-gray-600">Name:</p><p className="font-semibold">{selectedPatient?.name}</p></div>
                      <div><p className="text-gray-600">UHID:</p><p className="font-semibold">{selectedPatient?.uhid}</p></div>
                      <div><p className="text-gray-600">Age / Gender:</p><p className="font-semibold">{selectedPatient?.age} yrs • {selectedPatient?.gender}</p></div>
                      <div><p className="text-gray-600">Diabetes Type:</p><p className="font-semibold">{selectedPatient?.diabetesType || "—"}</p></div>
                    </div>
                  </div>

                  {/* Presenting Complaints */}
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase border-b pb-1">Presenting Complaints</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {[
                        { key: "weightLoss", label: "Weight Loss" },
                        { key: "visualDisturbances", label: "Visual Disturbances" },
                        { key: "increasedThirst", label: "Increased Thirst (Polydipsia)" },
                        { key: "fatigue", label: "Fatigue" },
                        { key: "nocturia", label: "Nocturia" },
                        { key: "paresthesia", label: "Paresthesia (Numbness/Tingling)" },
                        { key: "dizziness", label: "Dizziness" },
                        { key: "legCramps", label: "Leg Cramps" },
                        { key: "constipation", label: "Constipation" },
                        { key: "diarrhea", label: "Diarrhea" },
                        { key: "decreasedLibido", label: "Decreased Libido" },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className={assessmentData[key] ? "text-green-600 font-bold" : "text-gray-400"}>
                            {assessmentData[key] ? "✓" : "✗"}
                          </span>
                          <span className={assessmentData[key] ? "text-gray-800 font-semibold" : "text-gray-400"}>{label}</span>
                        </div>
                      ))}
                    </div>
                    {assessmentData.otherComplaints && (
                      <div className="mt-3 p-3 bg-gray-50 rounded border-l-4 border-primary">
                        <p className="text-xs font-bold text-gray-700 mb-1">Other Complaints:</p>
                        <p className="text-sm text-gray-800">{assessmentData.otherComplaints}</p>
                      </div>
                    )}
                  </div>

                  {/* Diabetic Complications */}
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase border-b pb-1">Diabetic Complications Screening</h3>
                    <table className="w-full text-sm border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Complication</th>
                          <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Findings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: "Retinopathy", key: "retinopathy" },
                          { label: "Cerebrovascular Disease", key: "cerebrovascularDisease" },
                          { label: "Cardiovascular Disease", key: "cardiovascularDisease" },
                          { label: "Nephropathy", key: "nephropathy" },
                          { label: "Neuropathy – Peripheral", key: "neuropathyPeripheral" },
                          { label: "Neuropathy – Autonomic", key: "neuropathyAutonomic" },
                        ].map(({ label, key }) => (
                          <tr key={key}>
                            <td className="border border-gray-300 px-3 py-2 font-medium text-gray-700">{label}</td>
                            <td className="border border-gray-300 px-3 py-2 text-gray-800">{assessmentData[key] || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Family & Social History */}
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase border-b pb-1">Family History</h3>
                      <p className="text-sm text-gray-800 p-3 bg-gray-50 rounded">{assessmentData.familyHistory || "—"}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase border-b pb-1">Social History</h3>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium text-gray-600">Alcohol:</span> {assessmentData.alcoholIntake || "—"}</p>
                        <p><span className="font-medium text-gray-600">Smoking:</span> {assessmentData.cigaretteSmoking || "—"}</p>
                        <p><span className="font-medium text-gray-600">Diet:</span> {assessmentData.dietType || "—"}</p>
                        <p><span className="font-medium text-gray-600">Exercise:</span> {assessmentData.exercisePlan || "—"}</p>
                        <p><span className="font-medium text-gray-600">Substance Use:</span> {assessmentData.substanceUse || "—"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Signature */}
                  <div className="grid grid-cols-2 gap-8 mt-10 pt-6 border-t-2 border-gray-300">
                    <div>
                      <div className="border-t-2 border-gray-400 pt-2">
                        <p className="text-sm font-semibold">Doctor's Signature</p>
                      </div>
                    </div>
                    <div>
                      <div className="border-t-2 border-gray-400 pt-2">
                        <p className="text-sm font-semibold">Date</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="text-center mt-6 pt-4 border-t border-gray-300">
                    <p className="text-xs text-gray-500">This assessment is confidential and intended for the patient named above.</p>
                    <p className="text-xs text-gray-500 mt-1">CDC Diabetes Clinic • Nairobi, Kenya</p>
                  </div>

                  {/* Print Styles */}
                  <style>{`
                    @media print {
                      body * { visibility: hidden; }
                      #ia-print-content, #ia-print-content * { visibility: visible; }
                      #ia-print-content {
                        position: absolute;
                        top: 0; left: 0;
                        width: 100%;
                        padding: 1cm;
                        background: white;
                      }
                      @page { margin: 1cm; }
                    }
                  `}</style>
                </div>
              )}

            {/* Action Buttons */}
              <div className="flex gap-4">
                {!viewMode ? (
                  <>
                    <Button type="submit" className="flex-1">
                      Save Initial Assessment
                    </Button>
                    {fromConsultation && embedded ? (
                      // Embedded in Consultation tabs - no button needed
                      null
                    ) : fromConsultation ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate(`/doctor/consultation/${selectedPatient.uhid}`)}
                        className="flex-1"
                      >
                        Return to Consultation
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSelectedPatient(null)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      onClick={handlePrint}
                      className="flex items-center gap-2"
                    >
                      🖨️ Print Assessment
                    </Button>
                    {fromConsultation && embedded ? (
                      // Embedded in tabs - just show close
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          // Do nothing, stay in tab
                        }}
                        className="flex-1"
                      >
                        ✓ Viewing Assessment
                      </Button>
                    ) : fromConsultation ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate(`/doctor/consultation/${selectedPatient.uhid}`)}
                        className="flex-1"
                      >
                        Return to Consultation
                      </Button>
                    ) : fromProfile ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => window.history.back()}
                        className="flex-1"
                      >
                        Back to Profile
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSelectedPatient(null);
                          setViewMode(false);
                          setAlreadyAssessed(false);
                        }}
                        className="flex-1"
                      >
                        Back to Patient Selection
                      </Button>
                    )}
                  </>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default InitialAssessment;
