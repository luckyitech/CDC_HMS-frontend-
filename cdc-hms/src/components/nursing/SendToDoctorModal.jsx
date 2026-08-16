import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { X, Stethoscope, CheckCircle2 } from "lucide-react";
import Button from "../shared/Button";
import api from "../../services/api";
import { useQueueContext } from "../../contexts/QueueContext";

// Send to doctor — pick a doctor and move the patient to Awaiting Doctor. Decoupled
// from triage so a nurse can route a patient at any point after vitals.
const SendToDoctorModal = ({ patient, queueItem, onClose, onDone = () => {} }) => {
  const { updateQueueStatus } = useQueueContext();
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/users/doctors")
      .then((res) => { if (res.success) setDoctors(Array.isArray(res.data) ? res.data : []); })
      .catch(() => {});
  }, []);

  const send = async () => {
    if (!doctorId) { toast.error("Select a doctor"); return; }
    setBusy(true);
    await updateQueueStatus(queueItem.id, "Awaiting Doctor", parseInt(doctorId));
    setBusy(false);
    const name = doctors.find((d) => d.id === parseInt(doctorId))?.name || "the doctor";
    toast.success(`${patient?.name} sent to ${name}`);
    onDone();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><Stethoscope className="w-5 h-5" /> Send to doctor</h3>
          <button onClick={onClose} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-500">Assign {patient?.name} to a doctor — they move to Awaiting Doctor.</p>
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary font-semibold"
          >
            <option value="">Select a doctor...</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.name} - {d.specialty || "General Physician"}</option>
            ))}
          </select>
          {doctorId && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {patient?.name} → {doctors.find((d) => d.id === parseInt(doctorId))?.name}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={send} disabled={busy}>{busy ? "Sending…" : "Send to doctor"}</Button>
        </div>
      </div>
    </div>
  );
};

export default SendToDoctorModal;
