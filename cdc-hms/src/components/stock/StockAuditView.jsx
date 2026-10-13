import { useState, useEffect, useMemo } from "react";
import { Download, RefreshCw } from "lucide-react";
import SelectMenu from "../shared/SelectMenu";
import Spinner from "../shared/Spinner";
import Button from "../shared/Button";
import { notify } from "../../utils/notify";
import { downloadCsv } from "../../utils/exportCsv";
import stockService from "../../services/stockService";
import { inputCls } from "./stockUi";

// Stocks → Analytics → Audit (13 Oct 2026, Emu): when receiving, stocktakes
// and room balancing took place and by whom — so management can track the
// functions, set schedules and plan around leave — and every timestamped
// stock event. Server: GET /stock/reports/audit (utils/stockAudit +
// utils/stockAuditReport). The same events show in the HMS Activity Log and
// each person's Staff File → Activity.

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const monthStart = (add) => { const d = new Date(); return iso(new Date(d.getFullYear(), d.getMonth() + add, 1)); };
const monthEnd = (add) => { const d = new Date(); return iso(new Date(d.getFullYear(), d.getMonth() + add + 1, 0)); };

const PRESETS = [
  { id: "7",      label: "Last 7 days",   range: () => [daysAgo(6), iso(new Date())] },
  { id: "30",     label: "Last 30 days",  range: () => [daysAgo(29), iso(new Date())] },
  { id: "month",  label: "This month",    range: () => [monthStart(0), iso(new Date())] },
  { id: "last",   label: "Last month",    range: () => [monthStart(-1), monthEnd(-1)] },
  { id: "90",     label: "Last 3 months", range: () => [daysAgo(89), iso(new Date())] },
  { id: "custom", label: "Custom range" },
];

const FUNCTIONS = [
  { id: "", label: "All functions" },
  { id: "receiving", label: "Receiving" },
  { id: "stocktake", label: "Stocktake" },
  { id: "rooms", label: "Room balancing" },
  { id: "dispense", label: "Dispense & use" },
  { id: "transfer", label: "Transfer" },
  { id: "returns", label: "Returns" },
  { id: "writeoff", label: "Write-off" },
  { id: "items", label: "Items (catalogue)" },
  { id: "tests", label: "Tests" },
];
const FN_LABEL = Object.fromEntries(FUNCTIONS.map((f) => [f.id, f.label]));
const FN_TONE = {
  receiving: "bg-emerald-100 text-emerald-700",
  stocktake: "bg-teal-100 text-teal-700",
  rooms: "bg-sky-100 text-sky-700",
  dispense: "bg-blue-100 text-blue-700",
  transfer: "bg-sky-100 text-sky-700",
  returns: "bg-violet-100 text-violet-700",
  writeoff: "bg-red-100 text-red-700",
  items: "bg-slate-100 text-slate-700",
  tests: "bg-cyan-100 text-cyan-700",
  other: "bg-gray-100 text-gray-700",
};

