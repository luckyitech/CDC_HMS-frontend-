import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import { usePatientContext } from "../../contexts/PatientContext";
import MedicalEquipmentTab from "../../components/doctor/MedicalEquipmentTab";

const StaffPatientProfile = () => {
  const navigate = useNavigate();
  const { uhid } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  
  const { getPatientByUHID } = usePatientContext();
  const patient = getPatientByUHID(uhid);

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-2xl font-bold text-red-600">Patient not found!</p>
        <p className="text-gray-600 mt-2">UHID: {uhid}</p>
        <Button onClick={() => navigate("/staff/patients")} className="mt-4">
          ← Back to Patient Search
        </Button>
      </div>
    );
  }

  const tabs = [
    { id: "overview", name: "Overview", icon: "📋" },
    { id: "equipment", name: "Medical Equipment", icon: "🔋" },
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
            variant="outline"
            onClick={() => navigate("/staff/patients")}
          >
            ← Back to Patient Search
          </Button>
        </div>
      </div>

      {/* Patient Summary Card */}
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
      </Card>

      {/* Tabs */}
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

      {/* Tab Content */}
      <div>
        {activeTab === "overview" && <OverviewTab patient={patient} setActiveTab={setActiveTab} />}
        {activeTab === "equipment" && <MedicalEquipmentTab patient={patient} />}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ patient, setActiveTab }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
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

        {/* Medical Information */}
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

      {/* Emergency Contact */}
      <Card title="🚨 Emergency Contact">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Current Medications */}
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

      {/* Allergies & Comorbidities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="⚠️ Allergies">
          <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
            <p className="text-sm font-semibold text-red-700">
              {patient.allergies}
            </p>
          </div>
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

      {/* Latest Vitals */}
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
          
          {patient.vitals.waistCircumference && (
            <div className="bg-pink-50 p-4 rounded-lg text-center border-2 border-pink-200">
              <p className="text-xs text-gray-600 uppercase">Waist Circ.</p>
              <p className="text-lg font-bold text-pink-700 mt-1">
                {patient.vitals.waistCircumference}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Medical Equipment Summary */}
      {patient.medicalEquipment?.insulinPump?.hasPump && (
        <Card title="🔋 Medical Equipment">
          <div className="space-y-4">
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
                  {patient.medicalEquipment.insulinPump.current.model || "Not specified"}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Serial:</span>{" "}
                  {patient.medicalEquipment.insulinPump.current.serialNo}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Warranty expires:{" "}
                  {new Date(patient.medicalEquipment.insulinPump.current.warrantyEndDate).toLocaleDateString()}
                </p>
              </div>
            )}

            {patient.medicalEquipment.insulinPump.transmitter?.hasTransmitter && (
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
                  {new Date(patient.medicalEquipment.insulinPump.transmitter.warrantyEndDate).toLocaleDateString()}
                </p>
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => setActiveTab("equipment")}
              className="w-full"
            >
              Manage Equipment Details →
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default StaffPatientProfile;