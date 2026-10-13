import { useState } from "react";
import { notify } from "../../utils/notify";
import stockService from "../../services/stockService";
import Button from "../shared/Button";
import Modal from "../shared/Modal";
import { Field, inputCls } from "./stockUi";

// Write off an expired batch → disposal register. Moved out of the old
// StockDashboardTab (13 Oct 2026) so the Analytics "Today" view uses the same
// flow. `entry` is a /stock/dashboard expiry entry.
//
// Disposal (Emu, 13 Oct 2026): the clinic's one method is "Thrown away", with
// a comment box; no witness and no certificate. The method and the comment go
// into the movement's reason, which the disposal register shows.
export const DISPOSAL_METHOD = "Thrown away";
export const disposalReason = (comment) =>
  `Expired — ${DISPOSAL_METHOD.toLowerCase()}${comment.trim() ? ` · ${comment.trim()}` : ""}`;
const WriteOffExpiredModal = ({ entry, onClose, onDone }) => {
  const only = entry.locations.length === 1 ? entry.locations[0] : null;
  const [form, setForm] = useState({
    locationId: only ? String(only.id) : "",
    quantity: only ? String(only.quantity) : "",
    comment: "",
  });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.locationId) return notify("error", "Choose the location");
    if (!form.quantity || Number(form.quantity) < 1) return notify("error", "Enter a quantity");
    setBusy(true);
    try {
      const res = await stockService.writeoff({
        stockBatchId: entry.stockBatchId,
        locationId: Number(form.locationId),
        quantity: Number(form.quantity),
        kind: "expiry",
        reason: disposalReason(form.comment),
      });
      if (res.success) {
        notify("success", "Written off — recorded in the disposal register");
        onDone?.();
      } else {
        notify("error", res.message || "Write-off failed");
      }
    } catch (err) {
      notify("error", err?.message || "Write-off failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Write off expired stock">
      <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 text-sm">
        <p className="font-semibold">{entry.item?.name}</p>
        <p className="text-xs text-gray-600 font-mono">
          {entry.labelCode} · expired {entry.expiryDate}
        </p>
      </div>
      <Field label="Location">
        <select className={inputCls} value={form.locationId}
          onChange={(e) => {
            const loc = entry.locations.find((l) => String(l.id) === e.target.value);
            setForm((p) => ({ ...p, locationId: e.target.value, quantity: loc ? String(loc.quantity) : p.quantity }));
          }}>
          <option value="">— choose —</option>
          {entry.locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name} ({l.quantity} held)</option>
          ))}
        </select>
      </Field>
      <Field label="Quantity to write off">
        <input type="number" min="1" className={inputCls} value={form.quantity}
          onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} />
      </Field>
      <Field label="Disposal">
        <p className="text-sm text-gray-800">{DISPOSAL_METHOD}</p>
      </Field>
      <Field label="Comment (optional — goes to the disposal register)">
        <textarea rows={2} className={inputCls} value={form.comment} maxLength={400}
          placeholder="e.g. found on the fridge shelf during the weekly check"
          onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))} />
      </Field>
      <div className="flex gap-3 mt-4">
        <Button variant="danger" className="flex-1" disabled={busy} onClick={submit}>Write off</Button>
        <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
      </div>
    </Modal>
  );
};

export default WriteOffExpiredModal;
