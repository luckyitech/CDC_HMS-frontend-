import { useState, useMemo, useEffect } from "react";
import { notify } from "../../utils/notify";
import { PackagePlus, Printer } from "lucide-react";
import { useStockContext } from "../../contexts/StockContext";
import stockService from "../../services/stockService";
import Button from "../shared/Button";
import { Field, inputCls } from "./stockUi";
import { printStockBatchLabel } from "../../utils/print";
import ReceiptDocuments from "./ReceiptDocuments";

// Receive Stock (intake): choose/scan item → batch no, expiry, quantity,
// supplier → receiving location → save → print the STK- shelf label.
// Scanning a retail box's GTIN in the item search selects the matching item.
//
// 12 Oct 2026 (Emu): a line may name the supplier's INVOICE / RECEIPT number
// (optional); lines received on one document share it, and the document is
// scanned once (now, or later from Movements → Deliveries — until then it is
// flagged "No scan yet"). The delivery block stays filled between lines;
// "New delivery" clears it.

const EMPTY = {
  stockItemId: "", batchNo: "", expiryDate: "", supplierId: "",
  locationId: "", packs: "", quantity: "", receiptNo: "", receiptKind: "invoice",
};
const KIND_LABEL = { invoice: "Invoice", receipt: "Receipt", delivery_note: "Delivery note" };

const StockReceiveTab = () => {
  const { items, locations, suppliers } = useStockContext();
  const [form, setForm] = useState({ ...EMPTY });
  const [itemSearch, setItemSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [received, setReceived] = useState([]);   // this session's intakes, for reprint

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

  const newDelivery = () => {
    setForm((prev) => ({ ...prev, supplierId: "", receiptNo: "", receiptKind: "invoice" }));
    setReceipt(null);
  };

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
        notify("success", `Received ${form.quantity} × ${item.name} — label ${batch.labelCode}`);
        setReceived((prev) => [{ ...batch, itemName: item.name, receiptNo: r?.number }, ...prev]);
        if (r) setReceipt((prev) => ({ ...(prev || {}), id: r.id, number: r.number, kind: r.kind, documents: prev?.documents || [], itemCount: (prev?.itemCount || 0) + 1 }));
        printStockBatchLabel({
          labelCode: batch.labelCode,
          itemName: item.name,
          batchNo: batch.batchNo,
          expiryDate: batch.expiryDate,
        });
        // Keep item + location for multi-line deliveries; clear the batch line.
        setForm((prev) => ({ ...prev, batchNo: "", expiryDate: "", packs: "", quantity: "" }));
      } else {
        notify("error", res.message || "Intake failed");
      }
    } catch (err) {
      notify("error", err?.message || "Intake failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="ui-surface p-5">
        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <PackagePlus className="w-5 h-5 text-primary" /> Receive a delivery
          {(form.receiptNo || form.supplierId) && (
            <button type="button" onClick={newDelivery} className="ml-auto text-xs font-semibold text-primary hover:underline">New delivery</button>
          )}
        </h4>

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
              <button className="text-xs text-primary font-semibold" onClick={() => { set("stockItemId", ""); setItemSearch(""); }}>
                change
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
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
                      onClick={() => { set("stockItemId", String(i.id)); setItemSearch(""); }}
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
        </div>
        {selectedItem?.requiresColdChain && (
          <p className="text-xs text-blue-700 mb-3">
            ❄ Cold-chain item — only fridge locations are offered.
          </p>
        )}

        <Button className="w-full" disabled={saving} onClick={submit}>
          Save &amp; print shelf label
        </Button>
      </div>

      <div>
        <h4 className="font-bold text-gray-800 mb-3">Received this session</h4>
        {received.length === 0 ? (
          <p className="text-sm text-gray-500">
            Each saved line prints its shelf label automatically — reprint from here if needed.
          </p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 text-sm">
            {received.map((b) => (
              <div key={b.id} className="px-4 py-2 flex items-center justify-between">
                <div>
                  <p className="font-medium">{b.itemName}</p>
                  <p className="text-xs text-gray-500">
                    <span className="font-mono">{b.labelCode}</span>
                    {b.batchNo && ` · batch ${b.batchNo}`}
                    {b.expiryDate && ` · exp ${b.expiryDate}`}
                    {` · ${b.qtyReceived} unit(s)`}
                    {b.receiptNo && ` · doc ${b.receiptNo}`}
                  </p>
                </div>
                <button
                  className="text-primary hover:text-blue-800"
                  title="Reprint label"
                  onClick={() => printStockBatchLabel({
                    labelCode: b.labelCode, itemName: b.itemName,
                    batchNo: b.batchNo, expiryDate: b.expiryDate,
                  })}
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockReceiveTab;
