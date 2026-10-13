import { useState, useEffect, useCallback } from "react";
import SelectMenu from '../shared/SelectMenu';
import { useStockContext } from "../../contexts/StockContext";
import stockService from "../../services/stockService";
import Spinner from "../shared/Spinner";
import Pagination from "../shared/Pagination";
import { Pencil } from "lucide-react";
import { inputCls, MOVEMENT_LABELS, MovementBadge, ByLine, Recipient, useStockCan } from "./stockUi";
import { PERMISSIONS } from "../../utils/permissions";
import { ReceivedLineEditModal } from "./ReceivedLineEdit";

// Movement history — the ledger, filterable, read-only. Rows are immutable and
// nobody reverses one (Emu, 13 Oct 2026): a mistake is corrected through the
// tabs — dispense, return, transfer (and stocktake / write-off). Older
// 'reversal' rows still show. A received line (intake row) can be corrected
// here by a holder of "Can edit deliveries" — the way to reach lines that came
// in without an invoice number (the rest are also on Deliveries).

const EMPTY_FILTERS = { itemId: "", locationId: "", type: "", uhid: "", from: "", to: "" };

const StockMovementsTab = () => {
  const { items, locations } = useStockContext();
  const canEdit = useStockCan()(PERMISSIONS.STOCK_DELIVERIES_EDIT);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [data, setData] = useState({ movements: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 25 };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      // "Dispense — walk-ins" is a type option, not a type (13 Oct 2026).
      if (filters.type === "walkin") { params.type = "dispense"; params.walkIn = "1"; }
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

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
        <SelectMenu className={inputCls} value={filters.itemId} onChange={(e) => setFilter("itemId", e.target.value)}>
          <option value="">All items</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </SelectMenu>
        <SelectMenu className={inputCls} value={filters.locationId} onChange={(e) => setFilter("locationId", e.target.value)}>
          <option value="">All locations</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </SelectMenu>
        <SelectMenu className={inputCls} value={filters.type} onChange={(e) => setFilter("type", e.target.value)}>
          <option value="">All types</option>
          {Object.entries(MOVEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          <option value="walkin">Dispense — walk-ins only</option>
        </SelectMenu>
        <input
          className={inputCls}
          value={filters.uhid}
          onChange={(e) => setFilter("uhid", e.target.value.trim())}
          placeholder="Patient UHID (e.g. CDC042)"
        />
        <input type="date" className={inputCls} value={filters.from} onChange={(e) => setFilter("from", e.target.value)} />
        <input type="date" className={inputCls} value={filters.to} onChange={(e) => setFilter("to", e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden text-sm">
              <thead className="ui-thead">
                <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2">When · who</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Batch</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">From → To</th>
                  <th className="px-3 py-2">Patient / walk-in</th>
                  <th className="px-3 py-2">Reason</th>
                  {canEdit && <th className="px-3 py-2" />}
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
                        {m.type === "supplier_return"
                          ? <>{m.fromLocation?.name || "—"} → {m.batch?.supplier?.name || "supplier"}</>
                          : m.type === "return"
                            ? <>patient → {m.toLocation?.name || "—"}</>
                            : <>{m.fromLocation?.name || "—"} → {m.toLocation?.name || "—"}</>}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <Recipient m={m} showUhid />
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">{m.reason || ""}</td>
                      {canEdit && (
                        <td className="px-3 py-2 text-right">
                          {m.type === "intake" && m.batch && (
                            <button type="button" title="Correct this received line" className="text-primary hover:text-blue-800"
                              onClick={() => setEditing({
                                batchId: m.batch.id, stockItemId: m.item?.id, itemName: m.item?.name, unit: m.item?.unit,
                                labelCode: m.batch.labelCode, qtyReceived: m.batch.qtyReceived,
                                batchNo: m.batch.batchNo, expiryDate: m.batch.expiryDate,
                              })}>
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {data.movements.length === 0 && (
                  <tr><td colSpan={canEdit ? 9 : 8} className="px-3 py-8 text-center text-gray-500">No movements match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={page} totalPages={data.pages} onPageChange={setPage} />
        </>
      )}

      {editing && <ReceivedLineEditModal line={editing} onClose={() => setEditing(null)} onSaved={load} />}

    </div>
  );
};

export default StockMovementsTab;
