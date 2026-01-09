import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import { usePatientContext } from "../../contexts/PatientContext";
import { useInitialAssessmentContext } from "../../contexts/InitialAssessmentContext";
import { useUserContext } from "../../contexts/UserContext";

const InitialAssessment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { getPatientByUHID, patients } = usePatientContext();
  const { saveAssessment, getLatestAssessment } = useInitialAssessmentContext();
  const { currentUser } = useUserContext();

  const patientUHID = location.state?.patientUHID;
  const fromConsultation = location.state?.fromConsultation;

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [alreadyAssessed, setAlreadyAssessed] = useState(false);

  // Auto-select patient if coming from Consultations
  useEffect(() => {
    if (patientUHID) {
      const patient = getPatientByUHID(patientUHID);
      if (patient) {
        // Check if already assessed
        const existingAssessment = getLatestAssessment(patient.uhid);
        if (existingAssessment) {
          setAlreadyAssessed(true);
        }
        setSelectedPatient(patient);
      }
    }
  }, [patientUHID, getPatientByUHID, getLatestAssessment]);

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

  const handleCheckboxChange = (field) => {
    setAssessmentData({ ...assessmentData, [field]: !assessmentData[field] });
  };

  const handleInputChange = (field, value) => {
    setAssessmentData({ ...assessmentData, [field]: value });
  };

  const handleSelectPatient = (patient) => {
    // Check if patient already has an initial assessment
    const existingAssessment = getLatestAssessment(patient.uhid);
    
    if (existingAssessment) {
      setAlreadyAssessed(true);
      setSelectedPatient(patient);
      return;
    }
    
    setAlreadyAssessed(false);
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

  const handleSubmit = (e) => {
    e.preventDefault();

    // Save to context
    const savedAssessment = saveAssessment({
      uhid: selectedPatient.uhid,
      patientName: selectedPatient.name,
      doctorName: currentUser?.name || "Dr. Ahmed Hassan",
      data: assessmentData,
    });

    // Show success message
    const successDiv = document.createElement("div");
    successDiv.className =
      "fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-bounce";
    successDiv.innerHTML = `✅ Initial Assessment completed for ${selectedPatient.name}!`;
    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 3000);

    // Navigate back or clear
    if (fromConsultation) {
      navigate("/doctor/consultations");
    } else {
      setSelectedPatient(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">
          Initial Diabetic Assessment
        </h2>
        {fromConsultation && (
          <Button
            variant="outline"
            onClick={() => navigate("/doctor/consultations")}
          >
            ← Back to Consultation
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Selection (only show if NOT from consultation) */}
        {!fromConsultation && (
          <div className="lg:col-span-1">
            <Card title="👥 Select Patient">
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
                          {patient.age} yrs • {patient.gender}
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
        <div className={fromConsultation ? "lg:col-span-3" : "lg:col-span-2"}>
          {!selectedPatient ? (
            <Card>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👈</div>
                <p className="text-gray-500 text-lg">
                  Select a patient to start initial assessment
                </p>
              </div>
            </Card>
          ) : alreadyAssessed ? (
            <Card>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  Initial Assessment Already Completed
                </h3>
                <p className="text-gray-600 mb-4">
                  {selectedPatient.name} ({selectedPatient.uhid}) has already been assessed.
                </p>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded max-w-md mx-auto mb-6">
                  <p className="text-sm text-blue-800">
                    <strong>ℹ️ Note:</strong> Initial Assessment is a one-time comprehensive evaluation for new patients.
                    For ongoing evaluations, please use:
                  </p>
                  <ul className="text-sm text-blue-800 mt-2 space-y-1 text-left">
                    <li>• <strong>Physical Examination</strong> - For detailed body system checks</li>
                    <li>• <strong>Consultations</strong> - For follow-up visits</li>
                    <li>• <strong>Prescriptions</strong> - For medication management</li>
                  </ul>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() =>
                      navigate(`/doctor/patient-profile/${selectedPatient.uhid}`, {
                        state: { fromConsultation: false }
                      })
                    }
                  >
                    📄 View Patient Profile
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/doctor/physical-exam", {
                      state: { patientUHID: selectedPatient.uhid, fromConsultation: false }
                    })}
                  >
                    🩺 Physical Examination
                  </Button>
                  {!fromConsultation && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedPatient(null);
                        setAlreadyAssessed(false);
                      }}
                    >
                      ← Back
                    </Button>
                  )}
                  {fromConsultation && (
                    <Button
                      variant="outline"
                      onClick={() => navigate("/doctor/consultations")}
                    >
                      ← Back to Consultation
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Patient Header */}
              <Card>
                <h3 className="text-2xl font-bold text-gray-800">
                  {selectedPatient.name}
                </h3>
                <p className="text-gray-600 mt-1">
                  {selectedPatient.uhid} • {selectedPatient.age} yrs •{" "}
                  {selectedPatient.gender}
                </p>
              </Card>

              {/* Presenting Complaints */}
              <Card title="Presenting Complaints">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center space-x-3 p-3 border-2 border-gray-200 rounded-lg hover:border-primary transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assessmentData.weightLoss}
                      onChange={() => handleCheckboxChange("weightLoss")}
                      className="w-5 h-5 text-primary"
                    />
                    <span className="font-medium text-gray-800">
                      Weight Loss
                    </span>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border-2 border-gray-200 rounded-lg hover:border-primary transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assessmentData.visualDisturbances}
                      onChange={() =>
                        handleCheckboxChange("visualDisturbances")
                      }
                      className="w-5 h-5 text-primary"
                    />
                    <span className="font-medium text-gray-800">
                      Visual Disturbances
                    </span>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border-2 border-gray-200 rounded-lg hover:border-primary transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assessmentData.increasedThirst}
                      onChange={() => handleCheckboxChange("increasedThirst")}
                      className="w-5 h-5 text-primary"
                    />
                    <span className="font-medium text-gray-800">
                      Increased Thirst (Polydipsia)
                    </span>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border-2 border-gray-200 rounded-lg hover:border-primary transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assessmentData.fatigue}
                      onChange={() => handleCheckboxChange("fatigue")}
                      className="w-5 h-5 text-primary"
                    />
                    <span className="font-medium text-gray-800">Fatigue</span>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border-2 border-gray-200 rounded-lg hover:border-primary transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assessmentData.nocturia}
                      onChange={() => handleCheckboxChange("nocturia")}
                      className="w-5 h-5 text-primary"
                    />
                    <span className="font-medium text-gray-800">
                      Nocturia (Frequent Nighttime Urination)
                    </span>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border-2 border-gray-200 rounded-lg hover:border-primary transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assessmentData.paresthesia}
                      onChange={() => handleCheckboxChange("paresthesia")}
                      className="w-5 h-5 text-primary"
                    />
                    <span className="font-medium text-gray-800">
                      Paresthesia (Numbness/Tingling)
                    </span>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border-2 border-gray-200 rounded-lg hover:border-primary transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assessmentData.dizziness}
                      onChange={() => handleCheckboxChange("dizziness")}
                      className="w-5 h-5 text-primary"
                    />
                    <span className="font-medium text-gray-800">Dizziness</span>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border-2 border-gray-200 rounded-lg hover:border-primary transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assessmentData.legCramps}
                      onChange={() => handleCheckboxChange("legCramps")}
                      className="w-5 h-5 text-primary"
                    />
                    <span className="font-medium text-gray-800">
                      Leg Cramps
                    </span>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border-2 border-gray-200 rounded-lg hover:border-primary transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assessmentData.constipation}
                      onChange={() => handleCheckboxChange("constipation")}
                      className="w-5 h-5 text-primary"
                    />
                    <span className="font-medium text-gray-800">
                      Constipation
                    </span>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border-2 border-gray-200 rounded-lg hover:border-primary transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assessmentData.diarrhea}
                      onChange={() => handleCheckboxChange("diarrhea")}
                      className="w-5 h-5 text-primary"
                    />
                    <span className="font-medium text-gray-800">Diarrhea</span>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border-2 border-gray-200 rounded-lg hover:border-primary transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assessmentData.decreasedLibido}
                      onChange={() => handleCheckboxChange("decreasedLibido")}
                      className="w-5 h-5 text-primary"
                    />
                    <span className="font-medium text-gray-800">
                      Decreased Libido
                    </span>
                  </label>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Other Complaints
                  </label>
                  <textarea
                    value={assessmentData.otherComplaints}
                    onChange={(e) =>
                      handleInputChange("otherComplaints", e.target.value)
                    }
                    placeholder="Describe any other complaints..."
                    rows="3"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
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
                      onChange={(e) =>
                        handleInputChange("retinopathy", e.target.value)
                      }
                      placeholder="Enter findings or 'None'"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cerebrovascular Disease
                    </label>
                    <input
                      type="text"
                      value={assessmentData.cerebrovascularDisease}
                      onChange={(e) =>
                        handleInputChange(
                          "cerebrovascularDisease",
                          e.target.value
                        )
                      }
                      placeholder="Enter findings or 'None'"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cardiovascular Disease
                    </label>
                    <input
                      type="text"
                      value={assessmentData.cardiovascularDisease}
                      onChange={(e) =>
                        handleInputChange(
                          "cardiovascularDisease",
                          e.target.value
                        )
                      }
                      placeholder="Enter findings or 'None'"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nephropathy
                    </label>
                    <input
                      type="text"
                      value={assessmentData.nephropathy}
                      onChange={(e) =>
                        handleInputChange("nephropathy", e.target.value)
                      }
                      placeholder="Enter findings or 'None'"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Neuropathy - Peripheral
                    </label>
                    <input
                      type="text"
                      value={assessmentData.neuropathyPeripheral}
                      onChange={(e) =>
                        handleInputChange(
                          "neuropathyPeripheral",
                          e.target.value
                        )
                      }
                      placeholder="Enter findings or 'None'"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Neuropathy - Autonomic
                    </label>
                    <input
                      type="text"
                      value={assessmentData.neuropathyAutonomic}
                      onChange={(e) =>
                        handleInputChange("neuropathyAutonomic", e.target.value)
                      }
                      placeholder="Enter findings or 'None'"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                    />
                  </div>
                </div>
              </Card>

              {/* Family History */}
              <Card title="Family History">
                <textarea
                  value={assessmentData.familyHistory}
                  onChange={(e) =>
                    handleInputChange("familyHistory", e.target.value)
                  }
                  placeholder="Enter family history of diabetes, cardiovascular disease, etc..."
                  rows="4"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                />
              </Card>

              {/* Social History */}
              <Card title=" Social History">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Alcohol Intake
                    </label>
                    <input
                      type="text"
                      value={assessmentData.alcoholIntake}
                      onChange={(e) =>
                        handleInputChange("alcoholIntake", e.target.value)
                      }
                      placeholder="e.g., None, Occasional, Daily"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cigarette Smoking
                    </label>
                    <input
                      type="text"
                      value={assessmentData.cigaretteSmoking}
                      onChange={(e) =>
                        handleInputChange("cigaretteSmoking", e.target.value)
                      }
                      placeholder="e.g., Non-smoker, 5 cigarettes/day, Former smoker"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Diet Type
                    </label>
                    <select
                      value={assessmentData.dietType}
                      onChange={(e) =>
                        handleInputChange("dietType", e.target.value)
                      }
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
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
                    <textarea
                      value={assessmentData.exercisePlan}
                      onChange={(e) =>
                        handleInputChange("exercisePlan", e.target.value)
                      }
                      placeholder="Describe current exercise routine..."
                      rows="3"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Substance Use
                    </label>
                    <input
                      type="text"
                      value={assessmentData.substanceUse}
                      onChange={(e) =>
                        handleInputChange("substanceUse", e.target.value)
                      }
                      placeholder="Enter any substance use or 'None'"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                    />
                  </div>
                </div>
              </Card>

              {/* Submit Buttons */}
              <div className="flex gap-4">
                <Button type="submit" className="flex-1">
                  💾 Save Initial Assessment
                </Button>
                {fromConsultation ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/doctor/consultations")}
                    className="flex-1"
                  >
                    ← Return to Consultation
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
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default InitialAssessment;