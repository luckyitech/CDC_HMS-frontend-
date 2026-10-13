import { useState, useEffect, useMemo } from "react";
import { Download } from "lucide-react";
import SelectMenu from "../shared/SelectMenu";
import SwitcherTabs from "../shared/SwitcherTabs";
import StatusBadge from "../shared/StatusBadge";
import Spinner from "../shared/Spinner";
import Button from "../shared/Button";
import { notify } from "../../utils/notify";
import { downloadCsv } from "../../utils/exportCsv";
import stockService from "../../services/stockService";
import { inputCls, unitPlural } from "./stockUi";

// Stocks → Analytics → Reports → Expiry (13 Oct 2026, Emu: "how many items
// expire a month / time range, and which items?"). Batches whose EXPIRY DATE
// falls in the range — past or future — with what became of each, and one
// summary line per month. Server: GET /stock/reports/expiry (utils/expiryReport).

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthStart = (add) => { const d = new Date(); return iso(new Date(d.getFullYear(), d.getMonth() + add, 1)); };
const monthEnd = (add) => { const d = new Date(); return iso(new Date(d.getFullYear(), d.getMonth() + add + 1, 0)); };

// Expiry ranges look both ways: what is about to expire, and what did.
export const EXPIRY_PRESETS = [
  { id: "this",   label: "This month",          range: () => [monthStart(0), monthEnd(0)] },
  { id: "next3",  label: "This + next 2 months", range: () => [monthStart(0), monthEnd(2)] },
  { id: "next6",  label: "Next 6 months",       range: () => [monthStart(0), monthEnd(5)] },
  { id: "last",   label: "Last month",          range: () => [monthStart(-1), monthEnd(-1)] },
  { id: "last3",  label: "Last 3 months",       range: () => [monthStart(-3), monthEnd(-1)] },
  { id: "last12", label: "Last 12 months",      range: () => [monthStart(-12), monthEnd(-1)] },
  { id: "custom", label: "Custom range" },
];
export const DEFAULT_EXPIRY_RANGE = () => EXPIRY_PRESETS[1].range();

const STATUS_TONES = { on_shelf: "info", expired_on_shelf: "danger", written_off: "amber", returned: "neutral", used_up: "success" };
const FILTERS = [
  { id: "all", label: "All" },
  { id: "on_shelf", label: "On shelf" },
  { id: "expired_on_shelf", label: "Expired — on shelf" },
  { id: "written_off", label: "Written off" },
  { id: "returned", label: "Returned" },
  { id: "used_up", label: "Used up" },
];

const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
};
const fmtDate = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// Sheet rows — shared by this report's CSV and the all-reports workbook.
export const EXPIRY_HEADERS = ["Expiry", "Item", "Unit", "Shelf code", "Batch", "Received", "Used", "Written off", "Returned to supplier", "Still held", "Where", "Status"];
export const expiryRows = (batches = []) => batches.map((b) => [
  b.expiryDate, b.item?.name || "", b.item?.unit || "", b.labelCode || "", b.batchNo || "",
  b.received, b.used, b.writtenOff, b.returned || 0, b.held,
  b.locations.map((l) => `${l.name} (${l.quantity})`).join("; "), b.statusLabel,
]);

const th = "px-3 py-2";
const num = "px-3 py-2 text-right tabular-nums";

