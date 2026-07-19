import { ChevronLeft, ChevronRight } from 'lucide-react';

// Page-number strip with leading/trailing ellipsis for long ranges.
const getPageNumbers = (currentPage, totalPages) => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 3) return [1, 2, 3, 4, '...', totalPages];
  if (currentPage >= totalPages - 2) {
    return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
};

// Shared pager. Renders nothing when there is only one page.
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className="p-2 rounded-lg border-2 border-gray-300 hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        <ChevronLeft className="w-5 h-5 text-gray-700" />
      </button>

      {getPageNumbers(currentPage, totalPages).map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-gray-500">...</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-10 h-10 rounded-lg font-semibold text-sm transition ${
              currentPage === page
                ? 'bg-primary text-white border-2 border-primary'
                : 'border-2 border-gray-300 text-gray-700 hover:border-primary hover:bg-blue-50'
            }`}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className="p-2 rounded-lg border-2 border-gray-300 hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        <ChevronRight className="w-5 h-5 text-gray-700" />
      </button>
    </div>
  );
};

export default Pagination;
