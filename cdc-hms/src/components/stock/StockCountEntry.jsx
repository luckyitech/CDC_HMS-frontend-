import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Printer, Minus, Plus, CheckCircle2, Trash2 } from "lucide-react";
import { notify } from "../../utils/notify";
import { useStockContext } from "../../contexts/StockContext";
import stockService from "../../services/stockService";
import Button from "../shared/Button";
import SelectMenu from "../shared/SelectMenu";
import ConfirmActionModal from "../shared/ConfirmActionModal";
import { inputCls, unitPlural } from "./stockUi";
import { ItemPicker, NewItemPanel } from "./StockItemPick";
import { printStockBatchLabel } from "../../utils/print";

// Stocktake → Add counted stock (15 Oct 2026, Emu): the opening stock load,
// and afterwards any physical count that finds stock the HMS does not know
// about. One table, typed straight in — pick the item, batch, expiry, where
// it is, how many — and each row is SAVED THE MOMENT IT IS FINISHED (Enter or
// "Save row"), as a batch received as "Opening stock": no supplier, no
// invoice, nothing taught to the matcher. Labels print per row as it is
// saved (the tick, on by default) or in one go at the end.
//
// The location carries over to the next row, because a count goes shelf by
// shelf. Everything a row needs is checked here first so a refused save
// names what is missing instead of a server error.

const today = () => new Date().toLocaleDateString("en-CA");
const blankRow = (locationId = "") => ({ key: Date.now() + Math.random(), item: null, batchNo: "", expiryDate: "", locationId, quantity: "", newItemText: null });

/** Quantity with − / + and the unit hint. Enter in the box saves the row. */
const QuantityPicker = ({ value, onChange, unit, packSize, onEnter, inputRef }) => {
  const n = Number(value) || 0;
  const step = (d) => onChange(String(Math.max(0, n + d)));
  return (
    <div className="flex items-center gap-1">
      <button type="button" className="w-8 h-9 rounded-lg border border-gray-200 ui-hover grid place-items-center" onClick={() => step(-1)} aria-label="One fewer"><Minus className="w-3.5 h-3.5" /></button>
      <input ref={inputRef} type="number" min="1" className={`${inputCls} !w-20 text-center`} value={value} onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onEnter(); } }} aria-label="Quantity" />
      <button type="button" className="w-8 h-9 rounded-lg border border-gray-200 ui-hover grid place-items-center" onClick={() => step(1)} aria-label="One more"><Plus className="w-3.5 h-3.5" /></button>
      {unit && <span className="text-xs text-gray-500 ml-1 whitespace-nowrap">{unitPlural(unit)}{packSize > 1 ? ` · pack of ${packSize}` : ""}</span>}
    </div>
  );
};

