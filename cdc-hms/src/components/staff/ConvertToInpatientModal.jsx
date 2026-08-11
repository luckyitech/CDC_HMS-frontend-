import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import inpatientService from "../../services/inpatientService";

/**
 * ConvertToInpatientModal — front desk (staff) converts an OPD patient who was
 * advised for admission. Picks an available bed, chooses how to settle the OPD
 * bill (clear now / merge into inpatient), and creates the Admission.
 * Stays in the Outpatient workspace.
 *
 * Props: queueItem — a queue row as returned by GET /api/queue ({ id, name,
 * uhid, ... }). Passed through whole rather than rebuilt field-by-field, so
 * this stays in step with the row shape every other queue screen already reads.
 */
export default function ConvertToInpatientModal({ queueItem, onClose, onSuccess }) {
  const [board, setBoard] = useState([]);
  const [bedId, setBedId] = useState("");
  const [opdBilling, setOpdBilling] = useState("clear");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    inpatientService.getBoard().then((r) => setBoard(r.data || [])).catch(() => {});
  }, []);

  const availableBeds = board.flatMap((w) =>
    w.beds.filter((b) => b.status === "Available").map((b) => ({ ...b, ward: w.name }))
  );

  const submit = async () => {
    if (!bedId) return toast.error("Select an available bed.");
    setSubmitting(true);
    try {
      await inpatientService.convert({ queueId: queueItem.id, bedId: Number(bedId), opdBilling });
      toast.success("Patient admitted to the ward.");
      onSuccess?.();
    } catch (err) {
      if (err.status === 409) toast.error("That bed was just taken — pick another.");
      else toast.error(err.message || "Conversion failed");
      inpatientService.getBoard().then((r) => setBoard(r.data || [])); // refresh beds
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Convert to Inpatient</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-3">{queueItem?.name} · {queueItem?.uhid}</p>

        <label className="text-xs text-gray-500">Assign bed</label>
        <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-3" value={bedId} onChange={(e) => setBedId(e.target.value)}>
          <option value="">Select an available bed…</option>
          {availableBeds.map((b) => <option key={b.bedId} value={b.bedId}>{b.ward} · {b.roomName} · {b.label}</option>)}
        </select>

        <label className="text-xs text-gray-500">Outpatient charges</label>
        <div className="flex gap-3 mb-4 text-sm">
          <label className="flex items-center gap-1"><input type="radio" checked={opdBilling === "clear"} onChange={() => setOpdBilling("clear")} /> Clear OPD bill now</label>
          <label className="flex items-center gap-1"><input type="radio" checked={opdBilling === "merge"} onChange={() => setOpdBilling("merge")} /> Merge into inpatient</label>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded text-sm border border-gray-300">Cancel</button>
          <button onClick={submit} disabled={submitting} className="px-3 py-1.5 rounded text-sm bg-primary text-white disabled:opacity-50">
            {submitting ? "Admitting…" : "Admit patient"}
          </button>
        </div>
      </div>
    </div>
  );
}
