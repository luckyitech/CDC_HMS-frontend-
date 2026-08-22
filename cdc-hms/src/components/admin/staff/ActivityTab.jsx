import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader, Activity, Printer } from 'lucide-react';
import staffService from '../../../services/staffService';
import usePrint from '../../../hooks/usePrint';
import PrintRoot from '../../shared/PrintRoot';
import { formatDateTime } from './staffFormat';

/**
 * One unified activity timeline for a staff member — logins, profile/permission
 * edits, and every recorded clinical/operational action (register, triage, order
 * / cancel lab, prescribe, notes, appointments, …), newest first, tagged and
 * timestamped, with a date filter. Derived server-side from the same engine as
 * the admin Activity Log (one source of truth).
 *
 * Navigation-only actions (tab clicks, portal switches, page views) are NOT
 * tracked — they never reach the server. This is a record of actions taken.
 */

// Tag colour per event type; grey fallback for anything not listed.
const TAG = {
  user_login:              'bg-lime-100 text-lime-700',
  permissions_changed:     'bg-amber-100 text-amber-800',
  profile_updated:         'bg-gray-100 text-gray-600',
  registered:              'bg-blue-100 text-blue-700',
  added_to_queue:          'bg-yellow-100 text-yellow-800',
  triaged:                 'bg-purple-100 text-purple-700',
  discharged:              'bg-green-100 text-green-700',
  removed:                 'bg-red-100 text-red-700',
  referred:                'bg-fuchsia-100 text-fuchsia-700',
  document_uploaded:       'bg-indigo-100 text-indigo-700',
  document_reviewed:       'bg-green-100 text-green-700',
  equipment_added:         'bg-teal-100 text-teal-700',
  equipment_updated:       'bg-orange-100 text-orange-700',
  equipment_replaced:      'bg-slate-100 text-slate-700',
  prescription_created:    'bg-pink-100 text-pink-700',
  lab_test_ordered:        'bg-cyan-100 text-cyan-700',
  lab_test_cancelled:      'bg-red-100 text-red-700',
  treatment_plan_created:  'bg-emerald-100 text-emerald-700',
  consultation_note:       'bg-violet-100 text-violet-700',
  consultation_note_edited:'bg-orange-100 text-orange-700',
  consultation_started:    'bg-blue-100 text-blue-700',
  consultation_completed:  'bg-green-100 text-green-700',
  physical_exam:           'bg-rose-100 text-rose-700',
  initial_assessment:      'bg-amber-100 text-amber-700',
  appointment_booked:      'bg-sky-100 text-sky-700',
  appointment_cancelled:   'bg-orange-100 text-orange-700',
  slot_blocked:            'bg-red-100 text-red-700',
  barcode_scanned:         'bg-blue-100 text-blue-700',
  barcode_generated:       'bg-teal-100 text-teal-700',
};
const tagCls = (t) => TAG[t] || 'bg-gray-100 text-gray-600';

const ActivityTab = ({ employeeId, staffName }) => {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [typeFilter, setTypeFilter] = useState(null); // { type, label } | null
  const { printRef, handlePrint } = usePrint();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = {};
    if (fromDate) params.startDate = fromDate;
    if (toDate) params.endDate = toDate;

    staffService.getActivity(employeeId, params)
      .then((res) => { if (!cancelled) setTimeline(res.data?.timeline || []); })
      .catch(() => { if (!cancelled) toast.error('Failed to load activity'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [employeeId, fromDate, toDate]);

  const inputCls = 'px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-primary';

  // Currently-visible rows (date filter is server-side; type filter is client-side).
  const shown = typeFilter ? timeline.filter((a) => a.type === typeFilter.type) : timeline;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      {/* Header + date filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-primary" /> Activity log
        </h3>
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputCls} />
          </div>
          {(fromDate || toDate) && (
            <button
              onClick={() => { setFromDate(''); setToDate(''); }}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-blue-50"
            >
              Clear
            </button>
          )}
          <button
            onClick={handlePrint}
            disabled={loading || shown.length === 0}
            className="px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Active type filter — set by clicking a tag below */}
      {typeFilter && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <span className="text-gray-500">Showing only</span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${tagCls(typeFilter.type)}`}>{typeFilter.label}</span>
          <button onClick={() => setTypeFilter(null)} className="text-xs text-primary hover:underline">Clear filter</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : (() => {
        if (shown.length === 0) {
          return (
            <p className="text-sm text-gray-400 py-10 text-center">
              No activity{typeFilter ? ` of this type` : ''} recorded{(fromDate || toDate) ? ' in this date range' : ''}.
            </p>
          );
        }
        return (
          <ul className="divide-y divide-gray-100">
            {shown.map((a, i) => (
              <li key={`${a.type}-${a.timestamp}-${i}`} className="py-2.5 flex items-start justify-between gap-3 text-sm">
                <span className="flex items-start gap-2 min-w-0">
                  {/* Clickable tag → filter the list to this activity type */}
                  <button
                    type="button"
                    onClick={() => setTypeFilter((f) => (f && f.type === a.type ? null : { type: a.type, label: a.label }))}
                    title={typeFilter && typeFilter.type === a.type ? 'Clear filter' : `Show only ${a.label}`}
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 transition hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 ${tagCls(a.type)} ${typeFilter && typeFilter.type === a.type ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                  >
                    {a.label}
                  </button>
                  <span className="min-w-0 text-gray-600 pt-0.5">
                    {a.patient && <span className="text-gray-700">{a.patient}{a.uhid ? ` (${a.uhid})` : ''}</span>}
                    {a.detail && <span className="text-gray-400">{a.patient ? ' · ' : ''}{a.detail}</span>}
                  </span>
                </span>
                <span className="text-gray-400 text-xs whitespace-nowrap flex-shrink-0 pt-0.5">{formatDateTime(a.timestamp)}</span>
              </li>
            ))}
          </ul>
        );
      })()}

      {/* Print target — the currently-filtered rows on the clinic letterhead */}
      <PrintRoot printRef={printRef}>
        <div className="border-b border-gray-300 pb-3 mb-4">
          <p className="text-sm text-gray-700"><b>Staff activity{staffName ? ` — ${staffName}` : ''}</b></p>
          <p className="text-xs text-gray-500">
            {typeFilter ? `Filter: ${typeFilter.label} · ` : ''}
            {(fromDate || toDate) ? `${fromDate || '…'} to ${toDate || '…'}` : 'All dates'} · {shown.length} record{shown.length !== 1 ? 's' : ''}
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-300">
              <th className="py-1 pr-3">Time</th><th className="py-1 pr-3">Activity</th><th className="py-1 pr-3">Patient</th><th className="py-1">Detail</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((a, i) => (
              <tr key={i} className="border-b border-gray-100 align-top">
                <td className="py-1 pr-3 whitespace-nowrap text-gray-500">{formatDateTime(a.timestamp)}</td>
                <td className="py-1 pr-3 font-semibold">{a.label}</td>
                <td className="py-1 pr-3">{a.patient || ''}{a.uhid ? ` (${a.uhid})` : ''}</td>
                <td className="py-1 text-gray-600">{a.detail || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintRoot>
    </div>
  );
};

export default ActivityTab;
