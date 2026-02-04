import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Phone, Mail, Microscope, ArrowLeft } from "lucide-react";
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
import PrescriptionManagement from "../../components/doctor/PrescriptionManagement";
import MedicalEquipmentTab from "../../components/doctor/MedicalEquipmentTab";
import MedicalDocumentsTab from '../../components/shared/MedicalDocumentsTab';

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
import PhysicalExamList from "../../components/doctor/PhysicalExamList";

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
    { id: "equipment", name: "Medical Equipment", icon: "🔋" },
    { id: "initial-assessment", name: "Initial Assessment", icon: "📝" },
    { id: "physical-exam", name: "Physical Exam", icon: "🩺" },
    { id: "glycemic-charts", name: "Glycemic Charts", icon: "📈" },
    { id: "prescriptions", name: "Prescriptions", icon: "💊" },
    { id: "treatment-plans", name: "Treatment Plans", icon: "📝" },
    { id: "consultation-notes", name: "Consultation Notes", icon: "💬" },
     { id: "medical-documents", name: "Medical Documents", icon: "📄" },
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
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {/* Order Lab Test Button */}
          <Button
            onClick={() => setShowOrderLabModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3"
          >
            <Microscope className="w-5 h-5" />
            <span>Order Lab Test</span>
          </Button>

          {/* Back to Consultation Button */}
          {fromConsultation && (
            <Button
              variant="primary"
              onClick={() => navigate("/doctor/consultations")}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Consultation</span>
            </Button>
          )}

          {/* Back to My Patients Button */}
          <Button
            variant="outline"
            onClick={() => navigate("/doctor/patients")}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to My Patients</span>
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <div className="flex flex-col md:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Avatar - Responsive size */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold flex-shrink-0">
              {patient.name.charAt(0)}
            </div>

            {/* Patient Info - Left-aligned, compact on mobile */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-2xl font-bold text-gray-800 truncate">
                {patient.name}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mt-0.5 sm:mt-1">
                {patient.uhid} • {patient.age} yrs • {patient.gender}
              </p>
              {/* Contact Info - Stacked on mobile, inline on desktop */}
              <div className="mt-1 sm:mt-1.5 space-y-0.5 sm:space-y-0">
                <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-1.5">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="truncate">{patient.phone}</span>
                </p>
                <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-1.5">
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="truncate">{patient.email}</span>
                </p>
              </div>
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
        {activeTab === "equipment" && <MedicalEquipmentTab patient={patient} />}
        {activeTab === "initial-assessment" && <InitialAssessment />}
        {activeTab === "physical-exam" && (
          <PhysicalExamList patient={patient} embedded={true} />
        )}
        {activeTab === "glycemic-charts" && <GlycemicCharts />}
        {activeTab === "prescriptions" && (
          <PrescriptionsTab patient={patient} />
        )}
        {activeTab === "treatment-plans" && (
          <TreatmentPlansTab patient={patient} />
        )}
        {/* Consultation Notes Tab */}
        {activeTab === "consultation-notes" && (
          <ConsultationNotesList patient={patient} showStatistics={true} />
        )}
        {activeTab === "medical-documents" && <MedicalDocumentsTab patient={patient} />}
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-600 uppercase">Temperature</p>
            <p className="text-lg font-bold text-red-700 mt-1">
              {patient.vitals.temperature}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-600 uppercase">O2 Saturation</p>
            <p className="text-lg font-bold text-purple-700 mt-1">
              {patient.vitals.oxygenSaturation || "N/A"}
            </p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-600 uppercase">Weight</p>
            <p className="text-lg font-bold text-indigo-700 mt-1">
              {patient.vitals.weight}
            </p>
          </div>
          <div className="bg-cyan-50 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-600 uppercase">Height</p>
            <p className="text-lg font-bold text-cyan-700 mt-1">
              {patient.vitals.height}
            </p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg text-center border-2 border-orange-200">
            <p className="text-xs text-gray-600 uppercase">BMI</p>
            <p className="text-lg font-bold text-orange-700 mt-1">
              {patient.vitals.bmi}
            </p>
          </div>

          {/* NEW: Waist Circumference */}
          {patient.vitals.waistCircumference && (
            <div className="bg-pink-50 p-4 rounded-lg text-center border-2 border-pink-200">
              <p className="text-xs text-gray-600 uppercase">Waist Circ.</p>
              <p className="text-lg font-bold text-pink-700 mt-1">
                {patient.vitals.waistCircumference}
              </p>
            </div>
          )}

          {/* NEW: Waist-to-Height Ratio */}
          {patient.vitals.waistHeightRatio && (
            <div className="bg-yellow-50 p-4 rounded-lg text-center border-2 border-yellow-200">
              <p className="text-xs text-gray-600 uppercase">Waist/Height</p>
              <p className="text-lg font-bold text-yellow-700 mt-1">
                {patient.vitals.waistHeightRatio}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {parseFloat(patient.vitals.waistHeightRatio) < 0.5
                  ? "Healthy"
                  : parseFloat(patient.vitals.waistHeightRatio) < 0.6
                  ? "Inc. Risk"
                  : "High Risk"}
              </p>
            </div>
          )}

          {/* RBS */}
          {patient.vitals.rbs && (
            <div className="bg-rose-50 p-4 rounded-lg text-center border-2 border-rose-200">
              <p className="text-xs text-gray-600 uppercase">RBS</p>
              <p className="text-lg font-bold text-rose-700 mt-1">
                {patient.vitals.rbs}
              </p>
            </div>
          )}

          {/* HbA1c */}
          {patient.vitals.hba1c && (
            <div className="bg-red-50 p-4 rounded-lg text-center border-2 border-red-300">
              <p className="text-xs text-gray-600 uppercase">HbA1c</p>
              <p className="text-lg font-bold text-red-700 mt-1">
                {patient.vitals.hba1c}
              </p>
            </div>
          )}

          {/* Ketones */}
          {patient.vitals.ketones && (
            <div className="bg-amber-50 p-4 rounded-lg text-center">
              <p className="text-xs text-gray-600 uppercase">Ketones</p>
              <p className="text-lg font-bold text-amber-700 mt-1">
                {patient.vitals.ketones}
              </p>
            </div>
          )}
        </div>
      </Card>
      {/* NEW: Medical Equipment Summary */}
      {patient.medicalEquipment?.insulinPump?.hasPump && (
        <Card title="🔋 Medical Equipment">
          <div className="space-y-4">
            {/* Pump Summary */}
            {patient.medicalEquipment.insulinPump.current && (
              <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-gray-800 flex items-center gap-2">
                    ⚡ Insulin Pump
                  </p>
                  <span className="text-xs px-2 py-1 bg-blue-200 text-blue-800 rounded">
                    Active
                  </span>
                </div>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Model:</span>{" "}
                  {patient.medicalEquipment.insulinPump.current.model ||
                    "Not specified"}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Serial:</span>{" "}
                  {patient.medicalEquipment.insulinPump.current.serialNo}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Warranty expires:{" "}
                  {new Date(
                    patient.medicalEquipment.insulinPump.current.warrantyEndDate
                  ).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Transmitter Summary */}
            {patient.medicalEquipment.insulinPump.transmitter
              ?.hasTransmitter && (
              <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-gray-800 flex items-center gap-2">
                    📡 Transmitter
                  </p>
                  <span className="text-xs px-2 py-1 bg-purple-200 text-purple-800 rounded">
                    Active
                  </span>
                </div>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Serial:</span>{" "}
                  {patient.medicalEquipment.insulinPump.transmitter.serialNo}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Warranty expires:{" "}
                  {new Date(
                    patient.medicalEquipment.insulinPump.transmitter.warrantyEndDate
                  ).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* View Details Button */}
            <Button
              variant="outline"
              onClick={() => setActiveTab("equipment")}
              className="w-full"
            >
              View Equipment Details →
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

// InitialAssessmentTab removed - using imported InitialAssessment component
// PhysicalExamTab removed - using imported PhysicalExamination component
// GlycemicChartsTab removed - using imported GlycemicCharts component
// PrescriptionsTab removed - using imported DoctorPrescriptions component

const TreatmentPlansTab = ({ patient }) => {
  const { currentUser } = useUserContext();

  return (
    <TreatmentPlansList
      patient={patient}
      showStatistics={true}
      showCreateForm={true}
      currentUser={currentUser}
      onSuccess={() => {
        console.log("Treatment plan created successfully");
      }}
    />
  );
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

// Prescriptions Tab Component
const PrescriptionsTab = ({ patient }) => {
  const { currentUser } = useUserContext();
  const { getPrescriptionsByPatient, addPrescription } =
    usePrescriptionContext();

  const patientPrescriptions = getPrescriptionsByPatient(patient.uhid);

  return (
    <PrescriptionManagement
      patient={patient}
      patientPrescriptions={patientPrescriptions}
      addPrescription={addPrescription}
      currentUser={currentUser}
      onSuccess={() => {
        console.log("Prescription created successfully");
      }}
    />
  );
};

export default PatientProfile;
