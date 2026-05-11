import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Label,
  PieChart, Pie, Cell,
} from 'recharts';
import { ArrowLeft, Users } from 'lucide-react';
import Card from '../../../components/shared/Card';
import AnalyticsBarChart from '../../../components/shared/AnalyticsBarChart';
import AnalyticsDateFilter, { DEFAULT_DATE_RANGE } from '../../../components/shared/AnalyticsDateFilter';
import analyticsService from '../../../services/analyticsService';

const formatHour = (h) => {
  if (h === 0)  return '12am';
  if (h < 12)   return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
};

export default function StaffAnalytics() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState(DEFAULT_DATE_RANGE);
  const [triage, setTriage]       = useState(null);
  const [staffPerf, setStaffPerf] = useState(null);
  const [volume, setVolume]       = useState(null);
  const [priority, setPriority]   = useState(null);
  const [los, setLos]             = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, s, v, p, l] = await Promise.all([
        analyticsService.getTriageMetrics(dateRange.startDate, dateRange.endDate),
        analyticsService.getStaffTriagePerformance(dateRange.startDate, dateRange.endDate),
        analyticsService.getPatientVolumeByHour(dateRange.startDate, dateRange.endDate),
        analyticsService.getTriageByPriority(dateRange.startDate, dateRange.endDate),
        analyticsService.getLengthOfStay(dateRange.startDate, dateRange.endDate),
      ]);
      setTriage(t.data);
      setStaffPerf(s.data);
      setVolume(v.data);
      setPriority(p.data);
      setLos(l.data);
    } catch {
      setError('Failed to load staff analytics.');
    } finally {
      setLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const staffList   = staffPerf?.staff ?? [];
  const staffCount  = staffList.length;
  const chartHeight = Math.max(260, staffList.length * 60 + 80);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/admin/analytics')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-2 transition"
        >
          <ArrowLeft size={15} /> Back to Analytics
        </button>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Users className="text-purple-600" size={24} />
          Staff & Triage
        </h1>
        <p className="text-gray-500 text-sm mt-1">Triage volume, timing, and staff performance</p>
      </div>

      {/* Date filter */}
      <AnalyticsDateFilter onChange={setDateRange} />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-24 text-gray-400 text-sm">Loading…</div>
      ) : (
        <>
          {/* Summary stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <p className="text-sm opacity-90">Total Triages</p>
              <p className="text-4xl font-bold mt-2">{triage?.totalTriages ?? '—'}</p>
              <p className="text-sm mt-3 opacity-75">{dateRange.label}</p>
            </div>
            <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl shadow-lg p-6 text-white">
              <p className="text-sm opacity-90">Avg Triage Time</p>
              <p className="text-4xl font-bold mt-2">
                {triage?.avgTriageMinutes != null ? `${triage.avgTriageMinutes} min` : '—'}
              </p>
              <p className="text-sm mt-3 opacity-75">Per patient</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <p className="text-sm opacity-90">Fastest Triage</p>
              <p className="text-4xl font-bold mt-2">
                {triage?.minTriageMinutes != null ? `${triage.minTriageMinutes} min` : '—'}
              </p>
              <p className="text-sm mt-3 opacity-75">Minimum recorded</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <p className="text-sm opacity-90">Active Staff</p>
              <p className="text-4xl font-bold mt-2">{staffCount}</p>
              <p className="text-sm mt-3 opacity-75">Performed triage</p>
            </div>
          </div>

          {/* Daily triage volume line chart */}
          <Card title="Daily Triage Volume">
            {triage?.dailyVolume?.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={triage.dailyVolume}
                  margin={{ top: 20, right: 24, left: 8, bottom: 50 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    angle={-35}
                    textAnchor="end"
                    interval="preserveStartEnd"
                  >
                    <Label value="Date" position="insideBottom" offset={-30}
                      style={{ fontSize: 12, fill: '#9ca3af', fontStyle: 'italic' }} />
                  </XAxis>
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={false}
                    width={35}
                  >
                    <Label value="Triages" angle={-90} position="insideLeft" offset={10}
                      style={{ fontSize: 12, fill: '#9ca3af', fontStyle: 'italic' }} />
                  </YAxis>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', fontSize: '13px', border: '1px solid #e5e7eb' }}
                    formatter={(v) => [v, 'Triages']}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#7c3aed"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#7c3aed' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm text-center py-8">No triage data for this period.</p>
            )}
          </Card>

          {/* Patient volume by hour + priority breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnalyticsBarChart
              title="Patient Arrivals by Hour of Day"
              data={(volume?.hourlyVolume ?? []).filter(h => h.count > 0)}
              xKey="hour"
              yKey="count"
              xAxisLabel="Hour of Day"
              yAxisLabel="Patients"
              color="#6366f1"
              layout="horizontal"
              height={320}
              tickFormatter={formatHour}
              emptyText="No patient arrival data for this period."
            />

            <Card title="Triage by Priority">
              {priority?.priorities?.length ? (() => {
                const COLORS = { Normal: '#2563eb', Urgent: '#ef4444' };
                const total  = priority.total;
                return (
                  <div className="flex flex-col items-center gap-6">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={priority.priorities}
                          dataKey="count"
                          nameKey="priority"
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={100}
                          paddingAngle={3}
                          label={({ priority: p, count }) =>
                            `${p} (${total > 0 ? Math.round((count / total) * 100) : 0}%)`
                          }
                          labelLine
                        >
                          {priority.priorities.map((p, i) => (
                            <Cell key={i} fill={COLORS[p.priority] ?? '#6b7280'} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v, name) => [v, name]}
                          contentStyle={{ borderRadius: '8px', fontSize: '13px', border: '1px solid #e5e7eb' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex gap-6">
                      {priority.priorities.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: COLORS[p.priority] ?? '#6b7280' }} />
                          <span className="font-medium text-gray-700">{p.priority}</span>
                          <span className="font-bold text-gray-900">{p.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })() : (
                <p className="text-gray-400 text-sm text-center py-8">No triage data for this period.</p>
              )}
            </Card>
          </div>

          {/* Length of stay */}
          <Card title="Patient Length of Stay">
            <div className="flex flex-col gap-6">
              {/* Avg stat */}
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl px-6 py-4 text-white shadow-md">
                  <p className="text-xs opacity-90">Average Stay</p>
                  <p className="text-3xl font-bold mt-1">
                    {los?.avgMinutes != null
                      ? los.avgMinutes >= 60
                        ? `${Math.floor(los.avgMinutes / 60)}h ${los.avgMinutes % 60}m`
                        : `${los.avgMinutes} min`
                      : '—'}
                  </p>
                  <p className="text-xs mt-2 opacity-75">{los?.totalPatients ?? 0} patients</p>
                </div>
              </div>
              {/* Distribution chart */}
              <AnalyticsBarChart
                title=""
                data={los?.distribution ?? []}
                xKey="label"
                yKey="count"
                yAxisLabel="Patients"
                color="#f97316"
                layout="horizontal"
                height={260}
                emptyText="No completed or removed patients for this period."
              />
            </div>
          </Card>

          {/* Staff performance bar charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnalyticsBarChart
              title="Triages Performed per Staff"
              data={staffList}
              xKey="staffName"
              yKey="triageCount"
              xAxisLabel="Number of Triages"
              color="#7c3aed"
              height={chartHeight}
              emptyText="No triage records found for this period."
            />
            <AnalyticsBarChart
              title="Avg Triage Time per Staff"
              data={staffList.filter(s => s.avgTriageMinutes != null)}
              xKey="staffName"
              yKey="avgTriageMinutes"
              unit=" min"
              xAxisLabel="Minutes"
              color="#0891b2"
              height={chartHeight}
              emptyText="Triage timing data will appear after the system update."
            />
          </div>
        </>
      )}
    </div>
  );
}
