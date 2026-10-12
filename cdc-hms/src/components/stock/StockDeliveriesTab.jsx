import { useCallback, useEffect, useState } from "react";
import { Search, FileWarning, ArrowLeft } from "lucide-react";
import { useStockContext } from "../../contexts/StockContext";
import stockService from "../../services/stockService";
import Spinner from "../shared/Spinner";
import { inputCls } from "./stockUi";
import ReceiptDocuments from "./ReceiptDocuments";

// Movements → Deliveries (12 Oct 2026, Emu). Every supplier invoice / receipt /
// delivery note the stock came in on: supplier, date, how many lines, and
// whether it has been scanned. Open one to see the items RECORDED as received
// beside the SCANNED document — the audit check that what was entered is what
// was delivered. A missing scan can be added here.

const KIND_LABEL = { invoice: "Invoice", receipt: "Receipt", delivery_note: "Delivery note" };
const fmtDay = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");

const DeliveryDetail = ({ id, onBack, onChanged }) => {
  const [data, setData] = useState(null);
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
      </div>
      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <div className="ui-surface overflow-x-auto">
          <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Recorded as received</p>
          <table className="w-full text-sm mt-2">
            <thead className="ui-thead">
              <tr><th className="text-left px-4 py-2">Item</th><th className="text-right px-3 py-2">Qty</th><th className="text-left px-3 py-2">Batch / expiry</th><th className="text-left px-3 py-2">Into · by</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((it) => (
                <tr key={it.batchId}>
                  <td className="px-4 py-2"><span className="font-medium">{it.itemName}</span><span className="block text-xs font-mono text-gray-400">{it.labelCode}</span></td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{it.qtyReceived} {it.unit ? `${it.unit}s` : ""}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{it.batchNo || "—"}<span className="block">{it.expiryDate ? `exp ${it.expiryDate}` : ""}</span></td>
                  <td className="px-3 py-2 text-xs text-gray-600">{it.location || "—"}<span className="block">{it.receivedByName || ""} · {fmtDay(it.receivedAt)}</span></td>
                </tr>
              ))}
              {data.items.length === 0 && <tr><td colSpan={4} className="px-4 py-4 text-sm text-gray-500">No items received on it yet.</td></tr>}
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
    </div>
  );
};

const StockDeliveriesTab = () => {
  const { suppliers } = useStockContext();
  const [q, setQ] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [missing, setMissing] = useState(false);
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(null);

  const load = useCallback(() => {
    const params = {};
    if (q.trim()) params.q = q.trim();
    if (supplierId) params.supplierId = supplierId;
    if (missing) params.missing = "1";
    stockService.getReceipts(params).then((res) => setRows(res.data || [])).catch(() => setRows([]));
  }, [q, supplierId, missing]);
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
              <tr><th className="text-left px-4 py-2">Number</th><th className="text-left px-3 py-2">Supplier</th><th className="text-left px-3 py-2">Received</th><th className="text-right px-3 py-2">Lines</th><th className="text-left px-3 py-2">Scan</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id} className="ui-hover cursor-pointer" onClick={() => setOpen(r.id)}>
                  <td className="px-4 py-2"><button type="button" className="font-semibold text-primary hover:underline" onClick={(e) => { e.stopPropagation(); setOpen(r.id); }}>{r.number}</button><span className="block text-xs text-gray-400">{KIND_LABEL[r.kind]}</span></td>
                  <td className="px-3 py-2">{r.supplierName || "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDay(r.receivedAt)}<span className="block text-xs text-gray-400">{r.createdByName || ""}</span></td>
                  <td className="px-3 py-2 text-right">{r.itemCount}</td>
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
