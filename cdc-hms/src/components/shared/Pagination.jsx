import { ChevronLeft, ChevronRight } from 'lucide-react';

// Page-number strip with leading/trailing ellipsis for long ranges. At most 7
// slots, so the strip fits a phone (9 × 32 px buttons with the arrows).
const getPageNumbers = (currentPage, totalPages) => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 3) return [1, 2, 3, 4, '...', totalPages];
  if (currentPage >= totalPages - 2) {
    return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
};

const BTN = 'h-8 min-w-8 sm:h-9 sm:min-w-9 px-2 inline-flex items-center justify-center rounded-lg border text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed';
const IDLE = 'border-gray-300 text-gray-700 ui-hover';

/**
 * Pagination — THE pager (DRY-GUIDELINES §4). For one page it renders only
 * the summary (or nothing without one).
 * `summary` (e.g. "Showing 1–20 of 1676 patients") turns it into a footer bar:
 * the text sits ABOVE the buttons on phones and to their left from `sm` up
 * (Emu, 11 Oct 2026 — side by side, the phone pager was squashed). Without a
 * summary the buttons are centred under the list. `disabled` locks it while
 * a page is loading.
 */
const Pagination = ({ currentPage, totalPages, onPageChange, summary, disabled = false }) => {
  if (totalPages <= 1 && !summary) return null;
  const go = (p) => onPageChange(Math.min(totalPages, Math.max(1, p)));

  const buttons = (
    <div className="flex flex-wrap items-center justify-center gap-1">
      <button type="button" onClick={() => go(currentPage - 1)} disabled={disabled || currentPage === 1}
        aria-label="Previous page" className={`${BTN} ${IDLE}`}>
        <ChevronLeft className="w-4 h-4" />
      </button>
      {getPageNumbers(currentPage, totalPages).map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="px-1 text-gray-400">…</span>
        ) : (
          <button key={page} type="button" onClick={() => go(page)} disabled={disabled}
            aria-current={currentPage === page ? 'page' : undefined}
            className={`${BTN} ${currentPage === page ? 'bg-primary text-white border-primary' : IDLE}`}>
            {page}
          </button>
        ),
      )}
      <button type="button" onClick={() => go(currentPage + 1)} disabled={disabled || currentPage === totalPages}
        aria-label="Next page" className={`${BTN} ${IDLE}`}>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );

  if (!summary) return <div className="mt-6">{buttons}</div>;
  return (
    <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <p className="text-sm text-gray-500">{summary}</p>
      {totalPages > 1 && buttons}
    </div>
  );
};

export default Pagination;
