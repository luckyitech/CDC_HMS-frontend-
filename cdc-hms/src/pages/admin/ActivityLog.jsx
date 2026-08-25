import { useState, useEffect, useCallback } from 'react';
import { Activity, Filter, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, Printer } from 'lucide-react';
import Card from '../../components/shared/Card';
import PrintRoot from '../../components/shared/PrintRoot';
import ActivityDrilldownModal from '../../components/admin/ActivityDrilldownModal';
import usePrint from '../../hooks/usePrint';
import activityService from '../../services/activityService';
import { ACTION_STYLE, formatDateTime } from './activityLogShared';

const PAGE_SIZE = 100;

// ── Action metadata ───────────────────────────────────────────────────────────

const ACTION_TYPES = [
  { value: 'all',                  label: 'All Actions' },
  { value: 'registered',           label: 'Registered Patient' },
  { value: 'added_to_queue',       label: 'Added to Queue' },
  { value: 'triaged',              label: 'Triaged Patient' },
  { value: 'discharged',           label: 'Discharged Patient' },
  { value: 'removed',              label: 'Removed from Queue' },
  { value: 'referred',             label: 'Referred Patient' },
  { value: 'document_uploaded',    label: 'Uploaded Document' },
  { value: 'document_reviewed',    label: 'Reviewed Document' },
  { value: 'equipment_added',      label: 'Added Equipment' },
  { value: 'equipment_updated',    label: 'Updated Equipment' },
  { value: 'equipment_replaced',   label: 'Replaced Equipment' },
  { value: 'prescription_created', label: 'Wrote Prescription' },
  { value: 'lab_test_ordered',     label: 'Ordered Lab Test' },
  { value: 'lab_test_cancelled',   label: 'Cancelled Lab Test' },
  { value: 'treatment_plan_created',label: 'Created Treatment Plan' },
  { value: 'consultation_note',         label: 'Wrote Consultation Note' },
  { value: 'consultation_note_edited',  label: 'Edited Consultation Note' },
  { value: 'consultation_started',      label: 'Started Consultation' },
  { value: 'consultation_completed',label: 'Completed Consultation' },
  { value: 'physical_exam',        label: 'Recorded Physical Exam' },
  { value: 'initial_assessment',   label: 'Recorded Initial Assessment' },
  { value: 'account_created',      label: 'Created Account' },
  { value: 'user_login',           label: 'Logged In' },
  { value: 'appointment_booked',    label: 'Booked Appointment' },
  { value: 'appointment_cancelled', label: 'Cancelled Appointment' },
  { value: 'slot_blocked',          label: 'Blocked Slot' },
  { value: 'barcode_scanned',       label: 'Scanned Barcode' },
  { value: 'barcode_generated',     label: 'Generated Barcode' },
];

