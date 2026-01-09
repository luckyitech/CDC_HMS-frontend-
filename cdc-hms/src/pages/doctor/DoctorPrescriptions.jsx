import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import Input from "../../components/shared/Input";
import Modal from "../../components/shared/Modal";
import { useUserContext } from "../../contexts/UserContext";
import { usePrescriptionContext } from "../../contexts/PrescriptionContext";
import { usePatientContext } from "../../contexts/PatientContext";
import PrescriptionPrint from "../../components/doctor/PrescriptionPrint";
import VoiceInput from "../../components/shared/VoiceInput";

const DoctorPrescriptions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useUserContext();
  const {
    getPrescriptionsByDoctor,
    getPrescriptionsByPatient,
    addPrescription,
  } = usePrescriptionContext();
  const { getPatientByUHID } = usePatientContext();

  const patientUHID = location.state?.patientUHID;
  const fromConsultation = location.state?.fromConsultation;

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showNewPrescription, setShowNewPrescription] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    if (patientUHID) {
      const patient = getPatientByUHID(patientUHID);
      if (patient) {
        setSelectedPatient(patient);
      }
    }
  }, [patientUHID, getPatientByUHID]);

  const allPrescriptions = getPrescriptionsByDoctor(
    currentUser?.name || "Dr. Ahmed Hassan"
  );
  const prescriptions =
    fromConsultation && selectedPatient
      ? getPrescriptionsByPatient(selectedPatient.uhid)
      : allPrescriptions;

  const commonMedications = [
    { name: "Metformin", defaultDosage: "500mg", type: "Oral" },
    { name: "Glimepiride", defaultDosage: "2mg", type: "Oral" },
    { name: "Insulin Glargine", defaultDosage: "10 units", type: "Injectable" },
    { name: "Insulin Aspart", defaultDosage: "5 units", type: "Injectable" },
    { name: "Atorvastatin", defaultDosage: "20mg", type: "Oral" },
    { name: "Amlodipine", defaultDosage: "5mg", type: "Oral" },
  ];

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">
            Prescriptions
          </h2>
          {selectedPatient && fromConsultation && (
            <p className="text-gray-600 mt-1">
              For: {selectedPatient.name} ({selectedPatient.uhid})
            </p>
          )}
        </div>
        <div className="flex gap-3">
          {fromConsultation && (
            <Button
              variant="outline"
              onClick={() => navigate("/doctor/consultations")}
            >
              ← Back to Consultation
            </Button>
          )}
          <Button onClick={() => setShowNewPrescription(true)}>
            + New Prescription
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">
            {fromConsultation && selectedPatient
              ? "Patient Prescriptions"
              : "Today's Prescriptions"}
          </p>
          <p className="text-4xl font-bold mt-2">{prescriptions.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Active</p>
          <p className="text-4xl font-bold mt-2">
            {prescriptions.filter((p) => p.status === "Active").length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Completed</p>
          <p className="text-4xl font-bold mt-2">
            {prescriptions.filter((p) => p.status === "Completed").length}
          </p>
        </div>
      </div>

      <Card
        title={
          fromConsultation && selectedPatient
            ? `📋 Prescriptions for ${selectedPatient.name}`
            : "📋 Recent Prescriptions"
        }
      >
        <div className="space-y-4">
          {prescriptions.map((prescription) => (
            <div
              key={prescription.id}
              className="border-2 border-gray-200 rounded-lg p-6 hover:border-primary transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-800">
                      {prescription.patientName}
                    </h3>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      {prescription.uhid}
                    </span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      {prescription.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Date: {prescription.date}
                  </p>
                  <p className="text-sm font-medium text-gray-700 mt-2">
                    <span className="font-semibold">Diagnosis:</span>{" "}
                    {prescription.diagnosis}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="text-xs py-1 px-3"
                    onClick={() => handleView(prescription)}
                  >
                    📄 View
                  </Button>
                  <Button
                    variant="outline"
                    className="text-xs py-1 px-3"
                    onClick={() => handlePrint(prescription)}
                  >
                    🖨️ Print
                  </Button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-700 mb-3">
                  Medications:
                </h4>
                <div className="space-y-2">
                  {prescription.medications.map((med, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white rounded border border-gray-200"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">
                          💊 {med.name}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {med.dosage} • {med.frequency}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded text-xs font-semibold">
                        {med.duration}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        isOpen={showNewPrescription}
        onClose={() => setShowNewPrescription(false)}
        title="Create New Prescription"
      >
        <NewPrescriptionForm
          onClose={() => setShowNewPrescription(false)}
          commonMedications={commonMedications}
          selectedPatient={selectedPatient}
          fromConsultation={fromConsultation}
          addPrescription={addPrescription}
          currentDoctor={currentUser}
        />
      </Modal>

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
    </div>
  );
};

const NewPrescriptionForm = ({
  onClose,
  commonMedications,
  selectedPatient,
  fromConsultation,
  addPrescription,
  currentDoctor,
}) => {
  const [formData, setFormData] = useState({
    patientUHID: selectedPatient?.uhid || "",
    patientName: selectedPatient?.name || "",
    diagnosis: "",
  });

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
    const newMeds = medications.filter((_, i) => i !== index);
    setMedications(newMeds);
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
      uhid: formData.patientUHID,
      patientName: formData.patientName,
      diagnosis: formData.diagnosis,
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
        <Input
          label="Patient UHID"
          value={formData.patientUHID}
          onChange={(e) =>
            setFormData({ ...formData, patientUHID: e.target.value })
          }
          placeholder="CDC001"
          required
          disabled={fromConsultation}
        />
        <Input
          label="Patient Name"
          value={formData.patientName}
          onChange={(e) =>
            setFormData({ ...formData, patientName: e.target.value })
          }
          placeholder="John Doe"
          required
          disabled={fromConsultation}
        />
      </div>

      <div>
        <label className="block text-gray-700 font-semibold mb-2 text-sm uppercase tracking-wide">
          Diagnosis
        </label>
        {/* <textarea
          value={formData.diagnosis}
          onChange={(e) =>
            setFormData({ ...formData, diagnosis: e.target.value })
          }
          placeholder="Enter diagnosis..."
          rows="2"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
          required
        /> */}
        <VoiceInput
          value={formData.diagnosis}
          onChange={(e) =>
            setFormData({ ...formData, diagnosis: e.target.value })
          }
          placeholder="Enter diagnosis..."
          rows={2}
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
                    Medication Name
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
                      Dosage
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
                      Duration
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
                    Frequency
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
        <Button type="submit" className="flex-1">
          Create Prescription
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1"
        >
          Cancel
        </Button>
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

export default DoctorPrescriptions;
