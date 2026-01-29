import { useState } from "react";
import { Pill, FileText, FileEdit } from "lucide-react";
import toast from "react-hot-toast";
import Card from "../shared/Card";
import Modal from "../shared/Modal";
import Button from "../shared/Button";
import NewPrescriptionForm from "./NewPrescriptionForm";
import PrescriptionHistory from "./PrescriptionHistory";
import PrescriptionPrint from "./PrescriptionPrint";

const PrescriptionManagement = ({
  patient,
  patientPrescriptions,
  addPrescription,
  currentUser,
  onSuccess,
}) => {
  const [selectedMedications, setSelectedMedications] = useState([]);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Get current and past prescriptions
  const currentPrescription = patientPrescriptions[0] || null;
  const pastPrescriptions = patientPrescriptions.slice(1);

  // Handle adding medication from current or past
  const handleAddMedication = (medication) => {
    const exists = selectedMedications.some((m) => m.name === medication.name);
    if (exists) {
      toast("⚠️ Medication already added", {
        duration: 2000,
        position: "top-right",
        icon: "⚠️",
        style: { background: "#EAB308", color: "#fff" },
      });
      return;
    }

    setSelectedMedications([...selectedMedications, { ...medication }]);
    toast.success(`✅ ${medication.name} added`, {
      duration: 2000,
      position: "top-right",
    });
  };

  return (
    <div className="space-y-6">
      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Current Medications */}
        <Card
          title={
            <span className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-green-600" />
              Current Medications
            </span>
          }
        >
          {!currentPrescription ? (
            <div className="text-center py-8 text-gray-500">
              <Pill className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">No current medications</p>
            </div>
          ) : (
            <PrescriptionHistory
              prescriptions={[currentPrescription]}
              maxDisplay={1}
              showViewPrint={true}
              showAddButtons={true}
              onView={(rx) => {
                setSelectedPrescription(rx);
                setShowViewModal(true);
              }}
              onPrint={(rx) => {
                setSelectedPrescription(rx);
                setShowPrintModal(true);
              }}
              onAddMedication={handleAddMedication}
              collapsible={false}
            />
          )}
        </Card>

        {/* MIDDLE: Past Prescriptions */}
        <Card
          title={
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Past Prescriptions
            </span>
          }
        >
          {pastPrescriptions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">No past prescriptions</p>
            </div>
          ) : (
            <PrescriptionHistory
              prescriptions={pastPrescriptions}
              maxDisplay={null}
              showViewPrint={true}
              showAddButtons={true}
              onView={(rx) => {
                setSelectedPrescription(rx);
                setShowViewModal(true);
              }}
              onPrint={(rx) => {
                setSelectedPrescription(rx);
                setShowPrintModal(true);
              }}
              onAddMedication={handleAddMedication}
              collapsible={true}
            />
          )}
        </Card>

        {/* RIGHT: New Prescription */}
        <Card
          title={
            <span className="flex items-center gap-2">
              <FileEdit className="w-5 h-5 text-purple-600" />
              New Prescription
            </span>
          }
        >
          <NewPrescriptionForm
            selectedPatient={patient}
            fromConsultation={true}
            embedded={true}
            addPrescription={addPrescription}
            currentDoctor={currentUser}
            onSuccess={() => {
              setSelectedMedications([]);
              if (onSuccess) onSuccess();
            }}
            initialMedications={selectedMedications}
            onMedicationsChange={setSelectedMedications}
          />
        </Card>
      </div>

      {/* Modals */}
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

      {showPrintModal && selectedPrescription && (
        <PrescriptionPrint
          prescription={selectedPrescription}
          onClose={() => {
            setShowPrintModal(false);
            setSelectedPrescription(null);
          }}
        />
      )}
    </div>
  );
};

// View Prescription Modal Component
const ViewPrescriptionModal = ({ prescription, onClose, onPrint }) => {
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={
        <div>
          <h3 className="text-xl font-bold text-gray-800">
            Prescription Details
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            #{prescription.prescriptionNumber}
          </p>
        </div>
      }
    >
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Date and Status */}
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

        {/* Patient and Doctor Info */}
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

        {/* Diagnosis */}
        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
          <p className="text-xs text-gray-600 uppercase font-semibold mb-2">
            🩺 Diagnosis
          </p>
          <p className="text-gray-800">{prescription.diagnosis}</p>
        </div>

        {/* Medications */}
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
                    Qty: {med.quantity || "30"}
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

        {/* Notes */}
        {prescription.notes && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 uppercase font-semibold mb-2">
              📝 Additional Notes
            </p>
            <p className="text-gray-700">{prescription.notes}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={onPrint} className="flex-1">
            🖨️ Print Prescription
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PrescriptionManagement;