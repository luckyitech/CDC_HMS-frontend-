import { useState } from "react";
import { Pill, FileText, FileEdit, Stethoscope, Printer, NotebookPen } from "lucide-react";
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
  readOnly = false,
  hidePast = false,
}) => {
  const [selectedMedications, setSelectedMedications] = useState([]);
  const [loadKey, setLoadKey] = useState(0);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const prescriptionsArray = Array.isArray(patientPrescriptions) ? patientPrescriptions : [];
  const currentPrescription = prescriptionsArray[0] || null;
  const pastPrescriptions   = prescriptionsArray.slice(1);

  // Add a single medication from history into the new prescription form
  const handleAddMedication = (medication) => {
    const exists = selectedMedications.some((m) => m.name === medication.name);
    if (exists) {
      toast("Medication already added", { duration: 2000, icon: "⚠️", style: { background: "#EAB308", color: "#fff" } });
      return;
    }
    setSelectedMedications(prev => [...prev, { ...medication }]);
    setLoadKey(k => k + 1);
    toast.success(`${medication.name} added to new prescription`);
  };

  // Copy ALL medications from a prescription into the new form in one click
  const handleRenewAll = (prescription) => {
    setSelectedMedications(prescription.medications.map(m => ({ ...m })));
    setLoadKey(k => k + 1);
    toast.success(
      `${prescription.medications.length} medication${prescription.medications.length !== 1 ? "s" : ""} loaded — review and submit`,
      { duration: 3000 }
    );
  };

  // Read-only layout (staff / patient profile view)
  if (readOnly) {
    return (
      <div className={`grid grid-cols-1 gap-6 ${!hidePast ? "md:grid-cols-2" : ""}`}>
        <Card title={<span className="flex items-center gap-2"><Pill className="w-5 h-5 text-green-600" />Current Medications</span>}>
          {!currentPrescription ? (
            <EmptyState icon={Pill} message="No current medications" />
          ) : (
            <PrescriptionHistory
              prescriptions={[currentPrescription]}
              maxDisplay={1}
              showViewPrint={true}
              showAddButtons={false}
              collapsible={false}
              hidePatientName={true}
              onView={(rx) => { setSelectedPrescription(rx); setShowViewModal(true); }}
              onPrint={(rx) => { setSelectedPrescription(rx); setShowPrintModal(true); }}
            />
          )}
        </Card>

        {!hidePast && (
          <Card title={<span className="flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" />Past Prescriptions</span>}>
            {pastPrescriptions.length === 0 ? (
              <EmptyState icon={FileText} message="No past prescriptions" />
            ) : (
              <PrescriptionHistory
                prescriptions={pastPrescriptions}
                maxDisplay={null}
                showViewPrint={true}
                showAddButtons={false}
                collapsible={true}
                hidePatientName={true}
                onView={(rx) => { setSelectedPrescription(rx); setShowViewModal(true); }}
                onPrint={(rx) => { setSelectedPrescription(rx); setShowPrintModal(true); }}
              />
            )}
          </Card>
        )}

        <Modals
          showViewModal={showViewModal} showPrintModal={showPrintModal}
          selectedPrescription={selectedPrescription}
          onCloseView={() => { setShowViewModal(false); setSelectedPrescription(null); }}
          onClosePrint={() => { setShowPrintModal(false); setSelectedPrescription(null); }}
          onSwitchToPrint={() => { setShowViewModal(false); setShowPrintModal(true); }}
        />
      </div>
    );
  }

  // Doctor view — 2-column: history left, new prescription right
  return (
    <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-6">

      {/* LEFT: Prescription history */}
      <div className="space-y-4">
        <Card title={<span className="flex items-center gap-2"><Pill className="w-5 h-5 text-green-600" />Current Medications</span>}>
          {!currentPrescription ? (
            <EmptyState icon={Pill} message="No current medications" />
          ) : (
            <PrescriptionHistory
              prescriptions={[currentPrescription]}
              maxDisplay={1}
              showViewPrint={true}
              showAddButtons={true}
              addedMedications={selectedMedications.map(m => m.name)}
              collapsible={false}
              hidePatientName={true}
              onRenewAll={handleRenewAll}
              onView={(rx) => { setSelectedPrescription(rx); setShowViewModal(true); }}
              onPrint={(rx) => { setSelectedPrescription(rx); setShowPrintModal(true); }}
              onAddMedication={handleAddMedication}
            />
          )}
        </Card>

        {!hidePast && (
          <Card title={<span className="flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" />Past Prescriptions</span>}>
            {pastPrescriptions.length === 0 ? (
              <EmptyState icon={FileText} message="No past prescriptions" />
            ) : (
              <PrescriptionHistory
                prescriptions={pastPrescriptions}
                maxDisplay={null}
                showViewPrint={true}
                showAddButtons={true}
                addedMedications={selectedMedications.map(m => m.name)}
                collapsible={true}
                hidePatientName={true}
                onRenewAll={handleRenewAll}
                onView={(rx) => { setSelectedPrescription(rx); setShowViewModal(true); }}
                onPrint={(rx) => { setSelectedPrescription(rx); setShowPrintModal(true); }}
                onAddMedication={handleAddMedication}
              />
            )}
          </Card>
        )}
      </div>

      {/* RIGHT: New prescription form */}
      <Card title={<span className="flex items-center gap-2"><FileEdit className="w-5 h-5 text-purple-600" />New Prescription</span>}>
        <NewPrescriptionForm
          selectedPatient={patient}
          fromConsultation={true}
          embedded={true}
          addPrescription={addPrescription}
          currentDoctor={currentUser}
          onSuccess={() => {
            setSelectedMedications([]);
            setLoadKey(0);
            if (onSuccess) onSuccess();
          }}
          initialMedications={selectedMedications}
          loadKey={loadKey}
          onMedicationRemoved={(name) =>
            setSelectedMedications(prev => prev.filter(m => m.name !== name))
          }
        />
      </Card>

      <Modals
        showViewModal={showViewModal} showPrintModal={showPrintModal}
        selectedPrescription={selectedPrescription}
        onCloseView={() => { setShowViewModal(false); setSelectedPrescription(null); }}
        onClosePrint={() => { setShowPrintModal(false); setSelectedPrescription(null); }}
        onSwitchToPrint={() => { setShowViewModal(false); setShowPrintModal(true); }}
      />
    </div>
  );
};

