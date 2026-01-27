import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import VoiceInput from "../../components/shared/VoiceInput";
import { usePatientContext } from "../../contexts/PatientContext";
import { usePrescriptionContext } from "../../contexts/PrescriptionContext";
import { useUserContext } from "../../contexts/UserContext";
import { usePhysicalExamContext } from "../../contexts/PhysicalExamContext";
import { useInitialAssessmentContext } from "../../contexts/InitialAssessmentContext";
import { useLabContext } from "../../contexts/LabContext";
import LabTestDetailsModal from "../../components/lab/LabTestDetailsModal";
import LabTestPrint from "../../components/lab/LabTestPrint";
import { useTreatmentPlanContext } from "../../contexts/TreatmentPlanContext";
import ConsultationNotesList from "../../components/doctor/ConsultationNotesList";

import {
  physicalExamSections,
  generateFindingsProse,
} from "../doctor/physicalExamData";

import PrescriptionPrint from "../../components/doctor/PrescriptionPrint";
import Modal from "../../components/shared/Modal";
import Input from "../../components/shared/Input";
import OrderLabTestModal from "../../components/doctor/OrderLabTestModal";
import TreatmentPlanPrint from "../../components/doctor/TreatmentPlanPrint";
import TreatmentPlansList from "../../components/doctor/TreatmentPlansList";
// Import standalone components (to avoid duplication)
import GlycemicCharts from "./GlycemicCharts";
import DoctorPrescriptions from "./DoctorPrescriptions";
import PhysicalExamination from "./PhysicalExamination";
import InitialAssessment from "./InitialAssessment";

