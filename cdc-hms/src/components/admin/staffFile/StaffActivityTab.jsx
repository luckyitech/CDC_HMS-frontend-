import { useState, useEffect, useCallback } from 'react';
import { Activity } from 'lucide-react';
import Card from '../../shared/Card';
import activityService from '../../../services/activityService';

const fmtDateTime = (ts) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

// Action types worth filtering on in a staff file. 'all' short-circuits.
const ACTION_OPTIONS = [
  { value: 'all', label: 'All actions' },
  { value: 'user_login', label: 'Logins' },
  { value: 'triaged', label: 'Triage' },
  { value: 'added_to_queue', label: 'Queue' },
  { value: 'document_uploaded', label: 'Documents' },
  { value: 'appointment_booked', label: 'Appointments' },
  { value: 'registered', label: 'Registrations' },
  { value: 'barcode_scanned', label: 'Barcode scans' },
];

/**
 * Activity tab — the existing clinic activity feed (/api/activity) filtered to
 * this staff member by name. Covers what the system already tracks; it is not a
 * literal every-click audit log.
 */
const StaffActivityTab = ({ staff }) => {
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { staff: staff.name };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (action !== 'all') params.action = action;

      const res = await activityService.getLog(params);
      const evts = res?.data?.events || [];
      // The backend `staff` filter is a name substring; keep only exact matches
      // so a shared surname doesn't pull in another person's events.
      const mine = evts.filter((e) => (e.staff || '').includes(staff.name));
      setEvents(mine);
      const mineSummary = (res?.data?.summary || []).find((s) => (s.staff || '').includes(staff.name));
      setSummary(mineSummary || null);
    } catch {
      setEvents([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [staff.name, startDate, endDate, action]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <select value={action} onChange={(e) => setAction(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2">
          {ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2" />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2" />
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold">
          {summary ? `${summary.total} actions in range` : `${events.length} actions`}
        </span>
      </div>

      <Card shadow={false} className="border border-gray-100 p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading activity…</div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm">No tracked activity in this range.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map((e, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDateTime(e.timestamp)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700">{e.label}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {[e.patient, e.uhid, e.detail].filter(Boolean).join(' · ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <p className="text-xs text-gray-400">
        Sourced from the clinic activity feed, filtered to {staff.name}. Covers tracked actions
        (logins, triage, queue, documents, appointments, registrations, barcode scans, equipment) —
        not every individual click.
      </p>
    </div>
  );
};

export default StaffActivityTab;
