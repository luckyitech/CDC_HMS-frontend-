import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, UserPlus, Activity, UserCheck, UserX, Filter, RefreshCw } from 'lucide-react';
import Card from '../../components/shared/Card';
import activityService from '../../services/activityService';

const ACTION_TYPES = [
  { value: 'all',           label: 'All Actions' },
  { value: 'registered',    label: 'Registered Patient' },
  { value: 'added_to_queue',label: 'Added to Queue' },
  { value: 'triaged',       label: 'Triaged Patient' },
  { value: 'discharged',    label: 'Discharged Patient' },
  { value: 'removed',       label: 'Removed from Queue' },
];

const ACTION_STYLE = {
  registered:     { color: 'bg-blue-100 text-blue-700',   icon: UserPlus },
  added_to_queue: { color: 'bg-yellow-100 text-yellow-800', icon: ClipboardList },
  triaged:        { color: 'bg-purple-100 text-purple-700', icon: Activity },
  discharged:     { color: 'bg-green-100 text-green-700',  icon: UserCheck },
  removed:        { color: 'bg-red-100 text-red-700',      icon: UserX },
};

const formatDateTime = (iso) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

const ActivityLog = () => {
  const [events, setEvents]   = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [actionType, setActionType]   = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate)  params.startDate = startDate;
      if (endDate)    params.endDate   = endDate;
      if (staffSearch.trim()) params.staff = staffSearch.trim();
      if (actionType !== 'all') params.action = actionType;

      const res = await activityService.getLog(params);
      if (res.success) {
        setEvents(res.data.events);
        setSummary(res.data.summary);
      }
    } catch {
      // handled silently
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, staffSearch, actionType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Staff Activity Log</h1>
          <p className="text-sm text-gray-500 mt-1">Track every action performed by staff members</p>
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
      {summary.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Staff Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.map((s) => (
              <Card key={s.staff} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-gray-800 text-base">{s.staff}</span>
                  <span className="text-xs bg-primary text-white px-2 py-1 rounded-full font-semibold">
                    {s.total} actions
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  {s.registered   > 0 && <span className="flex justify-between"><span>Registered</span><span className="font-bold text-blue-600">{s.registered}</span></span>}
                  {s.addedToQueue > 0 && <span className="flex justify-between"><span>Added to Queue</span><span className="font-bold text-yellow-600">{s.addedToQueue}</span></span>}
                  {s.triaged      > 0 && <span className="flex justify-between"><span>Triaged</span><span className="font-bold text-purple-600">{s.triaged}</span></span>}
                  {s.discharged   > 0 && <span className="flex justify-between"><span>Discharged</span><span className="font-bold text-green-600">{s.discharged}</span></span>}
                  {s.removed      > 0 && <span className="flex justify-between"><span>Removed</span><span className="font-bold text-red-600">{s.removed}</span></span>}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Staff Member</label>
            <input
              type="text"
              placeholder="Search by name..."
              value={staffSearch}
              onChange={e => setStaffSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Action Type</label>
            <select
              value={actionType}
              onChange={e => setActionType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            >
              {ACTION_TYPES.map(t => (
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
          <span className="text-xs text-gray-400">{events.length} record{events.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No activity found for the selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Date & Time</th>
                  <th className="px-4 py-3 text-left">Staff Member</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Patient</th>
                  <th className="px-4 py-3 text-left">UHID</th>
                  <th className="px-4 py-3 text-left">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((e, i) => {
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
      </Card>
    </div>
  );
};

export default ActivityLog;
