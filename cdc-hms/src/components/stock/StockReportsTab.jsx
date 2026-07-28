import { useState, useEffect, useCallback } from "react";
import { notify } from "../../utils/notify";
import { Download, Search, DatabaseZap } from "lucide-react";
import { useUserContext } from "../../contexts/UserContext";
import stockService from "../../services/stockService";
import Spinner from "../shared/Spinner";
import Button from "../shared/Button";
import { inputCls, MovementBadge, ByLine } from "./stockUi";

// Reports — straight views over the ledger. Every table exports to CSV.
// No money anywhere.

// Client-side CSV download (no dependency).
const downloadCsv = (filename, headers, rows) => {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const SUB_TABS = [
  { id: "reorder", label: "Reorder" },
  { id: "consumption", label: "Consumption" },
  { id: "recall", label: "Batch recall" },
  { id: "disposal", label: "Disposal register" },
  { id: "fefo", label: "FEFO overrides" },
];

// Shared movement-row table used by disposal and FEFO views.
const MovementTable = ({ rows }) => (
  <table className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden text-sm">
    <thead>
      <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
        <th className="px-3 py-2">When · who</th>
        <th className="px-3 py-2">Type</th>
        <th className="px-3 py-2">Item</th>
        <th className="px-3 py-2">Batch</th>
        <th className="px-3 py-2">Qty</th>
        <th className="px-3 py-2">From</th>
        <th className="px-3 py-2">Reason</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((m) => {
        return (
          <tr key={m.id} className="border-t border-gray-100">
            <td className="px-3 py-2 whitespace-nowrap"><ByLine user={m.performedByUser} at={m.createdAt} /></td>
            <td className="px-3 py-2"><MovementBadge type={m.type} /></td>
            <td className="px-3 py-2 font-medium">{m.item?.name}</td>
            <td className="px-3 py-2 font-mono text-xs">{m.batch?.labelCode}</td>
            <td className="px-3 py-2 font-bold">{m.quantity}</td>
            <td className="px-3 py-2 text-xs">{m.fromLocation?.name || "—"}</td>
            <td className="px-3 py-2 text-xs text-gray-600">{m.reason}</td>
          </tr>
        );
      })}
      {rows.length === 0 && (
        <tr><td colSpan="7" className="px-3 py-8 text-center text-gray-500">Nothing recorded yet.</td></tr>
      )}
    </tbody>
  </table>
);

const movementCsv = (name, rows) => downloadCsv(
  name,
  ["Date", "By", "Type", "Item", "Batch", "Qty", "From", "Reason"],
  rows.map((m) => [
    new Date(m.createdAt).toISOString(),
    m.performedByUser ? `${m.performedByUser.firstName} ${m.performedByUser.lastName}` : "",
    m.type, m.item?.name, m.batch?.labelCode, m.quantity, m.fromLocation?.name || "", m.reason || "",
  ])
);

