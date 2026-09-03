import { useState } from "react";
import { Menu as MenuIcon, X } from "lucide-react";

/**
 * SummaryDock — the floating patient-summary dock, shared by Today's
 * Consultation and the Neuropathy exam so the layout lives in ONE place.
 *
 * Renders the main working column and, alongside it, the summary panel:
 *   ≥ xl  — the panel is FIXED to the viewport (page scroll never moves it);
 *           a spacer reserves its 340px column in the flow.
 *   < xl  — the panel is a right-side slide-in drawer opened by the
 *           "Patient Summary" button (with a dimmed backdrop).
 * The panel is hidden while the full patient overview is expanded
 * (`overviewOpen`) so the fixed panel can't overlap it.
 *
 * Props:
 *   children      the main column content (accordion, exam capture, …)
 *   panel         the summary content. Either a node, or a render function
 *                 ({ closeSummary }) => node so the panel can close the drawer
 *                 (e.g. "jump to prescriptions" also dismisses it on mobile).
 *   overviewOpen  hide the panel while the overview is expanded (default false)
 */
export default function SummaryDock({ children, panel, overviewOpen = false, xlTop = "xl:top-[11.5rem] xl:max-h-[calc(100dvh-12.5rem)]" }) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const closeSummary = () => setSummaryOpen(false);

  return (
    <div className="flex flex-col xl:flex-row xl:items-start gap-4">
      <div className="flex-1 min-w-0">
        {/* Patient summary — mobile/tablet trigger for the drawer (always-on ≥ xl) */}
        <div className="xl:hidden flex justify-end mb-3">
          <button
            onClick={() => setSummaryOpen(true)}
            className="flex items-center gap-1.5 text-sm font-semibold border border-primary text-primary rounded-lg px-3 py-1.5 hover:bg-blue-50"
          >
            <MenuIcon className="w-4 h-4" /> Patient Summary
          </button>
        </div>

        {children}
      </div>

      {/* Summary panel — hidden while the full overview is expanded so the
          fixed panel can't overlap it. */}
      {!overviewOpen && (
        <>
          {/* Drawer backdrop — mobile/tablet only */}
          {summaryOpen && (
            <div className="fixed inset-0 bg-black/40 z-40 xl:hidden" onClick={closeSummary} />
          )}

          <aside
            className={`
              fixed top-[calc(1rem+env(safe-area-inset-top,0px))] bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-[calc(1rem+env(safe-area-inset-right,0px))] z-40 w-[320px] max-w-[88vw] md:w-[50vw] overflow-y-auto no-scrollbar overscroll-contain rounded-[20px] bg-gray-50 shadow-2xl p-3
              transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
              ${summaryOpen ? "translate-x-0" : "translate-x-[calc(100%+1.5rem)]"}
              xl:inset-auto xl:right-8 xl:z-[5] xl:w-[340px] xl:max-w-none xl:translate-x-0
              ${xlTop} xl:rounded-none xl:bg-transparent xl:shadow-none xl:p-0
            `}
          >
            {/* Drawer header — mobile/tablet only */}
            <div className="xl:hidden flex items-center justify-between mb-2 px-1">
              <span className="text-sm font-bold text-gray-700">Patient Summary</span>
              <button onClick={closeSummary} className="p-1.5 text-gray-400 hover:text-gray-600" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            {typeof panel === "function" ? panel({ closeSummary }) : panel}
          </aside>

          {/* Spacer — reserves the fixed panel's column in the xl layout */}
          <div className="hidden xl:block w-[340px] flex-shrink-0" aria-hidden="true" />
        </>
      )}
    </div>
  );
}
