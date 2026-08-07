import { useState, useEffect } from "react";
import { useBillingContext } from "../../contexts/BillingContext";
import PriceListTab from "../../components/billing/PriceListTab";
import InvoicesTab from "../../components/billing/InvoicesTab";
import PaymentsTab from "../../components/billing/PaymentsTab";
import CashUpTab from "../../components/billing/CashUpTab";
import OutstandingTab from "../../components/billing/OutstandingTab";
import AuditTab from "../../components/billing/AuditTab";

// Billing — the full module: the price list, invoices, the payment ledger, the
// daily cash-up and the debtors list. Shared across portals: the sidebar shows
// it to admins and to anyone granted 'billing.manage'; the API enforces the
// same server-side.
//
// Money never crosses into the stock module and stock quantities never cross
// into this one. The two meet in exactly one place: a ServiceItem may name the
// StockItem it prices, so a batch scanned at the checkout desk finds its price.

const TABS = [
  // Price List first: it is what the clinic has to do before anything else
  // here works, and 19 of the 21 seeded services start with no price.
  { id: "prices", label: "Price List", el: <PriceListTab /> },
  { id: "invoices", label: "Invoices", el: <InvoicesTab /> },
  { id: "payments", label: "Payments", el: <PaymentsTab /> },
  { id: "cashup", label: "Cash-up", el: <CashUpTab /> },
  { id: "outstanding", label: "Outstanding", el: <OutstandingTab /> },
  // The audit three. Separated from the working tabs above because these are
  // CHECKED, not used — and on a good day all three are empty.
  { id: "unbilled", label: "Unbilled", el: <AuditTab report="unbilled" /> },
  { id: "removed", label: "Removed items", el: <AuditTab report="removed" /> },
  { id: "adhoc", label: "Desk prices", el: <AuditTab report="adhoc" /> },
];

const Billing = () => {
  const { loadConfig } = useBillingContext();
  const [tab, setTab] = useState("prices");

  // The clinic's billing configuration — VAT rate, currency, and the option
  // lists every form renders from. Loaded once per visit; nothing is fetched
  // for users who never open this page.
  useEffect(() => { loadConfig(); }, [loadConfig]);

  return (
    <div>
      {/* Header — standard page header block (AdminDashboard / Stocks) */}
      <div className="mb-6">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Billing</h2>
        <p className="text-gray-600 mt-1">
          Set prices, raise bills, take payments and reconcile the day.
        </p>
      </div>

      {/* Tab switcher — same pill group as Stocks / Clinical Catalog */}
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

      {/* key remounts the tab on switch so each loads fresh data — a stale
          balance or cash-up total is worse than a refetch. */}
      <div key={tab}>{TABS.find((t) => t.id === tab)?.el}</div>
    </div>
  );
};

export default Billing;
