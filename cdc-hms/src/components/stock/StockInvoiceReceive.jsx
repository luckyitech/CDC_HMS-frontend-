import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Upload, Camera, Loader2, CheckCircle2, AlertTriangle, Printer, FileText, ExternalLink, X, Plus } from "lucide-react";
import { notify } from "../../utils/notify";
import { useStockContext } from "../../contexts/StockContext";
import stockService from "../../services/stockService";
import Button from "../shared/Button";
import ConfirmActionModal from "../shared/ConfirmActionModal";
import { Field, inputCls, unitPlural } from "./stockUi";
import StockItemFields, { EMPTY_ITEM } from "./StockItemFields";
import { printStockBatchLabel } from "../../utils/print";

// Receive → From an invoice (13 Oct 2026, Emu). Three steps:
//   1. Upload   — photograph or choose the supplier's invoice / receipt / delivery note.
//   2. Review   — the HMS has read the lines and matched each to the catalogue
//                 (Remembered: this supplier's wording seen before; Suggested:
//                 the closest name; or unmatched). Staff correct anything,
//                 pick or add an item where needed, and tick "Confirmed
//                 correct" on EVERY line. Nothing is saved until then.
//   3. Saved    — all lines went in together (one fails → nothing saved). The
//                 scan is attached and the supplier's wording remembered.
//                 Labels are printed per item, as many as staff choose —
//                 never automatically.
// A line's corrections (item, batch no., expiry, quantity changed before the
// tick) are saved with it, so Deliveries and the Audit show what the reader
// got wrong.

const KIND_LABEL = { invoice: "Invoice", receipt: "Receipt", delivery_note: "Delivery note" };
const MAX_LABELS = 300;
const FIELD_WORDS = { description: "wording", batchNo: "batch no.", expiryDate: "expiry", quantity: "quantity" };
const defaultLabels = (packSize, quantity) => {
  const q = Number(quantity);
  if (!q || q < 1) return "";
  const size = Number(packSize) || 1;
  return String(size > 1 ? Math.ceil(q / size) : q);
};

// One read line as the review table holds it. `original` is what the reader
// said — the corrections are whatever differs at save time.
const toLine = (l) => ({
  id: l.id,
  sourceText: l.description,
  isStock: l.isStockItem,
  status: l.status,                  // remembered | suggested | unmatched | skipped
  stockItemId: l.stockItemId || "",
  candidates: l.candidates || [],
  batchNo: l.batchNo || "",
  expiryDate: l.expiryDate || "",
  quantity: l.quantity ? String(l.quantity) : "",
  packs: l.packs, packSize: l.packSize, unit: l.unit,
  uncertain: l.uncertain || [],
  locationId: "",                    // a per-line override (cold chain)
  confirmed: false,
  original: { stockItemId: l.stockItemId || null, batchNo: l.batchNo || "", expiryDate: l.expiryDate || "", quantity: l.quantity ? String(l.quantity) : "" },
});
const blankLine = (id) => ({
  ...toLine({ id, description: "", isStockItem: true, status: "unmatched", candidates: [], uncertain: [] }),
  added: true,
});

const corrections = (line) => {
  const out = [];
  if (line.added) return out;
  if (String(line.stockItemId) !== String(line.original.stockItemId || "")) out.push("item");
  if (line.batchNo.trim() !== line.original.batchNo) out.push("batchNo");
  if (line.expiryDate !== line.original.expiryDate) out.push("expiryDate");
  if (String(Number(line.quantity) || "") !== String(Number(line.original.quantity) || "")) out.push("quantity");
  return out;
};

