import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import { usePatientContext } from "../../contexts/PatientContext";
import { usePrescriptionContext } from "../../contexts/PrescriptionContext";
import { useUserContext } from "../../contexts/UserContext";
import { usePhysicalExamContext } from "../../contexts/PhysicalExamContext";
import { useInitialAssessmentContext } from "../../contexts/InitialAssessmentContext";
import { useLabContext } from "../../contexts/LabContext";
import LabTestDetailsModal from "../../components/lab/LabTestDetailsModal";
import LabTestPrint from "../../components/lab/LabTestPrint";
import { useTreatmentPlanContext } from "../../contexts/TreatmentPlanContext";

import {
  physicalExamSections,
  generateFindingsProse,
} from "../doctor/physicalExamData";

import PrescriptionPrint from "../../components/doctor/PrescriptionPrint";
import Modal from "../../components/shared/Modal";
import Input from "../../components/shared/Input";
import OrderLabTestModal from "../../components/doctor/OrderLabTestModal";

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
        {activeTab === "initial-assessment" && (
          <InitialAssessmentTab patient={patient} />
        )}
        {activeTab === "physical-exam" && <PhysicalExamTab patient={patient} />}
        {activeTab === "glycemic-charts" && (
          <GlycemicChartsTab
            patient={patient}
            getBloodSugarReadings={getBloodSugarReadings}
          />
        )}
        {activeTab === "prescriptions" && (
          <PrescriptionsTab
            patient={patient}
            getPrescriptionsByPatient={getPrescriptionsByPatient}
          />
        )}
        {activeTab === "treatment-plans" && (
          <TreatmentPlansTab patient={patient} />
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

const InitialAssessmentTab = ({ patient }) => {
  const navigate = useNavigate();
  const { getLatestAssessment } = useInitialAssessmentContext();
  const assessment = getLatestAssessment(patient.uhid);

  if (!assessment) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-gray-500 text-lg mb-2">
            No Initial Assessment Completed
          </p>
          <p className="text-gray-400 text-sm mb-6">
            This patient has not been assessed yet. Initial Assessment is
            required for new patients.
          </p>
          <Button
            onClick={() =>
              navigate(`/doctor/initial-assessment`, {
                state: { patientUHID: patient.uhid, fromConsultation: false },
              })
            }
          >
            📝 Start Initial Assessment
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* One-time assessment info banner */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ Initial Assessment:</strong> This is a one-time
          comprehensive evaluation completed when the patient first entered
          care. For ongoing evaluations, use Physical Examination or
          Consultations.
        </p>
      </div>

      <Card className="border-2 border-green-500">
        <div className="space-y-4">
          {/* Assessment Header */}
          <div className="flex justify-between items-start pb-4 border-b">
            <div>
              <div className="flex items-center gap-3">
                <h4 className="text-lg font-bold text-gray-800">
                  ✅ Initial Assessment Completed
                </h4>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                  BASELINE RECORD
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Date: {assessment.date} • Time: {assessment.time}
              </p>
              <p className="text-sm text-gray-600">
                Assessed by: {assessment.doctorName}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                navigate(`/doctor/physical-exam`, {
                  state: { patientUHID: patient.uhid, fromConsultation: false },
                })
              }
            >
              🩺 New Physical Exam
            </Button>
          </div>

          {/* Assessment Summary */}
          <div>
            <h5 className="font-semibold text-gray-800 mb-3">
              📋 Assessment Summary:
            </h5>

            {/* Presenting Complaints */}
            <div className="mb-4">
              <p className="text-sm font-bold text-gray-700 mb-2">
                Presenting Complaints:
              </p>
              <div className="flex flex-wrap gap-2">
                {assessment.data.weightLoss && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                    🔴 Weight Loss
                  </span>
                )}
                {assessment.data.visualDisturbances && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                    🔴 Visual Disturbances
                  </span>
                )}
                {assessment.data.increasedThirst && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                    🔴 Increased Thirst
                  </span>
                )}
                {assessment.data.fatigue && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                    🟡 Fatigue
                  </span>
                )}
                {assessment.data.nocturia && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                    🟡 Nocturia
                  </span>
                )}
                {assessment.data.paresthesia && (
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                    🟠 Paresthesia
                  </span>
                )}
                {assessment.data.dizziness && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                    🟡 Dizziness
                  </span>
                )}
                {assessment.data.legCramps && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                    🟡 Leg Cramps
                  </span>
                )}
                {assessment.data.constipation && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                    🟡 Constipation
                  </span>
                )}
                {assessment.data.diarrhea && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                    🟡 Diarrhea
                  </span>
                )}
                {assessment.data.decreasedLibido && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                    🟡 Decreased Libido
                  </span>
                )}
                {!assessment.data.weightLoss &&
                  !assessment.data.visualDisturbances &&
                  !assessment.data.increasedThirst &&
                  !assessment.data.fatigue &&
                  !assessment.data.nocturia &&
                  !assessment.data.paresthesia &&
                  !assessment.data.dizziness &&
                  !assessment.data.legCramps &&
                  !assessment.data.constipation &&
                  !assessment.data.diarrhea &&
                  !assessment.data.decreasedLibido && (
                    <span className="text-sm text-gray-600">
                      No specific complaints reported
                    </span>
                  )}
              </div>
              {assessment.data.otherComplaints && (
                <p className="text-sm text-gray-700 mt-2 p-3 bg-gray-50 rounded">
                  <strong>Other:</strong> {assessment.data.otherComplaints}
                </p>
              )}
            </div>

            {/* Complications */}
            <div className="mb-4">
              <p className="text-sm font-bold text-gray-700 mb-2">
                Diabetic Complications:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {assessment.data.retinopathy && (
                  <div className="p-2 bg-gray-50 rounded">
                    <strong>Retinopathy:</strong> {assessment.data.retinopathy}
                  </div>
                )}
                {assessment.data.cerebrovascularDisease && (
                  <div className="p-2 bg-gray-50 rounded">
                    <strong>Cerebrovascular:</strong>{" "}
                    {assessment.data.cerebrovascularDisease}
                  </div>
                )}
                {assessment.data.cardiovascularDisease && (
                  <div className="p-2 bg-gray-50 rounded">
                    <strong>Cardiovascular:</strong>{" "}
                    {assessment.data.cardiovascularDisease}
                  </div>
                )}
                {assessment.data.nephropathy && (
                  <div className="p-2 bg-gray-50 rounded">
                    <strong>Nephropathy:</strong> {assessment.data.nephropathy}
                  </div>
                )}
                {assessment.data.neuropathyPeripheral && (
                  <div className="p-2 bg-gray-50 rounded">
                    <strong>Neuropathy (Peripheral):</strong>{" "}
                    {assessment.data.neuropathyPeripheral}
                  </div>
                )}
                {assessment.data.neuropathyAutonomic && (
                  <div className="p-2 bg-gray-50 rounded">
                    <strong>Neuropathy (Autonomic):</strong>{" "}
                    {assessment.data.neuropathyAutonomic}
                  </div>
                )}
              </div>
            </div>

            {/* Social History */}
            <div className="mb-4">
              <p className="text-sm font-bold text-gray-700 mb-2">
                Social History:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {assessment.data.cigaretteSmoking && (
                  <div className="p-2 bg-gray-50 rounded">
                    <strong>Smoking:</strong> {assessment.data.cigaretteSmoking}
                  </div>
                )}
                {assessment.data.alcoholIntake && (
                  <div className="p-2 bg-gray-50 rounded">
                    <strong>Alcohol:</strong> {assessment.data.alcoholIntake}
                  </div>
                )}
                {assessment.data.dietType && (
                  <div className="p-2 bg-gray-50 rounded">
                    <strong>Diet:</strong> {assessment.data.dietType}
                  </div>
                )}
                {assessment.data.exercisePlan && (
                  <div className="p-2 bg-gray-50 rounded col-span-2">
                    <strong>Exercise:</strong> {assessment.data.exercisePlan}
                  </div>
                )}
                {assessment.data.substanceUse && (
                  <div className="p-2 bg-gray-50 rounded">
                    <strong>Substance Use:</strong>{" "}
                    {assessment.data.substanceUse}
                  </div>
                )}
              </div>
            </div>

            {/* Family History */}
            {assessment.data.familyHistory && (
              <div className="mb-4">
                <p className="text-sm font-bold text-gray-700 mb-2">
                  👨‍👩‍👧‍👦 Family History:
                </p>
                <p className="text-sm text-gray-700 p-3 bg-gray-50 rounded">
                  {assessment.data.familyHistory}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

const PhysicalExamTab = ({ patient }) => {
  const navigate = useNavigate();
  const { getExaminationsByPatient } = usePhysicalExamContext();
  const exams = getExaminationsByPatient(patient.uhid);

  if (exams.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-gray-500 text-lg mb-4">
            No physical examinations recorded yet
          </p>
          <Button
            onClick={() =>
              navigate(`/doctor/physical-exam`, {
                state: { patientUHID: patient.uhid, fromProfile: true },
              })
            }
          >
            Start First Examination
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">
          🩺 Physical Examination Records
        </h3>
        <Button
          onClick={() =>
            navigate(`/doctor/physical-exam`, {
              state: { patientUHID: patient.uhid, fromProfile: true },
            })
          }
        >
          ➕ New Examination
        </Button>
      </div>

      {exams.map((exam, index) => (
        <Card
          key={exam.id}
          className={index === 0 ? "border-2 border-blue-500" : ""}
        >
          <div className="space-y-4">
            <div className="flex justify-between items-start pb-4 border-b">
              <div>
                <div className="flex items-center gap-3">
                  <h4 className="text-lg font-bold text-gray-800">
                    {index === 0
                      ? "🌟 Latest Examination"
                      : "Previous Examination"}
                  </h4>
                  {index === 0 && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      MOST RECENT
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Date: {exam.date} • Time: {exam.time}
                </p>
                <p className="text-sm text-gray-600">
                  Examined by: {exam.doctorName}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="text-sm"
                  onClick={() =>
                    navigate(`/doctor/physical-exam`, {
                      state: {
                        patientUHID: patient.uhid,
                        examId: exam.id,
                        viewMode: "findings",
                        fromProfile: true,
                      },
                    })
                  }
                >
                  🖨️ Print Report
                </Button>
              </div>
            </div>

            <div>
              <h5 className="font-semibold text-gray-800 mb-3">
                📋 Examination Findings:
              </h5>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="text-left px-4 py-3 font-bold text-gray-700 w-1/4">
                        Category
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-gray-700">
                        Findings
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const findings = [];
                      physicalExamSections.forEach((section) => {
                        if (exam.data[section.id]) {
                          const prose = generateFindingsProse(
                            section.id,
                            exam.data[section.id]
                          );
                          if (prose && prose !== "No findings recorded") {
                            findings.push({
                              icon: section.icon,
                              title: section.title,
                              findings: prose,
                            });
                          }
                        }
                      });

                      if (findings.length === 0) {
                        return (
                          <tr>
                            <td
                              colSpan="2"
                              className="px-4 py-8 text-center text-gray-500"
                            >
                              No findings recorded
                            </td>
                          </tr>
                        );
                      }

                      return findings.map((finding, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 align-top">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{finding.icon}</span>
                              <span className="font-semibold text-sm">
                                {finding.title}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {finding.findings}
                            </p>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

const GlycemicChartsTab = ({ patient, getBloodSugarReadings }) => {
  const readings = getBloodSugarReadings(patient.uhid);

  const calculateAverages = () => {
    if (readings.length === 0) return { fasting: 0, postMeal: 0 };

    let totalFasting = 0;
    let totalPostMeal = 0;
    let fastingCount = 0;
    let postMealCount = 0;

    readings.forEach((reading) => {
      if (reading.timeSlot === "fasting") {
        totalFasting += reading.value;
        fastingCount++;
      } else {
        totalPostMeal += reading.value;
        postMealCount++;
      }
    });

    return {
      fasting: fastingCount > 0 ? Math.round(totalFasting / fastingCount) : 0,
      postMeal:
        postMealCount > 0 ? Math.round(totalPostMeal / postMealCount) : 0,
    };
  };

  const averages = calculateAverages();

  return (
    <Card title="📈 Glycemic Charts & Blood Sugar Trends">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-600 uppercase font-semibold">
              Average Fasting
            </p>
            <p className="text-3xl font-bold text-blue-700 mt-2">
              {averages.fasting} mg/dL
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-600 uppercase font-semibold">
              Average Post-Meal
            </p>
            <p className="text-3xl font-bold text-green-700 mt-2">
              {averages.postMeal} mg/dL
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-600 uppercase font-semibold">
              Total Readings
            </p>
            <p className="text-3xl font-bold text-purple-700 mt-2">
              {readings.length}
            </p>
          </div>
        </div>

        {readings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Time Slot
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {readings.slice(0, 10).map((reading, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{reading.date}</td>
                    <td className="px-4 py-3 text-sm capitalize">
                      {reading.timeSlot.replace(/([A-Z])/g, " $1").trim()}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm font-semibold ${
                        reading.value < 140
                          ? "text-green-600"
                          : reading.value < 180
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {reading.value} mg/dL
                    </td>
                    <td className="px-4 py-3 text-sm">{reading.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-600 text-center py-8">
              No blood sugar readings available for this patient.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

const PrescriptionsTab = ({ patient, getPrescriptionsByPatient }) => {
  const allPrescriptions = getPrescriptionsByPatient(patient.uhid);

  const [filter, setFilter] = useState("all");
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showNewPrescription, setShowNewPrescription] = useState(false);

  const { addPrescription } = usePrescriptionContext();
  const { currentUser } = useUserContext();

  const prescriptions =
    filter === "all"
      ? allPrescriptions
      : allPrescriptions.filter((p) => p.status.toLowerCase() === filter);

  const sortedPrescriptions = [...prescriptions].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const handlePrint = (prescription) => {
    setSelectedPrescription(prescription);
    setShowPrintModal(true);
  };

  const handleView = (prescription) => {
    setSelectedPrescription(prescription);
    setShowViewModal(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-800">
          💊 Prescription History
        </h3>

        <div className="flex gap-3">
          {/* New Prescription Button */}
          <button
            onClick={() => setShowNewPrescription(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 font-semibold transition"
          >
            ➕ New Prescription
          </button>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === "all"
                  ? "bg-primary text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              All ({allPrescriptions.length})
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === "active"
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Active (
              {allPrescriptions.filter((p) => p.status === "Active").length})
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === "completed"
                  ? "bg-gray-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Completed (
              {allPrescriptions.filter((p) => p.status === "Completed").length})
            </button>
          </div>
        </div>
      </div>

      {sortedPrescriptions.length > 0 ? (
        <div className="space-y-4">
          {sortedPrescriptions.map((prescription) => (
            <div
              key={prescription.id}
              className="border-2 border-gray-200 rounded-lg p-6 hover:border-primary hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-bold text-lg text-gray-800">
                      Prescription #{prescription.prescriptionNumber}
                    </p>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        prescription.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {prescription.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    📅 Date: {prescription.date}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    🩺 <strong>Diagnosis:</strong> {prescription.diagnosis}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Prescribed by: {prescription.doctorName} (
                    {prescription.doctorSpecialty})
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleView(prescription)}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-semibold transition text-sm"
                  >
                    📄 View
                  </button>
                  <button
                    onClick={() => handlePrint(prescription)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold transition text-sm"
                  >
                    🖨️ Print
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                  Medications ({prescription.medications.length})
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {prescription.medications.map((med, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200"
                    >
                      <span className="text-lg">💊</span>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-gray-800">
                          {med.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {med.dosage} • {med.frequency}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded font-semibold">
                        {med.duration}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {prescription.notes && (
                <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                  <p className="text-xs font-semibold text-gray-700">
                    📝 Notes:
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    {prescription.notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <div className="text-6xl mb-4">💊</div>
          <p className="text-gray-500 text-lg mb-2">
            {filter === "all"
              ? "No prescriptions found for this patient"
              : `No ${filter} prescriptions found`}
          </p>
          <p className="text-gray-400 text-sm">
            Prescriptions will appear here once created by a doctor
          </p>
        </div>
      )}

      {showPrintModal && selectedPrescription && (
        <PrescriptionPrint
          prescription={selectedPrescription}
          onClose={() => {
            setShowPrintModal(false);
            setSelectedPrescription(null);
          }}
        />
      )}

      {showViewModal && selectedPrescription && (
        <ViewPrescriptionModal
          prescription={selectedPrescription}
          onClose={() => {
            setShowViewModal(false);
            setSelectedPrescription(null);
          }}
          onPrint={() => {
            setShowViewModal(false);
            setShowPrintModal(true);
          }}
        />
      )}
      {/* New Prescription Modal */}
      <Modal
        isOpen={showNewPrescription}
        onClose={() => setShowNewPrescription(false)}
        title="Create New Prescription"
      >
        <NewPrescriptionForm
          onClose={() => setShowNewPrescription(false)}
          patient={patient}
          addPrescription={addPrescription}
          currentDoctor={currentUser}
        />
      </Modal>
    </div>
  );
};

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
        <textarea
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          placeholder="Enter diagnosis..."
          rows="2"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
          required
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
  const { getPlansByPatient } = useTreatmentPlanContext();
  const treatmentPlans = getPlansByPatient(patient.uhid);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  if (treatmentPlans.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-gray-500 text-lg mb-2">
            No Treatment Plans Available
          </p>
          <p className="text-gray-400 text-sm">
            Treatment plans will appear here after consultations
          </p>
        </div>
      </Card>
    );
  }

  const handlePrint = (plan) => {
    setSelectedPlan(plan);
    setShowPrintModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 text-white">
          <p className="text-xs opacity-90">Total Plans</p>
          <p className="text-3xl font-bold mt-1">{treatmentPlans.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 text-white">
          <p className="text-xs opacity-90">Active</p>
          <p className="text-3xl font-bold mt-1">
            {treatmentPlans.filter((p) => p.status === "Active").length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow-lg p-4 text-white">
          <p className="text-xs opacity-90">Completed</p>
          <p className="text-3xl font-bold mt-1">
            {treatmentPlans.filter((p) => p.status === "Completed").length}
          </p>
        </div>
      </div>

      {/* Treatment Plans List */}
      <Card title="📋 Treatment Plan History">
        <div className="space-y-4">
          {treatmentPlans.map((plan, index) => (
            <div
              key={plan.id}
              className={`p-4 sm:p-6 border-2 rounded-lg transition ${
                index === 0
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-primary"
              }`}
            >
              {/* Plan Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 pb-4 border-b">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {index === 0 && (
                      <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                        LATEST
                      </span>
                    )}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        plan.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {plan.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">
                    {plan.diagnosis}
                  </h3>
                  <div className="text-sm text-gray-600">
                    <p>
                      📅{" "}
                      {new Date(plan.date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      • {plan.time}
                    </p>
                    <p className="mt-1">👨‍⚕️ {plan.doctorName}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="text-sm"
                    onClick={() => handlePrint(plan)}
                  >
                    🖨️ Print
                  </Button>
                </div>
              </div>

              {/* Plan Content */}
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm font-bold text-gray-700 mb-3">
                  Treatment Plan:
                </p>
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                  {plan.plan}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Print Modal */}
      {showPrintModal && selectedPlan && (
        <TreatmentPlanPrint
          plan={selectedPlan}
          patient={patient}
          onClose={() => {
            setShowPrintModal(false);
            setSelectedPlan(null);
          }}
        />
      )}
    </div>
  );
};

const TreatmentPlanPrint = ({ plan, patient, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header - Hide on print */}
        <div className="sticky top-0 bg-white border-b-2 border-gray-200 p-6 flex justify-between items-center print:hidden">
          <h3 className="text-2xl font-bold text-gray-800">Treatment Plan</h3>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 font-semibold transition"
            >
              🖨️ Print
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>

        {/* Print Content */}
        <div className="p-8">
          {/* Hospital Header */}
          <div className="text-center mb-8 border-b-2 border-primary pb-4">
            <h1 className="text-3xl font-bold text-primary">
              CDC DIABETES CLINIC
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Comprehensive Diabetes Centre • Excellence in Diabetes Care
            </p>
            <p className="text-sm text-gray-600">
              Tel: +254 700 000 000 • Email: info@cdc-diabetes.com
            </p>
          </div>

          {/* Document Title */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">TREATMENT PLAN</h2>
            <p className="text-sm text-gray-600 mt-1">
              Date:{" "}
              {new Date(plan.date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}{" "}
              • {plan.time}
            </p>
          </div>

          {/* Patient Information */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-bold text-gray-700 mb-3">
              PATIENT INFORMATION
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Name:</p>
                <p className="font-semibold">{patient.name}</p>
              </div>
              <div>
                <p className="text-gray-600">UHID:</p>
                <p className="font-semibold">{patient.uhid}</p>
              </div>
              <div>
                <p className="text-gray-600">Age / Gender:</p>
                <p className="font-semibold">
                  {patient.age} years • {patient.gender}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Diabetes Type:</p>
                <p className="font-semibold">{patient.diabetesType}</p>
              </div>
            </div>
          </div>

          {/* Diagnosis */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-2">DIAGNOSIS</h3>
            <p className="text-gray-800 p-3 bg-yellow-50 rounded border-l-4 border-yellow-500">
              {plan.diagnosis}
            </p>
          </div>

          {/* Treatment Plan */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-2">
              TREATMENT PLAN
            </h3>
            <div className="p-4 bg-gray-50 rounded border-l-4 border-primary">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                {plan.plan}
              </pre>
            </div>
          </div>

          {/* Doctor Information */}
          <div className="mb-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-bold text-gray-700 mb-2">
              TREATING PHYSICIAN
            </h3>
            <p className="text-gray-800 font-semibold">{plan.doctorName}</p>
            <p className="text-sm text-gray-600 mt-1">Diabetes Specialist</p>
          </div>

          {/* Signature Section */}
          <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t-2 border-gray-300">
            <div>
              <div className="border-t-2 border-gray-400 pt-2">
                <p className="text-sm font-semibold">Doctor's Signature</p>
                <p className="text-xs text-gray-600 mt-1">{plan.doctorName}</p>
              </div>
            </div>
            <div>
              <div className="border-t-2 border-gray-400 pt-2">
                <p className="text-sm font-semibold">Date</p>
                <p className="text-xs text-gray-600 mt-1">
                  {new Date(plan.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 pt-4 border-t border-gray-300">
            <p className="text-xs text-gray-500">
              This treatment plan is confidential and intended for the patient
              named above.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              CDC Diabetes Clinic • Nairobi, Kenya
            </p>
          </div>
        </div>

        {/* Print Styles */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print\\:hidden {
              display: none !important;
            }
            div[class*="fixed inset-0"] {
              position: static !important;
              background: white !important;
            }
            div[class*="fixed inset-0"] > div {
              max-height: none !important;
              box-shadow: none !important;
            }
            div[class*="fixed inset-0"] * {
              visibility: visible;
            }
            @page {
              margin: 1cm;
            }
          }
        `}</style>
      </div>
    </div>
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

export default PatientProfile;
