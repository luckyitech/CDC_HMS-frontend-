import { useState } from "react";
import toast from "react-hot-toast";
import { X, BedDouble } from "lucide-react";
import inpatientService from "../../services/inpatientService";

/**
 * AdmitPatientModal — doctor ADVISES admission from the OPD consultation
 * (sibling to ReferPatientModal). Writes admission-request fields onto the queue
 * item and sends the patient to Pending Billing. The front desk then converts.
 *
 * Props: patient { name, uhid }, queueItem { id }, onClose, onSuccess
 */
export default function AdmitPatientModal({ patient, queueItem, onClose, onSuccess }) {
  const [form, setForm] = useState({ admissionType: "Elective", admissionReason: "", admissionWardPreference: "" });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.admissionReason.trim()) return toast.error("Please give a reason for admission.");
    if (!queueItem?.id) return toast.error("No active queue visit for this patient.");
    setSubmitting(true);
    try {
      await inpatientService.requestAdmission({ queueId: queueItem.id, ...form });
      toast.success("Admission advised — patient sent to billing.");
      onSuccess?.();
    } catch (err) {
      toast.error(err.message || "Failed to advise admission");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><BedDouble size={18} className="text-primary" /> Advise Admission</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-3">{patient?.name} · {patient?.uhid}</p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">Admission type</label>
            <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={form.admissionType} onChange={(e) => setForm({ ...form, admissionType: e.target.value })}>
              {["Elective", "Emergency", "Observation", "Transfer"].map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Reason / working diagnosis</label>
            <textarea className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" rows={3}
              value={form.admissionReason} onChange={(e) => setForm({ ...form, admissionReason: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Ward preference (optional)</label>
            <input className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={form.admissionWardPreference} onChange={(e) => setForm({ ...form, admissionWardPreference: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded text-sm border border-gray-300">Cancel</button>
            <button type="submit" disabled={submitting} className="px-3 py-1.5 rounded text-sm bg-primary text-white disabled:opacity-50">
              {submitting ? "Sending…" : "Advise admission → billing"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
