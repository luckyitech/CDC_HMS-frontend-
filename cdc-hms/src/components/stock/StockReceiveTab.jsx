import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { notify } from "../../utils/notify";
import { PackagePlus, Printer, CheckCircle2, Loader2 } from "lucide-react";
import { useStockContext } from "../../contexts/StockContext";
import stockService from "../../services/stockService";
import Button from "../shared/Button";
import { Field, inputCls } from "./stockUi";
import { printStockBatchLabel } from "../../utils/print";
import ReceiptDocuments from "./ReceiptDocuments";
import StockHelp from "./StockHelp";
import SwitcherTabs from "../shared/SwitcherTabs";
import StockInvoiceReceive from "./StockInvoiceReceive";

// Receive Stock (intake): choose/scan item → batch no, expiry, quantity,
// supplier → receiving location → save → print the STK- shelf label.
// Scanning a retail box's GTIN in the item search selects the matching item.
//
// 12 Oct 2026 (Emu): a line may name the supplier's INVOICE / RECEIPT number
// (optional); lines received on one document share it, and the document is
// scanned once (now, or later from Movements → Deliveries — until then it is
// flagged "No scan yet"). The delivery block stays filled between lines;
// "New delivery" clears it.
//
// 13 Oct 2026 (Emu): one press saves, prints and resets.
//   - Labels: one per unit; for an item that comes in packs/boxes (pack size
//     > 1) one per pack. Pre-filled, staff can change it. All copies go in ONE
//     print job.
//   - After a save a "Saved" card confirms what went in and asks: next item on
//     the SAME delivery (supplier + document kept) or a NEW delivery.
//   - "Received today" is read back from the server (intake movements), so a
//     saved line is visible after a reload and from any computer.
//
// 13 Oct 2026 (Emu, evening): two modes — "From an invoice" (photograph the
// invoice, the HMS reads and matches the lines, staff confirm each, save all,
// then print labels per item: StockInvoiceReceive) and "One item at a time"
// (this form, unchanged).

const EMPTY = {
  stockItemId: "", batchNo: "", expiryDate: "", supplierId: "",
  locationId: "", packs: "", quantity: "", receiptNo: "", receiptKind: "invoice",
};
// The item line — what a save clears. Supplier, document and location stay
// for the next item of the same delivery.
const LINE_RESET = { stockItemId: "", batchNo: "", expiryDate: "", packs: "", quantity: "" };
const MAX_LABELS = 300;   // a typo guard, not a policy

// Default label count: one per pack for packed items, else one per unit.
const defaultLabels = (item, quantity) => {
  const q = Number(quantity);
  if (!q || q < 1) return "";
  const size = Number(item?.packSize) || 1;
  return String(size > 1 ? Math.ceil(q / size) : q);
};
const todayIso = () => new Date().toLocaleDateString("en-CA");   // YYYY-MM-DD, local
const KIND_LABEL = { invoice: "Invoice", receipt: "Receipt", delivery_note: "Delivery note" };
const MODES = [{ id: "invoice", label: "From an invoice" }, { id: "manual", label: "One item at a time" }];

