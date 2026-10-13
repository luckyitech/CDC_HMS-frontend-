import { useCallback, useEffect, useState } from "react";
import { Search, FileWarning, ArrowLeft, Pencil } from "lucide-react";
import { useStockContext } from "../../contexts/StockContext";
import stockService from "../../services/stockService";
import Spinner from "../shared/Spinner";
import { inputCls, unitPlural, useStockCan, ReceiveMethodBadge } from "./stockUi";
import SelectMenu from "../shared/SelectMenu";
import { PERMISSIONS } from "../../utils/permissions";
import { ReceivedLineEditModal, EditedBadge } from "./ReceivedLineEdit";
import ReceiptDocuments from "./ReceiptDocuments";

// Movements → Deliveries (12 Oct 2026, Emu). Every supplier invoice / receipt /
// delivery note the stock came in on: supplier, date, how many lines, and
// whether it has been scanned. Open one to see the items RECORDED as received
// beside the SCANNED document — the audit check that what was entered is what
// was delivered. A missing scan can be added here.
//
// 13 Oct 2026 (Emu): a holder of "Can edit deliveries" selects a received line
// to correct it (item, quantity, batch no., expiry — reason required). An
// edited line shows "Edited", which opens what changed, who and why.
//
// 13 Oct 2026 (Emu, evening): every delivery and line says how it was entered
// — read From invoice or entered Manually (filter "How received"). An invoice
// line also shows what staff corrected before confirming it.

const KIND_LABEL = { invoice: "Invoice", receipt: "Receipt", delivery_note: "Delivery note" };
const CORRECTION_WORDS = { item: "item", batchNo: "batch no.", expiryDate: "expiry", quantity: "quantity" };
const METHOD_OPTIONS = [{ value: "", label: "How received: all" }, { value: "invoice", label: "From invoice" }, { value: "manual", label: "Manual" }];
const fmtDay = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");

