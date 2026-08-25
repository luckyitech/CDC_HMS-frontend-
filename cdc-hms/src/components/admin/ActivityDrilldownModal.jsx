import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import Modal from '../shared/Modal';
import activityService from '../../services/activityService';
import { ACTION_STYLE, formatDateTime } from '../../pages/admin/activityLogShared';

const PAGE_SIZE = 20;

/**
 * Drills from one stat on a staff summary card ("Triaged: 24") into the
 * actual events behind it — same data the summary count was built from, just
 * for this one staff member and action type.
 *
 * Fetches its own data scoped to { action: type } rather than reusing the
 * page's already-loaded `events`, because that list may be further narrowed
 * by the page's own action-type filter and would silently go empty here.
 * `staff` pre-filters server-side (a safe superset — that filter is a
 * substring match, e.g. "Ebrahim Yusuf" also matches "Dr. Ebrahim Yusuf"),
 * then an exact-string match client-side guarantees this shows precisely the
 * population the summary card counted — nothing from a same-named colleague.
 */
const ActivityDrilldownModal = ({ isOpen, onClose, staff, type, label, startDate, endDate, allTime }) => {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage]       = useState(1);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setPage(1);

    const params = { action: type, staff };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (!startDate && allTime) params.allTime = 'true';

    activityService.getLog(params)
      .then((res) => {
        if (cancelled) return;
        const exact = (res.data?.events || []).filter((e) => e.staff === staff);
        setRows(exact);
      })
      .catch(() => { if (!cancelled) toast.error('Failed to load activity'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [isOpen, staff, type, startDate, endDate, allTime]);

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const paginated  = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const style      = ACTION_STYLE[type] || { color: 'bg-gray-100 text-gray-600', icon: Activity };
  const Icon       = style.icon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${style.color}`}>
            <Icon className="w-3.5 h-3.5" />
          </span>
          <span>{staff}</span>
          <span className="text-gray-400 font-normal">· {label}</span>
          {!loading && (
            <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
              {rows.length}
            </span>
          )}
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center py-10"><Loader className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-10 text-center">No events found.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  {['Date & Time', 'Patient', 'UHID', 'Detail'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((e, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(e.timestamp)}</td>
                    <td className="px-4 py-3 text-gray-700">{e.patient || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{e.uhid || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 italic text-xs">{e.detail || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} of {rows.length}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="text-sm font-semibold text-gray-700">Page {page} of {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

export default ActivityDrilldownModal;