const StockReceiveTab = () => {
  const { items, locations, suppliers } = useStockContext();
  const [mode, setMode] = useState("invoice");
  const [form, setForm] = useState({ ...EMPTY });
  const [itemSearch, setItemSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [labels, setLabels] = useState("");          // stickers to print
  const [labelsEdited, setLabelsEdited] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);   // the "Saved" card
  const [received, setReceived] = useState([]);       // today's intakes (server)
  const searchRef = useRef(null);

  const loadToday = useCallback(() => {
    stockService.getMovements({ type: "intake", from: todayIso(), limit: 50 })
      .then((res) => { if (res?.success) setReceived(res.data?.movements || []); })
      .catch(() => {});
  }, []);
  useEffect(() => { loadToday(); }, [loadToday]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  // The invoice / receipt already on file for this supplier + number (lines
  // received before, scans attached) — looked up as the number is typed.
  const [receipt, setReceipt] = useState(null);
  useEffect(() => {
    const n = form.receiptNo.trim();
    if (!n) { setReceipt(null); return undefined; }
    let live = true;
    const t = setTimeout(() => {
      stockService.lookupReceipt(n, form.supplierId)
        .then((res) => { if (live) setReceipt(res?.data || null); })
        .catch(() => { if (live) setReceipt(null); });
    }, 400);
    return () => { live = false; clearTimeout(t); };
  }, [form.receiptNo, form.supplierId]);

  const ensureReceipt = async () => {
    if (!form.receiptNo.trim()) { notify("error", "Enter the invoice / receipt number first"); return null; }
    const res = await stockService.ensureReceipt({
      number: form.receiptNo.trim(), kind: form.receiptKind,
      supplierId: form.supplierId ? Number(form.supplierId) : undefined,
    });
    if (res.success) { setReceipt(res.data); return res.data.id; }
    return null;
  };

  const focusSearch = () => setTimeout(() => searchRef.current?.focus(), 0);

  const newDelivery = () => {
    setForm({ ...EMPTY });
    setReceipt(null);
    setLastSaved(null);
    focusSearch();
  };
  const sameDelivery = () => { setLastSaved(null); focusSearch(); };

  const selectedItem = useMemo(
    () => items.find((i) => i.id === Number(form.stockItemId)) || null,
    [items, form.stockItemId]
  );

  // Item search — matches name or GTIN (so scanning the retail box works).
  const matches = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter((i) => i.name.toLowerCase().includes(q) || (i.gtin && i.gtin === itemSearch.trim()))
      .slice(0, 8);
  }, [items, itemSearch]);

  // Labels follow the quantity until staff type their own number.
  useEffect(() => {
    if (!labelsEdited) setLabels(defaultLabels(selectedItem, form.quantity));
  }, [selectedItem, form.quantity, labelsEdited]);

  // Packs × pack-size helper: typing packs fills quantity.
  const onPacks = (packs) => {
    set("packs", packs);
    if (selectedItem && packs !== "") {
      set("quantity", String(Number(packs) * (selectedItem.packSize || 1)));
    }
  };

  const submit = async () => {
    if (!form.stockItemId) return notify("error", "Choose an item");
    if (!form.locationId) return notify("error", "Choose a receiving location");
    if (!form.quantity || Number(form.quantity) < 1) return notify("error", "Enter a quantity");
    const copies = labels === "" ? 0 : Math.floor(Number(labels));
    if (!(copies >= 0) || copies > MAX_LABELS) return notify("error", `Labels must be 0–${MAX_LABELS}`);

    setSaving(true);
    try {
      const res = await stockService.intake({
        stockItemId: Number(form.stockItemId),
        locationId: Number(form.locationId),
        quantity: Number(form.quantity),
        batchNo: form.batchNo || undefined,
        expiryDate: form.expiryDate || undefined,
        supplierId: form.supplierId ? Number(form.supplierId) : undefined,
        receiptNo: form.receiptNo.trim() || undefined,
        receiptKind: form.receiptKind,
      });
      if (res.success) {
        const { batch, item, receipt: r } = res.data;
        if (r) setReceipt((prev) => ({ ...(prev || {}), id: r.id, number: r.number, kind: r.kind, documents: prev?.documents || [], itemCount: (prev?.itemCount || 0) + 1 }));
        if (copies > 0) {
          printStockBatchLabel({
            labelCode: batch.labelCode,
            itemName: item.name,
            batchNo: batch.batchNo,
            expiryDate: batch.expiryDate,
            copies,
          });
        }
        setLastSaved({
          itemName: item.name, unit: item.unit, quantity: Number(form.quantity),
          labelCode: batch.labelCode, batchNo: batch.batchNo, expiryDate: batch.expiryDate, copies,
        });
        // Reset the item line; the delivery (supplier, document, location) waits
        // for the Same / New delivery choice on the Saved card.
        setForm((prev) => ({ ...prev, ...LINE_RESET }));
        setItemSearch("");
        setLabelsEdited(false);
        loadToday();
      } else {
        notify("error", res.message || "Intake failed");
      }
    } catch (err) {
      notify("error", err?.message || "Intake failed");
    } finally {
      setSaving(false);
    }
  };

  const receivedToday = (
    <div>
      <h4 className="font-bold text-gray-800 mb-3">Received today</h4>
      {received.length === 0 ? (
        <p className="text-sm text-gray-500">
          Nothing received yet today. Each saved item appears here straight away — reprint a label from here if one is damaged.
        </p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 text-sm">
          {received.map((m) => (
            <div key={m.id} className="px-4 py-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <span className="truncate">{m.item?.name}</span>
                  {m.batch?.receiveMethod === "invoice" && <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 rounded px-1">Invoice</span>}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(m.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  {` · ${m.quantity} ${m.item?.unit || "unit"}(s)`}
                  {m.batch?.labelCode && <> · <span className="font-mono">{m.batch.labelCode}</span></>}
                  {m.batch?.batchNo && ` · batch ${m.batch.batchNo}`}
                  {m.toLocation?.name && ` · ${m.toLocation.name}`}
                  {m.performedByUser && ` · ${m.performedByUser.firstName}`}
                </p>
              </div>
              <button
                className="text-primary hover:text-blue-800 shrink-0"
                title="Reprint one label"
                onClick={() => printStockBatchLabel({
                  labelCode: m.batch?.labelCode, itemName: m.item?.name,
                  batchNo: m.batch?.batchNo, expiryDate: m.batch?.expiryDate,
                })}
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const modeBar = (
    <div className="flex items-center gap-3 mb-4">
      <PackagePlus className="w-5 h-5 text-primary" />
      <SwitcherTabs tabs={MODES} active={mode} onChange={setMode} size="sm" ariaLabel="How to receive" />
      <StockHelp tab="receive" />
    </div>
  );

  if (mode === "invoice") {
    return (
      <div>
        {modeBar}
        {/* "Received today" sits beside the upload step; the review and the
            label printing take the full width. */}
        <StockInvoiceReceive onSaved={loadToday} aside={receivedToday} />
      </div>
    );
  }

  return (
    <div>
    {modeBar}
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="ui-surface p-5">
        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          Receive a delivery
          {(form.receiptNo || form.supplierId) && (
            <button type="button" onClick={newDelivery} className="ml-auto text-xs font-semibold text-primary hover:underline">New delivery</button>
          )}
        </h4>

        {lastSaved && (
          <div className="rounded-lg border-2 border-green-300 bg-green-50 p-3 mb-4" role="status">
            <p className="flex items-center gap-2 font-semibold text-green-800">
              <CheckCircle2 className="w-5 h-5" /> Saved — {lastSaved.quantity} {lastSaved.unit}{lastSaved.quantity === 1 ? "" : "s"} of {lastSaved.itemName}
            </p>
            <p className="text-xs text-green-800 mt-1">
              <span className="font-mono">{lastSaved.labelCode}</span>
              {lastSaved.batchNo && ` · batch ${lastSaved.batchNo}`}
              {` · ${lastSaved.copies ? `${lastSaved.copies} label${lastSaved.copies === 1 ? "" : "s"} sent to the printer` : "no labels printed"}`}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-sm text-gray-700 mr-1">Next item:</span>
              {(form.supplierId || form.receiptNo.trim()) ? (
                <>
                  <Button className="!px-4 !py-2 text-sm" onClick={sameDelivery}>
                    Same delivery{form.receiptNo.trim() ? ` (${form.receiptNo.trim()})` : ""}
                  </Button>
                  <Button variant="outline" className="!px-4 !py-2 text-sm" onClick={newDelivery}>New delivery</Button>
                </>
              ) : (
                <Button className="!px-4 !py-2 text-sm" onClick={sameDelivery}>Receive next item</Button>
              )}
              <button
                type="button"
                className="ml-auto text-xs font-semibold text-primary hover:underline"
                onClick={() => printStockBatchLabel({ ...lastSaved, copies: 1 })}
              >
                Reprint one label
              </button>
            </div>
          </div>
        )}

        {/* The supplier's document — kept between lines of one delivery. */}
        <div className="rounded-lg border border-gray-200 p-3 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Supplier">
              <select className={inputCls} value={form.supplierId} onChange={(e) => set("supplierId", e.target.value)}>
                <option value="">— none —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Document">
              <select className={inputCls} value={form.receiptKind} onChange={(e) => set("receiptKind", e.target.value)}>
                {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
          </div>
          <Field label={`${KIND_LABEL[form.receiptKind]} number`} hint="optional — several items can share one number; enter it to attach a scan">
            <input className={inputCls} value={form.receiptNo} onChange={(e) => set("receiptNo", e.target.value)} placeholder="e.g. INV-20431" />
          </Field>
          {receipt?.itemCount > 0 && (
            <p className="text-xs text-gray-500 -mt-1">
              Already on file: {receipt.itemCount} item{receipt.itemCount === 1 ? "" : "s"} received on this {KIND_LABEL[receipt.kind]?.toLowerCase() || "document"}.
            </p>
          )}
          {form.receiptNo.trim() && (
            <ReceiptDocuments
              receiptId={receipt?.id || null}
              documents={receipt?.documents || []}
              onNeedReceipt={ensureReceipt}
              onChange={(documents, id) => setReceipt((prev) => ({ ...(prev || {}), id, documents }))}
            />
          )}
        </div>

        <Field label="Item" hint="type a name, or scan the retail box barcode (GTIN)">
          {selectedItem ? (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <div>
                <p className="font-semibold text-sm">{selectedItem.name}</p>
                <p className="text-xs text-gray-500">
                  counted in {selectedItem.unit}s · pack of {selectedItem.packSize}
                </p>
              </div>
              <button className="text-xs text-primary font-semibold" onClick={() => { set("stockItemId", ""); setItemSearch(""); focusSearch(); }}>
                change
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                ref={searchRef}
                className={inputCls}
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search items…"
              />
              {matches.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {matches.map((i) => (
                    <button
                      key={i.id}
                      className="w-full text-left px-3 py-2 text-sm ui-hover"
                      onClick={() => { set("stockItemId", String(i.id)); setItemSearch(""); setLastSaved(null); }}
                    >
                      {i.name} <span className="text-xs text-gray-400">({i.category})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Batch / lot no.">
            <input className={inputCls} value={form.batchNo} onChange={(e) => set("batchNo", e.target.value)} />
          </Field>
          <Field label="Expiry date" hint={selectedItem?.category === "medication" ? "required for medications" : "optional for undated items"}>
            <input type="date" className={inputCls} value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} />
          </Field>
          <Field label={`Packs${selectedItem ? ` (× ${selectedItem.packSize})` : ""}`} hint="optional helper">
            <input type="number" min="0" className={inputCls} value={form.packs} onChange={(e) => onPacks(e.target.value)} />
          </Field>
          <Field label={`Quantity${selectedItem ? ` (${selectedItem.unit}s)` : ""}`}>
            <input type="number" min="1" className={inputCls} value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
          </Field>
          <Field label="Receiving location">
            <select className={inputCls} value={form.locationId} onChange={(e) => set("locationId", e.target.value)}>
              <option value="">— choose —</option>
              {locations
                .filter((l) => !selectedItem?.requiresColdChain || l.isColdChain)
                .map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
          <Field
            label="Labels to print"
            hint={labelsEdited
              ? <button type="button" className="text-primary hover:underline" onClick={() => setLabelsEdited(false)}>reset to suggested</button>
              : (Number(selectedItem?.packSize) > 1 ? `one per pack of ${selectedItem.packSize}` : "one per unit")}
          >
            <input
              type="number" min="0" max={MAX_LABELS} className={inputCls} value={labels}
              onChange={(e) => { setLabels(e.target.value); setLabelsEdited(true); }}
            />
          </Field>
        </div>
        {selectedItem?.requiresColdChain && (
          <p className="text-xs text-blue-700 mb-3">
            ❄ Cold-chain item — only fridge locations are offered.
          </p>
        )}

        <Button className="w-full" disabled={saving} onClick={submit}>
          {saving
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin inline" /> Saving…</>
            : Number(labels) > 0
              ? `Save & print ${Number(labels)} label${Number(labels) === 1 ? "" : "s"}`
              : "Save (no labels)"}
        </Button>
      </div>

      {receivedToday}
    </div>
    </div>
  );
};

export default StockReceiveTab;
