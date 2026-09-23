import { useState, useEffect, useMemo } from 'react';
import {
  Users, UserCheck, CalendarCheck, Footprints, Download, CalendarDays,
  ArrowUp, ArrowDown,
} from 'lucide-react';
import Card from '../../components/shared/Card';
import PageHeader from '../../components/shared/PageHeader';
import Button from '../../components/shared/Button';
import Pagination from '../../components/shared/Pagination';
import api from '../../services/api';
import { notify } from '../../utils/notify';
import { downloadCsv } from '../../utils/exportCsv';

const ROWS_PER_PAGE = 50;

// Local-timezone YYYY-MM-DD (toISOString would shift the date near midnight)
const toIsoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

// Quick range presets — add an entry here and it appears as a button
const PRESETS = [
  { label: 'Today',         range: () => [new Date(), new Date()] },
  { label: 'Last 7 Days',   range: () => [daysAgo(6), new Date()] },
  { label: 'Last 30 Days',  range: () => [daysAgo(29), new Date()] },
  { label: 'This Month',    range: () => [new Date(new Date().getFullYear(), new Date().getMonth(), 1), new Date()] },
  { label: 'Last 3 Months', range: () => [daysAgo(89), new Date()] },
];

const SUMMARY_CARDS = [
  { key: 'visits',         label: 'Total Visits',    icon: Users,         tone: 'text-blue-700 bg-blue-50' },
  { key: 'uniquePatients', label: 'Unique Patients', icon: UserCheck,     tone: 'text-teal-700 bg-teal-50' },
  { key: 'booked',         label: 'Booked',          icon: CalendarCheck, tone: 'text-violet-700 bg-violet-50' },
  { key: 'walkIn',         label: 'Walk-ins',        icon: Footprints,    tone: 'text-amber-700 bg-amber-50' },
];

const fmtDate = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      })
    : '—';

const AttendanceRegister = () => {
  const [from, setFrom] = useState(toIsoDate(daysAgo(29)));
  const [to, setTo]     = useState(toIsoDate(new Date()));
  // { key, data } — keyed by range so stale results are never shown
  const [result, setResult] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  // 'asc' = first-in-first (earliest arrival first); toggled from the Time header
  const [sortDir, setSortDir] = useState('asc');

  const rangeValid = from && to && from <= to;
  const rangeKey = `${from}_${to}`;

  useEffect(() => {
    if (!rangeValid) return;
    let cancelled = false;
    api.get('/reports/attendance', { params: { from, to } })
      .then((res) => {
        if (cancelled || !res.success) return;
        setResult({ key: `${from}_${to}`, data: res.data });
        setCurrentPage(1); // new range — back to the first page
      })
      .catch((err) => { if (!cancelled) notify('error', err.message || 'Failed to load attendance'); });
    return () => { cancelled = true; };
  }, [from, to, rangeValid]);

  // Derived — loading whenever the current range has no matching result yet
  const report = result?.key === rangeKey ? result.data : null;
  const loading = rangeValid && !report;

  const applyPreset = (preset) => {
    const [start, end] = preset.range();
    setFrom(toIsoDate(start));
    setTo(toIsoDate(end));
  };

  const summary = report?.totals || null;

  // Backend returns rows chronological (asc). Sort by arrival per the toggle.
  const sortedRows = useMemo(() => {
    if (!report) return [];
    const rows = [...report.rows];
    rows.sort((a, b) =>
      sortDir === 'asc'
        ? a.createdAt.localeCompare(b.createdAt)
        : b.createdAt.localeCompare(a.createdAt)
    );
    return rows;
  }, [report, sortDir]);

  const totalPages = Math.ceil(sortedRows.length / ROWS_PER_PAGE);
  const paginatedRows = sortedRows.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const toggleSort = () => {
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    setCurrentPage(1);
  };

  const handleDownload = () => {
    if (!report || sortedRows.length === 0) return;
    downloadCsv(
      `attendance_${report.from}_to_${report.to}.csv`,
      ['Date', 'Time', 'Patient', 'UHID', 'Type', 'Doctor(s)', 'Services', 'Follow-up'],
      sortedRows.map((r) => [
        fmtDate(r.date),
        r.time,
        r.patientName,
        r.uhid || '',
        r.type,
        (r.doctors || []).join(' → '),
        r.services + (!r.billed && r.services ? ' (not yet billed)' : ''),
        r.followUp ? fmtDate(r.followUp) : '',
      ])
    );
    notify('success', 'Attendance downloaded — open it with Excel or any spreadsheet app');
  };

  const SortIcon = sortDir === 'asc' ? ArrowUp : ArrowDown;

  return (
    <div>
      <PageHeader
        title="Attendance Register"
        subtitle="Every patient visit over a period — who was seen, by whom, for what, and their next appointment"
        actions={
          <Button
            onClick={handleDownload}
            disabled={!report || sortedRows.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Download CSV
          </Button>
        }
      />

      {/* Date range */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-3">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              {preset.label}
            </button>
          ))}

          <div className="flex items-end gap-3 ml-auto">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">From</label>
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">To</label>
              <input
                type="date"
                value={to}
                min={from}
                max={toIsoDate(new Date())}
                onChange={(e) => setTo(e.target.value)}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>
        {!rangeValid && (
          <p className="text-sm text-red-600 mt-3">The From date must be on or before the To date.</p>
        )}
      </Card>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {SUMMARY_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.key} className={`p-4 rounded-lg ${card.tone}`}>
                <p className="text-xs uppercase font-semibold flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" /> {card.label}
                </p>
                <p className="text-3xl font-bold mt-1">{summary[card.key]}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Attendance table */}
      {loading ? (
        <Card>
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Loading attendance...</p>
          </div>
        </Card>
      ) : !report || sortedRows.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-semibold text-gray-700">No visits in this period</p>
            <p className="text-sm mt-1">Try a different date range</p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 border-b">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">
                    <button
                      type="button"
                      onClick={toggleSort}
                      className="flex items-center gap-1 uppercase hover:text-primary transition-colors"
                      title={sortDir === 'asc' ? 'Earliest first — click for latest first' : 'Latest first — click for earliest first'}
                    >
                      Time <SortIcon className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-semibold">Patient</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Doctor(s)</th>
                  <th className="px-4 py-3 font-semibold">Services</th>
                  <th className="px-4 py-3 font-semibold">Follow-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedRows.map((r) => (
                  <tr key={r.id} className="hover:bg-blue-50 align-top">
                    <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{fmtDate(r.date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{r.time}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{r.patientName}</div>
                      {r.uhid && <div className="text-xs text-gray-500">{r.uhid}</div>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          r.type === 'Booked'
                            ? 'bg-violet-100 text-violet-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {r.doctors && r.doctors.length ? r.doctors.join(' → ') : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {r.services ? (
                        <>
                          {r.services}
                          {!r.billed && (
                            <span className="text-xs text-gray-400"> (not yet billed)</span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.followUp ? (
                        <span className="font-semibold text-teal-700">{fmtDate(r.followUp)}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </Card>
      )}
    </div>
  );
};

export default AttendanceRegister;
