import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Activity, AlertTriangle, ArrowRight, LayoutGrid, ListTree, BarChart3,
} from "lucide-react";
import stockService from "../../services/stockService";
import Spinner from "../shared/Spinner";
import StockDashboardTab from "./StockDashboardTab";
import StockReportsTab from "./StockReportsTab";
import { StatCard, MovementBadge, ByLine } from "./stockUi";

// Inventory Analytics — the merged command centre. Replaces the old separate
// Dashboard and Reports tabs (PRD: Executive → Operational → Interactive
// Reports). Everything here is derived from endpoints that already exist and
// are already tested — this is a presentation merge, no schema or new API.
//
// Load fans out to the handful of read endpoints the two old tabs used, and
// the Executive KPIs are computed from them client-side. Every KPI card drills
// into the matching report (or the operational detail below).

// ---- small dependency-free bar row, for the distribution widgets ----
const BarRow = ({ label, value, max, tone = "bg-primary", suffix }) => (
  <div className="flex items-center gap-3 text-sm">
    <span className="w-40 shrink-0 truncate text-gray-700" title={label}>{label}</span>
    <div className="flex-1 bg-gray-100 rounded h-2.5 overflow-hidden">
      <div className={`h-full ${tone} rounded`} style={{ width: max > 0 ? `${Math.max(4, (value / max) * 100)}%` : "0%" }} />
    </div>
    <span className="w-16 shrink-0 text-right font-semibold text-gray-700">{value}{suffix}</span>
  </div>
);

const Panel = ({ title, icon: Icon, children, action }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4">
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}{title}
      </h4>
      {action}
    </div>
    {children}
  </div>
);

