import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useUserContext } from "../../contexts/UserContext";
import { landingFor } from "../../utils/landing";
import { notify } from "../../utils/notify";
import { useStockContext } from "../../contexts/StockContext";
import StockItemsTab from "../../components/stock/StockItemsTab";
import StockReceiveTab from "../../components/stock/StockReceiveTab";
import StockDispenseTab from "../../components/stock/StockDispenseTab";
import StockReturnTab from "../../components/stock/StockReturnTab";
import StockMoveTab from "../../components/stock/StockMoveTab";
import StockMovementsTab from "../../components/stock/StockMovementsTab";
import StockDeliveriesTab from "../../components/stock/StockDeliveriesTab";
import StockRoomBalanceTab from "../../components/stock/StockRoomBalanceTab";
import StockStocktakeTab from "../../components/stock/StockStocktakeTab";
import StockAnalyticsTab from "../../components/stock/StockAnalyticsTab";
import PageHeader from "../../components/shared/PageHeader";
import SwitcherTabs from "../../components/shared/SwitcherTabs";
import { useStockCan } from "../../components/stock/stockUi";
import StockHelp from "../../components/stock/StockHelp";
import { PERMISSIONS as P } from "../../utils/permissions";

// Stocks — the full module: items/locations/suppliers, receive (STK- shelf-label
// printing), dispense + transfer (scan-first, FEFO-gated), room balance (par
// levels + restock picklist), stocktake, movement history, and Analytics — the
// merged command centre (Executive KPIs → operational widgets → interactive
// reports, with the daily expiry sweep + write-offs). Analytics replaces the old
// separate Dashboard and Reports tabs. Shared across portals: the sidebar shows
// it to admins and to staff/doctors holding any Stocks tab; each tab shows only to
// holders of its own capability, and the API enforces the same server-side. Quantities only — no money anywhere.

// Movements has two views (12 Oct 2026): the ledger, and Deliveries — each
// supplier invoice / receipt with its items and its scan, for auditing.
const MovementsPanel = () => {
  const [view, setView] = useState("ledger");
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <SwitcherTabs size="sm" ariaLabel="Movements views" idPrefix="stock-mv"
          tabs={[{ id: "ledger", label: "Movements" }, { id: "deliveries", label: "Deliveries" }]}
          active={view} onChange={setView} />
        <StockHelp tab="movements" />
      </div>
      {view === "ledger" ? <StockMovementsTab /> : <StockDeliveriesTab />}
    </div>
  );
};

// Dispense first (Emu, 13 Oct 2026) — the most-used tab, and where the page opens.
// Each tab shows only to holders of its capability (per-tab permissions, same
// day); the routes behind each tab are gated by the same capability server-side.
const TABS = [
  // Dispense is rendered separately below so it can report its lock state up
  { id: "dispense", label: "Dispense", cap: P.STOCK_DISPENSE_TAB, el: null },
  { id: "items", label: "Items", cap: P.STOCK_ITEMS, el: <StockItemsTab /> },
  { id: "receive", label: "Receive", cap: P.STOCK_RECEIVE, el: <StockReceiveTab /> },
  { id: "returns", label: "Returns", cap: P.STOCK_RETURNS, el: <StockReturnTab /> },
  { id: "transfer", label: "Transfer", cap: P.STOCK_TRANSFER, el: <StockMoveTab mode="transfer" /> },
  { id: "rooms", label: "Room Balance", cap: P.STOCK_ROOMS, el: <StockRoomBalanceTab /> },
  { id: "stocktake", label: "Stocktake", cap: P.STOCK_STOCKTAKE, el: <StockStocktakeTab /> },
  { id: "movements", label: "Movements", cap: P.STOCK_MOVEMENTS, el: <MovementsPanel /> },
  { id: "analytics", label: "Analytics", cap: P.STOCK_ANALYTICS, el: <StockAnalyticsTab /> },
];

const Stocks = () => {
  const { loadReferenceData } = useStockContext();
  const can = useStockCan();
  const { currentUser } = useUserContext();
  const visible = TABS.filter((t) => can(t.cap));
  const [tab, setTab] = useState(() => visible[0]?.id || null);
  // Set while a dispense has a patient attached — the Dispense tab reports this.
  const [dispenseLocked, setDispenseLocked] = useState(false);

  // Reference data (items, locations, suppliers) loads once per visit —
  // nothing is fetched for users who never open this page.
  useEffect(() => { if (visible.length) loadReferenceData(); }, [loadReferenceData, visible.length]);

  // A dispense in progress holds the staff on the Dispense tab: they must
  // complete it or cancel before navigating away, so a scanned trolley is never
  // left half-done behind another tab.
  const changeTab = (id) => {
    if (dispenseLocked && tab === "dispense" && id !== "dispense") {
      notify("error", "Complete the dispense or cancel it before leaving this tab");
      return;
    }
    setTab(id);
  };

  // No tab granted: Stocks is not shown anywhere (the portal switcher hides it
  // too), so a typed-in URL just goes to their home dashboard — no "no access" page.
  if (visible.length === 0) return <Navigate to={landingFor(currentUser)} replace />;

  return (
    <div>
      <PageHeader
        title="Stocks"
        subtitle="Monitor medication and supply quantities — batches, expiry, movements and room balance. No pricing."
      />

      <div className="mb-6">
        <SwitcherTabs
          className=""
          active={tab}
          onChange={changeTab}
          tabs={visible.map((t) => {
            const blocked = dispenseLocked && tab === "dispense" && t.id !== "dispense";
            return {
              id: t.id,
              label: t.label,
              disabled: blocked,
              title: blocked ? "Complete or cancel the dispense first" : undefined,
            };
          })}
        />
      </div>


      {/* key remounts the tab on switch so each loads fresh data */}
      <div key={tab}>
        {tab === "dispense"
          ? <StockDispenseTab onLockChange={setDispenseLocked} />
          : TABS.find((t) => t.id === tab)?.el}
      </div>
    </div>
  );
};

export default Stocks;