// ── Small helpers ─────────────────────────────────────────────────────────────

const EmptyState = ({ icon: Icon, message }) => (
  <div className="text-center py-8 text-gray-500">
    <Icon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
    <p className="text-sm">{message}</p>
  </div>
);

const Modals = ({ showViewModal, showPrintModal, selectedPrescription, onCloseView, onClosePrint, onSwitchToPrint }) => (
  <>
    {showViewModal && selectedPrescription && (
      <ViewPrescriptionModal
        prescription={selectedPrescription}
        onClose={onCloseView}
        onPrint={onSwitchToPrint}
      />
    )}
    {showPrintModal && selectedPrescription && (
      <PrescriptionPrint
        prescription={selectedPrescription}
        onClose={onClosePrint}
      />
    )}
  </>
);

// ── View Prescription Modal ───────────────────────────────────────────────────

const ViewPrescriptionModal = ({ prescription, onClose, onPrint }) => (
  <Modal
    isOpen={true}
    onClose={onClose}
    title={
      <div>
        <h3 className="text-xl font-bold text-gray-800">Prescription Details</h3>
        <p className="text-xs text-gray-600 mt-1">#{prescription.prescriptionNumber}</p>
      </div>
    }
  >
    <div className="space-y-6 max-h-[70vh] overflow-y-auto">

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-xs text-gray-600 uppercase font-semibold">Date Issued</p>
          <p className="text-base font-bold text-gray-800 mt-1">{prescription.date}</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-xs text-gray-600 uppercase font-semibold">Status</p>
          <p className="text-base font-bold text-green-700 mt-1">{prescription.status}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 border-2 border-gray-200 rounded-lg">
          <p className="text-xs text-gray-600 uppercase font-semibold mb-2">Patient</p>
          <p className="font-bold text-gray-800">{prescription.patientName}</p>
          <p className="text-sm text-gray-600">{prescription.uhid}</p>
        </div>
        <div className="p-4 border-2 border-gray-200 rounded-lg">
          <p className="text-xs text-gray-600 uppercase font-semibold mb-2">Prescribed By</p>
          <p className="font-bold text-gray-800">{prescription.doctorName}</p>
          <p className="text-sm text-gray-600">{prescription.doctorSpecialty}</p>
        </div>
      </div>

      {prescription.diagnosis && (
        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
          <p className="text-xs text-gray-600 uppercase font-semibold mb-2 flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5 text-teal-600" /> Diagnosis
          </p>
          <p className="text-gray-800">{prescription.diagnosis}</p>
        </div>
      )}

      <div>
        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-1.5">
          <Pill className="w-4 h-4 text-teal-600" /> Medications
        </h4>
        <div className="space-y-3">
          {prescription.medications.map((med, index) => (
            <div key={index} className="p-4 border-2 border-gray-200 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <p className="font-bold text-gray-800 text-lg">{med.name}</p>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                  Qty: {med.quantity || "30"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-gray-600">Dosage</p>
                  <p className="font-semibold text-gray-800">{med.dosage}</p>
                </div>
                <div>
                  <p className="text-gray-600">Frequency</p>
                  <p className="font-semibold text-gray-800">{med.frequency}</p>
                </div>
                <div>
                  <p className="text-gray-600">Duration</p>
                  <p className="font-semibold text-gray-800">{med.duration}</p>
                </div>
              </div>
              {med.instructions && (
                <div className="mt-3 p-2 bg-yellow-50 rounded">
                  <p className="text-xs text-gray-600">Instructions:</p>
                  <p className="text-sm text-gray-700">{med.instructions}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {prescription.notes && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 uppercase font-semibold mb-2 flex items-center gap-1.5">
            <NotebookPen className="w-3.5 h-3.5 text-teal-600" /> Additional Notes
          </p>
          <p className="text-gray-700">{prescription.notes}</p>
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t">
        <Button onClick={onPrint} className="flex-1 flex items-center justify-center gap-2">
          <Printer className="w-4 h-4 text-teal-300" /> Print Prescription
        </Button>
        <Button variant="outline" onClick={onClose} className="flex-1">Close</Button>
      </div>
    </div>
  </Modal>
);

export default PrescriptionManagement;
