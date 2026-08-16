import { useState, useEffect } from "react";
import { notify } from "../../utils/notify";
import { useStockContext } from "../../contexts/StockContext";
import StockItemsTab from "../../components/stock/StockItemsTab";
import StockReceiveTab from "../../components/stock/StockReceiveTab";
import StockDispenseTab from "../../components/stock/StockDispenseTab";
import StockReturnTab from "../../components/stock/StockReturnTab";
import StockMoveTab from "../../components/stock/StockMoveTab";
import StockMovementsTab from "../../components/stock/StockMovementsTab";
import StockRoomBalanceTab from "../../components/stock/StockRoomBalanceTab";
import StockStocktakeTab from "../../components/stock/StockStocktakeTab";
import StockAnalyticsTab from "../../components/stock/StockAnalyticsTab";
import PageHeader from "../../components/shared/PageHeader";
import SwitcherTabs from "../../components/shared/SwitcherTabs";

// Stocks — the full module: items/locations/suppliers, receive (STK- shelf-label
// printing), dispense + transfer (scan-first, FEFO-gated), room balance (par
// levels + restock picklist), stocktake, movement history, and Analytics — the
// merged command centre (Executive KPIs → operational widgets → interactive
// reports, with the daily expiry sweep + write-offs). Analytics replaces the old
// separate Dashboard and Reports tabs. Shared across portals: the sidebar shows
// it to admins and to staff/doctors granted canManageStock; the API enforces the
// same server-side. Quantities only — no money anywhere.

const TABS = [
  { id: "items", label: "Items", el: <StockItemsTab /> },
  { id: "receive", label: "Receive", el: <StockReceiveTab /> },
  // Dispense is rendered separately below so it can report its lock state up
  { id: "dispense", label: "Dispense", el: null },
  { id: "returns", label: "Returns", el: <StockReturnTab /> },
  { id: "transfer", label: "Transfer", el: <StockMoveTab mode="transfer" /> },
  { id: "rooms", label: "Room Balance", el: <StockRoomBalanceTab /> },
  { id: "stocktake", label: "Stocktake", el: <StockStocktakeTab /> },
  { id: "movements", label: "Movements", el: <StockMovementsTab /> },
  { id: "analytics", label: "Analytics", el: <StockAnalyticsTab /> },
];

const Stocks = () => {
  const { loadReferenceData } = useStockContext();
  const [tab, setTab] = useState("analytics");
  // Set while a dispense has a patient attached — the Dispense tab reports this.
  const [dispenseLocked, setDispenseLocked] = useState(false);

  // Reference data (items, locations, suppliers) loads once per visit —
  // nothing is fetched for users who never open this page.
  useEffect(() => { loadReferenceData(); }, [loadReferenceData]);

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

  return (
    <div>
      <PageHeader
        title="Stocks"
        subtitle="Monitor medication and supply quantities — batches, expiry, movements and room balance. No pricing."
      />

      <SwitcherTabs
        className="mb-6"
        active={tab}
        onChange={changeTab}
        tabs={TABS.map((t) => {
          const blocked = dispenseLocked && tab === "dispense" && t.id !== "dispense";
          return {
            id: t.id,
            label: t.label,
            disabled: blocked,
            title: blocked ? "Complete or cancel the dispense first" : undefined,
          };
        })}
      />

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
