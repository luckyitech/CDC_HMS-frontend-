import { useState, useEffect, useMemo } from "react";
import { notify } from "../../utils/notify";
import { AlertTriangle } from "lucide-react";
import stockService from "../../services/stockService";
import Button from "../shared/Button";
import Modal from "../shared/Modal";
import { Field, inputCls } from "./stockUi";

// Point-of-care "I used something" — open to ALL clinical roles, no stock
// permission needed (gating it would guarantee unrecorded usage and rotten
// room counts). Two paths into it, both landing here:
//   Scan:     an STK- shelf label scanned anywhere (ScanCapture) pre-fills
//             item, batch and room; quantity defaults to 1 — one tap.
//   Announce: opened from the staff dashboard / consultation quick action;
//             pick the room, then an item held in that room (batch chosen
//             FEFO automatically by list order).
// Writes a 'use' movement — who/when from the JWT. Patient attachment joins
// the future patient-linking phase (decision, 28 Jul).
const RecordUseModal = ({ scan = null, onClose }) => {
  const [locations, setLocations] = useState([]);
  const [batches, setBatches] = useState([]);          // announce path: what the room holds
  const [locationId, setLocationId] = useState("");
  const [stockBatchId, setStockBatchId] = useState(scan?.batch?.id || "");
  const [quantity, setQuantity] = useState("1");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const isScan = !!scan;

  // Locations always; pre-select when the scanned batch sits in one room.
  useEffect(() => {
    stockService.getUseOptions()
      .then((res) => { if (res.success) setLocations(res.data.locations || []); })
      .catch(() => {});
    if (isScan && scan.levels?.length === 1) {
      setLocationId(String(scan.levels[0].locationId));
    }
  }, [isScan, scan]);

  // Announce path: load what the chosen room holds (FEFO-ordered per item).
  useEffect(() => {
    if (isScan || !locationId) return;
    stockService.getUseOptions({ locationId })
      .then((res) => { if (res.success) setBatches(res.data.batches || []); })
      .catch(() => {});
  }, [isScan, locationId]);

  // Announce path shows one row per ITEM (its FEFO batch) — staff think in
  // items, the system picks the batch.
  const itemChoices = useMemo(() => {
    const seen = new Set();
    return batches.filter((b) => {
      if (seen.has(b.item.id)) return false;
      seen.add(b.item.id);
      return b.item.name.toLowerCase().includes(search.toLowerCase());
    });
  }, [batches, search]);

  const chosen = isScan
    ? { item: scan.item, labelCode: scan.batch.labelCode, available: scan.levels?.find((l) => String(l.locationId) === locationId)?.quantity }
    : batches.find((b) => b.stockBatchId === Number(stockBatchId));

  const submit = async () => {
    if (!locationId) return notify("error", "Choose the room");
    if (!stockBatchId) return notify("error", "Choose what was used");
    if (!quantity || Number(quantity) < 1) return notify("error", "Enter a quantity");
    setSaving(true);
    try {
      const res = await stockService.recordUse({
        stockBatchId: Number(stockBatchId),
        locationId: Number(locationId),
        quantity: Number(quantity),
      });
      if (res.success) {
        notify("success", "Use recorded");
        onClose();
      } else {
        notify("error", res.message || "Failed to record use");
      }
    } catch (err) {
      notify("error", err?.message || "Failed to record use");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Record use">
      {isScan && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-4">
          <p className="font-semibold text-sm">{scan.item.name}</p>
          <p className="text-xs text-gray-500 font-mono">
            {scan.batch.labelCode}
            {scan.batch.batchNo && ` · batch ${scan.batch.batchNo}`}
            {scan.batch.expiryDate && ` · exp ${scan.batch.expiryDate}`}
          </p>
        </div>
      )}

      <Field label="Room">
        <select
          className={inputCls}
          value={locationId}
          onChange={(e) => { setLocationId(e.target.value); setStockBatchId(isScan ? scan.batch.id : ""); }}
        >
          <option value="">— choose —</option>
          {(isScan ? (scan.levels || []).map((l) => ({ id: l.locationId, name: `${l.locationName} (${l.quantity} held)` })) : locations)
            .map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </Field>

      {!isScan && locationId && (
        <Field label="Item used" hint="batch selected automatically (earliest expiry first)">
          <input
            className={`${inputCls} mb-2`}
            placeholder="Search what this room holds…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            {itemChoices.map((b) => (
              <button
                key={b.stockBatchId}
                onClick={() => setStockBatchId(String(b.stockBatchId))}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                  Number(stockBatchId) === b.stockBatchId ? "bg-blue-50 font-semibold" : ""
                }`}
              >
                {b.item.name}
                <span className="text-xs text-gray-400"> — {b.available} {b.item.unit}(s) held</span>
              </button>
            ))}
            {itemChoices.length === 0 && (
              <p className="px-3 py-3 text-sm text-gray-500">Nothing recorded as held in this room.</p>
            )}
          </div>
        </Field>
      )}

      {chosen?.item?.isHighAlert && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700 font-semibold mb-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> High-alert medication — double-check.
        </div>
      )}

      <Field label={`Quantity${chosen?.item ? ` (${chosen.item.unit}s)` : ""}`}>
        <input type="number" min="1" className={inputCls} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </Field>

      <div className="flex gap-3 mt-4">
        <Button className="flex-1" disabled={saving} onClick={submit}>Record use</Button>
        <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
      </div>
    </Modal>
  );
};

export default RecordUseModal;