const StockCountEntry = () => {
  const { items, locations } = useStockContext();
  const stores = useMemo(() => locations.filter((l) => !l.isColdChain), [locations]);
  const fridges = useMemo(() => locations.filter((l) => l.isColdChain), [locations]);

  const [saved, setSaved] = useState([]);          // [{ ...server item, printed }]
  const [row, setRow] = useState(() => blankRow(""));
  const [printEach, setPrintEach] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [done, setDone] = useState(false);
  const itemRef = useRef(null);
  const qtyRef = useRef(null);

  // The first store is the usual answer for the first row; after that the
  // previous row's place stays.
  useEffect(() => {
    if (!row.locationId && stores.length) setRow((r) => (r.locationId ? r : { ...r, locationId: String(stores[0].id) }));
  }, [stores, row.locationId]);

  const set = (f, v) => setRow((r) => ({ ...r, [f]: v }));
  const pickItem = (item) => {
    setRow((r) => ({
      ...r, item, newItemText: null,
      // A cold-chain item goes to a fridge unless one was already chosen.
      locationId: item.requiresColdChain && !fridges.some((f) => String(f.id) === r.locationId) && fridges.length ? String(fridges[0].id) : r.locationId,
    }));
    setTimeout(() => document.getElementById("count-batch")?.focus(), 0);
  };

  const needsExpiry = row.item?.category === "medication";   // the same rule the server applies
  const problem = () => {
    if (!row.item) return "Pick the item";
    if (!row.locationId) return "Choose where it is";
    const q = Number(row.quantity);
    if (!Number.isInteger(q) || q < 1) return "Enter how many";
    if (row.expiryDate && row.expiryDate < today()) return "This batch has expired — it should leave the shelf, not be counted in";
    if (needsExpiry && !row.expiryDate) return `${row.item.name}: enter the expiry date`;
    return null;
  };

  const saveRow = useCallback(async () => {
    const p = problem();
    if (p) return notify("error", p);
    setSaving(true);
    try {
      const res = await stockService.receiveInvoice({
        method: "opening",
        lines: [{ stockItemId: row.item.id, quantity: Number(row.quantity), batchNo: row.batchNo.trim() || undefined, expiryDate: row.expiryDate || undefined, locationId: Number(row.locationId) }],
      });
      if (!res.success) return notify("error", res.message || "Could not save the row");
      const it = res.data.items[0];
      let printed = 0;
      if (printEach) {
        printStockBatchLabel({ labelCode: it.labelCode, itemName: it.itemName, batchNo: it.batchNo, expiryDate: it.expiryDate, copies: 1 });
        printed = 1;
      }
      setSaved((s) => [...s, { ...it, printed, copies: "1" }]);
      setRow(blankRow(row.locationId));
      setTimeout(() => itemRef.current?.focus(), 0);
    } catch (err) {
      notify("error", err?.message || "Could not save the row");
    } finally {
      setSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, printEach]);

  const print = (idx) => {
    const it = saved[idx];
    const copies = Math.max(1, parseInt(it.copies, 10) || 1);
    printStockBatchLabel({ labelCode: it.labelCode, itemName: it.itemName, batchNo: it.batchNo, expiryDate: it.expiryDate, copies });
    setSaved((s) => s.map((x, i) => (i === idx ? { ...x, printed: x.printed + copies } : x)));
  };
  const printAllUnprinted = () => {
    saved.forEach((it, i) => { if (!it.printed) print(i); });
  };
  const unprinted = saved.filter((s) => !s.printed).length;
  const total = saved.reduce((n, s) => n + s.quantity, 0);

  const finish = () => { if (unprinted) setConfirmFinish(true); else setDone(true); };
  const locName = (id) => locations.find((l) => String(l.id) === String(id))?.name || "";

  if (done) {
    return (
      <div className="ui-surface p-6 space-y-3">
        <p className="flex items-center gap-2 text-emerald-700 font-bold text-lg"><CheckCircle2 className="w-6 h-6" /> Count added — {saved.length} row{saved.length === 1 ? "" : "s"}, {total} unit{total === 1 ? "" : "s"}</p>
        <p className="text-sm text-gray-600">Recorded as <strong>Opening stock</strong>, attributed to you. Each row is now a batch in its location, shown in Movements as an intake marked Opening stock — correct a line or print its label from there (the pencil on the line).</p>
        <Button className="!px-5 !py-2.5 text-sm" onClick={() => { setSaved([]); setDone(false); setRow(blankRow("")); }}>Start another count</Button>
      </div>
    );
  }

  const canSave = !problem() && !saving;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-bold text-gray-800">Add counted stock</h4>
          <p className="text-sm text-gray-600 max-w-2xl">For opening stock, or anything a physical count finds that the HMS does not yet hold. Fill the row, press <kbd className="px-1 border rounded text-xs">Enter</kbd> or Save row — it is saved at once. The location stays for the next row; a cold-chain item goes to the fridge.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
          <input type="checkbox" className="w-4 h-4" checked={printEach} onChange={(e) => setPrintEach(e.target.checked)} /> Print labels as each row is saved
        </label>
      </div>

      <div className="ui-surface p-4 overflow-x-auto">
        <table className="w-full text-sm min-w-[56rem]">
          <thead className="ui-thead">
            <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
              <th className="px-2 py-2 w-8">#</th>
              <th className="px-2 py-2 min-w-[16rem]">Item</th>
              <th className="px-2 py-2 w-28">Batch / lot</th>
              <th className="px-2 py-2 w-40">Expiry date</th>
              <th className="px-2 py-2 w-52">Location</th>
              <th className="px-2 py-2 w-56">Quantity</th>
              <th className="px-2 py-2 w-44">Labels</th>
            </tr>
          </thead>
          <tbody>
            {saved.map((it, idx) => (
              <tr key={it.batchId} className="border-t border-gray-100 bg-emerald-50/60">
                <td className="px-2 py-2 text-gray-400">{idx + 1}</td>
                <td className="px-2 py-2"><span className="font-medium">{it.itemName}</span> <span className="font-mono text-xs text-gray-500 ml-1">{it.labelCode}</span></td>
                <td className="px-2 py-2 font-mono text-xs">{it.batchNo || "—"}</td>
                <td className="px-2 py-2">{it.expiryDate || "—"}</td>
                <td className="px-2 py-2">{it.location}</td>
                <td className="px-2 py-2">{it.quantity} {unitPlural(it.unit)}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1.5">
                    {it.printed > 0 && <span className="text-xs text-emerald-700 whitespace-nowrap">{it.printed} printed ·</span>}
                    <input type="number" min="1" className={`${inputCls} !w-14 !py-1 text-center`} value={it.copies} aria-label="Copies"
                      onChange={(e) => setSaved((s) => s.map((x, i) => (i === idx ? { ...x, copies: e.target.value } : x)))} />
                    <button type="button" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1" onClick={() => print(idx)}>
                      <Printer className="w-3.5 h-3.5" /> {it.printed ? "again" : "Print"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            <tr className="border-t-2 border-blue-200 bg-blue-50/40 align-top">
              <td className="px-2 py-2 text-gray-400 pt-4">{saved.length + 1}</td>
              <td className="px-2 py-2">
                {row.item ? (
                  <div className="flex items-start gap-2 pt-1.5">
                    <div className="min-w-0">
                      <p className="font-medium leading-tight">{row.item.name}</p>
                      <p className="text-xs text-gray-500">{row.item.category}{row.item.requiresColdChain ? " · ❄ fridge" : ""}</p>
                    </div>
                    <button type="button" className="text-xs text-primary hover:underline shrink-0" onClick={() => setRow((r) => ({ ...r, item: null }))}>change</button>
                  </div>
                ) : row.newItemText !== null ? (
                  <NewItemPanel seed={{ sourceText: row.newItemText }} onAdded={pickItem} onCancel={() => set("newItemText", null)}
                    title="New item — complete and add" note="Saved to Items; then used for this row." />
                ) : (
                  <ItemPicker items={items} onPick={pickItem} inputRef={itemRef} onAddNew={(t) => set("newItemText", t)} placeholder="Type the item name, or scan the box…" />
                )}
              </td>
              <td className="px-2 py-2"><input id="count-batch" className={inputCls} value={row.batchNo} onChange={(e) => set("batchNo", e.target.value)} placeholder="optional" aria-label="Batch / lot" /></td>
              <td className="px-2 py-2"><input type="date" className={inputCls} value={row.expiryDate} min={today()} onChange={(e) => set("expiryDate", e.target.value)} aria-label="Expiry date" /></td>
              <td className="px-2 py-2">
                <SelectMenu className={inputCls} value={row.locationId} onChange={(e) => set("locationId", e.target.value)} aria-label="Location">
                  <option value="">— where —</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}{l.isColdChain ? " ❄" : ""}</option>)}
                </SelectMenu>
              </td>
              <td className="px-2 py-2">
                <QuantityPicker value={row.quantity} onChange={(v) => set("quantity", v)} unit={row.item?.unit} packSize={row.item?.packSize} onEnter={saveRow} inputRef={qtyRef} />
              </td>
              <td className="px-2 py-2">
                <div className="flex items-center gap-2">
                  <Button className="!px-3 !py-2 text-sm" disabled={!canSave} onClick={saveRow}>{saving ? "Saving…" : "Save row"}</Button>
                  {(row.item || row.batchNo || row.quantity) && (
                    <button type="button" className="text-gray-400 hover:text-red-600" title="Clear this row" onClick={() => setRow(blankRow(row.locationId))}><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        {row.locationId && <p className="text-xs text-gray-500 mt-2">Next row goes to <strong>{locName(row.locationId)}</strong> too — change it on the row when you move shelf.</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-gray-600">{saved.length} row{saved.length === 1 ? "" : "s"} saved · {total} unit{total === 1 ? "" : "s"}{unprinted > 0 && <span className="text-amber-700"> · {unprinted} without labels</span>}</span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" className="!px-4 !py-2 text-sm" disabled={!unprinted} onClick={printAllUnprinted}><Printer className="w-4 h-4" /> Print all unprinted</Button>
          <Button className="!px-4 !py-2 text-sm" disabled={!saved.length} onClick={finish}>Finish</Button>
        </div>
      </div>

      <ConfirmActionModal
        isOpen={confirmFinish}
        onClose={() => setConfirmFinish(false)}
        onConfirm={() => { setConfirmFinish(false); setDone(true); }}
        title="Finish without printing?"
        message={`${unprinted} row${unprinted === 1 ? " has" : "s have"} no labels yet. Every row is already saved; a label can still be printed later from Movements (the pencil on the intake line).`}
        confirmLabel="Finish without printing"
      />
    </div>
  );
};

export default StockCountEntry;
