import { useState } from "react";
import { notify } from "../../utils/notify";
import { Plus, Minus, X, Package, AlertTriangle, ShoppingCart } from "lucide-react";
import stockService from "../../services/stockService";
import Button from "../shared/Button";
import { BatchScanBox, PatientAttach } from "./stockUi";

// Dispense — a scan-to-cart flow. The patient is attached first (mandatory),
// then each scanned shelf label adds a line to the list; scanning the same
// batch again bumps its quantity. Quantities and per-batch locations are
// adjustable, lines removable — so the staff can see exactly what's going out
// before committing. Confirm dispenses the whole list to the patient in ONE
// transaction (checkout-dispense): all-or-nothing, expired batches blocked,
// stock never goes negative. FEFO is advisory per line (staff holds the box).
const StockDispenseTab = () => {
  const [patient, setPatient] = useState(null);
  const [lines, setLines] = useState([]);   // see shape in onScan
  const [saving, setSaving] = useState(false);

  const availableAt = (line) =>
    line.levels.find((l) => String(l.locationId) === String(line.locationId))?.quantity ?? 0;

  const totalItems = lines.reduce((n, l) => n + Number(l.quantity || 0), 0);

  // FEFO nudge: flag a line when it isn't the earliest-expiring batch of that
  // item at its chosen location. Best-effort — never blocks.
  const evaluateFefo = async (stockBatchId, stockItemId, locationId) => {
    if (!locationId) return;
    try {
      const res = await stockService.getFefoSuggestion(stockItemId, locationId);
      const s = res.success ? res.data.suggestion : null;
      const warn = s && s.stockBatchId !== stockBatchId ? s : null;
      setLines((prev) => prev.map((l) => l.stockBatchId === stockBatchId ? { ...l, fefoWarn: warn } : l));
    } catch {
      /* nudge is advisory */
    }
  };

  // A scanned STK- shelf label lands here.
  const onScan = (data) => {
    const held = (data.levels || []).filter((l) => l.quantity > 0);
    if (held.length === 0) {
      notify("error", `No stock of ${data.item.name} is held anywhere`);
      return;
    }
    let targetLocation;
    setLines((prev) => {
      const idx = prev.findIndex((s) => s.stockBatchId === data.batch.id);
      if (idx !== -1) {
        targetLocation = prev[idx].locationId;
        return prev.map((s, i) => i === idx ? { ...s, quantity: s.quantity + 1 } : s);
      }
      targetLocation = held.length === 1 ? held[0].locationId : (held[0]?.locationId ?? "");
      return [...prev, {
        stockBatchId: data.batch.id,
        stockItemId:  data.item.id,
        name:         data.item.name,
        unit:         data.item.unit,
        labelCode:    data.batch.labelCode,
        expiryDate:   data.batch.expiryDate,
        isHighAlert:  data.item.isHighAlert,
        levels:       held,
        locationId:   targetLocation,
        quantity:     1,
        fefoWarn:     null,
      }];
    });
    evaluateFefo(data.batch.id, data.item.id, targetLocation);
  };

  const setLine = (idx, patch) => setLines((prev) => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!patient) return notify("error", "Attach the patient this is dispensed to");
    if (lines.length === 0) return notify("error", "Scan at least one item");
    for (const l of lines) {
      if (!l.locationId) return notify("error", `Choose where "${l.name}" comes from`);
      if (Number(l.quantity) < 1) return notify("error", `"${l.name}" needs a quantity of at least 1`);
    }
    setSaving(true);
    try {
      const res = await stockService.checkoutDispense(
        patient.uhid,
        lines.map((l) => ({ stockBatchId: l.stockBatchId, locationId: Number(l.locationId), quantity: Number(l.quantity) })),
      );
      if (res.success) {
        notify("success", `Dispensed ${totalItems} item(s) to ${patient.name}`);
        setLines([]);
        setPatient(null);
      } else {
        notify("error", res.message || "Dispense failed");
      }
    } catch (err) {
      notify("error", err?.message || "Dispense failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Left — patient + scan */}
      <div>
        <PatientAttach
          value={patient}
          onChange={setPatient}
          label="Patient (required)"
          hint="scan the patient card or type a UHID — attach before dispensing"
        />

        <BatchScanBox onResolved={onScan} disabled={!patient} />

        {!patient && (
          <p className="text-sm text-gray-500">
            Attach the patient first, then scan each shelf label the patient is taking. Every scan
            adds a line to the list on the right; scanning the same batch again adds one more.
          </p>
        )}
        {patient && (
          <p className="text-sm text-gray-500">
            Scan each shelf label the patient is taking. Same batch again = +1. Adjust quantities and
            remove lines on the right, then confirm to dispense the whole list at once.
          </p>
        )}
      </div>

      {/* Right — the dispensing list */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          Dispensing list{totalItems > 0 ? ` (${totalItems})` : ""}
        </h4>

        {lines.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-8 text-center">
            Nothing scanned yet. Scanned items appear here.
          </p>
        ) : (
          <div className="space-y-2">
            {lines.map((s, idx) => (
              <div key={s.stockBatchId} className="flex flex-wrap items-center gap-3 p-2.5 rounded-lg border border-gray-200">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {s.name}
                    {s.isHighAlert && <span className="ml-2 text-[11px] font-bold text-red-600">HIGH ALERT</span>}
                  </p>
                  <p className="text-xs text-gray-400 font-mono">
                    {s.labelCode}{s.expiryDate && ` · exp ${s.expiryDate}`}
                  </p>
                  {s.levels.length > 1 ? (
                    <select
                      value={s.locationId}
                      onChange={(e) => { setLine(idx, { locationId: e.target.value }); evaluateFefo(s.stockBatchId, s.stockItemId, Number(e.target.value)); }}
                      className="mt-1 text-xs border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-primary"
                    >
                      {s.levels.map((l) => (
                        <option key={l.locationId} value={l.locationId}>{l.locationName} ({l.quantity} held)</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-gray-400">from {s.levels[0]?.locationName} ({availableAt(s)} held)</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button type="button" aria-label="Decrease"
                    onClick={() => setLine(idx, { quantity: Math.max(1, Number(s.quantity) - 1) })}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input type="number" min="1" value={s.quantity}
                    onChange={(e) => setLine(idx, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    className="w-12 text-center text-sm font-semibold border border-gray-300 rounded-lg py-1 focus:outline-none focus:border-primary" />
                  <button type="button" aria-label="Increase"
                    onClick={() => setLine(idx, { quantity: Number(s.quantity) + 1 })}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" aria-label="Remove" onClick={() => removeLine(idx)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {s.fefoWarn && (
                  <div className="w-full basis-full flex items-start gap-1.5 mt-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>
                      An earlier-expiring batch is here: <span className="font-mono">{s.fefoWarn.labelCode}</span>
                      {s.fefoWarn.expiryDate && ` (exp ${s.fefoWarn.expiryDate})`} — use it first if you can.
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Button className="w-full mt-4" disabled={saving || lines.length === 0 || !patient} onClick={submit}>
          <Package className="w-4 h-4" />
          {patient ? `Confirm & dispense to ${patient.name}` : "Attach a patient to dispense"}
        </Button>
        <p className="text-xs text-gray-400 mt-2">
          Nothing leaves stock until you confirm. Everything is dispensed at once, recorded against the patient.
        </p>
      </div>
    </div>
  );
};

export default StockDispenseTab;
