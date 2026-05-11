import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Stethoscope } from 'lucide-react';
import Card from '../../../components/shared/Card';
import AnalyticsBarChart from '../../../components/shared/AnalyticsBarChart';
import AnalyticsDateFilter, { DEFAULT_DATE_RANGE } from '../../../components/shared/AnalyticsDateFilter';
import analyticsService from '../../../services/analyticsService';

const PIE_COLORS = ['#2563eb', '#0d9488', '#7c3aed', '#f59e0b', '#ef4444', '#10b981', '#f97316', '#8b5cf6'];

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-800">{name}</p>
      <p className="text-gray-600">{value} patients ({p.percent}%)</p>
    </div>
  );
};

export default function DoctorAnalytics() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState(DEFAULT_DATE_RANGE);
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsService.getDoctorPerformance(dateRange.startDate, dateRange.endDate);
      setData(res.data);
    } catch {
      setError('Failed to load doctor analytics.');
    } finally {
      setLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const doctors = data?.doctors ?? [];
  const total   = doctors.reduce((s, d) => s + d.patientsSeen, 0);
  const pieData = doctors.map(d => ({
    name:    d.doctorName,
    value:   d.patientsSeen,
    percent: total > 0 ? Math.round((d.patientsSeen / total) * 100) : 0,
  }));
  const chartHeight = Math.max(260, doctors.length * 60 + 80);

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
          <Stethoscope className="text-blue-600" size={24} />
          Doctor Performance
        </h1>
        <p className="text-gray-500 text-sm mt-1">Patients seen and consultation times per doctor</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <p className="text-sm opacity-90">Total Doctors</p>
              <p className="text-4xl font-bold mt-2">{doctors.length}</p>
              <p className="text-sm mt-3 opacity-75">{dateRange.label}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <p className="text-sm opacity-90">Total Consultations</p>
              <p className="text-4xl font-bold mt-2">{total}</p>
              <p className="text-sm mt-3 opacity-75">Completed visits</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <p className="text-sm opacity-90">Avg per Doctor</p>
              <p className="text-4xl font-bold mt-2">
                {doctors.length ? Math.round(total / doctors.length) : '—'}
              </p>
              <p className="text-sm mt-3 opacity-75">Patients per doctor</p>
            </div>
          </div>

          {/* Bar charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnalyticsBarChart
              title="Patients Seen per Doctor"
              data={doctors}
              xKey="doctorName"
              yKey="patientsSeen"
              xAxisLabel="Number of Patients"
              color="#2563eb"
              height={chartHeight}
              emptyText="No completed consultations found for this period."
            />
            <AnalyticsBarChart
              title="Avg Consultation Time per Doctor"
              data={doctors.filter(d => d.avgConsultationMinutes != null)}
              xKey="doctorName"
              yKey="avgConsultationMinutes"
              unit=" min"
              xAxisLabel="Minutes"
              color="#0d9488"
              height={chartHeight}
              emptyText="No consultation timing data for this period."
            />
          </div>

          {/* Patient distribution pie */}
          <Card title="Patient Distribution per Doctor">
            {pieData.length ? (
              <div className="flex flex-col lg:flex-row items-center gap-8">
                <div className="w-full lg:w-1/2">
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={130}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ percent }) => `${percent}%`}
                        labelLine
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full lg:w-1/2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Breakdown — {total} total patients
                  </p>
                  <div className="space-y-3">
                    {pieData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-sm font-medium text-gray-700">{d.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-bold text-gray-800">{d.value} patients</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}>
                            {d.percent}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-8">No consultation data for this period.</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
