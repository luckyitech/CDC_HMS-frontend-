import { useState } from "react";
import toast from "react-hot-toast";
import { X, BedDouble, Printer } from "lucide-react";
import inpatientService from "../../services/inpatientService";

/**
 * AdmitPatientModal — doctor ADVISES admission from the OPD consultation.
 *
 * The body is an editable ADMISSION NOTE, pre-filled from the consultation
 * (active diagnoses + clinical notes) via `defaultNote`. The doctor edits and can
 * print it. Ward preference is deliberately omitted — that's the admission
 * clerk's job. On submit the note is stored on the admission request (which the
 * front desk converts) and the patient is sent to Pending Billing.
 *
 * Props: patient { name, uhid }, queueItem { id }, defaultNote, onClose, onSuccess
 */
export default function AdmitPatientModal({ patient, queueItem, defaultNote = "", onClose, onSuccess }) {
  const [form, setForm] = useState({ admissionType: "Elective", admissionNote: defaultNote });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.admissionNote.trim()) return toast.error("The admission note is empty.");
    if (!queueItem?.id) return toast.error("No active queue visit for this patient.");
    setSubmitting(true);
    try {
      await inpatientService.requestAdmission({
        queueId: queueItem.id,
        admissionType: form.admissionType,
        admissionReason: form.admissionNote,
      });
      toast.success("Admission advised — patient sent to billing.");
      onSuccess?.();
    } catch (err) {
      toast.error(err.message || "Failed to advise admission");
    } finally {
      setSubmitting(false);
    }
  };

  const printNote = () => {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return toast.error("Allow pop-ups to print.");
    const esc = (s) => String(s || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    w.document.write(`<!DOCTYPE html><html><head><title>Admission Note — ${esc(patient?.uhid)}</title>
      <style>
        body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;padding:40px;color:#111}
        h1{font-size:20px;margin:0 0 2px} .sub{color:#555;font-size:13px}
        hr{border:none;border-top:1px solid #ccc;margin:16px 0}
        .label{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#666;margin-top:16px}
        .val{font-size:14px;margin-top:3px} .note{white-space:pre-wrap;font-size:14px;line-height:1.55;margin-top:4px}
      </style></head><body>
        <h1>Comprehensive Diabetes Centre</h1>
        <div class="sub">Admission Note</div>
        <hr/>
        <div class="val"><strong>${esc(patient?.name)}</strong> &middot; ${esc(patient?.uhid)}</div>
        <div class="sub">${esc(new Date().toLocaleString())}</div>
        <div class="label">Admission type</div><div class="val">${esc(form.admissionType)}</div>
        <div class="label">Admission note</div>
        <div class="note">${esc(form.admissionNote)}</div>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
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
            <textarea className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" rows={7}
              value={form.admissionNote} onChange={(e) => setForm({ ...form, admissionNote: e.target.value })}
              placeholder="Pre-filled from the consultation — edit as needed." />
            <p className="text-[11px] text-gray-400 mt-1">Pre-filled from the active diagnoses and consultation notes. The admission clerk assigns the ward.</p>
          </div>
          <div className="flex justify-between items-center gap-2 pt-2">
            <button type="button" onClick={printNote}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm border border-gray-300 hover:bg-blue-50 transition-colors">
              <Printer size={15} /> Print
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-3 py-1.5 rounded text-sm border border-gray-300 hover:bg-blue-50 transition-colors">Cancel</button>
              <button type="submit" disabled={submitting} className="px-3 py-1.5 rounded text-sm bg-primary text-white disabled:opacity-50">
                {submitting ? "Sending…" : "Advise admission → billing"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
