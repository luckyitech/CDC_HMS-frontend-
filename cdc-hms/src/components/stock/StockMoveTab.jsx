import { useState, useMemo } from "react";
import { notify } from "../../utils/notify";
import { AlertTriangle } from "lucide-react";
import { useStockContext } from "../../contexts/StockContext";
import stockService from "../../services/stockService";
import Button from "../shared/Button";
import { Field, inputCls, BatchScanBox, FefoOverrideModal, PatientAttach } from "./stockUi";

// One component for both stock-out flows — they differ only in whether the
// stock has a destination:
//   mode="dispense"  → item leaves the world (with the patient)
//   mode="transfer"  → item moves between locations (store → room restock)
// Both are scan-first (STK- shelf label pre-fills batch + item) and share the
// FEFO gate: a 409 from the backend opens the override modal.

const StockMoveTab = ({ mode }) => {
  const isTransfer = mode === "transfer";
  const { locations, items } = useStockContext();
  const [resolved, setResolved] = useState(null);      // { batch, item, levels } from a scan
  const [form, setForm] = useState({ fromLocationId: "", toLocationId: "", quantity: "" });
  const [fefo, setFefo] = useState(null);              // 409 suggestion payload
  const [patient, setPatient] = useState(null);        // { uhid, name } | null — dispense only
  const [saving, setSaving] = useState(false);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const reset = () => {
    setResolved(null);
    setForm({ fromLocationId: "", toLocationId: "", quantity: "" });
    setFefo(null);
    setPatient(null);
  };

  const onScan = (data) => {
    setResolved(data);
    // Pre-select the source when the batch sits in exactly one location.
    if (data.levels?.length === 1) set("fromLocationId", String(data.levels[0].locationId));
    notify("success", `${data.item.name} — ${data.batch.labelCode}`);
  };

  const availableAtSource = useMemo(() => {
    if (!resolved || !form.fromLocationId) return null;
    const lvl = resolved.levels?.find((l) => l.locationId === Number(form.fromLocationId));
    return lvl ? lvl.quantity : 0;
  }, [resolved, form.fromLocationId]);

  const submit = async (fefoOverrideReason = null, batchIdOverride = null) => {
    if (!resolved && !batchIdOverride) return notify("error", "Scan a batch label first");
    if (!form.fromLocationId) return notify("error", "Choose the source location");
    if (isTransfer && !form.toLocationId) return notify("error", "Choose the destination");
    if (!form.quantity || Number(form.quantity) < 1) return notify("error", "Enter a quantity");

    setSaving(true);
    try {
      const payload = {
        stockBatchId: batchIdOverride || resolved.batch.id,
        quantity: Number(form.quantity),
        ...(isTransfer
          ? { fromLocationId: Number(form.fromLocationId), toLocationId: Number(form.toLocationId) }
          : { locationId: Number(form.fromLocationId) }),
        ...(!isTransfer && patient ? { uhid: patient.uhid } : {}),
        ...(fefoOverrideReason ? { fefoOverrideReason } : {}),
      };
      const res = isTransfer ? await stockService.transfer(payload) : await stockService.dispense(payload);
      if (res.success) {
        notify("success", isTransfer ? "Transfer recorded" : "Dispense recorded");
        reset();
      } else {
        notify("error", res.message || "Failed");
      }
    } catch (err) {
      // FEFO gate: the backend answers 409 with the suggested batch
      // (carried through the api interceptor's `data` field).
      const suggestion = err?.data?.fefoSuggestion;
      if (suggestion) {
        setFefo(suggestion);
      } else {
        notify("error", err?.message || "Failed");
      }
    } finally {
      setSaving(false);
    }
  };

  const item = resolved?.item;

  return (
    <div className="max-w-2xl">
      <BatchScanBox onResolved={onScan} />

      {resolved && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-bold text-gray-800">{item.name}</p>
              <p className="text-xs text-gray-500 font-mono">
                {resolved.batch.labelCode}
                {resolved.batch.batchNo && ` · batch ${resolved.batch.batchNo}`}
                {resolved.batch.expiryDate && ` · exp ${resolved.batch.expiryDate}`}
              </p>
            </div>
            <button className="text-xs text-primary font-semibold" onClick={reset}>clear</button>
          </div>

          {item.isHighAlert && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 font-semibold mb-3 flex gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              High-alert medication — double-check item, dose and quantity.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label={isTransfer ? "From location" : "Dispensing location"}>
              <select className={inputCls} value={form.fromLocationId} onChange={(e) => set("fromLocationId", e.target.value)}>
                <option value="">— choose —</option>
                {(resolved.levels || []).map((l) => (
                  <option key={l.locationId} value={l.locationId}>
                    {l.locationName} ({l.quantity} available)
                  </option>
                ))}
              </select>
            </Field>
            {isTransfer && (
              <Field label="To location">
                <select className={inputCls} value={form.toLocationId} onChange={(e) => set("toLocationId", e.target.value)}>
                  <option value="">— choose —</option>
                  {locations
                    .filter((l) => String(l.id) !== form.fromLocationId)
                    .filter((l) => !item.requiresColdChain || l.isColdChain)
                    .map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </Field>
            )}
            <Field
              label={`Quantity (${item.unit}s)`}
              hint={availableAtSource !== null ? `${availableAtSource} available at source` : undefined}
            >
              <input type="number" min="1" className={inputCls} value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
            </Field>
          </div>
          {isTransfer && item.requiresColdChain && (
            <p className="text-xs text-blue-700 mb-3">❄ Cold-chain item — only fridge destinations are offered.</p>
          )}

          {/* Optional patient — attach for a named collection so it lands on
              their record and a bad-batch recall can trace it. Omit for a
              genuine over-the-counter sale. Dispense only. */}
          {!isTransfer && (
            <PatientAttach
              value={patient}
              onChange={setPatient}
              hint="scan the patient card or type a UHID — leave blank for over-the-counter collection"
            />
          )}

          <Button className="w-full" disabled={saving} onClick={() => submit()}>
            {isTransfer ? "Record transfer" : "Record dispense"}
          </Button>
        </div>
      )}

      {!resolved && (
        <p className="text-sm text-gray-500">
          Scan the shelf label of the batch you are {isTransfer ? "moving" : "dispensing"}.
          The system suggests the earliest-expiring batch (FEFO) — scanning a different
          one asks for a logged override reason. Every entry records who and when.
        </p>
      )}

      {fefo && (
        <FefoOverrideModal
          suggestion={fefo}
          onClose={() => setFefo(null)}
          onUseSuggested={(s) => {
            setFefo(null);
            submit(null, s.stockBatchId);
          }}
          onOverride={(reason) => {
            setFefo(null);
            submit(reason);
          }}
        />
      )}
    </div>
  );
};

export default StockMoveTab;
