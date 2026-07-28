import { useState } from "react";
import { notify } from "../../utils/notify";
import { Undo2, AlertTriangle, PackageCheck } from "lucide-react";
import { useStockContext } from "../../contexts/StockContext";
import stockService from "../../services/stockService";
import Button from "../shared/Button";
import { BatchScanBox, PatientAttach, Field, inputCls } from "./stockUi";

// Returns — a patient brings stock back. Attach the patient (required — recall
// traceability), scan the item, give a reason. "Safe to re-dispense" (e.g. a
// collection error, the item is unused) sends it back into stock; otherwise it
// is quarantined in the Faulty Box, a non-dispensing location the ledger will
// not let stock leave — so a faulty item can't be handed out again by accident.
const REASON_PRESETS = [
  "Faulty CGM sensor",
  "Faulty glucometer",
  "Wrong medicine dispensed",
  "Collection error",
];

const StockReturnTab = () => {
  const { locations } = useStockContext();
  const [patient, setPatient] = useState(null);
  const [scan, setScan] = useState(null);        // { batch, item, levels }
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [reDispensable, setReDispensable] = useState(false);
  const [toLocationId, setToLocationId] = useState("");
  const [saving, setSaving] = useState(false);

  // Somewhere real stock can go back to — never the Faulty Box or a retired room.
  const destinations = locations.filter(
    (l) => l.status !== "retired" && l.isDispensing !== false && l.kind !== "faulty"
  );

  const clear = () => {
    setScan(null); setQuantity(1); setReason(""); setReDispensable(false); setToLocationId("");
  };

  const submit = async () => {
    if (!patient) return notify("error", "Attach the patient returning the item");
    if (!scan) return notify("error", "Scan the item being returned");
    if (!reason.trim()) return notify("error", "Give a reason for the return");
    if (reDispensable && !toLocationId) return notify("error", "Choose where the item goes back to");
    setSaving(true);
    try {
      const res = await stockService.returnStock({
        stockBatchId: scan.batch.id,
        quantity: Number(quantity) || 1,
        uhid: patient.uhid,
        reason: reason.trim(),
        reDispensable,
        toLocationId: reDispensable ? Number(toLocationId) : undefined,
      });
      if (res.success) {
        notify("success", reDispensable
          ? `Returned ${scan.item.name} to stock`
          : `${scan.item.name} quarantined in the Faulty Box`);
        clear();
      } else {
        notify("error", res.message || "Return failed");
      }
    } catch (err) {
      notify("error", err?.message || "Return failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Left — patient scan */}
      <div className="lg:col-span-1">
        <PatientAttach
          value={patient}
          onChange={setPatient}
          label="Patient returning (required)"
          hint="scan the patient card or type a UHID — a return is traced to the patient"
        />
        <p className="text-sm text-gray-500">
          Attach the patient, then scan the item they are bringing back and give a reason. Tick
          “safe to re-dispense” only if the item is unused and fine — otherwise it goes to the
          Faulty Box and can’t be handed out again.
        </p>
      </div>

      {/* Right — scan + return form */}
      <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
        <BatchScanBox onResolved={setScan} disabled={!patient} />

        {!scan ? (
          <p className="text-sm text-gray-400 italic py-8 text-center">
            Scan the item being returned.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 truncate">
                  {scan.item.name}
                  {scan.item.isHighAlert && <span className="ml-2 text-[11px] font-bold text-red-600">HIGH ALERT</span>}
                </p>
                <p className="text-xs text-gray-400 font-mono">
                  {scan.batch.labelCode}{scan.batch.expiryDate && ` · exp ${scan.batch.expiryDate}`}
                </p>
              </div>
              <button type="button" className="text-xs text-primary font-semibold flex-shrink-0" onClick={clear}>
                change
              </button>
            </div>

            <div className="max-w-[10rem]">
              <Field label="Quantity returned">
                <input type="number" min="1" className={inputCls} value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))} />
              </Field>
            </div>

            <Field label="Reason" hint="recorded on the return, and shown if the item is later re-dispensed">
              <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. sensor error 3 days after fitting" />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {REASON_PRESETS.map((r) => (
                  <button key={r} type="button" onClick={() => setReason(r)}
                    className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-primary hover:text-primary">
                    {r}
                  </button>
                ))}
              </div>
            </Field>

            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" className="mt-1" checked={reDispensable}
                onChange={(e) => setReDispensable(e.target.checked)} />
              <span>
                <b>Safe to re-dispense</b> — unused and fine (e.g. a collection error); it goes back into
                stock. Leave unticked to quarantine it in the Faulty Box.
              </span>
            </label>

            {reDispensable ? (
              <Field label="Return to location">
                <select className={inputCls} value={toLocationId} onChange={(e) => setToLocationId(e.target.value)}>
                  <option value="">— choose —</option>
                  {destinations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </Field>
            ) : (
              <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>
                  This item will be quarantined in the Faulty Box and cannot be dispensed until an
                  admin moves it back into stock.
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-shrink-0" onClick={clear} disabled={saving}>Cancel</Button>
              <Button className="flex-1" disabled={saving} onClick={submit}>
                {reDispensable ? <PackageCheck className="w-4 h-4" /> : <Undo2 className="w-4 h-4" />}
                {reDispensable ? "Return to stock" : "Send to Faulty Box"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockReturnTab;
