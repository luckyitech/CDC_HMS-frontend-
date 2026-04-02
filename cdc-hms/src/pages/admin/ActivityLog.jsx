import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, UserPlus, Activity, UserCheck, UserX, Filter, RefreshCw, ChevronLeft, ChevronRight, FileText, Cpu, RefreshCcw, Settings, Pill, FlaskConical, BookOpen, Stethoscope, UserCog, Pencil } from 'lucide-react';
import Card from '../../components/shared/Card';
import activityService from '../../services/activityService';

const PAGE_SIZE = 100;

// ── Action metadata ───────────────────────────────────────────────────────────

const ACTION_TYPES = [
  { value: 'all',                  label: 'All Actions' },
  { value: 'registered',           label: 'Registered Patient' },
  { value: 'added_to_queue',       label: 'Added to Queue' },
  { value: 'triaged',              label: 'Triaged Patient' },
  { value: 'discharged',           label: 'Discharged Patient' },
  { value: 'removed',              label: 'Removed from Queue' },
  { value: 'document_uploaded',    label: 'Uploaded Document' },
  { value: 'equipment_added',      label: 'Added Equipment' },
  { value: 'equipment_updated',    label: 'Updated Equipment' },
  { value: 'equipment_replaced',   label: 'Replaced Equipment' },
  { value: 'prescription_created', label: 'Wrote Prescription' },
  { value: 'lab_test_ordered',     label: 'Ordered Lab Test' },
  { value: 'treatment_plan_created',label: 'Created Treatment Plan' },
  { value: 'consultation_note',         label: 'Wrote Consultation Note' },
  { value: 'consultation_note_edited',  label: 'Edited Consultation Note' },
  { value: 'consultation_started',      label: 'Started Consultation' },
  { value: 'consultation_completed',label: 'Completed Consultation' },
  { value: 'physical_exam',        label: 'Recorded Physical Exam' },
  { value: 'initial_assessment',   label: 'Recorded Initial Assessment' },
  { value: 'account_created',      label: 'Created Account' },
];

const ACTION_STYLE = {
  registered:            { color: 'bg-blue-100 text-blue-700',     icon: UserPlus },
  added_to_queue:        { color: 'bg-yellow-100 text-yellow-800', icon: ClipboardList },
  triaged:               { color: 'bg-purple-100 text-purple-700', icon: Activity },
  discharged:            { color: 'bg-green-100 text-green-700',   icon: UserCheck },
  removed:               { color: 'bg-red-100 text-red-700',       icon: UserX },
  document_uploaded:     { color: 'bg-indigo-100 text-indigo-700', icon: FileText },
  equipment_added:       { color: 'bg-teal-100 text-teal-700',     icon: Cpu },
  equipment_updated:     { color: 'bg-orange-100 text-orange-700', icon: Settings },
  equipment_replaced:    { color: 'bg-slate-100 text-slate-700',   icon: RefreshCcw },
  prescription_created:  { color: 'bg-pink-100 text-pink-700',     icon: Pill },
  lab_test_ordered:      { color: 'bg-cyan-100 text-cyan-700',     icon: FlaskConical },
  treatment_plan_created:{ color: 'bg-emerald-100 text-emerald-700',icon: BookOpen },
  consultation_note:         { color: 'bg-violet-100 text-violet-700', icon: Stethoscope },
  consultation_note_edited:  { color: 'bg-orange-100 text-orange-700', icon: Pencil },
  consultation_started:      { color: 'bg-blue-100 text-blue-700',     icon: Activity },
  consultation_completed:{ color: 'bg-green-100 text-green-700',   icon: UserCheck },
  physical_exam:         { color: 'bg-rose-100 text-rose-700',     icon: Activity },
  initial_assessment:    { color: 'bg-amber-100 text-amber-700',   icon: ClipboardList },
  account_created:       { color: 'bg-purple-100 text-purple-700', icon: UserCog },
};

