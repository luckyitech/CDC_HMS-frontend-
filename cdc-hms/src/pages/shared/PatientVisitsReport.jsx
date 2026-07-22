import { useState, useEffect, useMemo } from 'react';
import { Users, UserCheck, UserPlus, Repeat, Footprints, CalendarCheck, CalendarDays, Download } from 'lucide-react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import Pagination from '../../components/shared/Pagination';
import api from '../../services/api';
import { notify } from '../../utils/notify';
import { downloadCsv } from '../../utils/exportCsv';

const DAYS_PER_PAGE = 31;

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

// New + Return = Total Visits; Walk-in + Booked = Total Visits
const SUMMARY_CARDS = [
  { key: 'visits',         label: 'Total Visits',    icon: Users,         tone: 'text-blue-700 bg-blue-50' },
  { key: 'newPatients',    label: 'New Patients',    icon: UserPlus,      tone: 'text-green-700 bg-green-50' },
  { key: 'returnPatients', label: 'Return Patients', icon: Repeat,        tone: 'text-teal-700 bg-teal-50' },
  { key: 'walkIn',         label: 'Walk-ins',        icon: Footprints,    tone: 'text-amber-700 bg-amber-50' },
  { key: 'booked',         label: 'Booked',          icon: CalendarCheck, tone: 'text-violet-700 bg-violet-50' },
  { key: 'uniquePatients', label: 'Unique Patients', icon: UserCheck,     tone: 'text-rose-700 bg-rose-50' },
];

const TABLE_COLUMNS = [
  { key: 'visits',         header: 'Total' },
  { key: 'newPatients',    header: 'New' },
  { key: 'returnPatients', header: 'Return' },
  { key: 'walkIn',         header: 'Walk-in' },
  { key: 'booked',         header: 'Booked' },
  { key: 'completed',      header: 'Completed' },
  { key: 'removed',        header: 'Removed' },
];

const PatientVisitsReport = () => {
  const [from, setFrom] = useState(toIsoDate(daysAgo(29)));
  const [to, setTo]     = useState(toIsoDate(new Date()));
  // { key, data } — keyed by range so stale results are never shown
  const [result, setResult] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const rangeValid = from && to && from <= to;
  const rangeKey = `${from}_${to}`;

  useEffect(() => {
    if (!rangeValid) return;
    let cancelled = false;
    api.get('/reports/patient-visits', { params: { from, to } })
      .then((res) => {
        if (cancelled || !res.success) return;
        setResult({ key: `${from}_${to}`, data: res.data });
        setCurrentPage(1); // new range — back to the first page
      })
      .catch((err) => { if (!cancelled) notify('error', err.message || 'Failed to load report'); });
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

  // Newest day first for reading; CSV export keeps chronological order
  const daysNewestFirst = useMemo(
    () => (report ? [...report.days].reverse() : []),
    [report]
  );
  const totalPages = Math.ceil(daysNewestFirst.length / DAYS_PER_PAGE);
  const paginatedDays = daysNewestFirst.slice(
    (currentPage - 1) * DAYS_PER_PAGE,
    currentPage * DAYS_PER_PAGE
  );

  const handleDownload = () => {
    if (!report) return;
    downloadCsv(
      `patient-visits_${report.from}_to_${report.to}.csv`,
      ['Date', ...TABLE_COLUMNS.map((c) => c.header), 'Unique Patients'],
      [
        ...report.days.map((d) => [d.date, ...TABLE_COLUMNS.map((c) => d[c.key]), d.uniquePatients]),
        ['TOTAL', ...TABLE_COLUMNS.map((c) => report.totals[c.key]), report.totals.uniquePatients],
      ]
    );
    notify('success', 'Report downloaded — open it with Excel or any spreadsheet app');
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Patient Visits Report</h2>
          <p className="text-gray-600 mt-1">Patients who visited the clinic over a period</p>
        </div>
        <Button
          onClick={handleDownload}
          disabled={!report || report.days.length === 0}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Download CSV
        </Button>
      </div>

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
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
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

      {/* Daily breakdown */}
      {loading ? (
        <Card>
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Loading report...</p>
          </div>
        </Card>
      ) : !report || report.days.length === 0 ? (
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
                  {TABLE_COLUMNS.map((c) => (
                    <th key={c.key} className="px-4 py-3 font-semibold">{c.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedDays.map((day) => (
                  <tr key={day.date} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
                      {new Date(`${day.date}T00:00:00`).toLocaleDateString('en-GB', {
                        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                    {TABLE_COLUMNS.map((c) => (
                      <td key={c.key} className="px-4 py-3">{day[c.key]}</td>
                    ))}
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

export default PatientVisitsReport;
