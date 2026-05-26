import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Label,
  BarChart, Bar,
  PieChart, Pie, Cell,
} from 'recharts';
import { ArrowLeft, Users, Timer, Activity, CreditCard, Clock, TrendingDown, TrendingUp } from 'lucide-react';
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

const fmtMinutes = (mins) => {
  if (mins == null) return '—';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
};

const WAIT_THEMES = {
  blue: {
    Icon:        Timer,
    subtitle:    'Time from queue entry to triage start',
    borderAccent: 'border-blue-500',
    iconBg:      'bg-blue-50',
    iconColor:   'text-blue-600',
    avgCard:     'from-blue-500 to-blue-700',
    trackedCard: 'from-purple-500 to-purple-600',
    distColors:  ['#22c55e', '#0066CC', '#f59e0b', '#ef4444', '#7c3aed'],
    normalBadge: 'bg-blue-100 text-blue-700',
    normalDot:   'bg-primary',
    normalBar:   'from-blue-400 to-blue-600',
    lineColor:   '#0066CC',
  },
  orange: {
    Icon:        Activity,
    subtitle:    'Time from triage completion to doctor starting',
    borderAccent: 'border-orange-500',
    iconBg:      'bg-orange-50',
    iconColor:   'text-orange-600',
    avgCard:     'from-orange-500 to-orange-600',
    trackedCard: 'from-teal-500 to-teal-600',
    distColors:  ['#22c55e', '#f97316', '#f59e0b', '#ef4444', '#7c3aed'],
    normalBadge: 'bg-orange-100 text-orange-700',
    normalDot:   'bg-orange-500',
    normalBar:   'from-orange-400 to-orange-600',
    lineColor:   '#f97316',
  },
  green: {
    Icon:        CreditCard,
    subtitle:    'Time from consultation end to billing completion',
    borderAccent: 'border-emerald-500',
    iconBg:      'bg-emerald-50',
    iconColor:   'text-emerald-600',
    avgCard:     'from-emerald-500 to-emerald-600',
    trackedCard: 'from-cyan-500 to-cyan-600',
    distColors:  ['#22c55e', '#10b981', '#f59e0b', '#ef4444', '#7c3aed'],
    normalBadge: 'bg-emerald-100 text-emerald-700',
    normalDot:   'bg-emerald-500',
    normalBar:   'from-emerald-400 to-emerald-600',
    lineColor:   '#059669',
  },
};

