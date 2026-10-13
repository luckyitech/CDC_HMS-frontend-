import { useState } from "react";
import { Truck } from "lucide-react";
import { notify } from "../../utils/notify";
import stockService from "../../services/stockService";
import Button from "../shared/Button";
import { BatchScanBox, Field, inputCls, unitPlural } from "./stockUi";

// Returns → To a supplier (13 Oct 2026, Emu). Stock going back: excess or the
// wrong item delivered, faulty, short-dated or recalled. Scan the shelf label,
// choose where it leaves from, how many and why. Shows in Movements as
// "Return to supplier" (and in the Expiry report as returned, not used).
const REASONS = [
  "Excess delivered",
  "Wrong item delivered",
  "Faulty / damaged on arrival",
  "Short-dated on arrival",
  "Recalled by the supplier",
];

const StockSupplierReturn = () => {
  const [scan, setScan] = useState(null);        // { batch, item, levels }
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const levels = scan?.levels || [];
  const heldHere = levels.find((l) => String(l.locationId) === String(locationId))?.quantity || 0;

  const onResolved = (s) => {
    setScan(s);
    const only = (s?.levels || []).length === 1 ? s.levels[0] : null;
    setLocationId(only ? String(only.locationId) : "");
    setQuantity(1);
  };
  const clear = () => { setScan(null); setLocationId(""); setQuantity(1); setReason(""); };

  const submit = async () => {
    if (!scan) return notify("error", "Scan the shelf label of the stock going back");
    if (!locationId) return notify("error", "Choose where it leaves from");
    if (!reason.trim()) return notify("error", "Give a reason for the return");
    setSaving(true);
    try {
      const res = await stockService.supplierReturn({
        stockBatchId: scan.batch.id, locationId: Number(locationId), quantity: Number(quantity) || 1, reason: reason.trim(),
      });
      if (res.success) {
        notify("success", `${quantity} ${Number(quantity) === 1 ? scan.item.unit : unitPlural(scan.item.unit)} of ${scan.item.name} returned to the supplier`);
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
      <p className="text-sm text-gray-500 lg:col-span-1">
        Scan the shelf label of the stock going back to the supplier, choose where it leaves from, how many,
        and why. It is recorded in Movements as a return to the supplier.
      </p>
      <div className="ui-surface lg:col-span-2 p-5">
        <BatchScanBox onResolved={onResolved} />
        {!scan ? (
          <p className="text-sm text-gray-400 italic py-8 text-center">Scan the stock going back.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 truncate">{scan.item.name}</p>
                <p className="text-xs text-gray-400 font-mono">
                  {scan.batch.labelCode}{scan.batch.batchNo && ` · ${scan.batch.batchNo}`}{scan.batch.expiryDate && ` · exp ${scan.batch.expiryDate}`}
                </p>
              </div>
              <button type="button" className="text-xs text-primary font-semibold flex-shrink-0" onClick={clear}>change</button>
            </div>
            {levels.length === 0 ? (
              <p className="text-sm text-amber-700">None of this batch is held anywhere — nothing to return.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Leaves from">
                    <select className={inputCls} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                      <option value="">— choose —</option>
                      {levels.map((l) => <option key={l.locationId} value={l.locationId}>{l.locationName} ({l.quantity} held)</option>)}
                    </select>
                  </Field>
                  <Field label={`Quantity (${unitPlural(scan.item.unit)})`} hint={locationId ? `${heldHere} held there` : undefined}>
                    <input type="number" min="1" max={heldHere || undefined} className={inputCls} value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))} />
                  </Field>
                </div>
                <Field label="Reason">
                  <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. 2 extra boxes on invoice 64374" />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {REASONS.map((r) => (
                      <button key={r} type="button" onClick={() => setReason(r)}
                        className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-primary hover:text-primary">
                        {r}
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-shrink-0" onClick={clear} disabled={saving}>Cancel</Button>
                  <Button className="flex-1" disabled={saving} onClick={submit}>
                    <Truck className="w-4 h-4" /> Return to supplier
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockSupplierReturn;
