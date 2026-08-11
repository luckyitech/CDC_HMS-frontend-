import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import AnalyticsBarChart from '../../../components/shared/AnalyticsBarChart';
import AnalyticsDateFilter, { DEFAULT_DATE_RANGE } from '../../../components/shared/AnalyticsDateFilter';
import StatCard from '../../../components/shared/StatCard';
import analyticsService from '../../../services/analyticsService';

const formatHour = (h) => {
  if (h === 0)  return '12am';
  if (h < 12)   return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
};

export default function ConsultationAnalytics() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState(DEFAULT_DATE_RANGE);
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsService.getConsultationTiming(dateRange.startDate, dateRange.endDate);
      setData(res.data);
    } catch {
      setError('Failed to load consultation analytics.');
    } finally {
      setLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
          <Clock className="text-green-600" size={24} />
          Consultation Timing
        </h1>
        <p className="text-gray-500 text-sm mt-1">When consultations happen and how long they take</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
            <StatCard title="Total Consultations" value={data?.totalConsultations ?? '—'} gradient="from-green-500 to-green-600" sub={dateRange.label} />
            <StatCard title="Avg Duration" value={data?.avgConsultationMinutes != null ? `${data.avgConsultationMinutes} min` : '—'} gradient="from-blue-500 to-blue-600" sub="Per consultation" />
            <StatCard
              title="Busiest Hour"
              value={data?.hourlyDistribution?.length
                ? formatHour(data.hourlyDistribution.reduce((a, b) => a.count > b.count ? a : b).hour)
                : '—'}
              gradient="from-cyan-500 to-cyan-600"
              sub="Most consultations"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnalyticsBarChart
              title="Consultations by Hour of Day"
              data={(data?.hourlyDistribution ?? []).filter(h => h.count > 0)}
              xKey="hour"
              yKey="count"
              xAxisLabel="Hour of Day"
              yAxisLabel="Consultations"
              color="#f59e0b"
              layout="horizontal"
              height={320}
              tickFormatter={formatHour}
              emptyText="No consultation timing data for this period."
            />
            <AnalyticsBarChart
              title="Consultation Duration Breakdown"
              data={data?.durationBuckets ?? []}
              xKey="label"
              yKey="count"
              xAxisLabel="Duration Range"
              yAxisLabel="Consultations"
              color="#10b981"
              layout="horizontal"
              height={320}
              emptyText="No consultation duration data for this period."
            />
          </div>
        </>
      )}
    </div>
  );
}
