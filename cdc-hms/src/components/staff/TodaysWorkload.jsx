import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronRight, FileSpreadsheet } from 'lucide-react';
import Card from '../shared/Card';
import SwitcherTabs from '../shared/SwitcherTabs';
import { useQueueContext } from '../../contexts/QueueContext';

const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—';

// Status → badge colour. One place, so the board reads consistently.
const STATUS_STYLES = {
  'Awaiting Triage':   'bg-amber-100 text-amber-700',
  'In Triage':         'bg-blue-100 text-blue-700',
  'Awaiting Doctor':   'bg-purple-100 text-purple-700',
  'With Doctor':       'bg-indigo-100 text-indigo-700',
  'Pending Injection': 'bg-teal-100 text-teal-700',
  'Pending Billing':   'bg-orange-100 text-orange-700',
  'Completed':         'bg-green-100 text-green-700',
};

const isToday = (d) => {
  if (!d) return false;
  const dt = new Date(d);
  return !Number.isNaN(dt) && dt.toDateString() === new Date().toDateString();
};

// Doctor names arrive in two shapes: assignedDoctorName is "Dr. X Y", session
// doctorName is the raw user name. Normalise for grouping, display with "Dr. ".
const stripDr = (n) => (n || '').replace(/^Dr\.?\s*/i, '').trim();

// Every doctor who touched this visit (assigned + each consultation session).
const doctorsOf = (item) => {
  const names = new Set();
  if (item.assignedDoctorName) names.add(stripDr(item.assignedDoctorName));
  (item.consultationSessions || []).forEach((s) => { if (s.doctorName) names.add(stripDr(s.doctorName)); });
  return [...names].filter(Boolean);
};

/**
 * TodaysWorkload — the staff dashboard's whole-day patient board: every patient
 * who has been through the clinic today, whatever their current state. Tabs
 * filter by doctor (a patient seen by two doctors appears under both).
 * Live via QueueContext (SSE-updated). Rows open the patient file.
 */
const TodaysWorkload = () => {
  const navigate = useNavigate();
  const { queue } = useQueueContext();
  const [tab, setTab] = useState('all');

  const items = useMemo(
    () => (queue || []).filter((q) => isToday(q.createdAt) && q.status !== 'Removed'),
    [queue]
  );

  // Doctor tabs — only doctors who saw at least one patient today, busiest
  // first (ties alphabetical). No patients, no tab.
  const doctors = useMemo(() => {
    const counts = new Map();
    items.forEach((it) => doctorsOf(it).forEach((d) => counts.set(d, (counts.get(d) || 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [items]);

  // Guard: if the selected doctor's tab no longer exists, fall back to All.
  const activeTab = tab !== 'all' && !doctors.some(([name]) => name === tab) ? 'all' : tab;
  const shown = activeTab === 'all' ? items : items.filter((it) => doctorsOf(it).includes(activeTab));

  // Export the current tab as CSV — opens straight in Excel. Kept dependency-free
  // (a spreadsheet library is not worth a new production package for this).
  const exportExcel = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Patient', 'UHID', 'Age', 'Gender', 'Arrived', 'Out', 'Doctor', 'Status'],
      ...shown.map((it) => [
        it.name, it.uhid, it.age ?? '', it.gender ?? '',
        it.arrivalTime ?? '', it.dischargedAt ? fmtTime(it.dischargedAt) : '',
        doctorsOf(it).map((d) => `Dr. ${d}`).join('; '), it.status,
      ]),
    ];
    const csv = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinic-workload-${new Date().toISOString().slice(0, 10)}${activeTab === 'all' ? '' : `-${activeTab.replace(/\s+/g, '-')}`}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card title={
      <span className="flex items-center gap-2">
        <CalendarDays className="w-5 h-5" /> Today&rsquo;s Patients
      </span>
    }>
      {/* Tabs — All + one per doctor; export on the right */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SwitcherTabs
          active={activeTab}
          onChange={setTab}
          tabs={[
            { id: 'all', label: 'All', count: items.length },
            ...doctors.map(([name, count]) => ({ id: name, label: `Dr. ${name}`, count })),
          ]}
        />
        {shown.length > 0 && (
          <button
            onClick={exportExcel}
            className="sm:ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-green-700 border border-green-300 hover:bg-green-50 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export to Excel
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">No patients through the clinic yet today.</p>
      ) : (
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                <th className="py-2 pr-3">Patient</th>
                <th className="py-2 pr-3">Arrived</th>
                <th className="py-2 pr-3">Out</th>
                <th className="py-2 pr-3">Doctor</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 w-6" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shown.map((it) => (
                <tr
                  key={it.id}
                  onClick={() => navigate(`/staff/patient-profile/${it.uhid}`)}
                  className="cursor-pointer hover:bg-blue-50 transition-colors"
                >
                  <td className="py-2.5 pr-3">
                    <p className="font-semibold text-gray-800">{it.name}</p>
                    <p className="text-xs text-gray-400">{it.uhid}{it.age != null ? ` · ${it.age} yrs` : ''}{it.gender ? ` · ${it.gender}` : ''}</p>
                  </td>
                  <td className="py-2.5 pr-3 whitespace-nowrap text-gray-600">{it.arrivalTime || '—'}</td>
                  <td className="py-2.5 pr-3 whitespace-nowrap text-gray-600">{fmtTime(it.dischargedAt)}</td>
                  <td className="py-2.5 pr-3 text-gray-600">
                    {doctorsOf(it).map((d) => `Dr. ${d}`).join(', ') || '—'}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[it.status] || 'bg-gray-100 text-gray-600'}`}>
                      {it.status}
                    </span>
                  </td>
                  <td className="py-2.5"><ChevronRight className="w-4 h-4 text-gray-300" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

export default TodaysWorkload;
