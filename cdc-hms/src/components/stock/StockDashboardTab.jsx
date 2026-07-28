import { useState, useEffect, useCallback } from "react";
import { notify } from "../../utils/notify";
import { Trash2 } from "lucide-react";
import stockService from "../../services/stockService";
import Spinner from "../shared/Spinner";
import Button from "../shared/Button";
import Modal from "../shared/Modal";
import { StatCard, Field, inputCls } from "./stockUi";

// Landing tab: headline cards + expiry buckets, all from ONE backend request.
// Expired rows offer the write-off flow (reason required → disposal register).
const ExpiryTable = ({ title, rows, tone, onWriteOff }) => {
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
              {onWriteOff && <th className="px-3 py-2" />}
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
                {onWriteOff && (
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => onWriteOff(b)} className="text-red-500 hover:text-red-700" title="Write off">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
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
  const [writeOff, setWriteOff] = useState(null);   // expiry entry being written off
  const [woForm, setWoForm] = useState({ locationId: "", quantity: "", reason: "Expired stock" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    stockService.getDashboard()
      .then((res) => { if (res.success) setData(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openWriteOff = (entry) => {
    setWriteOff(entry);
    const only = entry.locations.length === 1 ? entry.locations[0] : null;
    setWoForm({
      locationId: only ? String(only.id) : "",
      quantity: only ? String(only.quantity) : "",
      reason: "Expired stock",
    });
  };

  const submitWriteOff = async () => {
    if (!woForm.locationId) return notify("error", "Choose the location");
    if (!woForm.quantity || Number(woForm.quantity) < 1) return notify("error", "Enter a quantity");
    if (!woForm.reason.trim()) return notify("error", "A reason is required");
    setBusy(true);
    try {
      const res = await stockService.writeoff({
        stockBatchId: writeOff.stockBatchId,
        locationId: Number(woForm.locationId),
        quantity: Number(woForm.quantity),
        kind: "expiry",
        reason: woForm.reason.trim(),
      });
      if (res.success) {
        notify("success", "Written off — recorded in the disposal register");
        setWriteOff(null);
        load();
      } else {
        notify("error", res.message || "Write-off failed");
      }
    } catch (err) {
      notify("error", err?.message || "Write-off failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (!data) return <p className="text-sm text-gray-500">Could not load the stock dashboard.</p>;

  const { cards, itemsBelowReorder, expiry, sweep } = data;

  return (
    <div>
      {sweep?.newlyExpired > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 font-semibold">
          {sweep.newlyExpired} batch(es) passed their expiry date since the last check — they are
          blocked from dispensing and listed below for write-off.
        </div>
      )}
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

      <ExpiryTable title="Already expired — write off" rows={expiry.expired} tone="text-red-700" onWriteOff={openWriteOff} />
      <ExpiryTable title="Expiring within 30 days" rows={expiry.d30} tone="text-amber-700" />
      <ExpiryTable title="Expiring within 60 days" rows={expiry.d60} tone="text-amber-600" />
      <ExpiryTable title="Expiring within 90 days" rows={expiry.d90} tone="text-gray-600" />

      {!expiry.expired.length && !expiry.d30.length && !expiry.d60.length && !expiry.d90.length && (
        <p className="text-sm text-gray-500">No held batches expire within 90 days.</p>
      )}

      {writeOff && (
        <Modal isOpen onClose={() => setWriteOff(null)} title="Write off expired stock">
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 text-sm">
            <p className="font-semibold">{writeOff.item?.name}</p>
            <p className="text-xs text-gray-600 font-mono">
              {writeOff.labelCode} · expired {writeOff.expiryDate}
            </p>
          </div>
          <Field label="Location">
            <select className={inputCls} value={woForm.locationId}
              onChange={(e) => {
                const loc = writeOff.locations.find((l) => String(l.id) === e.target.value);
                setWoForm((p) => ({ ...p, locationId: e.target.value, quantity: loc ? String(loc.quantity) : p.quantity }));
              }}>
              <option value="">— choose —</option>
              {writeOff.locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name} ({l.quantity} held)</option>
              ))}
            </select>
          </Field>
          <Field label="Quantity to write off">
            <input type="number" min="1" className={inputCls} value={woForm.quantity}
              onChange={(e) => setWoForm((p) => ({ ...p, quantity: e.target.value }))} />
          </Field>
          <Field label="Reason (goes to the disposal register)">
            <input className={inputCls} value={woForm.reason}
              onChange={(e) => setWoForm((p) => ({ ...p, reason: e.target.value }))} />
          </Field>
          <div className="flex gap-3 mt-4">
            <Button variant="danger" className="flex-1" disabled={busy} onClick={submitWriteOff}>Write off</Button>
            <Button variant="outline" className="flex-1" onClick={() => setWriteOff(null)}>Cancel</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StockDashboardTab;
