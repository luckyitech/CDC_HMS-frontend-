import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, CheckCircle, XCircle, ClipboardList } from 'lucide-react';
import { useUserContext } from '../../contexts/UserContext';
import appointmentService from '../../services/appointmentService';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  scheduled:    'bg-blue-100 text-blue-700 border border-blue-200',
  'checked-in': 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  completed:    'bg-green-100 text-green-700 border border-green-200',
  cancelled:    'bg-red-100 text-red-700 border border-red-200',
};

const TYPE_STYLES = {
  consultation: 'bg-purple-100 text-purple-700',
  'follow-up':  'bg-cyan-100 text-cyan-700',
  'check-up':   'bg-teal-100 text-teal-700',
  emergency:    'bg-red-100 text-red-700',
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/**
 * Shared appointments list used by both staff and doctor portals.
 * @param {'staff' | 'doctor'} mode
 *   - 'staff'  — shows all appointments + Doctor column, action: Check In
 *   - 'doctor' — shows only current doctor's appointments, action: Mark Completed
 */
const PAGE_LIMIT = 15;

const AppointmentsListView = ({ mode }) => {
  const navigate = useNavigate();
  const { currentUser } = useUserContext();
  const isDoctor = mode === 'doctor';

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', date: '', search: '' });
  const [searchInput, setSearchInput] = useState(''); // raw input — debounced before hitting API
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [stats, setStats] = useState({ total: 0, scheduled: 0, checkedIn: 0, completed: 0, cancelled: 0 });
  const debounceRef = useRef(null);

  // Debounce search input — only commit to filters after 500ms of no typing
  const handleSearchChange = (value) => {
    setSearchInput(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters(f => ({ ...f, search: value }));
    }, 500);
  };

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [filters.status, filters.date, filters.search]);

  // Fetch accurate stats across ALL pages (ignores status filter, respects doctor + date)
  const fetchStats = useCallback(async () => {
    if (isDoctor && !currentUser?.id) return;
    try {
      const base = { limit: 1 };
      if (isDoctor)        base.doctor = currentUser.id;
      if (filters.date)    base.date   = filters.date;
      if (filters.search)  base.search = filters.search;

      const [total, scheduled, checkedIn, completed, cancelled] = await Promise.all([
        appointmentService.getAll({ ...base }),
        appointmentService.getAll({ ...base, status: 'scheduled' }),
        appointmentService.getAll({ ...base, status: 'checked-in' }),
        appointmentService.getAll({ ...base, status: 'completed' }),
        appointmentService.getAll({ ...base, status: 'cancelled' }),
      ]);

      setStats({
        total:     total.data?.pagination?.total     || 0,
        scheduled: scheduled.data?.pagination?.total || 0,
        checkedIn: checkedIn.data?.pagination?.total || 0,
        completed: completed.data?.pagination?.total || 0,
        cancelled: cancelled.data?.pagination?.total || 0,
      });
    } catch { /* non-blocking */ }
  }, [isDoctor, currentUser?.id, filters.date, filters.search]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const fetchAppointments = useCallback(async () => {
    if (isDoctor && !currentUser?.id) return;
    setLoading(true);
    try {
      const params = { page, limit: PAGE_LIMIT };
      if (isDoctor)        params.doctor = currentUser.id;
      if (filters.status)  params.status = filters.status;
      if (filters.date)    params.date   = filters.date;
      if (filters.search)  params.search = filters.search;

      const res = await appointmentService.getAll(params);
      if (res.success) {
        const data = res.data.appointments || res.data || [];
        setAppointments(data);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [isDoctor, currentUser?.id, filters.status, filters.date, filters.search, page]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleStatusUpdate = async (id, status) => {
    try {
      const res = await appointmentService.updateStatus(id, { status });
      if (res.success) {
        toast.success(`Appointment ${status}`);
        fetchAppointments();
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const counts = {
    total:     stats.total,
    scheduled: stats.scheduled,
    checkedIn: stats.checkedIn,
    completed: stats.completed,
    cancelled: stats.cancelled,
  };

  const startItem = (page - 1) * PAGE_LIMIT + 1;
  const endItem   = Math.min(page * PAGE_LIMIT, pagination.total);

  const patientProfilePath = (uhid) =>
    isDoctor ? `/doctor/patient-profile/${uhid}` : `/staff/patient-profile/${uhid}`;

  const tableHeaders = isDoctor
    ? ['Appt #', 'Patient', 'Date & Time', 'Type', 'Reason', 'Booked On', 'Status', 'Actions']
    : ['Appt #', 'Patient', 'Doctor', 'Date & Time', 'Type', 'Reason', 'Booked On', 'Status', 'Actions'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-800">
            {isDoctor ? 'My Appointments' : 'Appointments'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isDoctor ? 'Appointments booked by patients for you' : 'All patient-booked appointments'}
          </p>
        </div>
        <button
          onClick={fetchAppointments}
          className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Stats — Total spans full width on mobile so 4 remaining fit as 2×2 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        {[
          { label: 'Total',      value: counts.total,     color: 'bg-blue-50 border-blue-200 text-blue-700',     span: 'col-span-2 lg:col-span-1' },
          { label: 'Scheduled',  value: counts.scheduled, color: 'bg-blue-50 border-blue-200 text-blue-700',     span: '' },
          { label: 'Checked In', value: counts.checkedIn, color: 'bg-yellow-50 border-yellow-200 text-yellow-700', span: '' },
          { label: 'Completed',  value: counts.completed, color: 'bg-green-50 border-green-200 text-green-700',  span: '' },
          { label: 'Cancelled',  value: counts.cancelled, color: 'bg-red-50 border-red-200 text-red-700',        span: '' },
        ].map(s => (
          <div key={s.label} className={`p-3 lg:p-4 rounded-xl border-2 ${s.color} ${s.span}`}>
            <p className="text-xs font-medium opacity-70">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4">
        <div className="flex flex-col gap-3">
          {/* Search — full width always */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={isDoctor ? 'Search by patient name or UHID...' : 'Search by patient name, UHID, doctor...'}
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          {/* Status + Date side by side on all screen sizes */}
          <div className="flex gap-3">
            <select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            >
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="checked-in">Checked In</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input
              type="date"
              value={filters.date}
              onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            />
            {(filters.status || filters.date || filters.search) && (
              <button
                onClick={() => {
                  setFilters({ status: '', date: '', search: '' });
                  setSearchInput('');
                }}
                className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List / Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <ClipboardList className="w-12 h-12 mb-2 opacity-30" />
          <p>No appointments found</p>
        </div>
      ) : (
        <>
          {/* Cards — mobile & tablet (< xl) */}
          <div className="xl:hidden space-y-3">
            {appointments.map(a => (
              <div key={a.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Card header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-400">{a.appointmentNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[a.status] || ''}`}>
                      {a.status}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_STYLES[a.appointmentType] || 'bg-gray-100 text-gray-600'}`}>
                    {a.appointmentType}
                  </span>
                </div>

                {/* Card body */}
                <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                  <div className="col-span-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Patient</p>
                    <button
                      onClick={() => navigate(patientProfilePath(a.uhid))}
                      className="font-semibold text-blue-600 hover:underline text-left text-sm"
                    >
                      {a.patientName}
                    </button>
                    <p className="text-xs text-gray-400">{a.uhid}</p>
                  </div>
                  {!isDoctor && (
                    <div className="col-span-2">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Doctor</p>
                      <p className="text-sm font-medium text-gray-700">{a.doctorName}</p>
                      {a.specialty && <p className="text-xs text-gray-400">{a.specialty}</p>}
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Date</p>
                    <p className="text-sm font-medium text-gray-800">{formatDate(a.date)}</p>
                    <p className="text-xs text-gray-400">{a.timeSlot}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Booked On</p>
                    <p className="text-xs text-gray-500">{formatDateTime(a.bookedAt)}</p>
                  </div>
                  {a.reason && (
                    <div className="col-span-2">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Reason</p>
                      <p className="text-sm text-gray-600 truncate">{a.reason}</p>
                    </div>
                  )}
                </div>

                {/* Card footer — actions */}
                {(a.status === 'scheduled' || a.status === 'checked-in') && (
                  <div className="flex gap-2 px-4 py-3 bg-gray-50 border-t border-gray-100">
                    {isDoctor && a.status === 'checked-in' && (
                      <button
                        onClick={() => handleStatusUpdate(a.id, 'completed')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Mark Completed
                      </button>
                    )}
                    {!isDoctor && a.status === 'scheduled' && (
                      <button
                        onClick={() => handleStatusUpdate(a.id, 'checked-in')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-yellow-50 hover:bg-yellow-100 text-yellow-700 text-xs font-semibold"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Check In
                      </button>
                    )}
                    <button
                      onClick={() => handleStatusUpdate(a.id, 'cancelled')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Table — desktop only (xl+) */}
          <div className="hidden xl:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {tableHeaders.map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {appointments.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.appointmentNumber}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(patientProfilePath(a.uhid))}
                          className="font-semibold text-blue-600 hover:underline text-left"
                        >
                          {a.patientName}
                        </button>
                        <p className="text-xs text-gray-400">{a.uhid}</p>
                      </td>
                      {!isDoctor && (
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-700">{a.doctorName}</p>
                          {a.specialty && <p className="text-xs text-gray-400">{a.specialty}</p>}
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium text-gray-800">{formatDate(a.date)}</p>
                        <p className="text-xs text-gray-400">{a.timeSlot}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${TYPE_STYLES[a.appointmentType] || 'bg-gray-100 text-gray-600'}`}>
                          {a.appointmentType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[150px] truncate">{a.reason}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDateTime(a.bookedAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[a.status] || ''}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {isDoctor && a.status === 'checked-in' && (
                            <button
                              onClick={() => handleStatusUpdate(a.id, 'completed')}
                              title="Mark Completed"
                              className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {!isDoctor && a.status === 'scheduled' && (
                            <button
                              onClick={() => handleStatusUpdate(a.id, 'checked-in')}
                              title="Check In"
                              className="p-1.5 rounded-lg bg-yellow-50 hover:bg-yellow-100 text-yellow-600"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {(a.status === 'scheduled' || a.status === 'checked-in') && (
                            <button
                              onClick={() => handleStatusUpdate(a.id, 'cancelled')}
                              title="Cancel"
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-sm text-gray-500 order-2 sm:order-1">
            Showing {startItem}–{endItem} of {pagination.total} appointments
          </p>
          <div className="flex items-center gap-1 order-1 sm:order-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-sm">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 text-sm border rounded-lg ${
                      page === p
                        ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsListView;