const PatientProfile = () => {
  const navigate = useNavigate();
  const { uhid } = useParams();
  const location = useLocation();
  const fromConsultation = location.state?.fromConsultation;
  const [activeTab, setActiveTab] = useState(
    location.state?.activeTab || "overview"
  );
  const [showOrderLabModal, setShowOrderLabModal] = useState(false);

  const { getPatientByUHID, getBloodSugarReadings } = usePatientContext();
  const { getPrescriptionsByPatient } = usePrescriptionContext();

  const patient = getPatientByUHID(uhid);

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-2xl font-bold text-red-600">Patient not found!</p>
        <p className="text-gray-600 mt-2">UHID: {uhid}</p>
        <Button onClick={() => navigate("/doctor/patients")} className="mt-4">
          ← Back to My Patients
        </Button>
      </div>
    );
  }

  const tabs = [
    { id: "overview", name: "Overview", icon: "📋" },
    { id: "initial-assessment", name: "Initial Assessment", icon: "📝" },
    { id: "physical-exam", name: "Physical Exam", icon: "🩺" },
    { id: "glycemic-charts", name: "Glycemic Charts", icon: "📈" },
    { id: "prescriptions", name: "Prescriptions", icon: "💊" },
    { id: "treatment-plans", name: "Treatment Plans", icon: "📝" },
    { id: "consultation-notes", name: "Consultation Notes", icon: "💬" }, 
    { id: "reports", name: "Reports", icon: "📄" },
  ];

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">
            Patient Profile
          </h2>
          <p className="text-gray-600 mt-1">
            {patient.name} ({patient.uhid})
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowOrderLabModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            🔬 Order Lab Test
          </Button>
          {fromConsultation && (
            <Button
              variant="primary"
              onClick={() => navigate("/doctor/consultations")}
            >
              ← Back to Consultation
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate("/doctor/patients")}
          >
            ← Back to My Patients
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <div className="flex flex-col md:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {patient.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">
                {patient.name}
              </h3>
              <p className="text-gray-600 mt-1">
                {patient.uhid} • {patient.age} yrs • {patient.gender}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                📞 {patient.phone} • 📧 {patient.email}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold">
              {patient.diabetesType}
            </span>
            <span
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                patient.riskLevel === "High"
                  ? "bg-red-100 text-red-700"
                  : patient.riskLevel === "Medium"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {patient.riskLevel} Risk
            </span>
            <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-semibold">
              {patient.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div>
            <p className="text-xs text-gray-500 uppercase">HbA1c</p>
            <p className="text-xl font-bold text-red-600 mt-1">
              {patient.hba1c}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Diagnosis Date</p>
            <p className="text-sm font-semibold mt-1">
              {patient.diagnosisDate}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Last Visit</p>
            <p className="text-sm font-semibold mt-1">{patient.lastVisit}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Next Visit</p>
            <p className="text-sm font-semibold text-blue-600 mt-1">
              {patient.nextVisit}
            </p>
          </div>
        </div>
      </Card>

      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 border-b-2 border-gray-200 pb-2 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-t-lg font-semibold transition whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        {activeTab === "overview" && <OverviewTab patient={patient} />}
        {activeTab === "initial-assessment" && <InitialAssessment />}
        {activeTab === "physical-exam" && <PhysicalExamination />}
        {activeTab === "glycemic-charts" && <GlycemicCharts />}
        {activeTab === "prescriptions" && <DoctorPrescriptions />}
        {activeTab === "treatment-plans" && (
          <TreatmentPlansTab patient={patient} />
        )}
        {/* Consultation Notes Tab */}
        {activeTab === "consultation-notes" && (
          <ConsultationNotesList 
            patient={patient} 
            showStatistics={true}
          />
        )}
        {activeTab === "reports" && <ReportsTab patient={patient} />}
      </div>

      {/* Order Lab Test Modal */}
      {showOrderLabModal && patient && (
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

const OverviewTab = ({ patient }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="📋 Personal Information">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Full Name</p>
              <p className="font-semibold text-gray-800">{patient.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">UHID</p>
              <p className="font-semibold text-primary">{patient.uhid}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Age / Gender</p>
              <p className="font-semibold text-gray-800">
                {patient.age} years • {patient.gender}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-semibold text-gray-800">{patient.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-semibold text-gray-800">{patient.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Address</p>
              <p className="font-semibold text-gray-800">{patient.address}</p>
            </div>
          </div>
        </Card>

        <Card title="🏥 Medical Information">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Diabetes Type</p>
              <p className="font-semibold text-gray-800">
                {patient.diabetesType}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Diagnosis Date</p>
              <p className="font-semibold text-gray-800">
                {patient.diagnosisDate}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Current HbA1c</p>
              <p className="font-semibold text-red-600">{patient.hba1c}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Risk Level</p>
              <p
                className={`font-semibold ${
                  patient.riskLevel === "High"
                    ? "text-red-600"
                    : patient.riskLevel === "Medium"
                    ? "text-yellow-600"
                    : "text-green-600"
                }`}
              >
                {patient.riskLevel}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Primary Doctor</p>
              <p className="font-semibold text-gray-800">
                {patient.primaryDoctor}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-semibold text-green-600">{patient.status}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="🚨 Emergency Contact">
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-600">Name</p>
            <p className="font-semibold text-gray-800">
              {patient.emergencyContact.name}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Relationship</p>
            <p className="font-semibold text-gray-800">
              {patient.emergencyContact.relationship}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Phone</p>
            <p className="font-semibold text-gray-800">
              {patient.emergencyContact.phone}
            </p>
          </div>
        </div>
      </Card>

      <Card title="💊 Current Medications">
        <ul className="space-y-2">
          {patient.medications.map((med, index) => (
            <li
              key={index}
              className="flex items-start p-3 bg-gray-50 rounded-lg"
            >
              <span className="text-blue-600 mr-2">💊</span>
              <span className="text-sm font-medium text-gray-800">{med}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="⚠️ Allergies">
          <p className="text-sm font-semibold text-red-600">
            {patient.allergies}
          </p>
        </Card>

        <Card title="🏥 Comorbidities">
          {patient.comorbidities && patient.comorbidities.length > 0 ? (
            <ul className="space-y-1">
              {patient.comorbidities.map((condition, index) => (
                <li key={index} className="text-sm text-gray-700">
                  • {condition}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600">None</p>
          )}
        </Card>
      </div>

      <Card title="📊 Latest Vitals">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-600 uppercase">Blood Pressure</p>
            <p className="text-lg font-bold text-blue-700 mt-1">
              {patient.vitals.bp}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-600 uppercase">Heart Rate</p>
            <p className="text-lg font-bold text-green-700 mt-1">
              {patient.vitals.heartRate}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-600 uppercase">Weight</p>
            <p className="text-lg font-bold text-purple-700 mt-1">
              {patient.vitals.weight}
            </p>
          </div>
          <div className="bg-cyan-50 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-600 uppercase">Height</p>
            <p className="text-lg font-bold text-cyan-700 mt-1">
              {patient.vitals.height}
            </p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-600 uppercase">BMI</p>
            <p className="text-lg font-bold text-orange-700 mt-1">
              {patient.vitals.bmi}
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-600 uppercase">Temperature</p>
            <p className="text-lg font-bold text-red-700 mt-1">
              {patient.vitals.temperature}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

// InitialAssessmentTab removed - using imported InitialAssessment component
// PhysicalExamTab removed - using imported PhysicalExamination component
// GlycemicChartsTab removed - using imported GlycemicCharts component
// PrescriptionsTab removed - using imported DoctorPrescriptions component

const NewPrescriptionForm = ({
  onClose,
  patient,
  addPrescription,
  currentDoctor,
 }) => {
  const commonMedications = [
    { name: "Metformin", defaultDosage: "500mg", type: "Oral" },
    { name: "Glimepiride", defaultDosage: "2mg", type: "Oral" },
    { name: "Insulin Glargine", defaultDosage: "10 units", type: "Injectable" },
    { name: "Insulin Aspart", defaultDosage: "5 units", type: "Injectable" },
    { name: "Atorvastatin", defaultDosage: "20mg", type: "Oral" },
    { name: "Amlodipine", defaultDosage: "5mg", type: "Oral" },
  ];

  const [diagnosis, setDiagnosis] = useState("");
  const [medications, setMedications] = useState([
    { name: "", dosage: "", frequency: "", duration: "", instructions: "" },
  ]);

  const handleAddMedication = () => {
    setMedications([
      ...medications,
      { name: "", dosage: "", frequency: "", duration: "", instructions: "" },
    ]);
  };

  const handleRemoveMedication = (index) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleMedicationChange = (index, field, value) => {
    const newMeds = [...medications];
    newMeds[index][field] = value;

    if (field === "name") {
      const commonMed = commonMedications.find((m) => m.name === value);
      if (commonMed) {
        newMeds[index]["dosage"] = commonMed.defaultDosage;
      }
    }

    setMedications(newMeds);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newPrescription = {
      uhid: patient.uhid,
      patientName: patient.name,
      diagnosis: diagnosis,
      doctorName: currentDoctor?.name || "Dr. Ahmed Hassan",
      doctorSpecialty: currentDoctor?.specialty || "Endocrinologist",
      medications: medications.map((med) => ({
        ...med,
        quantity: "30",
      })),
      notes: "",
    };

    addPrescription(newPrescription);

    const successDiv = document.createElement("div");
    successDiv.className =
      "fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-bounce";
    successDiv.innerHTML = "✅ Prescription created successfully!";
    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 3000);

    onClose();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 max-h-[70vh] overflow-y-auto"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 font-semibold mb-2 text-sm">
            Patient UHID
          </label>
          <input
            type="text"
            value={patient.uhid}
            disabled
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-gray-700 font-semibold mb-2 text-sm">
            Patient Name
          </label>
          <input
            type="text"
            value={patient.name}
            disabled
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-100"
          />
        </div>
      </div>

      <div>
        <label className="block text-gray-700 font-semibold mb-2 text-sm uppercase tracking-wide">
          Diagnosis *
        </label>
        {/* <textarea
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          placeholder="Enter diagnosis..."
          rows="2"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
          required
        /> */}
        <VoiceInput
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          placeholder="Enter diagnosis..."
          rows={2}
          // className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
          required ={true}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-700">Medications</h4>
          <button
            type="button"
            onClick={handleAddMedication}
            className="text-sm text-primary hover:underline font-semibold"
          >
            + Add Medication
          </button>
        </div>

        <div className="space-y-4">
          {medications.map((med, index) => (
            <div
              key={index}
              className="p-4 border-2 border-gray-200 rounded-lg relative"
            >
              {medications.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveMedication(index)}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold"
                >
                  ✕
                </button>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Medication Name *
                  </label>
                  <select
                    value={med.name}
                    onChange={(e) =>
                      handleMedicationChange(index, "name", e.target.value)
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                    required
                  >
                    <option value="">Select medication...</option>
                    {commonMedications.map((commonMed) => (
                      <option key={commonMed.name} value={commonMed.name}>
                        {commonMed.name} ({commonMed.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Dosage *
                    </label>
                    <input
                      type="text"
                      value={med.dosage}
                      onChange={(e) =>
                        handleMedicationChange(index, "dosage", e.target.value)
                      }
                      placeholder="500mg"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Duration *
                    </label>
                    <input
                      type="text"
                      value={med.duration}
                      onChange={(e) =>
                        handleMedicationChange(
                          index,
                          "duration",
                          e.target.value
                        )
                      }
                      placeholder="30 days"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Frequency *
                  </label>
                  <select
                    value={med.frequency}
                    onChange={(e) =>
                      handleMedicationChange(index, "frequency", e.target.value)
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                    required
                  >
                    <option value="">Select frequency...</option>
                    <option value="Once daily">Once daily</option>
                    <option value="Twice daily">Twice daily</option>
                    <option value="Three times daily">Three times daily</option>
                    <option value="Before meals">Before meals</option>
                    <option value="After meals">After meals</option>
                    <option value="Bedtime">Bedtime</option>
                    <option value="As needed">As needed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Special Instructions
                  </label>
                  <input
                    type="text"
                    value={med.instructions}
                    onChange={(e) =>
                      handleMedicationChange(
                        index,
                        "instructions",
                        e.target.value
                      )
                    }
                    placeholder="Take with food"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <button
          type="submit"
          className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-700 font-semibold transition"
        >
          Create Prescription
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

const ViewPrescriptionModal = ({ prescription, onClose, onPrint }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b-2 border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              Prescription Details
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              #{prescription.prescriptionNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-600 uppercase font-semibold">
                Date Issued
              </p>
              <p className="text-lg font-bold text-gray-800 mt-1">
                {prescription.date}
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-600 uppercase font-semibold">
                Status
              </p>
              <p className="text-lg font-bold text-green-700 mt-1">
                {prescription.status}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border-2 border-gray-200 rounded-lg">
              <p className="text-xs text-gray-600 uppercase font-semibold mb-2">
                Patient
              </p>
              <p className="font-bold text-gray-800">
                {prescription.patientName}
              </p>
              <p className="text-sm text-gray-600">{prescription.uhid}</p>
            </div>
            <div className="p-4 border-2 border-gray-200 rounded-lg">
              <p className="text-xs text-gray-600 uppercase font-semibold mb-2">
                Prescribed By
              </p>
              <p className="font-bold text-gray-800">
                {prescription.doctorName}
              </p>
              <p className="text-sm text-gray-600">
                {prescription.doctorSpecialty}
              </p>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
            <p className="text-xs text-gray-600 uppercase font-semibold mb-2">
              🩺 Diagnosis
            </p>
            <p className="text-gray-800">{prescription.diagnosis}</p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-3">💊 Medications</h4>
            <div className="space-y-3">
              {prescription.medications.map((med, index) => (
                <div
                  key={index}
                  className="p-4 border-2 border-gray-200 rounded-lg"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-gray-800 text-lg">
                      {med.name}
                    </p>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      Qty: {med.quantity}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-gray-600">Dosage</p>
                      <p className="font-semibold text-gray-800">
                        {med.dosage}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Frequency</p>
                      <p className="font-semibold text-gray-800">
                        {med.frequency}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Duration</p>
                      <p className="font-semibold text-gray-800">
                        {med.duration}
                      </p>
                    </div>
                  </div>
                  {med.instructions && (
                    <div className="mt-3 p-2 bg-yellow-50 rounded">
                      <p className="text-xs text-gray-600">Instructions:</p>
                      <p className="text-sm text-gray-700">
                        {med.instructions}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {prescription.notes && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 uppercase font-semibold mb-2">
                📝 Additional Notes
              </p>
              <p className="text-gray-700">{prescription.notes}</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200 p-6 flex gap-3">
          <button
            onClick={onPrint}
            className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-700 font-semibold transition"
          >
            🖨️ Print Prescription
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const TreatmentPlansTab = ({ patient }) => {
  return <TreatmentPlansList patient={patient} showStatistics={true} />;
};

// ReportsTab component

const ReportsTab = ({ patient }) => {
  const { getTestsByPatient } = useLabContext();
  const labTests = getTestsByPatient(patient.uhid);

  const [selectedTest, setSelectedTest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const handleViewFullReport = (test) => {
    setSelectedTest(test);
    setShowDetailsModal(true);
  };

  const handlePrint = (test) => {
    setSelectedTest(test);
    setShowPrintModal(true);
  };

  const handleEmail = (test) => {
    // Show "Not implemented" message
    const notificationDiv = document.createElement("div");
    notificationDiv.className =
      "fixed top-4 right-4 bg-blue-500 text-white px-6 py-4 rounded-lg shadow-lg z-50";
    notificationDiv.innerHTML = `
      <p class="font-bold">📧 Email Feature</p>
      <p class="text-sm mt-1">Email functionality will be implemented with backend integration.</p>
      <p class="text-sm">Test: ${test.testType} for ${test.patientName}</p>
    `;
    document.body.appendChild(notificationDiv);
    setTimeout(() => notificationDiv.remove(), 4000);
  };

  if (labTests.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔬</div>
          <p className="text-gray-500 text-lg mb-2">No Lab Reports Available</p>
          <p className="text-gray-400 text-sm">
            This patient has no lab test results yet.
          </p>
        </div>
      </Card>
    );
  }

  const getInterpretationColor = (interpretation) => {
    switch (interpretation) {
      case "Normal":
        return "bg-green-100 text-green-700 border-green-300";
      case "Abnormal":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "Critical":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const formatTestResults = (results, testType) => {
    const entries = Object.entries(results);
    if (entries.length === 1) {
      return `${entries[0][1]}`;
    }
    return entries.map(([key, value]) => `${key}: ${value}`).join(", ");
  };

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 text-white">
          <p className="text-xs opacity-90">Total Tests</p>
          <p className="text-3xl font-bold mt-1">{labTests.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 text-white">
          <p className="text-xs opacity-90">Normal</p>
          <p className="text-3xl font-bold mt-1">
            {labTests.filter((t) => t.interpretation === "Normal").length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-4 text-white">
          <p className="text-xs opacity-90">Abnormal</p>
          <p className="text-3xl font-bold mt-1">
            {labTests.filter((t) => t.interpretation === "Abnormal").length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-4 text-white">
          <p className="text-xs opacity-90">Critical</p>
          <p className="text-3xl font-bold mt-1">
            {labTests.filter((t) => t.interpretation === "Critical").length}
          </p>
        </div>
      </div>

      {/* Critical Alerts */}
      {labTests.some((t) => t.isCritical) && (
        <Card className="border-2 border-red-500">
          <div className="flex items-start gap-3 mb-4">
            <div className="text-3xl">🚨</div>
            <div>
              <h3 className="text-lg font-bold text-red-700">
                Critical Results Alert
              </h3>
              <p className="text-sm text-gray-600">
                This patient has {labTests.filter((t) => t.isCritical).length}{" "}
                critical lab result(s) requiring immediate attention.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {labTests
              .filter((t) => t.isCritical)
              .map((test) => (
                <div
                  key={test.id}
                  className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-800">{test.testType}</p>
                      <p className="text-sm text-gray-600">
                        Result:{" "}
                        <span className="font-bold text-red-600">
                          {formatTestResults(test.results, test.testType)}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">
                        Date:{" "}
                        {new Date(test.completedDate).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                      CRITICAL
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Lab Reports List */}
      <Card title="🔬 Laboratory Test Results">
        <div className="space-y-4">
          {labTests.map((test, index) => (
            <div
              key={test.id}
              className={`p-4 sm:p-6 border-2 rounded-lg transition hover:shadow-lg ${
                test.isCritical
                  ? "border-red-300 bg-red-50"
                  : index === 0
                  ? "border-blue-300 bg-blue-50"
                  : "border-gray-200 hover:border-primary"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                {/* Test Info */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {index === 0 && !test.isCritical && (
                      <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                        LATEST
                      </span>
                    )}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${getInterpretationColor(
                        test.interpretation
                      )}`}
                    >
                      {test.interpretation}
                    </span>
                    {test.isCritical && (
                      <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                        🚨 CRITICAL
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Test Type</p>
                      <p className="text-lg font-bold text-primary">
                        {test.testType}
                      </p>
                      <p className="text-sm text-gray-600">
                        Sample: {test.sampleType}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Test Results</p>
                      <p className="text-lg font-bold text-gray-800">
                        {formatTestResults(test.results, test.testType)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Normal Range: {test.normalRange}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Ordered By</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {test.orderedBy}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(test.orderedDate).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}{" "}
                        at {test.orderedTime}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Completed By</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {test.completedBy}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(test.completedDate).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}{" "}
                        at {test.completedTime}
                      </p>
                    </div>
                  </div>

                  {/* Detailed Results Breakdown */}
                  {Object.keys(test.results).length > 1 && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-bold text-gray-700 mb-2">
                        Detailed Results:
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.entries(test.results).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="text-gray-600">{key}:</span>{" "}
                            <span className="font-bold text-gray-800">
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {test.technicianNotes && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                      <p className="text-sm font-bold text-gray-700">
                        Technician Notes:
                      </p>
                      <p className="text-sm text-gray-800 mt-1">
                        {test.technicianNotes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 lg:items-end">
                  <Button
                    variant="outline"
                    className="w-full lg:w-auto text-sm"
                    onClick={() => handleViewFullReport(test)}
                  >
                    📄 View Full Report
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full lg:w-auto text-sm"
                    onClick={() => handlePrint(test)}
                  >
                    🖨️ Print
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full lg:w-auto text-sm"
                    onClick={() => handleEmail(test)}
                  >
                    📧 Email
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Reference Guide */}
      <Card title="📚 Interpretation Guide">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
            <p className="font-bold text-gray-800 mb-1">✅ Normal</p>
            <p className="text-gray-600">
              Test results are within the normal reference range. No immediate
              action required.
            </p>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
            <p className="font-bold text-gray-800 mb-1">⚠️ Abnormal</p>
            <p className="text-gray-600">
              Results are outside normal range. May require follow-up testing or
              treatment adjustment.
            </p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
            <p className="font-bold text-gray-800 mb-1">🚨 Critical</p>
            <p className="text-gray-600">
              Significantly abnormal values requiring immediate medical
              attention and intervention.
            </p>
          </div>
        </div>
      </Card>

      {/* Lab Test Details Modal */}
      {showDetailsModal && selectedTest && (
        <LabTestDetailsModal
          test={selectedTest}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedTest(null);
          }}
        />
      )}

      {/* Lab Test Print Modal */}
      {showPrintModal && selectedTest && (
        <LabTestPrint
          test={selectedTest}
          onClose={() => {
            setShowPrintModal(false);
            setSelectedTest(null);
          }}
        />
      )}
    </div>
  );
};

export default PatientProfile;