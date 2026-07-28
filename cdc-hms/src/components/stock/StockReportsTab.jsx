import { useState, useEffect, useCallback, useMemo } from "react";
import { notify } from "../../utils/notify";
import { Download, Search, DatabaseZap, FileSpreadsheet } from "lucide-react";
import { useUserContext } from "../../contexts/UserContext";
import stockService from "../../services/stockService";
import { downloadWorkbook } from "../../utils/exportCsv";
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
  { id: "inventory", label: "Inventory overview" },
  { id: "reorder", label: "Reorder" },
  { id: "consumption", label: "Consumption" },
  { id: "recall", label: "Batch recall" },
  { id: "disposal", label: "Disposal register" },
  { id: "fefo", label: "FEFO overrides" },
  { id: "variances", label: "Variances" },
];

// Date-range presets shared by the movement reports and the Excel export.
const RANGE_PRESETS = [
  { id: "all", label: "All time" },
  { id: "1m", label: "Last month" },
  { id: "3m", label: "Last 3 months" },
  { id: "6m", label: "Last 6 months" },
  { id: "1y", label: "Last year" },
  { id: "custom", label: "Custom range" },
];

// Sheet builders reused by per-report CSV and the all-in-one workbook.
const movementRows = (rows = []) => rows.map((m) => [
  m.createdAt ? new Date(m.createdAt).toISOString().slice(0, 10) : "",
  m.performedByUser ? `${m.performedByUser.firstName} ${m.performedByUser.lastName}` : "",
  m.type, m.item?.name || "", m.batch?.labelCode || "", m.quantity,
  m.fromLocation?.name || m.toLocation?.name || "",
  m.Patient ? `${m.Patient.firstName} ${m.Patient.lastName}` : "",
  m.reason || "",
]);
const MOVEMENT_HEADERS = ["Date", "By", "Type", "Item", "Batch", "Qty", "Location", "Patient", "Reason"];

