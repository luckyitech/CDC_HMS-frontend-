import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { SlidersHorizontal, Truck, Copy } from "lucide-react";
import { useStockContext } from "../../contexts/StockContext";
import stockService from "../../services/stockService";
import Spinner from "../shared/Spinner";
import Button from "../shared/Button";
import Modal from "../shared/Modal";
import { Field, inputCls } from "./stockUi";

// Room Balance: the red/amber/green grid (rooms × items vs par levels), the
// per-room par editor with copy-from-room, and the FEFO restock picklist.
// Confirming a picklist line posts an ordinary transfer; unconfirmed lines
// simply lapse — nothing moves unless confirmed.

const CELL_CLS = {
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-700",
  green: "bg-green-100 text-green-700",
};

const StockRoomBalanceTab = () => {
  const { items: allItems, locations } = useStockContext();
  const [grid, setGrid] = useState(null);
  const [loading, setLoading] = useState(true);

  // Par editor state
  const [editingRoom, setEditingRoom] = useState(null);   // locationId being edited
  const [parRows, setParRows] = useState([]);             // [{stockItemId, name, minQty, maxQty}]
  const [copyFrom, setCopyFrom] = useState("");
  const [saving, setSaving] = useState(false);

  // Restock picklist state
  const [plan, setPlan] = useState(null);
  const [sourceId, setSourceId] = useState("");
  const [doneLines, setDoneLines] = useState({});         // index → 'ok' | 'fail'

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await stockService.getRoomBalance();
      if (res.success) setGrid(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ---------- Par editor ----------
  const openParEditor = async (locationId) => {
    const res = await stockService.getParLevels({ locationId });
    const existing = res.success ? res.data : [];
    const byItem = Object.fromEntries(existing.map((p) => [p.stockItemId, p]));
    setParRows(allItems.map((i) => ({
      stockItemId: i.id,
      name: i.name,
      unit: i.unit,
      minQty: byItem[i.id]?.minQty ?? 0,
      maxQty: byItem[i.id]?.maxQty ?? 0,
    })));
    setEditingRoom(locationId);
    setCopyFrom("");
  };

  const savePars = async () => {
    setSaving(true);
    try {
      const entries = parRows.map(({ stockItemId, minQty, maxQty }) => ({
        stockItemId, minQty: Number(minQty) || 0, maxQty: Number(maxQty) || 0,
      }));
      const res = await stockService.setParLevels(editingRoom, entries);
      if (res.success) {
        toast.success("Par levels saved");
        setEditingRoom(null);
        load();
      } else {
        toast.error(res.message || "Save failed");
      }
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const doCopy = async () => {
    if (!copyFrom) return;
    setSaving(true);
    try {
      const res = await stockService.copyParLevels(Number(copyFrom), editingRoom);
      if (res.success) {
        toast.success(res.data?.message || "Copied");
        openParEditor(editingRoom);   // reload rows with the copied values
      } else {
        toast.error(res.message || "Copy failed");
      }
    } catch (err) {
      toast.error(err?.message || "Copy failed");
    } finally {
      setSaving(false);
    }
  };

  // ---------- Restock picklist ----------
  const buildPlan = async () => {
    if (!sourceId) return toast.error("Choose the source store");
    try {
      const res = await stockService.getRestockPlan(Number(sourceId));
      if (res.success) {
        setPlan(res.data);
        setDoneLines({});
        if (!res.data.lines.length) toast("All rooms are at their maximum — nothing to restock");
      } else {
        toast.error(res.message || "Could not build the plan");
      }
    } catch (err) {
      toast.error(err?.message || "Could not build the plan");
    }
  };

  const confirmLine = async (line, idx) => {
    try {
      const res = await stockService.transfer({
        stockBatchId: line.stockBatchId,
        fromLocationId: line.fromLocationId,
        toLocationId: line.toLocationId,
        quantity: line.quantity,
        // Lines are FEFO by construction; if stock moved since the plan was
        // built the server re-checks and this reason keeps the audit honest.
        fefoOverrideReason: "Restock picklist line",
      });
      if (res.success) {
        setDoneLines((prev) => ({ ...prev, [idx]: "ok" }));
      } else {
        toast.error(res.message || "Transfer failed");
        setDoneLines((prev) => ({ ...prev, [idx]: "fail" }));
      }
    } catch (err) {
      toast.error(err?.message || "Transfer failed");
      setDoneLines((prev) => ({ ...prev, [idx]: "fail" }));
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  const stores = locations.filter((l) => l.kind === "store" || l.kind === "fridge");
  const editableRooms = locations.filter((l) => l.kind !== "store");

  return (
    <div>
      {/* Grid */}
      {grid && grid.rooms.length > 0 ? (
        <div className="overflow-x-auto mb-6">
          <table className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2">Item</th>
                {grid.rooms.map((r) => (
                  <th key={r.id} className="px-3 py-2 text-center">
                    {r.name}
                    <button
                      className="block mx-auto text-primary normal-case font-semibold mt-0.5"
                      onClick={() => openParEditor(r.id)}
                    >
                      edit pars
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.items.map((i) => (
                <tr key={i.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">{i.name}</td>
                  {grid.rooms.map((r) => {
                    const cell = grid.cells[`${i.id}:${r.id}`];
                    return (
                      <td key={r.id} className="px-2 py-1.5 text-center">
                        {cell ? (
                          <span
                            className={`inline-block min-w-[3.5rem] rounded-md px-2 py-1 font-bold text-xs ${CELL_CLS[cell.status]}`}
                            title={`min ${cell.min} · max ${cell.max}`}
                          >
                            {cell.qty}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-2">
            Red below minimum · amber near minimum · green in range. Hover a cell for its min/max.
          </p>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 mb-6">
          No par levels yet. Set a room's targets to start the grid:
          <span className="inline-flex gap-2 ml-2">
            {editableRooms.map((r) => (
              <button key={r.id} className="font-semibold underline" onClick={() => openParEditor(r.id)}>
                {r.name}
              </button>
            ))}
          </span>
        </div>
      )}

      {/* Restock */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Truck className="w-5 h-5 text-primary" /> Restock picklist
        </h4>
        <div className="flex gap-3 items-end mb-4">
          <div className="flex-1 max-w-xs">
            <Field label="From store">
              <select className={inputCls} value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                <option value="">— choose —</option>
                {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="mb-4">
            <Button onClick={buildPlan}>Generate restock</Button>
          </div>
        </div>

        {plan?.lines.length > 0 && (
          <>
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Batch</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">To</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {plan.lines.map((line, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium">{line.itemName}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {line.labelCode}{line.expiryDate && <span className="text-gray-400"> exp {line.expiryDate}</span>}
                    </td>
                    <td className="px-3 py-2 font-bold">{line.quantity}</td>
                    <td className="px-3 py-2">{line.toLocationName}</td>
                    <td className="px-3 py-2 text-right">
                      {doneLines[idx] === "ok" ? (
                        <span className="text-green-600 font-bold text-xs">moved ✓</span>
                      ) : (
                        <Button
                          variant="outline"
                          className="!px-3 !py-1 text-xs"
                          onClick={() => confirmLine(line, idx)}
                        >
                          Confirm
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-500 mt-2">
              Walk the trolley round and confirm each line as it lands (scan the shelf label to double-check).
              Unconfirmed lines lapse — nothing moves unless confirmed.
            </p>
          </>
        )}
        {plan?.shortfalls?.length > 0 && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            Store shortfalls: {plan.shortfalls.map((s) => `${s.itemName} → ${s.toLocationName} (short ${s.short})`).join("; ")}
          </div>
        )}
      </div>

      {/* Par editor modal */}
      {editingRoom && (
        <Modal isOpen onClose={() => setEditingRoom(null)}
               title={`Par levels — ${locations.find((l) => l.id === editingRoom)?.name || "room"}`} size="lg">
          <div className="flex items-end gap-2 mb-4">
            <div className="flex-1">
              <Field label="Copy from another room">
                <select className={inputCls} value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
                  <option value="">— choose —</option>
                  {editableRooms.filter((r) => r.id !== editingRoom)
                    .map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="mb-4">
              <Button variant="outline" disabled={!copyFrom || saving} onClick={doCopy}>
                <Copy className="w-4 h-4" /> Copy
              </Button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2 w-24">Min</th>
                  <th className="px-3 py-2 w-24">Max</th>
                </tr>
              </thead>
              <tbody>
                {parRows.map((row, idx) => (
                  <tr key={row.stockItemId} className="border-t border-gray-100">
                    <td className="px-3 py-1.5">{row.name} <span className="text-xs text-gray-400">({row.unit})</span></td>
                    <td className="px-3 py-1.5">
                      <input type="number" min="0" className={`${inputCls} !py-1`}
                        value={row.minQty}
                        onChange={(e) => setParRows((p) => p.map((r, i) => i === idx ? { ...r, minQty: e.target.value } : r))} />
                    </td>
                    <td className="px-3 py-1.5">
                      <input type="number" min="0" className={`${inputCls} !py-1`}
                        value={row.maxQty}
                        onChange={(e) => setParRows((p) => p.map((r, i) => i === idx ? { ...r, maxQty: e.target.value } : r))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">Leave both 0 for items this room doesn't stock.</p>

          <div className="flex gap-3 mt-4">
            <Button className="flex-1" disabled={saving} onClick={savePars}>
              <SlidersHorizontal className="w-4 h-4" /> Save par levels
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setEditingRoom(null)}>Cancel</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StockRoomBalanceTab;
