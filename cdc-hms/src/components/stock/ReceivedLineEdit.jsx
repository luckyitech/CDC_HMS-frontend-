import { useEffect, useState } from "react";
import { Pencil, History, Printer } from "lucide-react";
import Modal from "../shared/Modal";
import Button from "../shared/Button";
import { notify } from "../../utils/notify";
import stockService from "../../services/stockService";
import { useStockContext } from "../../contexts/StockContext";
import { printStockBatchLabel } from "../../utils/print";
import { Field, inputCls, unitPlural } from "./stockUi";

// Correcting a received delivery line (13 Oct 2026, Emu): "anyone with
// permission to edit deliveries can edit … by selecting the item received …
// this will need to show that it was edited and what was edited".
// Used from Movements → Deliveries (every line on an invoice) and from the
// Movements ledger (intake rows — lines received without an invoice number).
// Server: PUT /stock/batches/:id/received (utils/stockLineEdit).

const FIELD_LABELS = { item: "Item", quantity: "Quantity", batchNo: "Batch no.", expiryDate: "Expiry" };
const show = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));
const when = (d) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// What was edited, newest first: who, when, why, and old → new per field.
export const EditHistory = ({ edits = [] }) => (
  <ol className="space-y-2">
    {edits.map((e) => (
      <li key={e.id} className="text-xs border-l-2 border-amber-300 pl-3">
        <p className="text-gray-500">{when(e.at)}{e.by ? ` · ${e.by}` : ""}</p>
        <p className="text-gray-800">
          {e.changes.map((c, i) => (
            <span key={i}>
              {i > 0 && "; "}<b>{FIELD_LABELS[c.field] || c.field}</b> {show(c.from)} → {show(c.to)}
            </span>
          ))}
        </p>
        <p className="text-gray-600 italic">“{e.reason}”</p>
      </li>
    ))}
  </ol>
);

// "Edited" marker that opens the history in place.
export const EditedBadge = ({ edits = [] }) => {
  const [open, setOpen] = useState(false);
  if (!edits.length) return null;
  return (
    // Inside a clickable row (Deliveries): opening the history must not open the editor.
    <div className="mt-1" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 rounded-full px-2 py-0.5">
        <History className="w-3 h-3" /> Edited{edits.length > 1 ? ` ×${edits.length}` : ""}
      </button>
      {open && <div className="mt-2"><EditHistory edits={edits} /></div>}
    </div>
  );
};

// `line`: { batchId, stockItemId, itemName, unit, labelCode, qtyReceived, batchNo, expiryDate }
export const ReceivedLineEditModal = ({ line, onClose, onSaved }) => {
  const { items } = useStockContext();
  const [form, setForm] = useState({
    stockItemId: String(line.stockItemId || ""),
    quantity: String(line.qtyReceived ?? ""),
    batchNo: line.batchNo || "",
    expiryDate: line.expiryDate || "",
    reason: "",
  });
  const [history, setHistory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);   // the corrected line, for the reprint offer
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    stockService.getLineEdits(line.batchId).then((r) => setHistory(r.data || [])).catch(() => setHistory([]));
  }, [line.batchId]);

  const item = items.find((i) => i.id === Number(form.stockItemId));
  const save = async () => {
    if (form.reason.trim().length < 3) return notify("error", "Give a reason for the correction");
    setSaving(true);
    try {
      const res = await stockService.editReceivedLine(line.batchId, {
        stockItemId: Number(form.stockItemId),
        quantity: form.quantity === "" ? undefined : Number(form.quantity),
        batchNo: form.batchNo,
        expiryDate: form.expiryDate,
        reason: form.reason.trim(),
      });
      if (res.success) {
        notify("success", "Delivery line corrected");
        setHistory(res.data.edits);
        const b = res.data.batch;
        const labelChanged = res.data.edits[0]?.changes.some((c) => ["item", "batchNo", "expiryDate"].includes(c.field));
        setSaved(labelChanged && b.qtyReceived > 0 ? b : null);
        setForm((f) => ({ ...f, reason: "" }));
        onSaved?.();
        if (!labelChanged || b.qtyReceived === 0) onClose();
      } else {
        notify("error", res.message || "Correction failed");
      }
    } catch (err) {
      notify("error", err?.message || "Correction failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Correct ${line.labelCode}`} size="lg">
      {saved ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Saved. The shelf label shows the item, batch and expiry — reprint it for this line and replace the old stickers.
          </p>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => {
              printStockBatchLabel({
                labelCode: saved.labelCode, itemName: saved.item?.name, batchNo: saved.batchNo,
                expiryDate: saved.expiryDate, copies: saved.qtyReceived,
              });
            }}>
              <Printer className="w-4 h-4" /> Reprint {saved.qtyReceived} label{saved.qtyReceived === 1 ? "" : "s"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-4">
            Change only what was entered wrong. The original stays on record, and the line will show
            <b> Edited</b> with what changed, who changed it and why. Set the quantity to 0 for a line received in error.
          </p>
          <Field label="Item" hint="can change only while nothing has left this line">
            <select className={inputCls} value={form.stockItemId} onChange={(e) => set("stockItemId", e.target.value)}>
              {items.filter((i) => i.status !== "retired" || i.id === line.stockItemId)
                .map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label={`Quantity${item ? ` (${unitPlural(item.unit)})` : ""}`}>
              <input type="number" min="0" className={inputCls} value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
            </Field>
            <Field label="Batch / lot no.">
              <input className={inputCls} value={form.batchNo} onChange={(e) => set("batchNo", e.target.value)} />
            </Field>
            <Field label="Expiry date">
              <input type="date" className={inputCls} value={form.expiryDate || ""} onChange={(e) => set("expiryDate", e.target.value)} />
            </Field>
          </div>
          <Field label="Reason (required)">
            <input className={inputCls} value={form.reason} onChange={(e) => set("reason", e.target.value)}
              placeholder="e.g. 5 received, not 4 — the 1 was entered as a second line" />
          </Field>
          <div className="flex gap-3">
            <Button className="flex-1" disabled={saving || form.reason.trim().length < 3} onClick={save}>
              <Pencil className="w-4 h-4" /> Save correction
            </Button>
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          </div>
          {history?.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Earlier corrections</p>
              <EditHistory edits={history} />
            </div>
          )}
        </>
      )}
    </Modal>
  );
};
