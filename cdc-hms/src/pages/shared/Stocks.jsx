import { useState, useEffect } from "react";
import { Package } from "lucide-react";
import { useStockContext } from "../../contexts/StockContext";
import StockDashboardTab from "../../components/stock/StockDashboardTab";
import StockItemsTab from "../../components/stock/StockItemsTab";
import StockReceiveTab from "../../components/stock/StockReceiveTab";
import StockMoveTab from "../../components/stock/StockMoveTab";
import StockMovementsTab from "../../components/stock/StockMovementsTab";

// Stocks — Phase 1: dashboard, items/locations/suppliers, receive (with STK-
// shelf-label printing), dispense + transfer (scan-first, FEFO-gated) and the
// movement history. Shared across portals: the sidebar shows it to admins and
// to staff/doctors granted canManageStock; the API enforces the same
// server-side. Quantities only — no money anywhere (decision).
//
// Room Balance, Stocktake and Reports arrive in Phase 2/3 as further tabs.

const TABS = [
  { id: "dashboard", label: "Dashboard", el: <StockDashboardTab /> },
  { id: "items", label: "Items", el: <StockItemsTab /> },
  { id: "receive", label: "Receive", el: <StockReceiveTab /> },
  { id: "dispense", label: "Dispense", el: <StockMoveTab mode="dispense" /> },
  { id: "transfer", label: "Transfer", el: <StockMoveTab mode="transfer" /> },
  { id: "movements", label: "Movements", el: <StockMovementsTab /> },
];

const Stocks = () => {
  const { loadReferenceData } = useStockContext();
  const [tab, setTab] = useState("dashboard");

  // Reference data (items, locations, suppliers) loads once per visit —
  // nothing is fetched for users who never open this page.
  useEffect(() => { loadReferenceData(); }, [loadReferenceData]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
          <Package className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Stocks</h2>
          <p className="text-sm text-gray-500">
            Monitoring quantities only — batches, expiry and movements. No pricing.
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b-2 border-gray-200 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold -mb-0.5 border-b-[3px] transition ${
              tab === t.id
                ? "text-primary border-primary"
                : "text-gray-500 border-transparent hover:text-gray-700"
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
