import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import { usePatientContext } from "../../contexts/PatientContext";
import { useQueueContext } from "../../contexts/QueueContext";
import OrderLabTestModal from "../../components/doctor/OrderLabTestModal";

const Consultations = () => {
  const navigate = useNavigate();
  const { getPatientByUHID } = usePatientContext();
  const { getQueueByStatus, updateQueueStatus } = useQueueContext();

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedPatientFull, setSelectedPatientFull] = useState(null);
  const [showConsultationForm, setShowConsultationForm] = useState(false);
  const [consultationNotes, setConsultationNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
   const [showOrderLabModal, setShowOrderLabModal] = useState(false);

  // Get patients waiting for doctor
  const waitingPatients = getQueueByStatus("With Doctor");

  const handleSelectPatient = (uhid) => {
    const patient = getPatientByUHID(uhid);
    setSelectedPatient(uhid);
    setSelectedPatientFull(patient);
    setShowConsultationForm(false);
    setConsultationNotes("");
    setDiagnosis("");
  };

  const handleStartConsultation = () => {
    setShowConsultationForm(true);
  };

  const handleSaveNotes = () => {
    // Save notes (for now just show alert, will implement storage later)
    alert("Consultation notes saved!");
  };

  const handleCompleteConsultation = () => {
    if (!consultationNotes.trim() || !diagnosis.trim()) {
      alert("Please enter consultation notes and diagnosis before completing.");
      return;
    }

    // Update queue status to "Completed"
    updateQueueStatus(selectedPatientFull.uhid, "Completed");

    alert(
      `Consultation completed for ${selectedPatientFull.name}!\n\nPatient has been moved to completed queue.`
    );

    // Reset
    setShowConsultationForm(false);
    setSelectedPatient(null);
    setSelectedPatientFull(null);
    setConsultationNotes("");
    setDiagnosis("");
  };

  const handleNavigateWithPatient = (path) => {
    // Navigate to page with patient context
    navigate(path, {
      state: {
        patientUHID: selectedPatientFull.uhid,
        patientName: selectedPatientFull.name,
        fromConsultation: true,
      },
    });
  };

  return (
    <div>
      <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-6">
        Consultations
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waiting Patients List */}
        <div className="lg:col-span-1">
          <Card title="Patients Waiting">
            {waitingPatients.length > 0 ? (
              <div className="space-y-3">
                {waitingPatients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => handleSelectPatient(patient.uhid)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition ${
                      selectedPatient === patient.uhid
                        ? "border-primary bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-primary">{patient.uhid}</p>
                      {patient.priority === "Urgent" && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                          URGENT
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-800 mt-1">
                      {patient.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {patient.age} yrs • {patient.gender}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Arrived: {patient.arrivalTime}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No patients waiting</p>
              </div>
            )}
          </Card>
        </div>

        {/* Patient Details */}
        <div className="lg:col-span-2">
          {!selectedPatientFull ? (
            <Card>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👈</div>
                <p className="text-gray-500 text-lg">
                  Select a patient to view details
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Patient Info Header */}
              <Card>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">
                      {selectedPatientFull.name}
                    </h3>
                    <p className="text-gray-600">{selectedPatientFull.uhid}</p>
                  </div>
                  {!showConsultationForm && (
                    <Button onClick={handleStartConsultation}>
                      Start Consultation
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Age</p>
                    <p className="font-semibold">
                      {selectedPatientFull.age} years
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Gender</p>
                    <p className="font-semibold">
                      {selectedPatientFull.gender}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Diabetes Type</p>
                    <p className="font-semibold">
                      {selectedPatientFull.diabetesType}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last HbA1c</p>
                    <p className="font-semibold text-red-600">
                      {selectedPatientFull.hba1c}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Today's Triage Data */}
              {selectedPatientFull.lastTriageDate && (
                <Card title="📋 Today's Triage">
                  <div className="mb-4 pb-4 border-b">
                    <p className="text-sm text-gray-600">
                      Triaged on:{" "}
                      {new Date(
                        selectedPatientFull.lastTriageDate
                      ).toLocaleString()}
                    </p>
                    {selectedPatientFull.triageBy && (
                      <p className="text-sm text-gray-600">
                        Triaged by: {selectedPatientFull.triageBy}
                      </p>
                    )}
                  </div>

                  {/* Chief Complaint */}
                  {selectedPatientFull.chiefComplaint && (
                    <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                      <p className="text-sm font-semibold text-gray-700 mb-1">
                        Chief Complaint:
                      </p>
                      <p className="text-gray-800">
                        {selectedPatientFull.chiefComplaint}
                      </p>
                    </div>
                  )}

                  {/* Vital Signs */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">
                      🩺 Vital Signs
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedPatientFull.vitals?.bp && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600">
                            Blood Pressure
                          </p>
                          <p className="font-semibold text-lg">
                            {selectedPatientFull.vitals.bp}
                          </p>
                        </div>
                      )}
                      {selectedPatientFull.vitals?.heartRate && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600">Heart Rate</p>
                          <p className="font-semibold text-lg">
                            {selectedPatientFull.vitals.heartRate}
                          </p>
                        </div>
                      )}
                      {selectedPatientFull.vitals?.temperature && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600">Temperature</p>
                          <p className="font-semibold text-lg">
                            {selectedPatientFull.vitals.temperature}
                          </p>
                        </div>
                      )}
                      {selectedPatientFull.vitals?.weight && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600">Weight</p>
                          <p className="font-semibold text-lg">
                            {selectedPatientFull.vitals.weight}
                          </p>
                        </div>
                      )}
                      {selectedPatientFull.vitals?.height && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600">Height</p>
                          <p className="font-semibold text-lg">
                            {selectedPatientFull.vitals.height}
                          </p>
                        </div>
                      )}
                      {selectedPatientFull.vitals?.bmi && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-xs text-gray-600">BMI</p>
                          <p className="font-semibold text-lg text-blue-700">
                            {selectedPatientFull.vitals.bmi}
                          </p>
                        </div>
                      )}
                      {selectedPatientFull.vitals?.oxygenSaturation && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600">O2 Saturation</p>
                          <p className="font-semibold text-lg">
                            {selectedPatientFull.vitals.oxygenSaturation}
                          </p>
                        </div>
                      )}
                      {selectedPatientFull.currentVitals?.rbs && (
                        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                          <p className="text-xs text-gray-600">RBS</p>
                          <p className="font-semibold text-lg text-red-700">
                            {selectedPatientFull.currentVitals.rbs} mg/dL
                          </p>
                        </div>
                      )}
                      {selectedPatientFull.currentVitals?.hba1c && (
                        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                          <p className="text-xs text-gray-600">HbA1c</p>
                          <p className="font-semibold text-lg text-red-700">
                            {selectedPatientFull.currentVitals.hba1c}%
                          </p>
                        </div>
                      )}
                      {selectedPatientFull.currentVitals?.ketones && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600">Ketones</p>
                          <p className="font-semibold text-lg">
                            {selectedPatientFull.currentVitals.ketones} mmol/L
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {/* Medical History */}
              <Card title="📊 Medical Information">
                <div className="space-y-4">
                  {selectedPatientFull.medications &&
                    selectedPatientFull.medications.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                          Current Medications:
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                          {selectedPatientFull.medications.map((med, index) => (
                            <li key={index} className="text-sm text-gray-600">
                              {med}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {selectedPatientFull.allergies && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">
                        Allergies:
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedPatientFull.allergies}
                      </p>
                    </div>
                  )}

                  {selectedPatientFull.comorbidities &&
                    selectedPatientFull.comorbidities.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                          Comorbidities:
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                          {selectedPatientFull.comorbidities.map(
                            (condition, index) => (
                              <li key={index} className="text-sm text-gray-600">
                                {condition}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                </div>
              </Card>

              {/* Consultation Form */}
              {showConsultationForm && (
                <Card title="💬 Consultation">
                  <div className="space-y-4">
                    {/* Consultation Notes */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Consultation Notes *
                      </label>
                      <textarea
                        value={consultationNotes}
                        onChange={(e) => setConsultationNotes(e.target.value)}
                        placeholder="Document history of present illness, physical examination findings, assessment, and treatment plan..."
                        rows="6"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Include: Patient's history, your examination findings,
                        clinical assessment
                      </p>
                    </div>

                    {/* Diagnosis */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Diagnosis *
                      </label>
                      <input
                        type="text"
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                        placeholder="e.g., Type 2 Diabetes Mellitus - Poorly Controlled"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                      />
                    </div>

                    {/* Navigation Buttons to Other Pages */}
                    <div className="pt-4 border-t">
                      <p className="text-sm font-semibold text-gray-700 mb-3">
                        Additional Actions:
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleNavigateWithPatient(
                              "/doctor/initial-assessment"
                            )
                          }
                          className="text-sm"
                        >
                          📋 Initial Assessment
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleNavigateWithPatient("/doctor/physical-exam")
                          }
                          className="text-sm"
                        >
                          🩺 Physical Exam
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleNavigateWithPatient("/doctor/glycemic-charts")
                          }
                          className="text-sm"
                        >
                          📊 View Charts
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            navigate(
                              `/doctor/patient-profile/${selectedPatientFull.uhid}`,
                              {
                                state: { fromConsultation: true },
                              }
                            )
                          }
                          className="text-sm"
                        >
                          👤 Patient Profile
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleNavigateWithPatient("/doctor/prescriptions")
                          }
                          className="text-sm"
                        >
                          💊 Write Prescription
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleNavigateWithPatient("/doctor/reports")
                          }
                          className="text-sm"
                        >
                          📄 Generate Report
                        </Button>
                         <Button
                          variant="outline"
                          onClick={() => setShowOrderLabModal(true)}
                          className="text-sm bg-purple-50 hover:bg-purple-100 border-purple-300"
                        >
                          🔬 Order Lab Test
                        </Button>
                      </div>
                    </div>

                    {/* Main Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={handleSaveNotes}
                        className="flex-1"
                      >
                        Save Notes
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleCompleteConsultation}
                        className="flex-1"
                      >
                        Complete Consultation
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
        {/* Order Lab Test Modal */}
      {showOrderLabModal && selectedPatientFull && (
        <OrderLabTestModal
          patient={selectedPatientFull}
          onClose={() => setShowOrderLabModal(false)}
          onSuccess={() => {
            console.log("Lab test ordered successfully");
          }}
        />
      )}
      </div>
    </div>
  );
};

export default Consultations;
