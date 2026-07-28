import { useState, useEffect } from "react";
import stockService from "../../services/stockService";
import Spinner from "../shared/Spinner";
import { StatCard } from "./stockUi";

// Landing tab: headline cards + expiry buckets, all from ONE backend request.
const ExpiryTable = ({ title, rows, tone }) => {
  if (!rows?.length) return null;
  return (
    <div className="mb-6">
      <h4 className={`text-sm font-bold mb-2 ${tone}`}>{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Label</th>
              <th className="px-3 py-2">Batch</th>
              <th className="px-3 py-2">Expiry</th>
              <th className="px-3 py-2">Where (qty)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.stockBatchId} className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium">{b.item?.name}</td>
                <td className="px-3 py-2 font-mono text-xs">{b.labelCode}</td>
                <td className="px-3 py-2">{b.batchNo || "—"}</td>
                <td className="px-3 py-2">{b.expiryDate}</td>
                <td className="px-3 py-2 text-xs text-gray-600">
                  {b.locations.map((l) => `${l.name} (${l.quantity})`).join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StockDashboardTab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    stockService.getDashboard()
      .then((res) => { if (res.success) setData(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (!data) return <p className="text-sm text-gray-500">Could not load the stock dashboard.</p>;

  const { cards, itemsBelowReorder, expiry } = data;

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active items" value={cards.activeItems} tone="blue" />
        <StatCard label="Below reorder level" value={cards.itemsBelowReorder} tone="red" />
        <StatCard label="Expiring ≤ 30 days" value={cards.batchesExpiring30} sub="includes already expired" tone="amber" />
        <StatCard label="Movements today" value={cards.todaysMovements} tone="green" />
      </div>

      {itemsBelowReorder?.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-bold text-red-700 mb-2">Items at or below reorder level</h4>
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 text-sm">
            {itemsBelowReorder.map((i) => (
              <div key={i.id} className="px-4 py-2 flex justify-between">
                <span className="font-medium">{i.name}</span>
                <span className="text-gray-600">{i.total} {i.unit}(s) — reorder at {i.reorderLevel}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ExpiryTable title="Already expired — write off" rows={expiry.expired} tone="text-red-700" />
      <ExpiryTable title="Expiring within 30 days" rows={expiry.d30} tone="text-amber-700" />
      <ExpiryTable title="Expiring within 60 days" rows={expiry.d60} tone="text-amber-600" />
      <ExpiryTable title="Expiring within 90 days" rows={expiry.d90} tone="text-gray-600" />

      {!expiry.expired.length && !expiry.d30.length && !expiry.d60.length && !expiry.d90.length && (
        <p className="text-sm text-gray-500">No held batches expire within 90 days.</p>
      )}
    </div>
  );
};

export default StockDashboardTab;