const fmtDateTime = (at) => new Date(at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const fmtDay = (at) => new Date(at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const ageDays = (at) => Math.floor((Date.now() - new Date(at).getTime()) / 86400000);
const ageText = (at) => {
  const d = ageDays(at);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};
const duration = (from, to) => {
  const mins = Math.round((new Date(to) - new Date(from)) / 60000);
  if (!from || !to || mins < 1) return null;
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h ${mins % 60} min`;
};

const th = "px-3 py-2";
const num = "px-3 py-2 text-right tabular-nums";
const Badge = ({ fn, children }) => (
  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${FN_TONE[fn] || FN_TONE.other}`}>{children}</span>
);
const Section = ({ title, hint, children, action }) => (
  <section>
    <div className="flex items-end justify-between gap-3 mb-2">
      <div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

// One "last done" line: place, when, who — amber once it is older than `staleAfter` days.
const LastLine = ({ name, at, staff, staleAfter }) => {
  const stale = !at || ageDays(at) > staleAfter;
  return (
    <li className="flex items-baseline justify-between gap-3 py-1.5 border-t border-gray-100 first:border-t-0">
      <span className="text-sm text-gray-800">{name}</span>
      <span className={`text-xs text-right ${stale ? "text-amber-700 font-semibold" : "text-gray-500"}`}>
        {at ? <>{fmtDay(at)} · {ageText(at)}{staff ? <span className="block font-normal text-gray-500">{staff}</span> : null}</> : "Never"}
      </span>
    </li>
  );
};

const EVENT_HEADERS = ["When", "Function", "Action", "By", "Role", "Where", "Detail", "Patient", "UHID"];
const eventRows = (events) => events.map((e) => [
  new Date(e.at).toISOString(), FN_LABEL[e.fn] || e.fn, e.label, e.staff, e.role || "", e.location || "", e.detail || "", e.patient || "", e.uhid || "",
]);

const StockAuditView = () => {
  const [preset, setPreset] = useState("30");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [userId, setUserId] = useState("");
  const [fn, setFn] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);

  const [from, to] = useMemo(() => {
    if (preset === "custom") return [custom.from, custom.to];
    return PRESETS.find((p) => p.id === preset).range();
  }, [preset, custom]);

  useEffect(() => {
    if (!from || !to) return undefined;
    let live = true;
    setLoading(true);
    stockService.getAuditReport({ from, to, userId: userId || undefined, fn: fn || undefined })
      .then((res) => { if (live && res?.success) setData(res.data); })
      .catch((err) => { if (live) { setData(null); notify("error", err?.message || "Failed to load the audit"); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [from, to, userId, fn, nonce]);

  const last = data?.lastDone;
  const people = data?.people || [];

  return (
    <div className="space-y-6">
      {/* Range, person, function */}
      <div className="flex flex-wrap items-center gap-2">
        <SelectMenu className={`${inputCls} !w-auto !py-1.5 text-xs`} value={preset} onChange={(e) => setPreset(e.target.value)}>
          {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </SelectMenu>
        {preset === "custom" && (
          <>
            <input type="date" className={`${inputCls} !w-auto !py-1.5 text-xs`} value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
            <span className="text-xs text-gray-400">to</span>
            <input type="date" className={`${inputCls} !w-auto !py-1.5 text-xs`} value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
          </>
        )}
        <SelectMenu className={`${inputCls} !w-auto !py-1.5 text-xs`} value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Everyone</option>
          {people.filter((p) => p.userId).map((p) => <option key={p.userId} value={String(p.userId)}>{p.staff}</option>)}
        </SelectMenu>
        <SelectMenu className={`${inputCls} !w-auto !py-1.5 text-xs`} value={fn} onChange={(e) => setFn(e.target.value)}>
          {FUNCTIONS.map((f) => <option key={f.id || "all"} value={f.id}>{f.label}</option>)}
        </SelectMenu>
        <button type="button" onClick={() => setNonce((n) => n + 1)} className="text-xs font-semibold text-primary inline-flex items-center gap-1 hover:underline">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
        {data?.events?.length > 0 && (
          <Button variant="outline" className="!px-3 !py-1.5 text-xs ml-auto"
            onClick={() => downloadCsv(`stock-audit-${from}-to-${to}.csv`, EVENT_HEADERS, eventRows(data.events))}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        )}
      </div>

      {loading && !data && <div className="flex justify-center py-10"><Spinner /></div>}

      {data && (
        <>
          {/* All time: when each was last done — the basis for a schedule */}
          <Section title="When it was last done" hint="All time, whatever the range above. Amber: never, or a stocktake over 30 days / a room restock over 7 days ago.">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="ui-surface rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-600 mb-1">Stocktake — by location</p>
                <ul>{last.stocktake.map((l) => <LastLine key={l.locationId} name={l.location} at={l.at} staff={l.staff} staleAfter={30} />)}</ul>
                {last.stocktake.length === 0 && <p className="text-xs text-gray-400">No locations yet.</p>}
              </div>
              <div className="ui-surface rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-600 mb-1">Receiving — last delivery</p>
                {last.receiving ? (
                  <div className="text-sm text-gray-800">
                    <p>{fmtDay(last.receiving.at)} · <span className="text-gray-500">{ageText(last.receiving.at)}</span></p>
                    <p className="text-xs text-gray-500">{[last.receiving.staff, last.receiving.receipt, last.receiving.supplier].filter(Boolean).join(" · ")}</p>
                  </div>
                ) : <p className="text-xs text-amber-700 font-semibold">Nothing received yet.</p>}
              </div>
              <div className="ui-surface rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-600 mb-1">Room balancing — last restock</p>
                <ul>{last.restock.map((l) => <LastLine key={l.locationId} name={l.location} at={l.at} staff={l.staff} staleAfter={7} />)}</ul>
                {last.restock.length === 0 && <p className="text-xs text-gray-400">No room has par levels yet.</p>}
              </div>
            </div>
          </Section>

          {/* Sessions in the range */}
          <Section title="Receiving, stocktakes and room balancing" hint="One line per delivery received, stocktake, room restocked or par change in the range.">
            {data.sessions.length === 0 ? (
              <p className="text-sm text-gray-500 py-3">None in this range.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden text-sm">
                  <thead className="ui-thead">
                    <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
                      <th className={th}>When</th><th className={th}>What</th><th className={th}>By</th>
                      <th className={th}>Where</th><th className={th}>Details</th><th className={th}>Took</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sessions.map((s, i) => (
                      <tr key={i} className="border-t border-gray-100 align-top">
                        <td className="px-3 py-2 whitespace-nowrap">{fmtDateTime(s.at)}</td>
                        <td className="px-3 py-2"><Badge fn={s.fn}>{s.kind}</Badge></td>
                        <td className="px-3 py-2 whitespace-nowrap">{s.staff}</td>
                        <td className="px-3 py-2">{s.location || "—"}</td>
                        <td className="px-3 py-2 text-gray-600">{s.summary}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-500">{duration(s.at, s.endAt) || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Per person — who covers what, for rotas and leave */}
          <Section title="By person" hint="How often each person did each function in the range.">
            {people.length === 0 ? (
              <p className="text-sm text-gray-500 py-3">No stock activity in this range.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden text-sm">
                  <thead className="ui-thead">
                    <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
                      <th className={th}>Person</th>
                      <th className={`${th} text-right`}>Days active</th>
                      <th className={`${th} text-right`}>Deliveries</th>
                      <th className={`${th} text-right`}>Stocktakes</th>
                      <th className={`${th} text-right`}>Restocks</th>
                      <th className={`${th} text-right`}>Par changes</th>
                      <th className={`${th} text-right`}>Dispensed / used</th>
                      <th className={`${th} text-right`}>Transfers</th>
                      <th className={`${th} text-right`}>Returns</th>
                      <th className={`${th} text-right`}>Write-offs</th>
                      <th className={th}>Last active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {people.map((p) => (
                      <tr key={p.userId || p.staff} className="border-t border-gray-100">
                        <td className="px-3 py-2 whitespace-nowrap">{p.staff}{p.role && <span className="text-xs text-gray-400"> · {p.role}</span>}</td>
                        <td className={num}>{p.activeDays}</td>
                        <td className={num}>{p.receiving}</td>
                        <td className={num}>{p.stocktakes}</td>
                        <td className={num}>{p.restocks}</td>
                        <td className={num}>{p.parChanges}</td>
                        <td className={num}>{p.dispensed}</td>
                        <td className={num}>{p.transfers}</td>
                        <td className={num}>{p.returns}</td>
                        <td className={num}>{p.writeOffs}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-500">{fmtDateTime(p.lastAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Everything, timestamped */}
          <Section title="Every stock event"
            hint={data.totalEvents > data.events.length
              ? `Showing the latest ${data.events.length} of ${data.totalEvents}. Narrow the range, person or function to see the rest.`
              : `${data.totalEvents} in this range.`}>
            {data.events.length === 0 ? (
              <p className="text-sm text-gray-500 py-3">None in this range.</p>
            ) : (
              <div className="overflow-x-auto max-h-[32rem] overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full bg-white text-sm">
                  <thead className="ui-thead sticky top-0">
                    <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
                      <th className={th}>When</th><th className={th}>Action</th><th className={th}>By</th><th className={th}>Details</th><th className={th}>Patient</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.events.map((e, i) => (
                      <tr key={i} className="border-t border-gray-100 align-top">
                        <td className="px-3 py-2 whitespace-nowrap">{fmtDateTime(e.at)}</td>
                        <td className="px-3 py-2"><Badge fn={e.fn}>{e.label}</Badge></td>
                        <td className="px-3 py-2 whitespace-nowrap">{e.staff}</td>
                        <td className="px-3 py-2 text-gray-600">{e.detail}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{e.patient ? <>{e.patient}<span className="block text-xs text-gray-400">{e.uhid}</span></> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
};

export default StockAuditView;
