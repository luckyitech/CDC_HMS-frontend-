import { useState } from "react";
import { ScanLine, FolderOpen, UserPlus, X } from "lucide-react";
import Button from "../shared/Button";
import { useQueueContext } from "../../contexts/QueueContext";
import AddToQueueModal from "./AddToQueueModal";

// Shown when a patient record was opened by a barcode scan. The patient file
// is already open in the background; this asks what the staff member wants to
// do — just view the file, or also add the patient to today's queue.
const ScanActionModal = ({ patient, onClose }) => {
  const { isInQueue } = useQueueContext();
  const [showQueueModal, setShowQueueModal] = useState(false);
  const inQueue = isInQueue(patient.uhid);

  if (showQueueModal) {
    return <AddToQueueModal patient={patient} onClose={onClose} onAdded={onClose} />;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary" />
            Patient Scanned
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="font-semibold text-gray-800">{patient.name}</p>
          <p className="text-sm text-gray-600">UHID: {patient.uhid}</p>
          <p className="text-sm text-gray-600">{patient.age} yrs &middot; {patient.gender}</p>
          {inQueue && (
            <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-2">
              This patient is already in today's queue.
            </p>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-4">
          The patient file is open behind this window. What would you like to do?
        </p>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            <FolderOpen className="w-4 h-4 mr-2" /> Open File
          </Button>
          {inQueue ? (
            <Button variant="secondary" className="flex-1" disabled>In Queue</Button>
          ) : (
            <Button variant="primary" className="flex-1" onClick={() => setShowQueueModal(true)}>
              <UserPlus className="w-4 h-4 mr-2" /> Add to Queue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanActionModal;
