import { useState, useEffect, useCallback, useMemo } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, ArrowRight, RefreshCw } from "lucide-react";
import stockService from "../../services/stockService";
import Spinner from "../shared/Spinner";
import WriteOffExpiredModal from "./WriteOffExpiredModal";
import Modal from "../shared/Modal";
import Button from "../shared/Button";
import { notify } from "../../utils/notify";
import { unitPlural, useStockCan } from "./stockUi";
import { PERMISSIONS } from "../../utils/permissions";

// Stocks → Analytics → Today (13 Oct 2026, Emu: "over stimulating — too much
// information, little organisation"). One question only: what needs doing?
//   - Four calm numbers; a number takes colour only when it is a problem.
//   - One to-do list, grouped in order of risk; empty groups disappear.
//   - Everything for looking back lives in Reports (the other Analytics view).
// Reads the two endpoints that already exist: /stock/dashboard (expiry
// buckets, below-reorder, expired sweep) and /stock/reports/inventory (stock
// on hand, last stocktake). No new API.

const TONES = {
  red:   { num: "text-red-600",   dot: "bg-red-500",   badge: "bg-red-100 text-red-700" },
  amber: { num: "text-amber-600", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-800" },
  grey:  { num: "text-gray-800",  dot: "bg-gray-300",  badge: "bg-gray-100 text-gray-600" },
};
const DAY = 86400000;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
const daysFrom = (d) => Math.round((new Date(`${String(d).slice(0, 10)}T00:00:00`) - new Date(new Date().toDateString())) / DAY);
const where = (locs) => (locs || []).map((l) => `${l.name} (${l.quantity})`).join(", ");
const plural = (n, unit = "unit") => `${n} ${n === 1 ? unit : unitPlural(unit)}`;

// A headline number. Grey unless it is a problem.
const Tile = ({ label, value, sub, tone, onClick }) => (
  <button type="button" onClick={onClick} className="ui-surface ui-hover rounded-xl p-4 text-left w-full">
    <p className="text-xs font-semibold text-gray-500">{label}</p>
    <p className={`text-2xl font-bold mt-1 ${TONES[tone]?.num || TONES.grey.num}`}>{value}</p>
    {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
  </button>
);

// One group of the to-do list. Header shows the count; the rows open below.
const Group = ({ id, title, hint, rows, tone, open, onToggle, footer }) => (
  <section id={`today-${id}`} className="ui-surface rounded-xl overflow-hidden scroll-mt-4">
    <button type="button" onClick={onToggle} aria-expanded={open}
      className="w-full flex items-center gap-3 px-4 py-3 text-left ui-hover">
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${TONES[tone].dot}`} />
      <span className="font-semibold text-gray-800">{title}</span>
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TONES[tone].badge}`}>{rows.length}</span>
      <span className="text-xs text-gray-500 hidden sm:inline truncate">{hint}</span>
      <span className="ml-auto text-gray-400">{open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
    </button>
    {open && (
      <div className="border-t border-gray-100 divide-y divide-gray-100">
        {rows.map((r) => (
          <div key={r.key} className="px-4 py-2.5 flex items-center gap-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-gray-800 truncate">{r.name}</p>
              <p className="text-xs text-gray-500">{r.meta}</p>
            </div>
            {r.action && <div className="ml-auto shrink-0">{r.action}</div>}
          </div>
        ))}
        {footer && <div className="px-4 py-2.5">{footer}</div>}
      </div>
    )}
  </section>
);

const ReportLink = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
    {children} <ArrowRight className="w-3 h-3" />
  </button>
);

const StockTodayView = ({ onReport }) => {
  const canWriteOff = useStockCan()(PERMISSIONS.STOCK_WRITEOFF);
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [writeOff, setWriteOff] = useState(null);
  const [open, setOpen] = useState(null);   // Set of open group ids (null = not chosen yet)
  const [testsNotTaken, setTestsNotTaken] = useState([]);   // test attempts whose supplies were not taken
  const [settling, setSettling] = useState(null);           // { id, name, note }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, inv, tests] = await Promise.allSettled([
        stockService.getDashboard(), stockService.getInventoryReport(), stockService.getTestsNotTaken(),
      ]);
      if (d.status === "fulfilled" && d.value?.success) setDash(d.value.data);
      if (inv.status === "fulfilled" && inv.value?.success) setInventory(inv.value.data || []);
      if (tests.status === "fulfilled" && tests.value?.success) setTestsNotTaken(tests.value.data || []);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    const exp = dash?.expiry || {};
    const outIds = new Set(inventory.filter((r) => (r.totalQuantity || 0) === 0).map((r) => r.id));
    const variances = inventory.filter((r) => r.lastStocktake && r.lastStocktake.variance);
    return [
      {
        id: "expired", tone: "red", title: "Expired — still on the shelf", hint: "write off",
        rows: (exp.expired || []).map((b) => ({
          key: `x${b.stockBatchId}`, name: b.item?.name || "Item",
          meta: `${b.labelCode}${b.batchNo ? ` · batch ${b.batchNo}` : ""} · expired ${fmtDate(b.expiryDate)} · ${where(b.locations)}`,
          action: canWriteOff && (
            <button type="button" onClick={() => setWriteOff(b)}
              className="text-xs font-semibold text-red-700 border border-red-300 rounded-lg px-3 py-1.5 hover:bg-red-50">
              Write off
            </button>
          ),
        })),
      },
      {
        id: "expiring", tone: "amber", title: "Expiring within 30 days", hint: "use these first",
        rows: (exp.d30 || []).map((b) => {
          const n = daysFrom(b.expiryDate);
          return {
            key: `e${b.stockBatchId}`, name: b.item?.name || "Item",
            meta: `${fmtDate(b.expiryDate)} (${n <= 0 ? "today" : `in ${n} day${n === 1 ? "" : "s"}`}) · ${b.labelCode} · ${where(b.locations)}`,
          };
        }),
        footer: <ReportLink onClick={() => onReport("expiry")}>Open the Expiry report</ReportLink>,
      },
      {
        id: "out", tone: "red", title: "Out of stock", hint: "reorder",
        rows: inventory.filter((r) => outIds.has(r.id)).map((r) => ({
          key: `o${r.id}`, name: r.name, meta: `none held${r.reorderQuantity ? ` · usual order ${plural(r.reorderQuantity, r.unit)}` : ""}`,
        })),
        footer: <ReportLink onClick={() => onReport("reorder")}>Open the reorder list</ReportLink>,
      },
      {
        id: "low", tone: "amber", title: "Below reorder level", hint: "reorder",
        rows: (dash?.itemsBelowReorder || []).filter((i) => !outIds.has(i.id)).map((i) => ({
          key: `l${i.id}`, name: i.name, meta: `${plural(i.total, i.unit)} held · reorder at ${i.reorderLevel}`,
        })),
        footer: <ReportLink onClick={() => onReport("reorder")}>Open the reorder list</ReportLink>,
      },
      {
        id: "variance", tone: "amber", title: "Stocktake differences to check", hint: "review",
        rows: variances.map((r) => {
          const v = r.lastStocktake.variance;
          return {
            key: `v${r.id}`, name: r.name,
            meta: `${v > 0 ? "+" : ""}${v} ${r.unit || "unit"}(s)${r.lastStocktake.counted != null ? ` · counted ${r.lastStocktake.counted}, expected ${r.lastStocktake.expected}` : ""} · ${fmtDate(r.lastStocktake.date)}`,
          };
        }),
        footer: <ReportLink onClick={() => onReport("variances")}>Review in the Variances report</ReportLink>,
      },
      {
        // 13 Oct 2026: a test (HbA1c, RBS, Ketones) whose supplies could not be
        // taken — none set up, or none at its location. Receive or move the stock,
        // then Take now; or Settle if it was handled another way.
        id: "tests", tone: "amber", title: "Tests not taken from stock", hint: "take now or settle",
        rows: testsNotTaken.map((t) => ({
          key: `t${t.id}`, name: `${t.name}${t.patient ? ` — ${t.patient.name}` : ""}`,
          meta: `${fmtDate(t.at)}${t.by ? ` · ${t.by}` : ""}${t.patient ? ` · ${t.patient.uhid}` : ""} · ${t.note || "not taken"}`,
          action: (
            <span className="flex gap-2">
              <button type="button" onClick={() => retryTest(t)}
                className="text-xs font-semibold text-primary border border-blue-300 rounded-lg px-3 py-1.5 ui-hover">Take now</button>
              {canWriteOff && (
                <button type="button" onClick={() => setSettling({ id: t.id, name: t.name, note: "" })}
                  className="text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg px-3 py-1.5 ui-hover">Settle</button>
              )}
            </span>
          ),
        })),
        footer: <span className="text-xs text-gray-500">Each test takes 1 strip from the triage room, or from the room matched to the doctor in Room Balance → edit pars.</span>,
      },
    ].filter((g) => g.rows.length > 0);
  }, [dash, inventory, onReport, canWriteOff, testsNotTaken]); // eslint-disable-line react-hooks/exhaustive-deps

  async function retryTest(t) {
    try {
      const res = await stockService.retryTestStock(t.id);
      if (res.success) { notify("success", `${t.name} supplies taken from stock`); load(); }
      else notify("error", res.message || "Still could not take the supplies");
    } catch (err) { notify("error", err?.message || "Still could not take the supplies"); }
  }
  const settleTest = async () => {
    try {
      const res = await stockService.resolveTestStock(settling.id, settling.note.trim());
      if (res.success) { notify("success", "Settled"); setSettling(null); load(); }
      else notify("error", res.message || "Could not settle it");
    } catch (err) { notify("error", err?.message || "Could not settle it"); }
  };

  // Coming up — information, not a task: batches expiring in 31–90 days.
  const upcoming = useMemo(() => [...(dash?.expiry?.d60 || []), ...(dash?.expiry?.d90 || [])].map((b) => ({
    key: `u${b.stockBatchId}`, name: b.item?.name || "Item",
    meta: `${fmtDate(b.expiryDate)} · ${b.labelCode} · ${where(b.locations)}`,
  })), [dash]);

  // The first (riskiest) group opens on load; the rest stay folded.
  const openSet = open ?? new Set(groups.length ? [groups[0].id] : []);
  const toggle = (id) => {
    const next = new Set(openSet);
    if (next.has(id)) next.delete(id); else next.add(id);
    setOpen(next);
  };
  const jumpTo = (id) => {
    if (!groups.some((g) => g.id === id)) return;
    setOpen(new Set([...openSet, id]));
    setTimeout(() => document.getElementById(`today-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  if (loading && !dash) return <div className="flex justify-center py-16"><Spinner /></div>;

  const count = (id) => groups.find((g) => g.id === id)?.rows.length || 0;
  const out = count("out");
  const low = count("low");
  // The last stocktake done (even one where every count matched); falls back
  // to the latest stocktake adjustment for counts made before it was recorded.
  const lastStocktake = dash?.lastStocktakeAt || inventory.reduce((acc, r) => {
    const d = r.lastStocktake?.date;
    return d && (!acc || d > acc) ? d : acc;
  }, null);
  const stocktakeAge = lastStocktake ? -daysFrom(lastStocktake) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <button type="button" onClick={load} className="text-xs font-semibold text-primary inline-flex items-center gap-1 hover:underline">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {dash?.sweep?.newlyExpired > 0 && (
        <p className="text-sm text-red-700 font-semibold">
          {dash.sweep.newlyExpired} batch(es) passed their expiry date since the last check — now blocked from dispensing.
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Expired on the shelf" value={count("expired")} tone={count("expired") ? "red" : "grey"} onClick={() => jumpTo("expired")} />
        <Tile label="Expiring in 30 days" value={count("expiring")} tone={count("expiring") ? "amber" : "grey"} onClick={() => jumpTo("expiring")} />
        <Tile label="Out of stock / low" value={out + low} sub={out + low ? `${out} out · ${low} low` : null}
          tone={out ? "red" : low ? "amber" : "grey"} onClick={() => jumpTo(out ? "out" : "low")} />
        <Tile label="Last stocktake" value={lastStocktake ? fmtDate(lastStocktake) : "Never"}
          sub={stocktakeAge != null ? (stocktakeAge === 0 ? "today" : `${stocktakeAge} day${stocktakeAge === 1 ? "" : "s"} ago`) : null}
          tone={stocktakeAge == null || stocktakeAge > 90 ? "amber" : "grey"} onClick={() => onReport("variances")} />
      </div>

      {groups.length === 0 ? (
        <div className="ui-surface rounded-xl px-5 py-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="font-semibold text-gray-800">All clear</p>
          <p className="text-sm text-gray-500 mt-1">Nothing expired, expiring within 30 days, out of stock, low or waiting on a stocktake check.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-700">To do</h3>
          {groups.map((g) => (
            <Group key={g.id} {...g} open={openSet.has(g.id)} onToggle={() => toggle(g.id)} />
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <Group id="upcoming" tone="grey" title="Coming up — expiring in 31–90 days" hint="for planning"
          rows={upcoming} open={openSet.has("upcoming")} onToggle={() => toggle("upcoming")}
          footer={<ReportLink onClick={() => onReport("expiry")}>Open the Expiry report</ReportLink>} />
      )}

      {settling && (
        <Modal isOpen onClose={() => setSettling(null)} title={`Settle — ${settling.name}`}>
          <p className="text-sm text-gray-600 mb-3">
            Use this when the supplies were accounted for another way (e.g. counted out at a stocktake).
            It leaves stock as it is and closes the item, with your note.
          </p>
          <input className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
            value={settling.note} onChange={(e) => setSettling((s) => ({ ...s, note: e.target.value }))}
            placeholder="How was it settled?" autoFocus />
          <div className="flex gap-3 mt-4">
            <Button className="flex-1" disabled={settling.note.trim().length < 3} onClick={settleTest}>Settle</Button>
            <Button variant="outline" className="flex-1" onClick={() => setSettling(null)}>Cancel</Button>
          </div>
        </Modal>
      )}

      {writeOff && (
        <WriteOffExpiredModal entry={writeOff} onClose={() => setWriteOff(null)}
          onDone={() => { setWriteOff(null); load(); }} />
      )}
    </div>
  );
};

export default StockTodayView;
