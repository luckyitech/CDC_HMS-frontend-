import { useState, useEffect } from "react";
import { Package } from "lucide-react";
import stockService from "../../services/stockService";

// "Dispensed medications" panel for a patient profile — every stock item
// dispensed to this patient (merge-aware on the backend), newest first.
// Read-only patient-care context; renders nothing while loading or when the
// patient has never been dispensed anything, so it never clutters a profile.
const StockDispenseHistory = ({ uhid }) => {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (!uhid) return;
    let cancelled = false;
    stockService.getPatientDispenses(uhid)
      .then((res) => { if (!cancelled) setRows(res.success ? res.data : []); })
      .catch(() => { if (!cancelled) setRows([]); });
    return () => { cancelled = true; };
  }, [uhid]);

  if (!rows || rows.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mt-6">
      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
        <Package className="w-5 h-5 text-primary" />
        Dispensed Medications
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2 text-center">Qty</th>
              <th className="px-3 py-2">Batch</th>
              <th className="px-3 py-2">Dispensed by</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-t border-gray-100">
                <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                  {new Date(m.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-3 py-2 font-medium">{m.item?.name}</td>
                <td className="px-3 py-2 text-center font-bold">{m.quantity} {m.item?.unit}(s)</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-500">
                  {m.batch?.labelCode}{m.batch?.expiryDate && ` · exp ${m.batch.expiryDate}`}
                </td>
                <td className="px-3 py-2 text-xs text-gray-600">
                  {m.performedByUser ? `${m.performedByUser.firstName} ${m.performedByUser.lastName}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Medications dispensed to this patient at checkout. Quantities only — no pricing.
      </p>
    </div>
  );
};

export default StockDispenseHistory;