const SUMMARY_FIELDS = [
  { key: 'registered',           label: 'Registered',            color: 'text-blue-600' },
  { key: 'addedToQueue',         label: 'Added to Queue',        color: 'text-yellow-600' },
  { key: 'triaged',              label: 'Triaged',               color: 'text-purple-600' },
  { key: 'discharged',           label: 'Discharged',            color: 'text-green-600' },
  { key: 'removed',              label: 'Removed',               color: 'text-red-600' },
  { key: 'documentUploaded',     label: 'Documents',             color: 'text-indigo-600' },
  { key: 'equipmentAdded',       label: 'Equip. Added',          color: 'text-teal-600' },
  { key: 'equipmentUpdated',     label: 'Equip. Updated',        color: 'text-orange-600' },
  { key: 'equipmentReplaced',    label: 'Equip. Replaced',       color: 'text-slate-600' },
  { key: 'prescriptionCreated',  label: 'Prescriptions',         color: 'text-pink-600' },
  { key: 'labTestOrdered',       label: 'Lab Tests Ordered',     color: 'text-cyan-600' },
  { key: 'treatmentPlanCreated', label: 'Treatment Plans',       color: 'text-emerald-600' },
  { key: 'consultationNote',       label: 'Consultation Notes',    color: 'text-violet-600' },
  { key: 'consultationNoteEdited', label: 'Notes Edited',          color: 'text-orange-600' },
  { key: 'consultationStarted',    label: 'Consultations Started', color: 'text-blue-600' },
  { key: 'consultationCompleted',label: 'Consultations Done',    color: 'text-green-600' },
  { key: 'physicalExam',         label: 'Physical Exams',        color: 'text-rose-600' },
  { key: 'initialAssessment',    label: 'Assessments',           color: 'text-amber-600' },
  { key: 'accountCreated',       label: 'Accounts Created',      color: 'text-purple-600' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatDateTime = (iso) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

// ── Component ─────────────────────────────────────────────────────────────────

const ActivityLog = () => {
  const [events, setEvents]   = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);

  // Filters
  const [startDate, setStartDate]     = useState('');
  const [endDate, setEndDate]         = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [role, setRole]               = useState('all');
  const [actionType, setActionType]   = useState('all');

  // Derived: filter events by the performer's actual role (set by backend)
  const visibleEvents = events.filter(e => role === 'all' || e.role === role);
  const totalPages    = Math.ceil(visibleEvents.length / PAGE_SIZE);
  const paginated     = visibleEvents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // All action types are always shown — role and action type are independent filters
  const filteredActionTypes = ACTION_TYPES;

  // Derived: show summary cards whose performer role matches the filter
  const visibleSummary = summary.filter(s => role === 'all' || s.role === role);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate)        params.startDate = startDate;
      if (endDate)          params.endDate   = endDate;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, staffSearch, actionType]);

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setPage(1);
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  const roleLabel = { all: 'Summary', staff: 'Staff Summary', doctor: 'Doctor Summary', admin: 'Admin Summary' }[role];

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

      {/* Summary Cards */}
      {visibleSummary.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">{roleLabel}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleSummary.map((s) => (
              <Card key={s.staff} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-gray-800 text-base">{s.staff}</span>
                  <span className="text-xs bg-primary text-white px-2 py-1 rounded-full font-semibold">
                    {s.total} actions
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  {SUMMARY_FIELDS.filter(f => s[f.key] > 0).map(f => (
                    <span key={f.key} className="flex justify-between">
                      <span>{f.label}</span>
                      <span className={`font-bold ${f.color}`}>{s[f.key]}</span>
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-bold text-gray-600">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
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
      </Card>

      {/* Events Log */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-700">Activity Events</h2>
          <span className="text-xs text-gray-400">{visibleEvents.length} record{visibleEvents.length !== 1 ? 's' : ''}</span>
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
                    <tr key={i} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(e.timestamp)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{e.staff}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${style.color}`}>
                          <Icon className="w-3 h-3" />
                          {e.label}
                        </span>
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
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <span className="text-sm font-semibold text-gray-700">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ActivityLog;
