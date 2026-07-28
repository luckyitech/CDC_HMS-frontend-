import { useState, useEffect, useCallback } from "react";
import { notify } from "../../utils/notify";
import { Undo2 } from "lucide-react";
import { useStockContext } from "../../contexts/StockContext";
import stockService from "../../services/stockService";
import Spinner from "../shared/Spinner";
import Button from "../shared/Button";
import Modal from "../shared/Modal";
import Pagination from "../shared/Pagination";
import { Field, inputCls, MOVEMENT_LABELS, MovementBadge, ByLine } from "./stockUi";

// Movement history — the ledger, filterable. Rows are immutable; the only
// correction is a reversal (reason required), offered per row.

const EMPTY_FILTERS = { itemId: "", locationId: "", type: "", from: "", to: "" };

const StockMovementsTab = () => {
  const { items, locations } = useStockContext();
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [data, setData] = useState({ movements: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reversing, setReversing] = useState(null);   // movement row
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 25 };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await stockService.getMovements(params);
      if (res.success) setData(res.data);
    } catch (err) {
      console.error("Load movements error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const doReverse = async () => {
    setBusy(true);
    try {
      const res = await stockService.reverseMovement(reversing.id, reason.trim());
      if (res.success) {
        notify("success", "Movement reversed");
        setReversing(null);
        setReason("");
        load();
      } else {
        notify("error", res.message || "Reverse failed");
      }
    } catch (err) {
      notify("error", err?.message || "Reverse failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <select className={inputCls} value={filters.itemId} onChange={(e) => setFilter("itemId", e.target.value)}>
          <option value="">All items</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <select className={inputCls} value={filters.locationId} onChange={(e) => setFilter("locationId", e.target.value)}>
          <option value="">All locations</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select className={inputCls} value={filters.type} onChange={(e) => setFilter("type", e.target.value)}>
          <option value="">All types</option>
          {Object.entries(MOVEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <input type="date" className={inputCls} value={filters.from} onChange={(e) => setFilter("from", e.target.value)} />
        <input type="date" className={inputCls} value={filters.to} onChange={(e) => setFilter("to", e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2">When · who</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Batch</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">From → To</th>
                  <th className="px-3 py-2">Reason</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {data.movements.map((m) => {
                  return (
                    <tr key={m.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <ByLine user={m.performedByUser} at={m.createdAt} />
                      </td>
                      <td className="px-3 py-2">
                        <MovementBadge type={m.type} />
                      </td>
                      <td className="px-3 py-2 font-medium">{m.item?.name}</td>
                      <td className="px-3 py-2 font-mono text-xs">{m.batch?.labelCode || m.stockBatchId}</td>
                      <td className="px-3 py-2 font-bold">{m.quantity}</td>
                      <td className="px-3 py-2 text-xs">
                        {m.fromLocation?.name || "—"} → {m.toLocation?.name || "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">{m.reason || ""}</td>
                      <td className="px-3 py-2 text-right">
                        {m.type !== "reversal" && (
                          <button
                            onClick={() => setReversing(m)}
                            className="text-gray-400 hover:text-red-600"
                            title="Reverse this movement (reason required)"
                          >
                            <Undo2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {data.movements.length === 0 && (
                  <tr><td colSpan="8" className="px-3 py-8 text-center text-gray-500">No movements match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={page} totalPages={data.pages} onPageChange={setPage} />
        </>
      )}

      {reversing && (
        <Modal isOpen onClose={() => setReversing(null)} title="Reverse movement">
          <p className="text-sm text-gray-600 mb-4">
            The ledger is append-only — this posts a mirrored reversal entry restoring
            the quantities, attributed to you. The original row stays visible.
          </p>
          <Field label="Reason (required)">
            <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}
                   placeholder="e.g. wrong quantity entered" />
          </Field>
          <div className="flex gap-3 mt-4">
            <Button variant="danger" className="flex-1" disabled={busy || !reason.trim()} onClick={doReverse}>
              Reverse
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setReversing(null)}>Cancel</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StockMovementsTab;