const StockAnalyticsTab = () => {
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState(null);        // /stock/dashboard
  const [inventory, setInventory] = useState([]); // /stock/reports/inventory
  const [locations, setLocations] = useState([]);
  const [batches, setBatches] = useState([]);
  const [recent, setRecent] = useState([]);
  const [fefoOverrides, setFefoOverrides] = useState(0);

  // Reports engine, driven by KPI drill-down. Bumping `nonce` remounts it so a
  // second click on the same card still re-opens and re-fetches.
  const [reportSub, setReportSub] = useState("inventory");
  const [nonce, setNonce] = useState(0);
  const operationalRef = useRef(null);
  const reportsRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, inv, loc, bat, mov, fefo] = await Promise.allSettled([
        stockService.getDashboard(),
        stockService.getInventoryReport(),
        stockService.getLocations(),
        stockService.getBatches(),
        stockService.getMovements({ limit: 8 }),
        stockService.getFefoOverridesReport(),
      ]);
      if (d.status === "fulfilled" && d.value?.success) setDash(d.value.data);
      if (inv.status === "fulfilled" && inv.value?.success) setInventory(inv.value.data || []);
      if (loc.status === "fulfilled" && loc.value?.success) setLocations(loc.value.data || []);
      if (bat.status === "fulfilled" && bat.value?.success) setBatches(bat.value.data || []);
      if (mov.status === "fulfilled" && mov.value?.success) setRecent(mov.value.data?.movements || []);
      if (fefo.status === "fulfilled" && fefo.value?.success) setFefoOverrides((fefo.value.data || []).length);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ---- derived Executive KPIs (all honest, all from the loaded reads) ----
  const kpi = useMemo(() => {
    const totalItems = inventory.length || dash?.cards?.activeItems || 0;
    const totalQuantity = inventory.reduce((s, r) => s + (r.totalQuantity || 0), 0);
    const outOfStock = inventory.filter((r) => (r.totalQuantity || 0) === 0).length;
    const belowReorder = dash?.cards?.itemsBelowReorder
      ?? inventory.filter((r) => r.reorderLevel > 0 && r.totalQuantity <= r.reorderLevel).length;
    const expiredBatches = dash?.expiry?.expired?.length || 0;
    const expiring30 = dash?.cards?.batchesExpiring30 || 0;
    const variances = inventory.filter((r) => r.lastStocktake && r.lastStocktake.variance !== 0).length;
    const activeBatches = batches.length;
    const activeLocations = locations.length;

    const lastStocktakeDate = inventory.reduce((acc, r) => {
      const d = r.lastStocktake?.date;
      return d && (!acc || d > acc) ? d : acc;
    }, null);

    // Inventory Health Score — share of items with no supply problem, lightly
    // penalised for expired stock on the shelf. Defined here, not a black box.
    const problemItems = inventory.filter(
      (r) => (r.totalQuantity || 0) === 0 || (r.reorderLevel > 0 && r.totalQuantity <= r.reorderLevel)
    ).length;
    let health = totalItems ? Math.round((100 * (totalItems - problemItems)) / totalItems) : 100;
    if (expiredBatches > 0) health = Math.max(0, health - Math.min(15, expiredBatches * 3));

    return {
      totalItems, totalQuantity, outOfStock, belowReorder, expiredBatches,
      expiring30, variances, activeBatches, activeLocations, lastStocktakeDate, health,
    };
  }, [inventory, dash, batches, locations]);

  // ---- operational aggregations ----
  const byCategory = useMemo(() => {
    const map = {};
    inventory.forEach((r) => {
      const c = r.category || "Uncategorised";
      map[c] = map[c] || { label: c, value: 0 };
      map[c].value += r.totalQuantity || 0;
    });
    return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [inventory]);

  const byLocation = useMemo(() => {
    const map = {};
    inventory.forEach((r) => (r.locations || []).forEach((l) => {
      map[l.name] = map[l.name] || { label: l.name, value: 0 };
      map[l.name].value += l.quantity || 0;
    }));
    return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [inventory]);

  const expiryDist = useMemo(() => {
    const e = dash?.expiry;
    if (!e) return [];
    return [
      { label: "Already expired", value: e.expired?.length || 0, tone: "bg-red-500" },
      { label: "≤ 30 days", value: e.d30?.length || 0, tone: "bg-amber-500" },
      { label: "31–60 days", value: e.d60?.length || 0, tone: "bg-amber-400" },
      { label: "61–90 days", value: e.d90?.length || 0, tone: "bg-gray-400" },
    ];
  }, [dash]);

  // "Requiring immediate action today" — expired, then out of stock, then low.
  const immediate = useMemo(() => {
    const rows = [];
    (dash?.expiry?.expired || []).forEach((b) =>
      rows.push({ key: `x${b.stockBatchId}`, tone: "red", label: `Expired — ${b.item?.name || "item"}`, meta: b.labelCode }));
    inventory.filter((r) => (r.totalQuantity || 0) === 0).forEach((r) =>
      rows.push({ key: `o${r.id}`, tone: "red", label: `Out of stock — ${r.name}`, meta: r.category }));
    (dash?.itemsBelowReorder || []).forEach((i) =>
      rows.push({ key: `l${i.id}`, tone: "amber", label: `Low — ${i.name}`, meta: `${i.total}/${i.reorderLevel} ${i.unit}(s)` }));
    return rows;
  }, [dash, inventory]);

  const drillReport = (sub) => {
    setReportSub(sub);
    setNonce((n) => n + 1);
    setTimeout(() => reportsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const scrollOperational = () =>
    operationalRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const healthTone = kpi.health >= 85 ? "green" : kpi.health >= 60 ? "amber" : "red";
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

  if (loading && !dash) return <div className="flex justify-center py-16"><Spinner /></div>;

  // Executive cards — label, value, tone, and where a click goes.
  const cards = [
    { label: "Inventory health", value: `${kpi.health}%`, tone: healthTone, onClick: () => drillReport("reorder") },
    { label: "Total items", value: kpi.totalItems, tone: "blue", onClick: () => drillReport("inventory") },
    { label: "Active batches", value: kpi.activeBatches, tone: "cyan", onClick: () => drillReport("inventory") },
    { label: "Total stock quantity", value: kpi.totalQuantity, tone: "blue", onClick: () => drillReport("inventory") },
    { label: "Storage locations", value: kpi.activeLocations, tone: "purple", onClick: scrollOperational },
    { label: "Out of stock", value: kpi.outOfStock, tone: kpi.outOfStock ? "red" : "green", onClick: () => drillReport("inventory") },
    { label: "Below reorder level", value: kpi.belowReorder, tone: kpi.belowReorder ? "red" : "green", onClick: () => drillReport("reorder") },
    { label: "Expiring ≤ 30 days", value: kpi.expiring30, sub: "includes already expired", tone: kpi.expiring30 ? "amber" : "green", onClick: scrollOperational },
    { label: "Expired batches", value: kpi.expiredBatches, tone: kpi.expiredBatches ? "red" : "green", onClick: scrollOperational },
    { label: "Outstanding variances", value: kpi.variances, tone: kpi.variances ? "amber" : "green", onClick: () => drillReport("variances") },
    { label: "FEFO overrides", value: fefoOverrides, sub: "all time", tone: fefoOverrides ? "amber" : "green", onClick: () => drillReport("fefo") },
    { label: "Last stocktake", value: fmtDate(kpi.lastStocktakeDate), tone: "blue", onClick: () => drillReport("variances") },
  ];

  const maxCat = Math.max(1, ...byCategory.map((c) => c.value));
  const maxLoc = Math.max(1, ...byLocation.map((c) => c.value));
  const maxExp = Math.max(1, ...expiryDist.map((c) => c.value));

  return (
    <div>
      {/* ---- Section 1: Executive Dashboard ---- */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Executive dashboard</h3>
        <span className="text-xs text-gray-400">Every card drills into its report</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
        {cards.map((c) => (
          <button key={c.label} type="button" onClick={c.onClick}
            className="text-left transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-xl">
            <StatCard label={c.label} value={c.value} sub={c.sub} tone={c.tone} />
          </button>
        ))}
      </div>

      {/* ---- Section 2: Operational Dashboard ---- */}
      <div ref={operationalRef} className="scroll-mt-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">Operational dashboard</h3>

        {/* Immediate actions + expiry distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <Panel title="Requiring immediate action today" icon={AlertTriangle}
            action={<span className="text-xs font-bold text-gray-500">{immediate.length}</span>}>
            {immediate.length === 0
              ? <p className="text-sm text-gray-500">Nothing needs attention — no expired, out-of-stock or low items.</p>
              : (
                <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {immediate.slice(0, 12).map((r) => (
                    <div key={r.key} className="py-2 flex items-center justify-between text-sm">
                      <span className={`font-medium ${r.tone === "red" ? "text-red-700" : "text-amber-700"}`}>{r.label}</span>
                      <span className="text-xs text-gray-400 font-mono">{r.meta}</span>
                    </div>
                  ))}
                  {immediate.length > 12 && (
                    <button onClick={() => drillReport("reorder")} className="pt-2 text-xs font-semibold text-primary flex items-center gap-1">
                      View all in reports <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
          </Panel>

          <Panel title="Expiry distribution (held batches)" icon={BarChart3}
            action={<button onClick={scrollOperational} className="text-xs font-semibold text-primary">details ↓</button>}>
            {expiryDist.every((e) => e.value === 0)
              ? <p className="text-sm text-gray-500">No held batches expire within 90 days.</p>
              : <div className="space-y-2.5">{expiryDist.map((e) => <BarRow key={e.label} label={e.label} value={e.value} max={maxExp} tone={e.tone} />)}</div>}
          </Panel>
        </div>

        {/* By category + by location */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <Panel title="Inventory by category" icon={LayoutGrid}>
            {byCategory.length === 0
              ? <p className="text-sm text-gray-500">No stock on hand.</p>
              : <div className="space-y-2.5">{byCategory.map((c) => <BarRow key={c.label} label={c.label} value={c.value} max={maxCat} />)}</div>}
          </Panel>
          <Panel title="Inventory by storage location" icon={ListTree}>
            {byLocation.length === 0
              ? <p className="text-sm text-gray-500">No stock held anywhere.</p>
              : <div className="space-y-2.5">{byLocation.map((c) => <BarRow key={c.label} label={c.label} value={c.value} max={maxLoc} tone="bg-cyan-500" />)}</div>}
          </Panel>
        </div>

        {/* Recent activity */}
        <Panel title="Recent inventory activity" icon={Activity}
          action={<button onClick={() => drillReport("disposal")} className="text-xs font-semibold text-primary">movement reports →</button>}>
          {recent.length === 0
            ? <p className="text-sm text-gray-500">No movements recorded yet.</p>
            : (
              <div className="divide-y divide-gray-100">
                {recent.map((m) => (
                  <div key={m.id} className="py-2 flex items-center gap-3 text-sm flex-wrap">
                    <MovementBadge type={m.type} />
                    <span className="font-medium">{m.item?.name}</span>
                    <span className="font-bold">{m.quantity}</span>
                    <span className="text-xs text-gray-500">{m.fromLocation?.name || m.toLocation?.name || ""}</span>
                    <span className="ml-auto"><ByLine user={m.performedByUser} at={m.createdAt} /></span>
                  </div>
                ))}
              </div>
            )}
        </Panel>

        {/* Detailed expiry buckets + below-reorder + the working write-off flow.
            Reuses the old dashboard body without its (now-duplicate) KPI band. */}
        <div className="mt-6">
          <StockDashboardTab showCards={false} />
        </div>
      </div>

      {/* ---- Section 3: Interactive Reports ---- */}
      <div ref={reportsRef} className="scroll-mt-4 mt-10 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">Interactive reports</h3>
        <StockReportsTab key={nonce} initialSub={reportSub} />
      </div>
    </div>
  );
};

export default StockAnalyticsTab;