// `type` is the underlying event type (matches ACTION_STYLE / ACTION_TYPES and
// the backend's event `type` field) — it's what a click on this stat drills
// into, so it has to be the exact slug, not just a display key.
const SUMMARY_FIELDS = [
  { key: 'registered',           type: 'registered',              label: 'Registered',            color: 'text-blue-600' },
  { key: 'addedToQueue',         type: 'added_to_queue',          label: 'Added to Queue',        color: 'text-yellow-600' },
  { key: 'triaged',              type: 'triaged',                 label: 'Triaged',               color: 'text-purple-600' },
  { key: 'discharged',           type: 'discharged',              label: 'Discharged',            color: 'text-green-600' },
  { key: 'removed',              type: 'removed',                 label: 'Removed',               color: 'text-red-600' },
  { key: 'referred',             type: 'referred',                label: 'Referred',              color: 'text-fuchsia-600' },
  { key: 'documentUploaded',     type: 'document_uploaded',       label: 'Doc Uploaded',          color: 'text-indigo-600' },
  { key: 'documentReviewed',     type: 'document_reviewed',       label: 'Doc Reviewed',          color: 'text-green-600' },
  { key: 'equipmentAdded',       type: 'equipment_added',         label: 'Equip. Added',          color: 'text-teal-600' },
  { key: 'equipmentUpdated',     type: 'equipment_updated',       label: 'Equip. Updated',        color: 'text-orange-600' },
  { key: 'equipmentReplaced',    type: 'equipment_replaced',      label: 'Equip. Replaced',       color: 'text-slate-600' },
  { key: 'prescriptionCreated',  type: 'prescription_created',    label: 'Prescriptions',         color: 'text-pink-600' },
  { key: 'labTestOrdered',       type: 'lab_test_ordered',        label: 'Lab Tests Ordered',     color: 'text-cyan-600' },
  { key: 'labTestCancelled',     type: 'lab_test_cancelled',      label: 'Lab Tests Cancelled',   color: 'text-red-600' },
  { key: 'treatmentPlanCreated', type: 'treatment_plan_created',  label: 'Treatment Plans',       color: 'text-emerald-600' },
  { key: 'consultationNote',       type: 'consultation_note',         label: 'Consultation Notes',    color: 'text-violet-600' },
  { key: 'consultationNoteEdited', type: 'consultation_note_edited',  label: 'Notes Edited',          color: 'text-orange-600' },
  { key: 'consultationStarted',    type: 'consultation_started',      label: 'Consultations Started', color: 'text-blue-600' },
  { key: 'consultationCompleted',type: 'consultation_completed',  label: 'Consultations Done',    color: 'text-green-600' },
  { key: 'physicalExam',         type: 'physical_exam',           label: 'Physical Exams',        color: 'text-rose-600' },
  { key: 'initialAssessment',    type: 'initial_assessment',      label: 'Assessments',           color: 'text-amber-600' },
  { key: 'accountCreated',       type: 'account_created',         label: 'Accounts Created',      color: 'text-purple-600' },
  { key: 'userLogin',            type: 'user_login',              label: 'Logins',                color: 'text-lime-600' },
  { key: 'appointmentBooked',    type: 'appointment_booked',      label: 'Appointments Booked',    color: 'text-sky-600' },
  { key: 'appointmentCancelled', type: 'appointment_cancelled',   label: 'Appointments Cancelled', color: 'text-orange-600' },
  { key: 'slotBlocked',          type: 'slot_blocked',            label: 'Slots Blocked',          color: 'text-red-600' },
  { key: 'barcodeScanned',       type: 'barcode_scanned',         label: 'Barcodes Scanned',       color: 'text-blue-600' },
  { key: 'barcodeGenerated',     type: 'barcode_generated',       label: 'Barcodes Generated',     color: 'text-teal-600' },
];

// Matches the sm/lg Tailwind breakpoints the rest of the page uses. Columns
// are assigned by list position (below), not left to the browser to balance
// by rendered height — that's what made cards visibly relocate when one
// expanded. Widest match wins; narrower than both falls back to 1 column.
const COLUMN_BREAKPOINTS = [[1024, 3], [640, 2]];

const getColumnCount = () => {
  if (typeof window === 'undefined') return 1;
  const match = COLUMN_BREAKPOINTS.find(([minWidth]) => window.innerWidth >= minWidth);
  return match ? match[1] : 1;
};

// ── Component ─────────────────────────────────────────────────────────────────

