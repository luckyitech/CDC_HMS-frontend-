import { useState, useCallback } from "react";
import SwitcherTabs from "../shared/SwitcherTabs";
import StockTodayView from "./StockTodayView";
import StockReportsTab from "./StockReportsTab";
import StockAuditView from "./StockAuditView";
import StockHelp from "./StockHelp";

// Stocks → Analytics. Three views, one question each (13 Oct 2026, Emu: the old
// single page — 12 KPI cards, five panels, the old dashboard and the whole
// reports engine on one scroll — was "over stimulating"):
//   Today   — what needs doing now (StockTodayView).
//   Reports — everything for looking back (StockReportsTab).
//   Audit   — who did what and when: receiving, stocktakes, room balancing,
//             every stock event (StockAuditView, 13 Oct 2026).
// A link in Today opens Reports on the matching report; bumping `nonce`
// remounts the reports engine so a second click re-opens and re-fetches.
const VIEWS = [{ id: "today", label: "Today" }, { id: "reports", label: "Reports" }, { id: "audit", label: "Audit" }];

const StockAnalyticsTab = () => {
  const [view, setView] = useState("today");
  const [reportSub, setReportSub] = useState("inventory");
  const [nonce, setNonce] = useState(0);

  const openReport = useCallback((sub) => {
    setReportSub(sub);
    setNonce((n) => n + 1);
    setView("reports");
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <SwitcherTabs size="sm" tabs={VIEWS} active={view} onChange={setView} ariaLabel="Analytics view" idPrefix="analytics" />
        <StockHelp tab="analytics" />
      </div>
      {view === "today" && <StockTodayView onReport={openReport} />}
      {view === "reports" && <StockReportsTab key={nonce} initialSub={reportSub} />}
      {view === "audit" && <StockAuditView />}
    </div>
  );
};

export default StockAnalyticsTab;
