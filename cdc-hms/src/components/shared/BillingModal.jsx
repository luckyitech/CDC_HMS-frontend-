import { useState } from "react";
import { X, Receipt } from "lucide-react";
import Button from "./Button";
import RecordUseModal from "../stock/RecordUseModal";
import { BatchScanBox } from "../stock/stockUi";

const Chip = ({ label, on, onToggle }) => (
  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm ${
    on ? "border-primary bg-blue-50 text-primary" : "border-gray-200 hover:border-gray-300"
  }`}>
    <input type="checkbox" checked={on} onChange={onToggle} />
    {label}
  </label>
);

/**
 * BillingModal — the one send-to-billing modal, shared across portals and stages.
 *
 * A live "on the bill" breakdown (services already on the visit in grey, what you
 * add now in blue — services only, no prices), charge/procedure chips, and the
 * shared barcode scanner: scanning a shelf label opens the shared RecordUseModal
 * so point-of-care use is logged without leaving billing.
 *
 * The stage-specific action (nurse/doctor add → send onward; reception finalize →
 * dispense + discharge) is entirely the caller's — passed as onSubmit. Keeping the
 * financial/stock consequences in the caller lets one UI serve every stage.
 *
 * Props:
 *   patient, title, submitLabel, submitting
 *   chargeOptions, procedureOptions      what can be added here
 *   existingCharges, existingProcedures  what's already on the bill (breakdown)
 *   onSubmit({ charges, procedures })    the stage's action
 *   onClose
 */
const BillingModal = ({
  patient,
  title = "Send to billing",
  submitLabel = "Send to billing",
  submitting = false,
  chargeOptions = [],
  procedureOptions = [],
  existingCharges = [],
  existingProcedures = [],
  onSubmit = () => {},
  onClose = () => {},
}) => {
  const [charges, setCharges] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [scan, setScan] = useState(null); // resolved batch → opens RecordUseModal
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setBusy(true);
    try { await onSubmit({ charges, procedures }); }
    finally { setBusy(false); }
  };

  const existing = [...existingCharges, ...existingProcedures];
  const toggle = (setFn, item) =>
    setFn((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Receipt className="w-5 h-5" /> {title}</h3>
            <button onClick={onClose} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
          </div>

          <div className="overflow-y-auto flex-1 min-h-0 p-5 space-y-4">
            {/* Live breakdown — existing services (grey) + what you add now (blue) */}
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

            {chargeOptions.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Charges</p>
                <div className="grid grid-cols-2 gap-2">
                  {chargeOptions.map((item) => (
                    <Chip key={item} label={item} on={charges.includes(item)} onToggle={() => toggle(setCharges, item)} />
                  ))}
                </div>
              </div>
            )}

            {procedureOptions.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Procedures</p>
                <div className="grid grid-cols-2 gap-2">
                  {procedureOptions.map((item) => (
                    <Chip key={item} label={item} on={procedures.includes(item)} onToggle={() => toggle(setProcedures, item)} />
                  ))}
                </div>
              </div>
            )}

            {/* Barcode record-use — scan a shelf label to log point-of-care use */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs text-gray-500">Record use (scan)</p>
                <span className="text-[11px] text-gray-400">scan a shelf label to log stock used</span>
              </div>
              <BatchScanBox onResolved={(data) => setScan(data)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 px-5 py-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={busy || submitting}>
              {busy || submitting ? "Saving…" : submitLabel}
            </Button>
          </div>
        </div>
      </div>

      {scan && (
        <RecordUseModal
          scan={scan}
          patient={patient ? { uhid: patient.uhid, name: patient.name } : null}
          onClose={() => setScan(null)}
        />
      )}
    </>
  );
};

export default BillingModal;