const INVENTORY_HEADERS = [
  "Item", "Category", "Availability", "Unit", "Locations", "Reorder level",
  "Last order qty", "Last order date", "Last count", "Expected", "Variance", "Variance reason",
];
const inventoryRows = (rows = []) => rows.map((r) => [
  r.name, r.category, r.totalQuantity, r.unit,
  (r.locations || []).map((l) => `${l.name}: ${l.quantity}`).join("; "),
  r.reorderLevel || 0,
  r.lastOrder?.quantity ?? "",
  r.lastOrder?.date ? new Date(r.lastOrder.date).toISOString().slice(0, 10) : "",
  r.lastStocktake?.counted ?? "",
  r.lastStocktake?.expected ?? "",
  r.lastStocktake?.variance ?? "",
  r.lastStocktake?.reason || "",
]);

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
        <th className="px-3 py-2">Location</th>
        <th className="px-3 py-2">Patient</th>
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
            <td className="px-3 py-2 text-xs">{m.fromLocation?.name || m.toLocation?.name || "—"}</td>
            <td className="px-3 py-2 text-xs">
              {m.Patient ? `${m.Patient.firstName} ${m.Patient.lastName}` : <span className="text-gray-300">—</span>}
            </td>
            <td className="px-3 py-2 text-xs text-gray-600">{m.reason}</td>
          </tr>
        );
      })}
      {rows.length === 0 && (
        <tr><td colSpan="8" className="px-3 py-8 text-center text-gray-500">Nothing recorded yet.</td></tr>
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
  const [sub, setSub] = useState("inventory");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [recallQuery, setRecallQuery] = useState("");
  const [months, setMonths] = useState(6);
  const [preset, setPreset] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [invSort, setInvSort] = useState("name");   // name | availability

  // The from/to the movement reports and the Excel export use.
  const dateRange = useMemo(() => {
    if (preset === "custom") return { from: customFrom || undefined, to: customTo || undefined };
    if (preset === "all") return {};
    const from = new Date();
    if (preset === "1m") from.setMonth(from.getMonth() - 1);
    else if (preset === "3m") from.setMonth(from.getMonth() - 3);
    else if (preset === "6m") from.setMonth(from.getMonth() - 6);
    else if (preset === "1y") from.setFullYear(from.getFullYear() - 1);
    return { from: from.toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) };
  }, [preset, customFrom, customTo]);

  // Only the movement-based reports narrow by date; snapshots (inventory,
  // reorder) are always "as of now".
  const rangeApplies = ["disposal", "fefo", "variances"].includes(sub);

  // Inventory overview, sorted the way the user picked.
  const sortedInventory = useMemo(() => {
    if (sub !== "inventory" || !Array.isArray(data)) return [];
    const copy = [...data];
    copy.sort((a, b) => invSort === "availability"
      ? (a.totalQuantity - b.totalQuantity) || a.name.localeCompare(b.name)
      : a.name.localeCompare(b.name));
    return copy;
  }, [sub, data, invSort]);

  // Every report on its own sheet in ONE Excel workbook (no library).
  const exportAll = async () => {
    setLoading(true);
    try {
      const [inv, reorder, cons, disp, fefo, varr] = await Promise.all([
        stockService.getInventoryReport(),
        stockService.getReorderReport(),
        stockService.getConsumptionReport(months),
        stockService.getDisposalReport(dateRange),
        stockService.getFefoOverridesReport(dateRange),
        stockService.getVariancesReport(dateRange),
      ]);
      const sheets = [];
      if (inv.success) sheets.push({ name: "Inventory", headers: INVENTORY_HEADERS, rows: inventoryRows(inv.data) });
      if (reorder.success) sheets.push({
        name: "Reorder",
        headers: ["Item", "Category", "Unit", "In stock", "Reorder level", "Suggested order"],
        rows: reorder.data.map((i) => [i.name, i.category, i.unit, i.totalQuantity, i.reorderLevel, i.suggestedOrder]),
      });
      if (cons.success) sheets.push({
        name: "Consumption",
        headers: ["Item", ...cons.data.months, "Written off"],
        rows: cons.data.items.map((e) => [
          e.item.name,
          ...cons.data.months.map((k) => e.months[k]?.consumed || 0),
          cons.data.months.reduce((s, k) => s + (e.months[k]?.writtenOff || 0), 0),
        ]),
      });
      if (disp.success) sheets.push({ name: "Disposal", headers: MOVEMENT_HEADERS, rows: movementRows(disp.data) });
      if (fefo.success) sheets.push({ name: "FEFO overrides", headers: MOVEMENT_HEADERS, rows: movementRows(fefo.data) });
      if (varr.success) sheets.push({ name: "Variances", headers: MOVEMENT_HEADERS, rows: movementRows(varr.data) });

      downloadWorkbook(`stock-reports-${new Date().toISOString().slice(0, 10)}.xls`, sheets);
    } catch (err) {
      notify("error", err?.message || "Excel export failed");
    } finally {
      setLoading(false);
    }
  };

  const load = useCallback(async () => {
    if (sub === "recall") { setData(null); return; }
    setLoading(true);
    try {
      const res =
        sub === "inventory" ? await stockService.getInventoryReport()
        : sub === "reorder" ? await stockService.getReorderReport()
        : sub === "consumption" ? await stockService.getConsumptionReport(months)
        : sub === "disposal" ? await stockService.getDisposalReport(dateRange)
        : sub === "variances" ? await stockService.getVariancesReport(dateRange)
        : await stockService.getFefoOverridesReport(dateRange);
      if (res.success) setData(res.data);
    } catch (err) {
      notify("error", err?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [sub, months, dateRange]);

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
        <div className="flex items-center gap-2 flex-wrap">
          {rangeApplies && (
            <>
              <select className={`${inputCls} !w-auto !py-1.5 text-xs`} value={preset} onChange={(e) => setPreset(e.target.value)}>
                {RANGE_PRESETS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              {preset === "custom" && (
                <>
                  <input type="date" className={`${inputCls} !w-auto !py-1.5 text-xs`} value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                  <span className="text-xs text-gray-400">to</span>
                  <input type="date" className={`${inputCls} !w-auto !py-1.5 text-xs`} value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                </>
              )}
            </>
          )}
          <Button variant="outline" className="!px-3 !py-1.5 text-xs" onClick={exportAll}>
            <FileSpreadsheet className="w-4 h-4" /> Export all to Excel
          </Button>
          {currentUser?.role === "admin" && (
            <Button variant="outline" className="!px-3 !py-1.5 text-xs" onClick={rebuild}>
              <DatabaseZap className="w-4 h-4" /> Rebuild levels from ledger
            </Button>
          )}
        </div>
      </div>

      {loading && <div className="flex justify-center py-12"><Spinner /></div>}

      {/* Inventory overview — everything in one place */}
      {!loading && sub === "inventory" && Array.isArray(data) && (
        <>
          <div className="flex justify-between items-center mb-2 gap-2 flex-wrap">
            <select className={`${inputCls} !w-auto`} value={invSort} onChange={(e) => setInvSort(e.target.value)}>
              <option value="name">Sort A–Z</option>
              <option value="availability">Sort by availability (low → high)</option>
            </select>
            <Button variant="outline" className="!px-3 !py-1.5 text-xs"
              onClick={() => downloadCsv("inventory-overview.csv", INVENTORY_HEADERS, inventoryRows(sortedInventory))}>
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Available</th>
                  <th className="px-3 py-2">Locations</th>
                  <th className="px-3 py-2">Reorder</th>
                  <th className="px-3 py-2">Last order</th>
                  <th className="px-3 py-2">Last count</th>
                  <th className="px-3 py-2">Variance</th>
                </tr>
              </thead>
              <tbody>
                {sortedInventory.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 align-top">
                    <td className="px-3 py-2 font-medium">
                      {r.name}<span className="block text-xs text-gray-400">{r.category}</span>
                    </td>
                    <td className={`px-3 py-2 font-bold ${r.reorderLevel > 0 && r.totalQuantity <= r.reorderLevel ? "text-red-600" : ""}`}>
                      {r.totalQuantity} {r.unit}(s)
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {r.locations.length
                        ? r.locations.map((l) => `${l.name}: ${l.quantity}`).join(" · ")
                        : <span className="text-gray-300">not held anywhere</span>}
                    </td>
                    <td className="px-3 py-2">{r.reorderLevel || "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      {r.lastOrder
                        ? `${r.lastOrder.quantity} · ${new Date(r.lastOrder.date).toLocaleDateString("en-GB")}`
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.lastStocktake
                        ? `${r.lastStocktake.counted ?? "?"} · ${new Date(r.lastStocktake.date).toLocaleDateString("en-GB")}`
                        : <span className="text-gray-300">never</span>}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.lastStocktake ? (
                        <span className={r.lastStocktake.variance === 0 ? "text-gray-500" : "text-amber-700"} title={r.lastStocktake.reason || ""}>
                          {r.lastStocktake.variance > 0 ? `+${r.lastStocktake.variance}` : r.lastStocktake.variance}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr><td colSpan="7" className="px-3 py-8 text-center text-gray-500">No active items.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Everything in one place — availability, where it sits, last order and last stocktake variance.
            Export this sheet, or “Export all to Excel” for every report in one workbook.
          </p>
        </>
      )}

      {/* Reorder */}
      {!loading && sub === "reorder" && data && (
        <>
          <div className="flex justify-end mb-2">
            <Button variant="outline" className="!px-3 !py-1.5 text-xs"
              onClick={() => downloadCsv("reorder-report.csv",
                ["Item", "Category", "Unit", "In stock", "Reorder level", "Suggested order"],
                data.map((i) => [i.name, i.category, i.unit, i.totalQuantity, i.reorderLevel, i.suggestedOrder]))}>
              <Download className="w-4 h-4" /> Export CSV
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
              <Download className="w-4 h-4" /> Export CSV
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

              {r.recipients?.length > 0 && (
                <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <p className="text-xs font-semibold text-blue-900 mb-1">Dispensed to {r.recipients.length} patient(s):</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-blue-900">
                    {r.recipients.map((p) => (
                      <span key={p.uhid}>
                        {p.name} <span className="font-mono text-blue-700">({p.uhid})</span> — {p.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <MovementTable rows={r.movements} />
            </div>
          ))}
          <p className="text-xs text-gray-500">
            Every movement, location and patient this batch touched. Over-the-counter dispenses have no
            patient attached; supplies dispensed at checkout are traced to the patient who received them.
          </p>
        </div>
      )}

      {/* Disposal / FEFO / Variances — all movement-row reports */}
      {!loading && (sub === "disposal" || sub === "fefo" || sub === "variances") && Array.isArray(data) && (
        <>
          <div className="flex justify-end mb-2">
            <Button variant="outline" className="!px-3 !py-1.5 text-xs"
              onClick={() => movementCsv(
                sub === "disposal" ? "disposal-register.csv" : sub === "variances" ? "variances-report.csv" : "fefo-overrides.csv",
                data,
              )}>
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>
          <MovementTable rows={data} />
          <p className="text-xs text-gray-500 mt-2">
            {sub === "disposal"
              ? "Every write-off with its reason — the register an inspector asks for."
              : sub === "variances"
                ? "Every stocktake variance and manual count correction — the reason shows expected vs counted. Each row is the reconciliation: the ledger was moved to the counted figure."
                : "Every time the suggested earliest-expiring batch was bypassed, by whom and why."}
          </p>
        </>
      )}
    </div>
  );
};

export default StockReportsTab;