const DeliveryDetail = ({ id, onBack, onChanged }) => {
  const canEdit = useStockCan()(PERMISSIONS.STOCK_DELIVERIES_EDIT);
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(null);   // the line being corrected
  const load = useCallback(() => {
    stockService.getReceipt(id).then((res) => setData(res.data)).catch(() => setData(false));
  }, [id]);
  useEffect(() => { load(); }, [load]);
  if (data === null) return <Spinner />;
  if (data === false) return <p className="text-sm text-gray-500">Could not load this delivery.</p>;
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="w-4 h-4" /> All deliveries
      </button>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-lg font-bold text-gray-800">{KIND_LABEL[data.kind] || "Document"} {data.number}</h3>
        <span className="text-sm text-gray-500">{data.supplierName || "No supplier"} · {fmtDay(data.receivedAt)} · {data.itemCount} line{data.itemCount === 1 ? "" : "s"}, {data.unitCount} unit{data.unitCount === 1 ? "" : "s"}</span>
        <ReceiveMethodBadge method={data.method} />
      </div>
      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <div className="ui-surface overflow-x-auto">
          <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Recorded as received</p>
          <table className="w-full text-sm mt-2">
            <thead className="ui-thead">
              <tr><th className="text-left px-4 py-2">Item</th><th className="text-right px-3 py-2">Qty</th><th className="text-left px-3 py-2">Batch / expiry</th><th className="text-left px-3 py-2">Into · by</th>{canEdit && <th className="px-3 py-2" />}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((it) => (
                <tr key={it.batchId} className={`align-top ${canEdit ? "ui-hover cursor-pointer" : ""}`} onClick={canEdit ? () => setEditing(it) : undefined}>
                  <td className="px-4 py-2">
                    <span className="font-medium">{it.itemName}</span>
                    <span className="block text-xs font-mono text-gray-400">{it.labelCode}</span>
                    {data.method === "mixed" && <ReceiveMethodBadge method={it.receiveMethod} />}
                    {it.receiveMethod === "invoice" && (
                      <span className="block text-xs text-gray-500">
                        {it.sourceText && <>read as <span className="font-mono">{it.sourceText}</span></>}
                        {it.sourceCorrections?.length > 0 && <span className="text-amber-700">{it.sourceText ? " · " : ""}{it.sourceCorrections.map((f) => CORRECTION_WORDS[f] || f).join(", ")} corrected</span>}
                      </span>
                    )}
                    <EditedBadge edits={it.edits} />
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{it.qtyReceived} {it.unit ? (it.qtyReceived === 1 ? it.unit : unitPlural(it.unit)) : ""}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{it.batchNo || "—"}<span className="block">{it.expiryDate ? `exp ${it.expiryDate}` : ""}</span></td>
                  <td className="px-3 py-2 text-xs text-gray-600">{it.location || "—"}<span className="block">{it.receivedByName || ""} · {fmtDay(it.receivedAt)}</span></td>
                  {canEdit && (
                    <td className="px-3 py-2 text-right">
                      <button type="button" title="Correct this line" className="text-primary hover:text-blue-800"
                        onClick={(e) => { e.stopPropagation(); setEditing(it); }}>
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {data.items.length === 0 && <tr><td colSpan={canEdit ? 5 : 4} className="px-4 py-4 text-sm text-gray-500">No items received on it yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="ui-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Scanned document</p>
          <ReceiptDocuments
            receiptId={data.id}
            documents={data.documents}
            preview
            onChange={(documents) => { setData((d) => ({ ...d, documents, documentCount: documents.length })); onChanged?.(); }}
          />
        </div>
      </div>
      {canEdit && <p className="text-xs text-gray-500">Select a line to correct it.</p>}
      {editing && (
        <ReceivedLineEditModal line={editing} onClose={() => setEditing(null)} onSaved={() => { load(); onChanged?.(); }} />
      )}
    </div>
  );
};

const StockDeliveriesTab = () => {
  const { suppliers } = useStockContext();
  const [q, setQ] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [missing, setMissing] = useState(false);
  const [method, setMethod] = useState("");
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(null);

  const load = useCallback(() => {
    const params = {};
    if (q.trim()) params.q = q.trim();
    if (supplierId) params.supplierId = supplierId;
    if (missing) params.missing = "1";
    if (method) params.method = method;
    stockService.getReceipts(params).then((res) => setRows(res.data || [])).catch(() => setRows([]));
  }, [q, supplierId, missing, method]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  if (open) return <DeliveryDetail id={open} onBack={() => setOpen(null)} onChanged={load} />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[12rem] relative">
          <span className="sr-only">Search by number</span>
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input className={`${inputCls} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Invoice / receipt number…" />
        </label>
        <select aria-label="Supplier" className={`${inputCls} w-auto`} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
          <option value="">All suppliers</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <SelectMenu value={method} onChange={(e) => setMethod(e.target.value)} options={METHOD_OPTIONS} aria-label="How received" />
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={missing} onChange={(e) => setMissing(e.target.checked)} className="w-4 h-4" />
          Not scanned yet
        </label>
      </div>
      {rows === null ? <Spinner /> : rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">No deliveries match.</p>
      ) : (
        <div className="ui-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="ui-thead">
              <tr><th className="text-left px-4 py-2">Number</th><th className="text-left px-3 py-2">Supplier</th><th className="text-left px-3 py-2">Received</th><th className="text-right px-3 py-2">Lines</th><th className="text-left px-3 py-2">How</th><th className="text-left px-3 py-2">Scan</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id} className="ui-hover cursor-pointer" onClick={() => setOpen(r.id)}>
                  <td className="px-4 py-2"><button type="button" className="font-semibold text-primary hover:underline" onClick={(e) => { e.stopPropagation(); setOpen(r.id); }}>{r.number}</button><span className="block text-xs text-gray-400">{KIND_LABEL[r.kind]}</span></td>
                  <td className="px-3 py-2">{r.supplierName || "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDay(r.receivedAt)}<span className="block text-xs text-gray-400">{r.createdByName || ""}</span></td>
                  <td className="px-3 py-2 text-right">{r.itemCount}</td>
                  <td className="px-3 py-2"><ReceiveMethodBadge method={r.method} /></td>
                  <td className="px-3 py-2">
                    {r.documentCount > 0
                      ? <span className="text-xs font-semibold text-green-700">{r.documentCount} page{r.documentCount === 1 ? "" : "s"}</span>
                      : <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700"><FileWarning className="w-3.5 h-3.5" /> Not scanned</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StockDeliveriesTab;
