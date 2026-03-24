import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, Stethoscope, Search, Filter, RefreshCw, CheckCircle, XCircle, AlertCircle, ClipboardList } from 'lucide-react';
import appointmentService from '../../services/appointmentService';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  scheduled:  'bg-blue-100 text-blue-700 border border-blue-200',
  'checked-in': 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  completed:  'bg-green-100 text-green-700 border border-green-200',
  cancelled:  'bg-red-100 text-red-700 border border-red-200',
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

const AppointmentsList = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', date: '', search: '' });

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.date)   params.date   = filters.date;
      const res = await appointmentService.getAll(params);
      if (res.success) {
        let data = res.data.appointments || res.data || [];
        if (filters.search) {
          const q = filters.search.toLowerCase();
          data = data.filter(a =>
            a.patientName?.toLowerCase().includes(q) ||
            a.uhid?.toLowerCase().includes(q) ||
            a.doctorName?.toLowerCase().includes(q) ||
            a.appointmentNumber?.toLowerCase().includes(q)
          );
        }
        setAppointments(data);
      }
    } catch {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.date, filters.search]);

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
    total:     appointments.length,
    scheduled: appointments.filter(a => a.status === 'scheduled').length,
    checkedIn: appointments.filter(a => a.status === 'checked-in').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Appointments</h1>
          <p className="text-gray-500 text-sm mt-1">All patient-booked appointments</p>
        </div>
        <button onClick={fetchAppointments} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total',      value: counts.total,     color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { label: 'Scheduled',  value: counts.scheduled, color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { label: 'Checked In', value: counts.checkedIn, color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          { label: 'Completed',  value: counts.completed, color: 'bg-green-50 border-green-200 text-green-700' },
          { label: 'Cancelled',  value: counts.cancelled, color: 'bg-red-50 border-red-200 text-red-700' },
        ].map(s => (
          <div key={s.label} className={`p-4 rounded-xl border-2 ${s.color}`}>
            <p className="text-xs font-medium opacity-70">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient name, UHID, doctor..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <select
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
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
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
          />
          {(filters.status || filters.date || filters.search) && (
            <button
              onClick={() => setFilters({ status: '', date: '', search: '' })}
              className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Appt #', 'Patient', 'Doctor', 'Date & Time', 'Type', 'Reason', 'Booked On', 'Status', 'Actions'].map(h => (
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
                        onClick={() => navigate(`/staff/patient-profile/${a.uhid}`)}
                        className="font-semibold text-blue-600 hover:underline text-left"
                      >
                        {a.patientName}
                      </button>
                      <p className="text-xs text-gray-400">{a.uhid}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-700">{a.doctorName}</p>
                      {a.specialty && <p className="text-xs text-gray-400">{a.specialty}</p>}
                    </td>
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
                        {a.status === 'scheduled' && (
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
        )}
      </div>
    </div>
  );
};

export default AppointmentsList;
