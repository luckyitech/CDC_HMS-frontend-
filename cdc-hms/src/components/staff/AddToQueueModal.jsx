import { useState } from "react";
import { UserPlus, X, AlertCircle, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../shared/Button";
import { useQueueContext } from "../../contexts/QueueContext";
import { useUserContext } from "../../contexts/UserContext";

// Add-to-queue modal, shared so the scan flow on the patient profile can use
// the exact same fields and rules as Patient Search (priority, new/review
// visit, doctor assignment for reviews).
//
// NOTE: PatientSearch.jsx still has its own inline copy of this modal —
// pointing it at this component is a follow-up DRY cleanup, deliberately not
// done in the same change to keep the diff small.
const AddToQueueModal = ({ patient, onClose, onAdded }) => {
  const { queue, addToQueue } = useQueueContext();
  const { getDoctors } = useUserContext();
  const doctors = getDoctors();

  const todayStr = new Date().toDateString();
  const canReview = queue.some(
    (q) =>
      q.uhid === patient.uhid &&
      q.status === "Completed" &&
      new Date(q.createdAt).toDateString() === todayStr
  );

  const [queuePriority, setQueuePriority] = useState("Normal");
  const [queueReason, setQueueReason] = useState("");
  const [visitType, setVisitType] = useState("new");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");

  const handleConfirm = async () => {
    const isReview = visitType === "review";
    if (isReview && !selectedDoctorId) {
      toast.error("Please select a doctor for the review visit");
      return;
    }
    const result = await addToQueue(
      patient,
      queuePriority,
      queueReason,
      isReview ? selectedDoctorId : null,
      isReview
    );
    if (result.success) {
      toast.success(`${patient.name} added to queue!`, {
        duration: 3000,
        icon: <CheckCircle2 className="w-5 h-5" />,
        style: { background: "#D1FAE5", color: "#065F46", fontWeight: "bold", padding: "16px" },
      });
      onAdded?.();
      onClose();
    } else {
      toast.error(result.message, {
        duration: 3000,
        icon: <AlertCircle className="w-5 h-5" />,
        style: { background: "#FEE2E2", color: "#991B1B", fontWeight: "bold", padding: "16px" },
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Add to Queue
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="font-semibold text-gray-800">{patient.name}</p>
          <p className="text-sm text-gray-600">UHID: {patient.uhid}</p>
          <p className="text-sm text-gray-600">{patient.age} yrs &middot; {patient.gender}</p>
        </div>

        {canReview && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Visit Type</label>
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition ${
                  visitType === "new" ? "border-primary bg-blue-50" : "border-gray-200 bg-white"
                }`}>
                  <input type="radio" name="scanVisitType" value="new"
                    checked={visitType === "new"} onChange={() => setVisitType("new")} className="accent-primary" />
                  <span className="text-sm font-medium text-gray-700">New Visit</span>
                </label>
                <label className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition ${
                  visitType === "review" ? "border-green-500 bg-green-50" : "border-gray-200 bg-white"
                }`}>
                  <input type="radio" name="scanVisitType" value="review"
                    checked={visitType === "review"} onChange={() => setVisitType("review")} className="accent-green-500" />
                  <span className="text-sm font-medium text-gray-700">Review Visit</span>
                </label>
              </div>
              {visitType === "review" && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 mt-2">
                  Patient will skip triage and go directly to Awaiting Doctor.
                </p>
              )}
            </div>

            {visitType === "review" && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Assign Doctor <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className={`w-full px-3 py-2 border-2 rounded-lg text-sm focus:outline-none focus:border-primary ${
                    selectedDoctorId ? "border-gray-300" : "border-red-300"
                  }`}
                >
                  <option value="">Select a doctor...</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>Dr. {d.name}</option>
                  ))}
                </select>
                {!selectedDoctorId && (
                  <p className="text-xs text-red-500 mt-1">Required for review visits</p>
                )}
              </div>
            )}
          </>
        )}

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
          <div className="flex gap-4">
            <label className="flex items-center cursor-pointer">
              <input type="radio" name="scanPriority" value="Normal"
                checked={queuePriority === "Normal"} onChange={(e) => setQueuePriority(e.target.value)} className="mr-2" />
              <span className="text-sm">Normal</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input type="radio" name="scanPriority" value="Urgent"
                checked={queuePriority === "Urgent"} onChange={(e) => setQueuePriority(e.target.value)} className="mr-2" />
              <span className="text-sm text-red-600 font-semibold flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Urgent
              </span>
            </label>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for Visit</label>
          <input
            type="text"
            value={queueReason}
            onChange={(e) => setQueueReason(e.target.value)}
            placeholder="e.g., Routine checkup, Follow-up, Emergency"
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="flex-1" onClick={handleConfirm}>
            <UserPlus className="w-4 h-4 mr-2" /> Add to Queue
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddToQueueModal;