const ActivityLog = () => {
  const [events, setEvents]   = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [columnCount, setColumnCount] = useState(getColumnCount);

  // Filters
  const [startDate, setStartDate]     = useState('');
  const [endDate, setEndDate]         = useState('');
  // No dates picked defaults to the last 30 days server-side — this opts back
  // into the full history instead. Picking a date always wins over it.
  const [allTime, setAllTime]         = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [role, setRole]               = useState('all');
  const [actionType, setActionType]   = useState('all');
  // Which staff summary cards are expanded — collapsed (name + total only) by
  // default so the summary section doesn't dominate the page; each card toggles
  // independently rather than as an accordion.
  const [expandedStaff, setExpandedStaff] = useState(() => new Set());
  // The whole Summary section starts collapsed too — a hospital with 100+ staff
  // would otherwise render that many cards before the filters/table are even
  // reachable without scrolling.
  const [summaryOpen, setSummaryOpen] = useState(false);
  // A stat clicked on a summary card — { staff, type, label } | null. Drives
  // the drilldown modal showing the actual events behind that count.
  const [drilldown, setDrilldown] = useState(null);
  const { printRef, handlePrint }     = usePrint();

  const toggleStaffCard = (staff) => setExpandedStaff((prev) => {
    const next = new Set(prev);
    if (next.has(staff)) next.delete(staff); else next.add(staff);
    return next;
  });

  const pickStartDate = (v) => { setStartDate(v); if (v) setAllTime(false); };
  const pickEndDate   = (v) => { setEndDate(v);   if (v) setAllTime(false); };
  const toggleAllTime = () => setAllTime((prev) => {
    const next = !prev;
    if (next) { setStartDate(''); setEndDate(''); }
    return next;
  });

  // Derived: filter events by the performer's actual role (set by backend)
  const visibleEvents = events.filter(e => role === 'all' || e.role === role);
  const totalPages    = Math.ceil(visibleEvents.length / PAGE_SIZE);
  const paginated     = visibleEvents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // All action types are always shown — role and action type are independent filters
  const filteredActionTypes = ACTION_TYPES;

  // Derived: show summary cards whose performer role matches the filter
  const visibleSummary = summary.filter(s => role === 'all' || s.role === role);

  // Round-robin into fixed columns — card #4 is always in column 0, #5 always
  // in column 1, and so on, regardless of any card's expanded height. Expanding
  // a card can only push cards below it within its own column; it can never
  // cause a card to move to a different column.
  const summaryColumns = Array.from({ length: columnCount }, () => []);
  visibleSummary.forEach((s, i) => summaryColumns[i % columnCount].push(s));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate)        params.startDate = startDate;
      if (endDate)          params.endDate   = endDate;
      if (!startDate && allTime) params.allTime = 'true';
      if (staffSearch.trim()) params.staff   = staffSearch.trim();
      if (actionType !== 'all') params.action = actionType;

      const res = await activityService.getLog(params);
      if (res.success) {
        setEvents(res.data.events);
        setSummary(res.data.summary);
        setPage(1);
      }
    } catch {
      // handled silently
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, allTime, staffSearch, actionType]);

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setPage(1);
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const onResize = () => setColumnCount(getColumnCount());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const roleLabel = { all: 'Summary', staff: 'Staff Summary', doctor: 'Doctor Summary', lab: 'Lab Summary', admin: 'Admin Summary' }[role];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Activity Log</h1>
          <p className="text-sm text-gray-500 mt-1">Track every action performed by staff and doctors</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters — kept above the Summary section so they're reachable without
          scrolling past a potentially long staff list first. */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-bold text-gray-600">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From Date</label>
            <input type="date" value={startDate} disabled={allTime} onChange={e => pickStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary disabled:bg-gray-50 disabled:text-gray-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To Date</label>
            <input type="date" value={endDate} disabled={allTime} onChange={e => pickEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary disabled:bg-gray-50 disabled:text-gray-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Search by Name</label>
            <input type="text" placeholder="Search..." value={staffSearch} onChange={e => setStaffSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Role</label>
            <select value={role} onChange={e => handleRoleChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
              <option value="all">All Roles</option>
              <option value="staff">Staff Only</option>
              <option value="doctor">Doctors Only</option>
              <option value="lab">Lab Only</option>
              <option value="admin">Admin Only</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Action Type</label>
            <select value={actionType} onChange={e => setActionType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
              {filteredActionTypes.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 mt-3 text-xs text-gray-600 cursor-pointer w-fit">
          <input type="checkbox" checked={allTime} onChange={toggleAllTime} className="rounded border-gray-300" />
          All time — without this, no date range shown above means the last 30 days
        </label>
      </Card>

      {/* Summary Cards — collapsed by default at the section level (not just per
          card): a hospital with 100+ staff would otherwise render that many
          cards on every page load, before anyone has asked to see them. */}
      {visibleSummary.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setSummaryOpen((v) => !v)}
            aria-expanded={summaryOpen}
            className="flex items-center gap-1.5 mb-3 text-sm font-bold text-gray-500 uppercase tracking-wide"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${summaryOpen ? '' : '-rotate-90'}`} />
            {roleLabel} ({visibleSummary.length})
          </button>
          {summaryOpen && (
            /* Each card is pre-assigned to a fixed column (summaryColumns,
               computed above by list position) rather than laid out by a grid
               or CSS-columns that rebalances by rendered height — that
               rebalancing was what made cards visibly relocate elsewhere on
               screen the moment one expanded. Here, expanding a card can only
               push the cards below IT within its own column; every other
               column is completely unaffected. */
            <div className="flex gap-4 items-start">
              {summaryColumns.map((col, ci) => (
                <div key={ci} className="flex-1 min-w-0 flex flex-col gap-3">
                  {col.map((s) => {
                    const isOpen = expandedStaff.has(s.staff);
                    return (
                      <Card key={s.staff} className="p-4">
                        <button
                          type="button"
                          onClick={() => toggleStaffCard(s.staff)}
                          aria-expanded={isOpen}
                          className="w-full flex items-center justify-between gap-2 text-left"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                            <span className="font-bold text-gray-800 text-base truncate">{s.staff}</span>
                          </span>
                          <span className="text-xs bg-primary text-white px-2 py-1 rounded-full font-semibold flex-shrink-0">
                            {s.total} actions
                          </span>
                        </button>
                        {isOpen && (
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-3 pt-3 border-t border-gray-100">
                            {SUMMARY_FIELDS.filter(f => s[f.key] > 0).map(f => (
                              <button
                                key={f.key}
                                type="button"
                                onClick={() => setDrilldown({ staff: s.staff, type: f.type, label: f.label })}
                                title={`Show ${s.staff}'s ${f.label.toLowerCase()} events`}
                                className="flex justify-between text-left rounded px-1 -mx-1 hover:bg-gray-50"
                              >
                                <span>{f.label}</span>
                                <span className={`font-bold ${f.color} underline decoration-dotted underline-offset-2`}>{s[f.key]}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Events Log */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-700">Activity Events</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{visibleEvents.length} record{visibleEvents.length !== 1 ? 's' : ''}</span>
            <button
              onClick={handlePrint}
              disabled={loading || visibleEvents.length === 0}
              className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : visibleEvents.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No activity found for the selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Date & Time</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Patient</th>
                  <th className="px-4 py-3 text-left">UHID</th>
                  <th className="px-4 py-3 text-left">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map((e, i) => {
                  const style = ACTION_STYLE[e.type] || { color: 'bg-gray-100 text-gray-600', icon: Activity };
                  const Icon = style.icon;
                  return (
                    <tr key={i} className="hover:bg-blue-50 transition">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(e.timestamp)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{e.staff}</td>
                      <td className="px-4 py-3">
                        {/* Clickable tag → filter to this activity type (keeps the
                            current date range). Click the active one again to clear. */}
                        <button
                          type="button"
                          onClick={() => setActionType((prev) => (prev === e.type ? 'all' : e.type))}
                          title={actionType === e.type ? 'Clear filter' : `Show only ${e.label}`}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 ${style.color} ${actionType === e.type ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                        >
                          <Icon className="w-3 h-3" />
                          {e.label}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{e.patient}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{e.uhid}</td>
                      <td className="px-4 py-3 text-gray-500 italic text-xs max-w-xs truncate">{e.detail || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, visibleEvents.length)} of {visibleEvents.length} records
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <span className="text-sm font-semibold text-gray-700">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Print target — every filtered event (not just the current page) on the
          clinic letterhead. */}
      <PrintRoot printRef={printRef}>
        <div className="border-b border-gray-300 pb-3 mb-4">
          <p className="text-sm text-gray-700"><b>Activity log</b></p>
          <p className="text-xs text-gray-500">
            {[
              (startDate || endDate) ? `${startDate || '…'} to ${endDate || '…'}` : allTime ? 'All time' : 'Last 30 days',
              staffSearch.trim() ? `Staff: ${staffSearch.trim()}` : null,
              role !== 'all' ? `Role: ${role}` : null,
              actionType !== 'all' ? `Action: ${ACTION_TYPES.find(t => t.value === actionType)?.label || actionType}` : null,
            ].filter(Boolean).join(' · ')} · {visibleEvents.length} record{visibleEvents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-300">
              <th className="py-1 pr-3">Time</th><th className="py-1 pr-3">Staff</th><th className="py-1 pr-3">Activity</th><th className="py-1 pr-3">Patient</th><th className="py-1 pr-3">UHID</th><th className="py-1">Detail</th>
            </tr>
          </thead>
          <tbody>
            {visibleEvents.map((e, i) => (
              <tr key={i} className="border-b border-gray-100 align-top">
                <td className="py-1 pr-3 whitespace-nowrap text-gray-500">{formatDateTime(e.timestamp)}</td>
                <td className="py-1 pr-3">{e.staff}</td>
                <td className="py-1 pr-3 font-semibold">{e.label}</td>
                <td className="py-1 pr-3">{e.patient || ''}</td>
                <td className="py-1 pr-3 text-gray-500">{e.uhid || ''}</td>
                <td className="py-1 text-gray-600">{e.detail || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintRoot>

      <ActivityDrilldownModal
        isOpen={!!drilldown}
        onClose={() => setDrilldown(null)}
        staff={drilldown?.staff}
        type={drilldown?.type}
        label={drilldown?.label}
        startDate={startDate}
        endDate={endDate}
        allTime={allTime}
      />
    </div>
  );
};

export default ActivityLog;