const ExpiryReport = () => {
  const [preset, setPreset] = useState("next3");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [filter, setFilter] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [from, to] = useMemo(() => {
    if (preset === "custom") return [custom.from, custom.to];
    return EXPIRY_PRESETS.find((p) => p.id === preset).range();
  }, [preset, custom]);

  useEffect(() => {
    if (!from || !to) return undefined;
    let live = true;
    setLoading(true);
    stockService.getExpiryReport({ from, to })
      .then((res) => { if (live && res?.success) setData(res.data); })
      .catch((err) => { if (live) { setData(null); notify("error", err?.message || "Failed to load the expiry report"); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [from, to]);

  const counts = useMemo(() => {
    const c = { all: data?.batches.length || 0 };
    (data?.batches || []).forEach((b) => { c[b.status] = (c[b.status] || 0) + 1; });
    return c;
  }, [data]);
  const shown = useMemo(
    () => (data?.batches || []).filter((b) => filter === "all" || b.status === filter),
    [data, filter]
  );
  const totals = useMemo(() => (data?.months || []).reduce((t, m) => ({
    batches: t.batches + m.batches, received: t.received + m.received, used: t.used + m.used,
    writtenOff: t.writtenOff + m.writtenOff, returned: t.returned + (m.returned || 0), held: t.held + m.held, expiredOnShelf: t.expiredOnShelf + m.expiredOnShelf,
  }), { batches: 0, received: 0, used: 0, writtenOff: 0, returned: 0, held: 0, expiredOnShelf: 0 }), [data]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-600">Expiring</span>
        <SelectMenu className={`${inputCls} !w-auto !py-1.5 text-xs`} value={preset} onChange={(e) => setPreset(e.target.value)}>
          {EXPIRY_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </SelectMenu>
        {preset === "custom" && (
          <>
            <input type="date" className={`${inputCls} !w-auto !py-1.5 text-xs`} value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
            <span className="text-xs text-gray-400">to</span>
            <input type="date" className={`${inputCls} !w-auto !py-1.5 text-xs`} value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
          </>
        )}
        {from && to && <span className="text-xs text-gray-500">{fmtDate(from)} – {fmtDate(to)}</span>}
        {data?.batches.length > 0 && (
          <Button variant="outline" className="!px-3 !py-1.5 text-xs ml-auto"
            onClick={() => downloadCsv(`expiry-${from}-to-${to}.csv`, EXPIRY_HEADERS, expiryRows(shown))}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        )}
      </div>

      {loading && <div className="flex justify-center py-10"><Spinner /></div>}

      {!loading && data && data.batches.length === 0 && (
        <p className="text-sm text-gray-500 py-6 text-center">No batch expires in this range.</p>
      )}

      {!loading && data?.batches.length > 0 && (
        <>
          {/* One line per expiry month */}
          <div className="overflow-x-auto">
            <table className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden text-sm">
              <thead className="ui-thead">
                <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
                  <th className={th}>Expiry month</th>
                  <th className={`${th} text-right`}>Batches</th>
                  <th className={`${th} text-right`}>Received</th>
                  <th className={`${th} text-right`}>Used</th>
                  <th className={`${th} text-right`}>Written off</th>
                  <th className={`${th} text-right`}>Returned</th>
                  <th className={`${th} text-right`}>Still on shelf</th>
                </tr>
              </thead>
              <tbody>
                {data.months.map((m) => (
                  <tr key={m.month} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium">
                      {monthLabel(m.month)}{m.past && <span className="ml-2 text-xs text-gray-400">past</span>}
                    </td>
                    <td className={num}>{m.batches}</td>
                    <td className={num}>{m.received}</td>
                    <td className={num}>{m.used}</td>
                    <td className={`${num} ${m.writtenOff ? "text-amber-700 font-semibold" : ""}`}>{m.writtenOff}</td>
                    <td className={num}>{m.returned || 0}</td>
                    <td className={`${num} ${m.expiredOnShelf ? "text-red-600 font-semibold" : ""}`}>
                      {m.held}{m.expiredOnShelf > 0 && <span className="block text-[11px] font-normal">{m.expiredOnShelf} expired</span>}
                    </td>
                  </tr>
                ))}
                {data.months.length > 1 && (
                  <tr className="border-t-2 border-gray-200 font-semibold">
                    <td className="px-3 py-2">Total</td>
                    <td className={num}>{totals.batches}</td>
                    <td className={num}>{totals.received}</td>
                    <td className={num}>{totals.used}</td>
                    <td className={num}>{totals.writtenOff}</td>
                    <td className={num}>{totals.returned}</td>
                    <td className={num}>{totals.held}</td>
                  </tr>
                )}
              </tbody>
            </table>
            <p className="text-xs text-gray-500 mt-1.5">
              Units, counted in each item's own unit. "Used" = received − written off − returned to the supplier − still on shelf (dispensed, used in clinic or corrected at a count).
            </p>
          </div>

          {/* Which items */}
          <div>
            <SwitcherTabs size="sm" className="mb-3" active={filter} onChange={setFilter} idPrefix="expiry-filter"
              tabs={FILTERS.filter((f) => f.id === "all" || counts[f.id]).map((f) => ({ ...f, count: counts[f.id] || 0 }))} />
            <div className="overflow-x-auto">
              <table className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden text-sm">
                <thead className="ui-thead">
                  <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
                    <th className={th}>Expiry</th>
                    <th className={th}>Item</th>
                    <th className={th}>Shelf code · batch</th>
                    <th className={`${th} text-right`}>Received</th>
                    <th className={`${th} text-right`}>Used</th>
                    <th className={`${th} text-right`}>Written off</th>
                    <th className={`${th} text-right`}>Returned</th>
                    <th className={th}>Still held</th>
                    <th className={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((b) => (
                    <tr key={b.id} className="border-t border-gray-100 align-top">
                      <td className="px-3 py-2 whitespace-nowrap">{fmtDate(b.expiryDate)}</td>
                      <td className="px-3 py-2 font-medium">
                        {b.item?.name}<span className="block text-xs text-gray-400">{unitPlural(b.item?.unit)}</span>
                      </td>
                      <td className="px-3 py-2 text-xs"><span className="font-mono">{b.labelCode}</span>{b.batchNo && <span className="block text-gray-500">{b.batchNo}</span>}</td>
                      <td className={num}>{b.received}</td>
                      <td className={num}>{b.used}</td>
                      <td className={num}>{b.writtenOff || <span className="text-gray-300">0</span>}</td>
                      <td className={num}>{b.returned || <span className="text-gray-300">0</span>}</td>
                      <td className="px-3 py-2 text-xs">
                        {b.held
                          ? <><span className="font-semibold text-sm">{b.held}</span><span className="block text-gray-500">{b.locations.map((l) => `${l.name} (${l.quantity})`).join(", ")}</span></>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge shape="tag" size="xs" bordered={false} tone={STATUS_TONES[b.status]}>{b.statusLabel}</StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.truncated && <p className="text-xs text-amber-700 mt-1.5">Showing the first 2,000 batches — narrow the range to see the rest.</p>}
          </div>
        </>
      )}
    </div>
  );
};

export default ExpiryReport;
