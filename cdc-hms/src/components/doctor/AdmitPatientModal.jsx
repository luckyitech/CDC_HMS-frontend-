import { useState } from "react";
import toast from "react-hot-toast";
import { X, BedDouble, Printer } from "lucide-react";
import inpatientService from "../../services/inpatientService";
import usePrint from "../../hooks/usePrint";
import PrintRoot from "../shared/PrintRoot";

/**
 * AdmitPatientModal — doctor ADVISES admission from the OPD consultation.
 *
 * The body is an editable ADMISSION NOTE, pre-filled from the consultation
 * (structured like the visit-history document) via `defaultNote`. The doctor
 * edits and can print it — on the shared clinic letterhead (PrintRoot). Ward
 * preference is omitted (the admission clerk's job).
 *
 * Flow: Save & Print documents the note to the visit history (no billing move).
 * "Send for admission" hands off to the shared Complete-Consultation billing
 * modal (`onSendToBilling`) — billing is entered there, and submitting it
 * finalises the admission and completes the visit. Admission never skips billing.
 *
 * Props: patient { name, uhid }, queueItem { id }, defaultNote, onClose,
 *        onSendToBilling({ admissionType, admissionNote })
 */
export default function AdmitPatientModal({ patient, queueItem, defaultNote = "", onClose, onSendToBilling }) {
  const [form, setForm] = useState({ admissionType: "Elective", admissionNote: defaultNote });
  const [saving, setSaving] = useState(false);
  const { printRef, handlePrint } = usePrint();

  // Save & Print — documents the admission note to the visit history per protocol,
  // WITHOUT sending for admission. The doctor then sends for admission or cancels.
  const saveAndPrint = async () => {
    if (!form.admissionNote.trim()) return toast.error("The admission note is empty.");
    if (!queueItem?.id) return toast.error("No active queue visit for this patient.");
    setSaving(true);
    try {
      await inpatientService.saveAdmissionNote({
        queueId: queueItem.id,
        admissionType: form.admissionType,
        admissionReason: form.admissionNote,
      });
      toast.success("Admission note saved to visit history.");
      handlePrint();
    } catch (err) {
      toast.error(err.message || "Failed to save admission note");
    } finally {
      setSaving(false);
    }
  };

  // Send for admission — hand off to the shared billing modal. The admission is
  // finalised there once the doctor enters billing (never skipped).
  const submit = (e) => {
    e.preventDefault();
    if (!form.admissionNote.trim()) return toast.error("The admission note is empty.");
    if (!queueItem?.id) return toast.error("No active queue visit for this patient.");
    onSendToBilling?.({ admissionType: form.admissionType, admissionNote: form.admissionNote });
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
            <label className="text-xs text-gray-500">Admission note</label>
            <textarea className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" rows={8}
              value={form.admissionNote} onChange={(e) => setForm({ ...form, admissionNote: e.target.value })}
              placeholder="Pre-filled from the consultation — edit as needed." />
            <p className="text-[11px] text-gray-400 mt-1">Pre-filled from this visit's vitals, notes and diagnosis. The admission clerk assigns the ward.</p>
          </div>
          <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
            <button type="button" onClick={saveAndPrint} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm border border-primary text-primary font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50">
              <Printer size={15} /> {saving ? "Saving…" : "Save & Print"}
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-3 py-1.5 rounded text-sm border border-gray-300 hover:bg-blue-50 transition-colors">Cancel</button>
              <button type="submit" className="px-3 py-1.5 rounded text-sm bg-primary text-white">
                Send for admission
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Print target — shared clinic letterhead */}
      <PrintRoot printRef={printRef}>
        <div className="border-b border-gray-300 pb-3 mb-4">
          <p className="text-sm text-gray-700"><b>{patient?.name}</b>{patient?.uhid ? ` · ${patient.uhid}` : ""}</p>
          <p className="text-xs text-gray-500">Admission Note · {new Date().toLocaleString()}</p>
        </div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Admission type</p>
        <p className="text-sm mb-3">{form.admissionType}</p>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Admission note</p>
        <p className="text-sm whitespace-pre-wrap">{form.admissionNote}</p>
      </PrintRoot>
    </div>
  );
}
