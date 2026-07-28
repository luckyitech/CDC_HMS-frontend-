import { useState, useEffect } from "react";
import { useStockContext } from "../../contexts/StockContext";
import StockDashboardTab from "../../components/stock/StockDashboardTab";
import StockItemsTab from "../../components/stock/StockItemsTab";
import StockReceiveTab from "../../components/stock/StockReceiveTab";
import StockMoveTab from "../../components/stock/StockMoveTab";
import StockMovementsTab from "../../components/stock/StockMovementsTab";
import StockRoomBalanceTab from "../../components/stock/StockRoomBalanceTab";
import StockStocktakeTab from "../../components/stock/StockStocktakeTab";
import StockReportsTab from "../../components/stock/StockReportsTab";

// Stocks — the full module: dashboard (with daily expiry sweep + write-offs),
// items/locations/suppliers, receive (STK- shelf-label printing), dispense +
// transfer (scan-first, FEFO-gated), room balance (par levels + restock
// picklist), stocktake, movement history and reports. Shared across portals:
// the sidebar shows it to admins and to staff/doctors granted canManageStock;
// the API enforces the same server-side. Quantities only — no money anywhere.

const TABS = [
  { id: "dashboard", label: "Dashboard", el: <StockDashboardTab /> },
  { id: "items", label: "Items", el: <StockItemsTab /> },
  { id: "receive", label: "Receive", el: <StockReceiveTab /> },
  { id: "dispense", label: "Dispense", el: <StockMoveTab mode="dispense" /> },
  { id: "transfer", label: "Transfer", el: <StockMoveTab mode="transfer" /> },
  { id: "rooms", label: "Room Balance", el: <StockRoomBalanceTab /> },
  { id: "stocktake", label: "Stocktake", el: <StockStocktakeTab /> },
  { id: "movements", label: "Movements", el: <StockMovementsTab /> },
  { id: "reports", label: "Reports", el: <StockReportsTab /> },
];

const Stocks = () => {
  const { loadReferenceData } = useStockContext();
  const [tab, setTab] = useState("dashboard");

  // Reference data (items, locations, suppliers) loads once per visit —
  // nothing is fetched for users who never open this page.
  useEffect(() => { loadReferenceData(); }, [loadReferenceData]);

  return (
    <div>
      {/* Header — standard page header block (AdminDashboard / ClinicalCatalog) */}
      <div className="mb-6">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Stocks</h2>
        <p className="text-gray-600 mt-1">
          Monitor medication and supply quantities — batches, expiry, movements and room balance. No pricing.
        </p>
      </div>

      {/* Tab switcher — same pill group as the Clinical Catalog / Create Users tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-gray-100 rounded-lg mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              tab === t.id ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* key remounts the tab on switch so each loads fresh data */}
      <div key={tab}>{TABS.find((t) => t.id === tab)?.el}</div>
    </div>
  );
};

export default Stocks;
