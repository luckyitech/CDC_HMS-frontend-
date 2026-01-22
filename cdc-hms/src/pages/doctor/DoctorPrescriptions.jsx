import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import Modal from "../../components/shared/Modal";
import { useUserContext } from "../../contexts/UserContext";
import { usePrescriptionContext } from "../../contexts/PrescriptionContext";
import { usePatientContext } from "../../contexts/PatientContext";
import PrescriptionPrint from "../../components/doctor/PrescriptionPrint";
import NewPrescriptionForm from "../../components/doctor/NewPrescriptionForm";
import PrescriptionHistory from "../../components/doctor/PrescriptionHistory";

const DoctorPrescriptions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { uhid: urlUHID } = useParams();
  const { currentUser } = useUserContext();
  const {
    getPrescriptionsByDoctor,
    getPrescriptionsByPatient,
    addPrescription,
  } = usePrescriptionContext();
  const { getPatientByUHID } = usePatientContext();

  // Get patient from URL params OR navigation state
  const patientUHID = urlUHID || location.state?.patientUHID;
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
      {/* Header */}
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

      {/* Statistics Cards */}
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

      {/* Prescription List with View/Print buttons */}
      <Card
        title={
          fromConsultation && selectedPatient
            ? `📋 Prescriptions for ${selectedPatient.name}`
            : "📋 Recent Prescriptions"
        }
      >
        <PrescriptionHistory
          prescriptions={prescriptions}
          maxDisplay={null} // Show all
          showViewPrint={true} // Show View/Print buttons
          onView={handleView}
          onPrint={handlePrint}
        />
      </Card>

      {/* New Prescription Modal - Uses the component! */}
      <Modal
        isOpen={showNewPrescription}
        onClose={() => setShowNewPrescription(false)}
        title="Create New Prescription"
       >
        <NewPrescriptionForm
          selectedPatient={selectedPatient}
          fromConsultation={fromConsultation}
          embedded={false} // Modal mode
          addPrescription={addPrescription}
          currentDoctor={currentUser}
          onSuccess={() => setShowNewPrescription(false)}
          onCancel={() => setShowNewPrescription(false)}
        />
      </Modal>

      {/* Print Modal */}
      {showPrintModal && selectedPrescription && (
        <PrescriptionPrint
          prescription={selectedPrescription}
          onClose={() => {
            setShowPrintModal(false);
            setSelectedPrescription(null);
          }}
        />
      )}

      {/* View Modal */}
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

// Keep ViewPrescriptionModal here since it's only used in this page
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