function WaitTimeSection({ title, data, dateLabel, theme }) {
  const t = WAIT_THEMES[theme];
  const Icon = t.Icon;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

      {/* Section header */}
      <div className={`flex items-center gap-3 mb-6 pb-5 border-b-2 ${t.borderAccent} border-opacity-30 border-b border-gray-100`}>
        <div className={`w-11 h-11 rounded-xl ${t.iconBg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
          <Icon className={`w-5 h-5 ${t.iconColor}`} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{t.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
        <div className={`bg-gradient-to-br ${t.avgCard} rounded-xl shadow-lg p-5 text-white`}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm opacity-90">Avg Wait</p>
            <Clock className="w-4 h-4 opacity-50" />
          </div>
          <p className="text-3xl font-bold mt-1">{fmtMinutes(data?.avgWaitMinutes)}</p>
          <p className="text-xs mt-3 opacity-75">Per patient</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-5 text-white">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm opacity-90">Shortest Wait</p>
            <TrendingDown className="w-4 h-4 opacity-50" />
          </div>
          <p className="text-3xl font-bold mt-1">{fmtMinutes(data?.minWaitMinutes)}</p>
          <p className="text-xs mt-3 opacity-75">Best recorded</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-5 text-white">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm opacity-90">Longest Wait</p>
            <TrendingUp className="w-4 h-4 opacity-50" />
          </div>
          <p className="text-3xl font-bold mt-1">{fmtMinutes(data?.maxWaitMinutes)}</p>
          <p className="text-xs mt-3 opacity-75">Worst recorded</p>
        </div>
        <div className={`bg-gradient-to-br ${t.trackedCard} rounded-xl shadow-lg p-5 text-white`}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm opacity-90">Patients Tracked</p>
            <Users className="w-4 h-4 opacity-50" />
          </div>
          <p className="text-3xl font-bold mt-1">{data?.totalRecords ?? '—'}</p>
          <p className="text-xs mt-3 opacity-75">{dateLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Wait Time Distribution">
          {data?.distribution?.some(d => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.distribution} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={30} />
                <Tooltip
                  formatter={(v) => [v, 'Patients']}
                  contentStyle={{ borderRadius: '8px', fontSize: '13px', border: '1px solid #e5e7eb' }}
                  cursor={{ fill: '#f3f4f6' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {data.distribution.map((_, i) => (
                    <Cell key={i} fill={t.distColors[i] ?? t.distColors[0]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No wait time data for this period.</p>
          )}
        </Card>

        <Card title="Avg Wait by Priority">
          {data?.waitByPriority?.length ? (
            <div className="space-y-6 pt-2">
              {data.waitByPriority.map(p => {
                const isUrgent = p.priority === 'Urgent';
                const pct = Math.min(100, (p.avgWait / (data.maxWaitMinutes || 1)) * 100);
                return (
                  <div key={p.priority}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        isUrgent ? 'bg-red-100 text-red-700' : t.normalBadge
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${isUrgent ? 'bg-red-500' : t.normalDot}`} />
                        {p.priority}
                      </span>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-800">{fmtMinutes(p.avgWait)}</p>
                        <p className="text-xs text-gray-400">{p.count} patients</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-4 rounded-full transition-all duration-500 ${
                          isUrgent
                            ? 'bg-gradient-to-r from-red-400 to-red-600'
                            : `bg-gradient-to-r ${t.normalBar}`
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No priority data for this period.</p>
          )}
        </Card>
      </div>

      {data?.dailyAvg?.length > 1 && (
        <Card title="Daily Average Wait Trend" className="mt-6">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.dailyAvg} margin={{ top: 8, right: 24, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                angle={-35}
                textAnchor="end"
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                width={40}
                tickFormatter={fmtMinutes}
              />
              <Tooltip
                formatter={(v) => [fmtMinutes(v), 'Avg Wait']}
                contentStyle={{ borderRadius: '8px', fontSize: '13px', border: '1px solid #e5e7eb' }}
              />
              <Line
                type="monotone"
                dataKey="avgWait"
                stroke={t.lineColor}
                strokeWidth={2.5}
                dot={{ r: 4, fill: t.lineColor }}
                activeDot={{ r: 6, fill: t.lineColor }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

export default function StaffAnalytics() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState(DEFAULT_DATE_RANGE);
  const [triage, setTriage]       = useState(null);
  const [staffPerf, setStaffPerf] = useState(null);
  const [volume, setVolume]       = useState(null);
  const [priority, setPriority]   = useState(null);
  const [los, setLos]             = useState(null);
  const [waitTime, setWaitTime]           = useState(null);
  const [triageToDoc, setTriageToDoc]     = useState(null);
  const [docToBilling, setDocToBilling]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const results = await Promise.allSettled([
      analyticsService.getTriageMetrics(dateRange.startDate, dateRange.endDate),
      analyticsService.getStaffTriagePerformance(dateRange.startDate, dateRange.endDate),
      analyticsService.getPatientVolumeByHour(dateRange.startDate, dateRange.endDate),
      analyticsService.getTriageByPriority(dateRange.startDate, dateRange.endDate),
      analyticsService.getLengthOfStay(dateRange.startDate, dateRange.endDate),
      analyticsService.getWaitTimeBeforeTriage(dateRange.startDate, dateRange.endDate),
      analyticsService.getWaitTimeBetweenTriageAndConsultation(dateRange.startDate, dateRange.endDate),
      analyticsService.getWaitTimeConsultationToBilling(dateRange.startDate, dateRange.endDate),
    ]);
    const [t, s, v, p, l, w, td, dtb] = results;
    if (t.status   === 'fulfilled') setTriage(t.value.data);
    if (s.status   === 'fulfilled') setStaffPerf(s.value.data);
    if (v.status   === 'fulfilled') setVolume(v.value.data);
    if (p.status   === 'fulfilled') setPriority(p.value.data);
    if (l.status   === 'fulfilled') setLos(l.value.data);
    if (w.status   === 'fulfilled') setWaitTime(w.value.data);
    if (td.status  === 'fulfilled') setTriageToDoc(td.value.data);
    if (dtb.status === 'fulfilled') setDocToBilling(dtb.value.data);
    if (results.some(r => r.status === 'rejected')) setError('Some analytics data failed to load.');
    setLoading(false);
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

          <WaitTimeSection
            title="Patient Wait Time Before Triage"
            data={waitTime}
            dateLabel={dateRange.label}
            theme="blue"
          />

          <WaitTimeSection
            title="Wait Time: Triage to Consultation"
            data={triageToDoc}
            dateLabel={dateRange.label}
            theme="orange"
          />

          <WaitTimeSection
            title="Wait Time: Consultation to Billing"
            data={docToBilling}
            dateLabel={dateRange.label}
            theme="green"
          />

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
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl px-6 py-4 text-white shadow-md">
                  <p className="text-xs opacity-90">Average Stay</p>
                  <p className="text-3xl font-bold mt-1">
                    {los?.avgMinutes != null ? fmtMinutes(los.avgMinutes) : '—'}
                  </p>
                  <p className="text-xs mt-2 opacity-75">{los?.totalPatients ?? 0} patients</p>
                </div>
              </div>
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
