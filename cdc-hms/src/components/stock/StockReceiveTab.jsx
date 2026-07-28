import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { PackagePlus, Printer } from "lucide-react";
import { useStockContext } from "../../contexts/StockContext";
import stockService from "../../services/stockService";
import Button from "../shared/Button";
import { Field, inputCls } from "./stockUi";
import { printStockBatchLabel } from "../../utils/print";

// Receive Stock (intake): choose/scan item → batch no, expiry, quantity,
// supplier → receiving location → save → print the STK- shelf label.
// Scanning a retail box's GTIN in the item search selects the matching item.

const EMPTY = {
  stockItemId: "", batchNo: "", expiryDate: "", supplierId: "",
  locationId: "", packs: "", quantity: "",
};

const StockReceiveTab = () => {
  const { items, locations, suppliers } = useStockContext();
  const [form, setForm] = useState({ ...EMPTY });
  const [itemSearch, setItemSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [received, setReceived] = useState([]);   // this session's intakes, for reprint

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

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
    if (!form.stockItemId) return toast.error("Choose an item");
    if (!form.locationId) return toast.error("Choose a receiving location");
    if (!form.quantity || Number(form.quantity) < 1) return toast.error("Enter a quantity");

    setSaving(true);
    try {
      const res = await stockService.intake({
        stockItemId: Number(form.stockItemId),
        locationId: Number(form.locationId),
        quantity: Number(form.quantity),
        batchNo: form.batchNo || undefined,
        expiryDate: form.expiryDate || undefined,
        supplierId: form.supplierId ? Number(form.supplierId) : undefined,
      });
      if (res.success) {
        const { batch, item } = res.data;
        toast.success(`Received ${form.quantity} × ${item.name} — label ${batch.labelCode}`);
        setReceived((prev) => [{ ...batch, itemName: item.name }, ...prev]);
        printStockBatchLabel({
          labelCode: batch.labelCode,
          itemName: item.name,
          batchNo: batch.batchNo,
          expiryDate: batch.expiryDate,
        });
        // Keep item + location for multi-line deliveries; clear the batch line.
        setForm((prev) => ({ ...prev, batchNo: "", expiryDate: "", packs: "", quantity: "" }));
      } else {
        toast.error(res.message || "Intake failed");
      }
    } catch (err) {
      toast.error(err?.message || "Intake failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <PackagePlus className="w-5 h-5 text-primary" /> Receive a delivery
        </h4>

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
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
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
          <Field label="Supplier">
            <select className={inputCls} value={form.supplierId} onChange={(e) => set("supplierId", e.target.value)}>
              <option value="">— none —</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
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