const StockReportsTab = () => {
  const { currentUser } = useUserContext();
  const [sub, setSub] = useState("reorder");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [recallQuery, setRecallQuery] = useState("");
  const [months, setMonths] = useState(6);

  const load = useCallback(async () => {
    if (sub === "recall") { setData(null); return; }
    setLoading(true);
    try {
      const res =
        sub === "reorder" ? await stockService.getReorderReport()
        : sub === "consumption" ? await stockService.getConsumptionReport(months)
        : sub === "disposal" ? await stockService.getDisposalReport()
        : await stockService.getFefoOverridesReport();
      if (res.success) setData(res.data);
    } catch (err) {
      notify("error", err?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [sub, months]);

  useEffect(() => { load(); }, [load]);

  const runRecall = async () => {
    if (!recallQuery.trim()) return;
    setLoading(true);
    try {
      const res = await stockService.getRecallReport(recallQuery.trim());
      if (res.success) setData(res.data);
    } catch (err) {
      setData(null);
      notify("error", err?.message || "No batch matches");
    } finally {
      setLoading(false);
    }
  };

  const rebuild = async () => {
    if (!window.confirm("Recompute all stock levels from the ledger? Screens may shift if the levels had drifted.")) return;
    try {
      const res = await stockService.rebuildLevels();
      if (res.success) notify("success", res.data?.message || "Levels rebuilt");
    } catch (err) {
      notify("error", err?.message || "Rebuild failed");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">
          {SUB_TABS.map((t) => (
            <button key={t.id} onClick={() => { setSub(t.id); setData(null); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                sub === t.id ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        {currentUser?.role === "admin" && (
          <Button variant="outline" className="!px-3 !py-1.5 text-xs" onClick={rebuild}>
            <DatabaseZap className="w-4 h-4" /> Rebuild levels from ledger
          </Button>
        )}
      </div>

      {loading && <div className="flex justify-center py-12"><Spinner /></div>}

      {/* Reorder */}
      {!loading && sub === "reorder" && data && (
        <>
          <div className="flex justify-end mb-2">
            <Button variant="outline" className="!px-3 !py-1.5 text-xs"
              onClick={() => downloadCsv("reorder-report.csv",
                ["Item", "Category", "Unit", "In stock", "Reorder level", "Suggested order"],
                data.map((i) => [i.name, i.category, i.unit, i.totalQuantity, i.reorderLevel, i.suggestedOrder]))}>
              <Download className="w-4 h-4" /> CSV
            </Button>
          </div>
          <table className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2">Item</th><th className="px-3 py-2">In stock</th>
                <th className="px-3 py-2">Reorder level</th><th className="px-3 py-2">Suggested order</th>
              </tr>
            </thead>
            <tbody>
              {data.map((i) => (
                <tr key={i.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">{i.name}</td>
                  <td className="px-3 py-2 font-bold text-red-600">{i.totalQuantity} {i.unit}(s)</td>
                  <td className="px-3 py-2">{i.reorderLevel}</td>
                  <td className="px-3 py-2 font-bold">{i.suggestedOrder}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan="4" className="px-3 py-8 text-center text-gray-500">Nothing at or below its reorder level.</td></tr>
              )}
            </tbody>
          </table>
        </>
      )}

      {/* Consumption */}
      {!loading && sub === "consumption" && data && (
        <>
          <div className="flex justify-between items-center mb-2">
            <select className={`${inputCls} !w-auto`} value={months} onChange={(e) => setMonths(Number(e.target.value))}>
              {[3, 6, 12, 24].map((m) => <option key={m} value={m}>Last {m} months</option>)}
            </select>
            <Button variant="outline" className="!px-3 !py-1.5 text-xs"
              onClick={() => downloadCsv("consumption-report.csv",
                ["Item", ...data.months, "Written off"],
                data.items.map((e) => [
                  e.item.name,
                  ...data.months.map((k) => e.months[k]?.consumed || 0),
                  data.months.reduce((s, k) => s + (e.months[k]?.writtenOff || 0), 0),
                ]))}>
              <Download className="w-4 h-4" /> CSV
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2">Item</th>
                  {data.months.map((k) => <th key={k} className="px-3 py-2 text-center">{k}</th>)}
                  <th className="px-3 py-2 text-center">Written off</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((e) => (
                  <tr key={e.item.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium">{e.item.name}</td>
                    {data.months.map((k) => (
                      <td key={k} className="px-3 py-2 text-center">{e.months[k]?.consumed || 0}</td>
                    ))}
                    <td className="px-3 py-2 text-center text-red-600">
                      {data.months.reduce((s, k) => s + (e.months[k]?.writtenOff || 0), 0)}
                    </td>
                  </tr>
                ))}
                {data.items.length === 0 && (
                  <tr><td colSpan={data.months.length + 2} className="px-3 py-8 text-center text-gray-500">No consumption recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">Units dispensed + used per month — the honest basis for reorder and par levels.</p>
        </>
      )}

      {/* Recall */}
      {!loading && sub === "recall" && (
        <div>
          <div className="flex gap-2 mb-4 max-w-md">
            <input className={inputCls} value={recallQuery}
              onChange={(e) => setRecallQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runRecall()}
              placeholder="Manufacturer batch no. or STK- label…" />
            <Button onClick={runRecall}><Search className="w-4 h-4" /> Trace</Button>
          </div>
          {Array.isArray(data) && data.map((r) => (
            <div key={r.batch.id} className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
              <div className="flex flex-wrap justify-between gap-2 mb-3">
                <div>
                  <p className="font-bold">{r.item?.name}</p>
                  <p className="text-xs text-gray-500 font-mono">
                    {r.batch.labelCode} · batch {r.batch.batchNo || "—"} · exp {r.batch.expiryDate || "—"} · {r.batch.status}
                  </p>
                  <p className="text-xs text-gray-500">
                    Received {r.batch.qtyReceived} on {new Date(r.batch.receivedAt).toLocaleDateString("en-GB")}
                    {r.batch.supplier && ` from ${r.batch.supplier}`}
                  </p>
                </div>
                <div className="text-xs text-gray-600">
                  <p className="font-semibold">Currently held:</p>
                  {r.currentLocations.length
                    ? r.currentLocations.map((l) => <p key={l.name}>{l.name}: {l.quantity}</p>)
                    : <p>none — fully moved out</p>}
                </div>
              </div>
              <MovementTable rows={r.movements} />
            </div>
          ))}
          <p className="text-xs text-gray-500">
            Every movement and location this batch touched. Patient-level tracing activates with the
            future patient-linking phase — the ledger already carries the field for it.
          </p>
        </div>
      )}

      {/* Disposal / FEFO */}
      {!loading && (sub === "disposal" || sub === "fefo") && Array.isArray(data) && (
        <>
          <div className="flex justify-end mb-2">
            <Button variant="outline" className="!px-3 !py-1.5 text-xs"
              onClick={() => movementCsv(sub === "disposal" ? "disposal-register.csv" : "fefo-overrides.csv", data)}>
              <Download className="w-4 h-4" /> CSV
            </Button>
          </div>
          <MovementTable rows={data} />
          <p className="text-xs text-gray-500 mt-2">
            {sub === "disposal"
              ? "Every write-off with its reason — the register an inspector asks for."
              : "Every time the suggested earliest-expiring batch was bypassed, by whom and why."}
          </p>
        </>
      )}
    </div>
  );
};

export default StockReportsTab;
