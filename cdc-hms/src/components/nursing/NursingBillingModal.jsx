import { useState } from "react";
import toast from "react-hot-toast";
import { X, Receipt } from "lucide-react";
import Button from "../shared/Button";
import RecordUseModal from "../stock/RecordUseModal";
import { NURSE_CHARGE_OPTIONS, NURSE_PROCEDURE_OPTIONS } from "../../constants/billingOptions";
import { useQueueContext } from "../../contexts/QueueContext";

const Chip = ({ label, on, onToggle }) => (
  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm ${
    on ? "border-primary bg-blue-50 text-primary" : "border-gray-200 hover:border-gray-300"
  }`}>
    <input type="checkbox" checked={on} onChange={onToggle} />
    {label}
  </label>
);

/**
 * NursingBillingModal — the nurse's send-to-billing. Mirrors the doctor's billing:
 * a breakdown of what's already on the visit (services only, no prices) at the top,
 * then chips to add nursing services, plus Record use for anything used but not yet
 * logged. sendToBilling MERGES with the existing bill, so nothing is doubled.
 */
const NursingBillingModal = ({ patient, queueItem, onClose, onDone = () => {} }) => {
  const { sendToBilling } = useQueueContext();
  const [charges, setCharges] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [busy, setBusy] = useState(false);
  const [recordUse, setRecordUse] = useState(false);

  // Current bill — what's already attached to this visit (doctor or a prior nurse
  // action). Services only. This is the self-populating breakdown.
  const existing = [...(queueItem?.selectedCharges || []), ...(queueItem?.selectedProcedures || [])];

  const toggle = (setFn, item) =>
    setFn((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));

  const send = async () => {
    setBusy(true);
    await sendToBilling(queueItem.id, charges, procedures);
    setBusy(false);
    toast.success(`${patient?.name} sent to billing`);
    onDone();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Receipt className="w-5 h-5" /> Send to billing</h3>
            <button onClick={onClose} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
          </div>

          <div className="overflow-y-auto flex-1 min-h-0 p-5 space-y-4">
            {/* Current bill breakdown — live: services already on the visit (grey)
                plus what you tick now (blue). Services only, no prices. */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">On the bill</p>
              {existing.length + charges.length + procedures.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {existing.map((item) => (
                    <span key={`e-${item}`} className="px-2 py-1 rounded-lg bg-white border border-gray-200 text-xs text-gray-600">{item}</span>
                  ))}
                  {[...charges, ...procedures].map((item) => (
                    <span key={`n-${item}`} className="px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs text-primary font-medium">{item}</span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Nothing on the bill yet.</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Add nursing services</p>
              <button type="button" onClick={() => setRecordUse(true)} className="text-xs font-semibold text-primary hover:underline">
                Record use (scan)
              </button>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1.5">Charges</p>
              <div className="grid grid-cols-2 gap-2">
                {NURSE_CHARGE_OPTIONS.map((item) => (
                  <Chip key={item} label={item} on={charges.includes(item)} onToggle={() => toggle(setCharges, item)} />
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1.5">Procedures</p>
              <div className="grid grid-cols-2 gap-2">
                {NURSE_PROCEDURE_OPTIONS.map((item) => (
                  <Chip key={item} label={item} on={procedures.includes(item)} onToggle={() => toggle(setProcedures, item)} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 px-5 py-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={send} disabled={busy}>{busy ? "Sending…" : "Send to billing"}</Button>
          </div>
        </div>
      </div>

      {recordUse && (
        <RecordUseModal
          patient={patient ? { uhid: patient.uhid, name: patient.name } : null}
          onClose={() => setRecordUse(false)}
        />
      )}
    </>
  );
};

export default NursingBillingModal;