// ---------------------------------------------------------------------
// Pick an item from the catalogue (inline search).
// ---------------------------------------------------------------------
const ItemPicker = ({ items, onPick, onCancel, autoFocus = true }) => {
  const [q, setQ] = useState("");
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return items.filter((i) => i.name.toLowerCase().includes(s) || (i.gtin && i.gtin === q.trim())).slice(0, 8);
  }, [items, q]);
  return (
    <div className="relative">
      <input autoFocus={autoFocus} className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the catalogue by name, or scan the box…"
        onKeyDown={(e) => { if (e.key === "Escape") onCancel?.(); }} />
      {matches.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {matches.map((i) => (
            <button key={i.id} type="button" className="w-full text-left px-3 py-2 text-sm ui-hover" onClick={() => onPick(i)}>
              {i.name} <span className="text-xs text-gray-400">({i.category})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------
// "Add as a new item" — the Items form, pre-filled from the invoice line.
// ---------------------------------------------------------------------
const guessName = (text) => String(text || "").toLowerCase().replace(/\b\d+'?s\b/g, "").replace(/\s+/g, " ").trim()
  .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
const NewItemPanel = ({ line, onAdded, onCancel }) => {
  const { fetchItems } = useStockContext();
  const [form, setForm] = useState({
    ...EMPTY_ITEM,
    name: guessName(line.sourceText),
    unit: line.unit && line.unit.length <= 20 ? line.unit.toLowerCase() : EMPTY_ITEM.unit,
    packSize: line.packSize || 1,
  });
  const [saving, setSaving] = useState(false);
  const set = (f, v) => setForm((p) => ({ ...p, [f]: v }));
  const save = async () => {
    if (!form.name.trim()) return notify("error", "Give the item a name");
    setSaving(true);
    try {
      const res = await stockService.createItemWhileReceiving({ ...form, packSize: Number(form.packSize) || 1, reorderLevel: Number(form.reorderLevel) || 0, reorderQuantity: form.reorderQuantity === "" ? null : Number(form.reorderQuantity) });
      if (res.success) { await fetchItems(); onAdded(res.data); } else notify("error", res.message || "Could not add the item");
    } catch (err) { notify("error", err?.message || "Could not add the item"); } finally { setSaving(false); }
  };
  return (
    <div className="bg-white border border-blue-200 rounded-lg p-4 mt-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
        <p className="font-semibold text-sm">New item — filled in from the invoice, check and complete</p>
        <p className="text-xs text-gray-500">Saved to Items and remembered for this supplier's "{line.sourceText}".</p>
      </div>
      <StockItemFields form={form} set={set} isNew={false} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" className="!px-4 !py-2 text-sm" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button className="!px-4 !py-2 text-sm" onClick={save} disabled={saving}>{saving ? "Adding…" : "Add item & use on this line"}</Button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// The review table's item cell: the match, its badge, change / pick / add.
// ---------------------------------------------------------------------
const MATCH_BADGE = {
  remembered: ["Remembered", "bg-green-100 text-green-800"],
  suggested: ["Suggested", "bg-blue-100 text-blue-800"],
};
const ItemCell = ({ line, items, byId, onChange }) => {
  const [mode, setMode] = useState(null);   // null | 'pick' | 'new'
  const item = byId.get(Number(line.stockItemId));
  const choose = (i) => { onChange({ stockItemId: String(i.id), status: line.status === "remembered" && i.id === line.original.stockItemId ? "remembered" : "picked" }); setMode(null); };
  const badge = MATCH_BADGE[line.status];
  return (
    <div>
      {line.sourceText && !line.added && <div className="text-[11px] text-gray-500 font-mono">{line.sourceText}</div>}
      {line.added && (
        <input className={`${inputCls} mb-1`} value={line.sourceText} onChange={(e) => onChange({ sourceText: e.target.value })} placeholder="As written on the invoice (optional)" />
      )}
      {item && mode !== "pick" ? (
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          <span className="font-semibold">{item.name}</span>
          {badge && <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge[1]}`}>{badge[0]}</span>}
          {item.requiresColdChain && <span className="text-[11px] text-blue-800">❄ Fridge</span>}
          <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setMode("pick")}>change</button>
        </div>
      ) : (
        <div className="mt-1">
          <ItemPicker items={items} onPick={choose} onCancel={() => setMode(null)} autoFocus={mode === "pick"} />
          {!item && (
            <div className="text-[11px] text-amber-800 mt-1">
              No confident match — search the catalogue, or if the HMS doesn't have it under any name:
              <button type="button" className="block mt-1 text-xs font-semibold text-primary border border-primary rounded-md px-2 py-1" onClick={() => setMode("new")}>+ Add as a new item</button>
            </div>
          )}
          {item && <button type="button" className="text-xs text-gray-500 hover:underline mt-1" onClick={() => setMode(null)}>keep {item.name}</button>}
        </div>
      )}
      {line.status === "suggested" && item && line.candidates.length > 1 && mode === null && (
        <div className="text-[11px] text-gray-600 mt-1">
          Also close:{" "}
          {line.candidates.filter((c) => c.stockItemId !== item.id).slice(0, 2).map((c, i) => (
            <span key={c.stockItemId}>{i > 0 && " · "}<button type="button" className="text-primary hover:underline" onClick={() => choose(byId.get(c.stockItemId) || c)}>{c.name}</button></span>
          ))}
        </div>
      )}
      {mode === "new" && <NewItemPanel line={line} onAdded={(i) => choose(i)} onCancel={() => setMode(null)} />}
    </div>
  );
};

// ---------------------------------------------------------------------
// The component
// ---------------------------------------------------------------------
const StockInvoiceReceive = ({ onSaved, aside = null }) => {
  const { items, locations, suppliers } = useStockContext();
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const fridges = useMemo(() => locations.filter((l) => l.isColdChain), [locations]);

  const [stage, setStage] = useState("upload");          // upload | reading | review | saved
  const [ready, setReady] = useState(null);               // reader configured?
  const [header, setHeader] = useState({ supplierId: "", locationId: "", receiptKind: "invoice", receiptNo: "" });
  const [file, setFile] = useState(null);
  const [read, setRead] = useState(null);                 // the reply of /read
  const [lines, setLines] = useState([]);
  const [scanUrl, setScanUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);               // { receipt, items: [...with labels/printed] }
  const [confirmLeave, setConfirmLeave] = useState(false);
  const cameraRef = useRef(null); const fileRef = useRef(null);

  useEffect(() => {
    stockService.getInvoiceReaderStatus().then((r) => setReady(Boolean(r?.data?.configured))).catch(() => setReady(false));
  }, []);
  useEffect(() => () => { if (scanUrl) URL.revokeObjectURL(scanUrl); }, [scanUrl]);

  const setH = (f, v) => setHeader((p) => ({ ...p, [f]: v }));

  // ---- 1. Upload → read ----
  const startRead = async (chosen) => {
    if (!chosen) return;
    if (!header.locationId) { notify("error", "Choose the receiving location first"); return; }
    setFile(chosen);
    setStage("reading");
    try {
      const res = await stockService.readInvoice(chosen, header.supplierId || undefined);
      if (!res.success) { notify("error", res.message || "Could not read the invoice"); setStage("upload"); return; }
      const d = res.data;
      setRead(d);
      setLines(d.lines.map((l) => withFridge(toLine(l))));
      setHeader((p) => ({ ...p, supplierId: d.supplier.id ? String(d.supplier.id) : p.supplierId, receiptKind: d.documentKind || "invoice", receiptNo: d.documentNumber || "" }));
      stockService.pendingInvoiceFile(d.uploadToken).then((blob) => setScanUrl(URL.createObjectURL(blob))).catch(() => {});
      setStage("review");
    } catch (err) {
      notify("error", err?.message || "Could not read the invoice");
      setStage("upload");
    }
  };

  const reset = () => {
    setRead(null); setLines([]); setFile(null); setSaved(null);
    if (scanUrl) { URL.revokeObjectURL(scanUrl); setScanUrl(null); }
    setHeader((p) => ({ ...p, supplierId: "", receiptKind: "invoice", receiptNo: "" }));
    setStage("upload");
  };
  const cancelReview = async () => {
    if (read?.uploadToken) stockService.discardInvoiceRead(read.uploadToken).catch(() => {});
    reset();
  };

  // ---- 2. Review ----
  // A cold-chain item goes to the first fridge unless the line already names one.
  const withFridge = useCallback((l) => {
    const item = byId.get(Number(l.stockItemId));
    if (!item?.requiresColdChain || l.locationId || !fridges.length) return l;
    return { ...l, locationId: String(fridges[0].id) };
  }, [byId, fridges]);
  const update = (id, patch) => setLines((ls) => ls.map((l) => (l.id === id ? withFridge({ ...l, ...patch, confirmed: "confirmed" in patch ? patch.confirmed : false }) : l)));
  const remove = (id) => setLines((ls) => ls.filter((l) => l.id !== id));
  const addLine = () => setLines((ls) => [...ls, blankLine(Math.max(0, ...ls.map((l) => l.id)) + 1)]);

  // What stops a line being ticked — the first reason, in plain words.
  const problem = (line) => {
    const item = byId.get(Number(line.stockItemId));
    if (!item) return "choose the item first";
    if (!(Number(line.quantity) >= 1)) return "enter the quantity first";
    if (item.category === "medication" && !line.expiryDate) return "enter the expiry first";
    if (item.requiresColdChain) {
      const loc = locations.find((l) => l.id === Number(line.locationId || header.locationId));
      if (!loc?.isColdChain) return fridges.length ? "choose a fridge first" : "no fridge location exists";
    }
    return null;
  };
  const stockLines = lines.filter((l) => l.isStock);
  const problems = stockLines.filter((l) => problem(l)).length;
  const confirmed = stockLines.filter((l) => l.confirmed).length;
  const units = stockLines.reduce((n, l) => n + (Number(l.quantity) || 0), 0);
  const canSave = stockLines.length > 0 && problems === 0 && confirmed === stockLines.length && !saving;
  const toFix = (() => {
    const counts = {};
    stockLines.forEach((l) => { const p = problem(l); if (p) counts[p] = (counts[p] || 0) + 1; });
    return Object.entries(counts).map(([p, n]) => `${n} line${n === 1 ? "" : "s"}: ${p.replace(" first", "")}`).join(" · ");
  })();

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await stockService.receiveInvoice({
        uploadToken: read?.uploadToken, fileName: file?.name,
        supplierId: header.supplierId ? Number(header.supplierId) : null,
        receiptNo: header.receiptNo.trim() || undefined, receiptKind: header.receiptKind,
        locationId: Number(header.locationId),
        lines: stockLines.map((l) => ({
          stockItemId: Number(l.stockItemId), quantity: Number(l.quantity),
          batchNo: l.batchNo.trim() || undefined, expiryDate: l.expiryDate || undefined,
          locationId: l.locationId ? Number(l.locationId) : undefined,
          sourceText: l.sourceText.trim() || undefined, corrections: corrections(l),
        })),
      });
      if (!res.success) { notify("error", res.message || "Could not save the delivery"); return; }
      setSaved({
        ...res.data,
        items: res.data.items.map((it) => ({ ...it, labels: defaultLabels(it.packSize, it.quantity), printed: 0 })),
      });
      setStage("saved");
      onSaved?.();
    } catch (err) {
      notify("error", err?.message || "Could not save the delivery");
    } finally { setSaving(false); }
  };

  // ---- 3. Saved → print per item ----
  const printItem = (batchId) => {
    const it = saved.items.find((i) => i.batchId === batchId);
    const copies = Math.floor(Number(it.labels));
    if (!(copies >= 1) || copies > MAX_LABELS) return notify("error", `Labels must be 1–${MAX_LABELS}`);
    printStockBatchLabel({ labelCode: it.labelCode, itemName: it.itemName, batchNo: it.batchNo, expiryDate: it.expiryDate, copies });
    setSaved((s) => ({ ...s, items: s.items.map((i) => (i.batchId === batchId ? { ...i, printed: i.printed + copies } : i)) }));
  };
  const unprinted = saved ? saved.items.filter((i) => !i.printed).length : 0;
  const leaveSaved = () => { if (unprinted) setConfirmLeave(true); else reset(); };

  // =====================================================================
  if (stage === "upload" || stage === "reading") {
    return (
      <div className="grid lg:grid-cols-2 gap-6 items-start">
      <div className="ui-surface p-5 space-y-4">
        <h4 className="font-bold text-gray-800">Receive a delivery from its invoice</h4>
        <p className="text-sm text-gray-600">Photograph or scan the supplier's invoice, receipt or delivery note. The HMS reads the items, batches, expiry dates and quantities and fills them in for you to check. Nothing is saved until you confirm every line.</p>
        {ready === false && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <strong>Not set up.</strong> Reading invoices needs the server's invoice-reader key (ANTHROPIC_API_KEY). Ask the administrator — meanwhile use "One item at a time".
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Receiving location">
            <select className={inputCls} value={header.locationId} onChange={(e) => setH("locationId", e.target.value)}>
              <option value="">— choose —</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
          <Field label="Supplier" hint="optional — read from the invoice if left blank">
            <select className={inputCls} value={header.supplierId} onChange={(e) => setH("supplierId", e.target.value)}>
              <option value="">— read it for me —</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        </div>
        {stage === "reading" ? (
          <div className="rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/40 p-10 flex flex-col items-center gap-3 text-center" role="status">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="font-semibold">Reading {file?.name}…</p>
            <p className="text-xs text-gray-500">Usually 10–20 seconds. The scan is kept and attached to the invoice when you save.</p>
          </div>
        ) : (
          <div
            className="rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/40 p-8 flex flex-col items-center gap-3 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); startRead(e.dataTransfer.files?.[0]); }}
          >
            <Upload className="w-10 h-10 text-primary" />
            <p className="font-semibold">Drop the invoice here</p>
            <p className="text-xs text-gray-500">Photo (JPG, PNG) or PDF · up to 15 MB · one delivery at a time</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button className="!px-5 !py-2.5 text-sm" disabled={ready === false} onClick={() => cameraRef.current?.click()}><Camera className="w-4 h-4" /> Take a photo</Button>
              <Button variant="outline" className="!px-5 !py-2.5 text-sm" disabled={ready === false} onClick={() => fileRef.current?.click()}><FileText className="w-4 h-4" /> Choose a file</Button>
            </div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { startRead(e.target.files?.[0]); e.target.value = ""; }} />
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(e) => { startRead(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
        )}
      </div>
      {aside}
      </div>
    );
  }

  // =====================================================================
  if (stage === "saved" && saved) {
    const r = saved.receipt;
    const supplierName = suppliers.find((s) => s.id === Number(header.supplierId))?.name;
    return (
      <div className="rounded-lg border-2 border-green-300 bg-green-50 p-5 space-y-4" role="status">
        <p className="flex items-center gap-2 text-lg font-bold text-green-800">
          <CheckCircle2 className="w-6 h-6" /> Saved — {r ? `${r.number} ` : ""}{supplierName ? `from ${supplierName} · ` : ""}{saved.items.length} item{saved.items.length === 1 ? "" : "s"} · {saved.items.reduce((n, i) => n + i.quantity, 0)} units
        </p>
        <p className="text-sm text-green-800">
          {saved.scanAttached ? "Scan attached to the invoice" : r ? "No scan attached" : "No invoice number, so no document was recorded"}
          {" · supplier wording remembered for next time. Now print the shelf labels — one item at a time, as many as you need."}
        </p>
        <div className="bg-white border border-green-200 rounded-lg divide-y divide-green-50 text-sm overflow-x-auto">
          {saved.items.map((it) => (
            <div key={it.batchId} className={`flex flex-wrap items-center gap-3 px-4 py-2 ${!it.printed ? "bg-blue-50/60" : ""}`}>
              <span className="font-mono text-gray-600 w-24 shrink-0">{it.labelCode}</span>
              <span className="flex-1 min-w-[14rem]">
                {it.itemName} · {it.quantity} {it.quantity === 1 ? it.unit : unitPlural(it.unit)}
                {it.batchNo && ` · batch ${it.batchNo}`}{it.expiryDate && ` · exp ${it.expiryDate}`}{it.location && ` · ${it.location}`}
              </span>
              {it.printed
                ? <span className="inline-flex items-center gap-1 text-green-700 font-semibold"><CheckCircle2 className="w-4 h-4" /> {it.printed} printed</span>
                : <span className="text-amber-700 font-semibold">Not printed</span>}
              <label className="flex items-center gap-1.5 text-gray-600">Labels
                <input type="number" min="1" max={MAX_LABELS} className={`${inputCls} !w-20`} value={it.labels}
                  onChange={(e) => setSaved((s) => ({ ...s, items: s.items.map((i) => (i.batchId === it.batchId ? { ...i, labels: e.target.value } : i)) }))} />
              </label>
              <Button variant={it.printed ? "outline" : "primary"} className="!px-4 !py-2 text-sm" onClick={() => printItem(it.batchId)}>
                <Printer className="w-4 h-4" /> {it.printed ? "Print again" : `Print ${Number(it.labels) || ""}`}
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-green-800">The number starts at one per pack (one per unit for unpacked items) — change it before pressing Print. Labels can also be printed later from "Received today" or Movements → Deliveries.</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button className="!px-5 !py-2.5 text-sm" onClick={leaveSaved}>Receive another invoice</Button>
          {unprinted > 0 && <span className="text-sm text-amber-700">{unprinted} item{unprinted === 1 ? " has" : "s have"} no labels yet</span>}
        </div>
        <ConfirmActionModal
          isOpen={confirmLeave}
          onClose={() => setConfirmLeave(false)}
          onConfirm={() => { setConfirmLeave(false); reset(); }}
          title="Leave without printing?"
          message={`${unprinted} item${unprinted === 1 ? " has" : "s have"} no labels yet. You can still print them later from Received today or Movements → Deliveries.`}
          confirmLabel="Leave without printing"
        />
      </div>
    );
  }

  // =====================================================================
  // Review
  const existing = read?.existing;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h4 className="font-bold text-gray-800">Check the delivery</h4>
        <span className="text-sm text-gray-600">Read from the invoice — correct anything that's wrong, tick every line, then save.</span>
        <button type="button" className="ml-auto text-sm font-semibold text-primary hover:underline" onClick={cancelReview}>Cancel — nothing saved</button>
      </div>

      <div className="grid lg:grid-cols-[18rem_1fr] gap-5 items-start">
        <div className="space-y-2">
          <div className="ui-surface p-3">
            {scanUrl ? (
              file?.type === "application/pdf"
                ? <iframe title="Invoice scan" src={scanUrl} className="w-full h-96 rounded-lg border border-gray-200" />
                : <img src={scanUrl} alt="Invoice scan" className="w-full rounded-lg border border-gray-200" />
            ) : <div className="h-64 grid place-items-center text-xs text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /></div>}
            {scanUrl && <a href={scanUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline mt-2"><ExternalLink className="w-3.5 h-3.5" /> Open full size</a>}
          </div>
          <p className="text-xs text-gray-500">The scan is attached to the invoice on save{header.receiptNo.trim() ? "" : " — enter the invoice number for that"}.</p>
          {read?.notes && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2"><strong>Reader's note:</strong> {read.notes}</p>}
        </div>

        <div className="space-y-4 min-w-0">
          <div className="ui-surface p-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Supplier" hint={read?.supplier?.readAs && !header.supplierId ? `Read as "${read.supplier.readAs}" — not in your suppliers` : read?.supplier?.readAs && read.supplier.matched ? `Matched "${read.supplier.readAs}"` : undefined}>
              <select className={inputCls} value={header.supplierId} onChange={(e) => setH("supplierId", e.target.value)}>
                <option value="">— none —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Document">
              <select className={inputCls} value={header.receiptKind} onChange={(e) => setH("receiptKind", e.target.value)}>
                {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
            <Field label={`${KIND_LABEL[header.receiptKind]} number`} hint={!header.receiptNo.trim() ? "none read — type it so the scan is kept" : undefined}>
              <input className={inputCls} value={header.receiptNo} onChange={(e) => setH("receiptNo", e.target.value)} />
            </Field>
            <Field label="Receiving location">
              <select className={inputCls} value={header.locationId} onChange={(e) => setH("locationId", e.target.value)}>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
          </div>

          {existing && (
            <div className="flex gap-2 items-start rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span><strong>Already received?</strong> {header.receiptNo} from this supplier is on file: {existing.itemCount} item{existing.itemCount === 1 ? "" : "s"} received on {new Date(existing.receivedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}{existing.receivedByName ? ` by ${existing.receivedByName}` : ""}. Check it is not the same delivery before saving.</span>
            </div>
          )}

          <div className="ui-surface overflow-x-auto">
            <table className="w-full text-sm min-w-[56rem]">
              <thead className="ui-thead">
                <tr>
                  <th className="text-left px-3 py-2 w-28">Confirmed correct</th>
                  <th className="text-left px-3 py-2">On the invoice → item</th>
                  <th className="text-left px-3 py-2 w-32">Batch / lot</th>
                  <th className="text-left px-3 py-2 w-40">Expiry</th>
                  <th className="text-left px-3 py-2 w-36">Quantity</th>
                  <th className="px-2 py-2 w-8"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((l) => {
                  if (!l.isStock) {
                    return (
                      <tr key={l.id} className="text-gray-400">
                        <td className="px-3 py-2 text-xs">Left out</td>
                        <td className="px-3 py-2" colSpan={4}><span className="text-[11px] font-mono">{l.sourceText}</span><span className="block text-xs">Not a stock item — left out · <button type="button" className="text-primary font-semibold hover:underline" onClick={() => update(l.id, { isStock: true })}>add it back</button></span></td>
                        <td className="px-2 py-2"><button type="button" aria-label="Remove line" className="text-gray-400 hover:text-gray-600" onClick={() => remove(l.id)}><X className="w-4 h-4" /></button></td>
                      </tr>
                    );
                  }
                  const p = problem(l);
                  const item = byId.get(Number(l.stockItemId));
                  const unsure = (f) => l.uncertain.includes(f);
                  const lineLoc = locations.find((x) => x.id === Number(l.locationId));
                  return (
                    <tr key={l.id} className={`align-top ${l.confirmed ? "bg-green-50/60" : p ? "bg-amber-50/60" : ""}`}>
                      <td className="px-3 py-2">
                        <label className={`flex items-center gap-2 text-xs font-semibold ${p ? "text-gray-400" : l.confirmed ? "text-green-800" : "text-gray-700"}`}>
                          <input type="checkbox" className="w-5 h-5 accent-green-600" checked={l.confirmed} disabled={Boolean(p)} onChange={(e) => update(l.id, { confirmed: e.target.checked })} />
                          Correct
                        </label>
                        {p && <div className="text-[11px] text-gray-400 mt-1">{p}</div>}
                      </td>
                      <td className="px-3 py-2 min-w-[18rem]">
                        <ItemCell line={l} items={items} byId={byId} onChange={(patch) => update(l.id, patch)} />
                        {item?.requiresColdChain && (
                          <div className="text-[11px] text-blue-800 mt-1 flex items-center gap-1">→
                            <select className="border border-blue-200 rounded px-1 py-0.5 text-[11px] bg-white" value={l.locationId} onChange={(e) => update(l.id, { locationId: e.target.value })}>
                              <option value="">choose a fridge…</option>
                              {fridges.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                            {lineLoc && <span className="sr-only">{lineLoc.name}</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input className={`${inputCls} ${unsure("batchNo") ? "!border-amber-500" : ""}`} value={l.batchNo} onChange={(e) => update(l.id, { batchNo: e.target.value })} />
                        {unsure("batchNo") && <div className="text-[11px] text-amber-800 mt-1">Unclear on the scan — check</div>}
                      </td>
                      <td className="px-3 py-2">
                        <input type="date" className={`${inputCls} ${unsure("expiryDate") ? "!border-amber-500" : item?.category === "medication" && !l.expiryDate ? "!border-red-500" : ""}`} value={l.expiryDate} onChange={(e) => update(l.id, { expiryDate: e.target.value })} />
                        {unsure("expiryDate") && <div className="text-[11px] text-amber-800 mt-1">Unclear on the scan — check</div>}
                        {!unsure("expiryDate") && item?.category === "medication" && !l.expiryDate && <div className="text-[11px] text-red-700 mt-1">Not on the invoice — required for medications</div>}
                      </td>
                      <td className="px-3 py-2">
                        {l.packs && l.packSize ? <div className="text-xs text-gray-500">{l.packs} packs × {l.packSize}</div> : null}
                        <div className="flex items-center gap-1">
                          <input type="number" min="1" className={`${inputCls} !w-24 ${unsure("quantity") ? "!border-amber-500" : ""}`} value={l.quantity} onChange={(e) => update(l.id, { quantity: e.target.value })} />
                          <span className="text-xs text-gray-500">{item ? (Number(l.quantity) === 1 ? item.unit : unitPlural(item.unit)) : (l.unit || "")}</span>
                        </div>
                        {unsure("quantity") && <div className="text-[11px] text-amber-800 mt-1">Unclear on the scan — check</div>}
                      </td>
                      <td className="px-2 py-2"><button type="button" aria-label="Remove line" className="text-gray-400 hover:text-gray-600" onClick={() => remove(l.id)}><X className="w-4 h-4" /></button></td>
                    </tr>
                  );
                })}
                {lines.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-sm text-gray-500">Nothing was read from this file. Add the lines by hand below, or cancel and try a clearer photo.</td></tr>}
              </tbody>
            </table>
            <div className="px-3 py-2 border-t border-gray-100">
              <button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline" onClick={addLine}><Plus className="w-4 h-4" /> Add a line the reader missed</button>
            </div>
          </div>

          <div className="ui-surface p-4 flex flex-wrap items-center gap-4">
            <div className="text-sm">
              <strong>{stockLines.length} line{stockLines.length === 1 ? "" : "s"} · {units} units</strong> <span className="text-gray-500">· labels are printed after saving, item by item</span>
              <div className={`text-xs mt-0.5 ${problems ? "text-amber-700" : confirmed < stockLines.length ? "text-gray-600" : "text-green-700"}`}>
                {confirmed} of {stockLines.length} confirmed correct{problems ? ` · ${problems} to fix first: ${toFix}` : ""}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Save opens once every line is ticked. Changing anything on a ticked line clears its tick.</div>
            </div>
            <Button className="ml-auto !px-5 !py-2.5" disabled={!canSave} onClick={save}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : `Save all ${stockLines.length} line${stockLines.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockInvoiceReceive;
