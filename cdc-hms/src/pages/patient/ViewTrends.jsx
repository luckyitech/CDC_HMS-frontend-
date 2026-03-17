import { useState, useEffect, useCallback } from 'react';
import { BarChart2, Lightbulb, Target, ArrowLeftRight } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import Card from '../../components/shared/Card';
import { usePatientContext } from '../../contexts/PatientContext';
import { useUserContext } from '../../contexts/UserContext';
import { useBloodSugarUnit, toDisplay } from '../../hooks/useBloodSugarUnit';

// Map backend time slot names to frontend property names
const BACKEND_TO_FRONTEND = {
  fasting: "fasting",
  breakfast: "afterBreakfast",
  beforeLunch: "beforeLunch",
  afterLunch: "afterLunch",
  beforeDinner: "beforeDinner",
  afterDinner: "afterDinner",
  bedtime: "beforeBedtime",
};

/**
 * Transform backend array response into flat per-day objects for charts.
 * Backend: [{ date, timeSlot, value }, ...]
 * Chart:   [{ date, fasting: 142, afterBreakfast: 165, ... }, ...]
 * Values stay in mg/dL (patient-facing).
 */
const transformReadingsForChart = (readings) => {
  const grouped = {};
  readings.forEach((r) => {
    if (!grouped[r.date]) grouped[r.date] = { date: r.date };
    const key = BACKEND_TO_FRONTEND[r.timeSlot] || r.timeSlot;
    grouped[r.date][key] = r.value; // keep mg/dL
  });
  return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
};

const ViewTrends = () => {
  const { getBloodSugarReadings } = usePatientContext();
  const { currentUser } = useUserContext();
  const { unit, changeUnit } = useBloodSugarUnit();

  const currentPatientUHID = currentUser?.uhid;

  const [filterPeriod, setFilterPeriod] = useState('7days');
  const [chartData, setChartData] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Track viewport width so we can disable the scroll wrapper on mobile
  // (overflow-x-auto intercepts touch events and prevents Recharts tooltips)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Fetch real blood sugar data from API when period changes
  const fetchData = useCallback(async () => {
    if (!currentPatientUHID) return;

    setDataLoading(true);
    const periodDays = { '7days': 7, '14days': 14, '30days': 30, all: 365 };
    const days = periodDays[filterPeriod] || 7;

    const readings = await getBloodSugarReadings(currentPatientUHID, { days });
    if (readings && readings.length > 0) {
      setChartData(transformReadingsForChart(readings));
    } else {
      setChartData([]);
    }
    setDataLoading(false);
  }, [currentPatientUHID, filterPeriod, getBloodSugarReadings]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate statistics from all individual readings (safe for empty data)
  const calculateStats = () => {
    if (chartData.length === 0) {
      return { avg: 0, min: 0, max: 0, normalDays: 0, totalDays: 0 };
    }

    const allValues = [];
    chartData.forEach((day) => {
      Object.keys(day).forEach((key) => {
        if (key !== 'date' && day[key] > 0) {
          allValues.push(day[key]);
        }
      });
    });

    if (allValues.length === 0) {
      return { avg: 0, min: 0, max: 0, normalDays: 0, totalDays: 0 };
    }

    const avg = Math.round(allValues.reduce((a, b) => a + b, 0) / allValues.length);
    const min = Math.round(Math.min(...allValues));
    const max = Math.round(Math.max(...allValues));

    // A "normal day" = day where the average of all slots is < 130 mg/dL
    const normalDays = chartData.filter((day) => {
      const dayValues = Object.keys(day)
        .filter((k) => k !== 'date')
        .map((k) => day[k]);
      if (dayValues.length === 0) return false;
      const dayAvg = dayValues.reduce((a, b) => a + b, 0) / dayValues.length;
      return dayAvg < 130;
    }).length;

    return { avg, min, max, normalDays, totalDays: chartData.length };
  };

  const stats = calculateStats();

  // Convert raw mg/dL chart data to the selected display unit
  const SLOT_KEYS = ['fasting', 'afterBreakfast', 'beforeLunch', 'afterLunch', 'beforeDinner', 'afterDinner', 'beforeBedtime'];
  const convertedChartData = chartData.map((day) => {
    const c = { date: day.date };
    SLOT_KEYS.forEach((k) => { if (day[k] != null) c[k] = toDisplay(day[k], unit); });
    return c;
  });

  const yAxis = unit === 'mmol/L'
    ? { domain: [0, 16.7], ticks: [0, 5.6, 7.2, 10.0, 16.7] }
    : { domain: [0, 300],  ticks: [0, 100, 130, 180, 300] };

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">My Blood Sugar Trends</h2>
      </div>

      {/* Loading State */}
      {dataLoading && (
        <div className="text-center py-10 sm:py-16">
          <div className="animate-spin w-8 h-8 sm:w-10 sm:h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3 sm:mb-4"></div>
          <p className="text-gray-500 text-sm sm:text-lg">Loading your blood sugar trends...</p>
        </div>
      )}

      {/* Empty State */}
      {!dataLoading && chartData.length === 0 && (
        <div className="text-center py-10 sm:py-16 px-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-base sm:text-xl mb-2">No blood sugar data available</p>
          <p className="text-gray-400 text-xs sm:text-sm">Start logging your readings in the "Log Blood Sugar" page to see your trends here.</p>
        </div>
      )}

      {/* Content — only show when we have data */}
      {!dataLoading && chartData.length > 0 && (<>

      

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-5 mb-4 sm:mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-3 sm:p-5 text-white">
          <p className="text-xs sm:text-sm font-semibold opacity-90">Average</p>
          <p className="text-xl sm:text-3xl lg:text-4xl font-bold mt-1 sm:mt-2">{toDisplay(stats.avg, unit)}</p>
          <p className="text-xs sm:text-sm opacity-75 mt-0.5">{unit}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-3 sm:p-5 text-white">
          <p className="text-xs sm:text-sm font-semibold opacity-90">Lowest</p>
          <p className="text-xl sm:text-3xl lg:text-4xl font-bold mt-1 sm:mt-2">{toDisplay(stats.min, unit)}</p>
          <p className="text-xs sm:text-sm opacity-75 mt-0.5">{unit}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-3 sm:p-5 text-white">
          <p className="text-xs sm:text-sm font-semibold opacity-90">Highest</p>
          <p className="text-xl sm:text-3xl lg:text-4xl font-bold mt-1 sm:mt-2">{toDisplay(stats.max, unit)}</p>
          <p className="text-xs sm:text-sm opacity-75 mt-0.5">{unit}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-3 sm:p-5 text-white">
          <p className="text-xs sm:text-sm font-semibold opacity-90">Normal Days</p>
          <p className="text-xl sm:text-3xl lg:text-4xl font-bold mt-1 sm:mt-2">{stats.normalDays}/{stats.totalDays}</p>
          <p className="text-xs sm:text-sm opacity-75 mt-0.5">Days</p>
        </div>
        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl shadow-lg p-3 sm:p-5 text-white">
          <p className="text-xs sm:text-sm font-semibold opacity-90">Control Rate</p>
          <p className="text-xl sm:text-3xl lg:text-4xl font-bold mt-1 sm:mt-2">
            {stats.totalDays > 0 ? Math.round((stats.normalDays / stats.totalDays) * 100) : 0}%
          </p>
          <p className="text-xs sm:text-sm opacity-75 mt-0.5">Success</p>
        </div>
      </div>

      {/* Period Filter + Unit Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex gap-1.5 sm:gap-2 flex-wrap">
          {['7days', '14days', '30days', 'all'].map((period) => (
            <button
              key={period}
              onClick={() => setFilterPeriod(period)}
              className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg font-semibold transition text-[11px] sm:text-sm ${
                filterPeriod === period
                  ? 'bg-primary text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {period === '7days' ? '7 Days' : period === '14days' ? '14 Days' : period === '30days' ? '30 Days' : 'All'}
            </button>
          ))}
        </div>
        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
          {['mg/dL', 'mmol/L'].map((u) => (
            <button
              key={u}
              onClick={() => {
                if (unit !== u) {
                  changeUnit(u);
                  toast(`Your readings will now show in ${u}`, { duration: 2000, icon: <ArrowLeftRight className="w-4 h-4 text-primary" /> });
                }
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition ${
                unit === u ? 'bg-white text-primary shadow' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Glycemic Chart */}
      <Card title={<span className="flex items-center gap-2"><BarChart2 className="w-5 h-5" />Blood Sugar Trends by Time of Day</span>}>
        <div className="mb-4 p-3 sm:p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
          <p className="text-xs sm:text-sm text-gray-700">
            <strong>Target Range:</strong> Keep your blood sugar between{' '}
            <span className="text-green-600 font-bold">
              {unit === 'mmol/L' ? '3.9–7.2 mmol/L' : '70–130 mg/dL'}
            </span>{' '}
            (fasting) and below{' '}
            <span className="text-green-600 font-bold">
              {unit === 'mmol/L' ? '10.0 mmol/L' : '180 mg/dL'}
            </span>{' '}
            (after meals) for good control.
          </p>
        </div>

        {/* Legend */}
        <div className="mb-3 sm:mb-4">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-4 gap-y-1.5 sm:gap-4 text-[10px] sm:text-xs lg:text-sm font-semibold">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-600 rounded flex-shrink-0"></div>
              <span>Fasting</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-400 rounded flex-shrink-0"></div>
              <span>After Breakfast</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-500 rounded flex-shrink-0"></div>
              <span>Before Lunch</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 sm:w-8 sm:h-1 bg-red-600 flex-shrink-0"></div>
              <span>After Lunch</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-600 rounded flex-shrink-0"></div>
              <span>Before Dinner</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-900 rounded flex-shrink-0"></div>
              <span>After Dinner</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-orange-700 rounded flex-shrink-0"></div>
              <span>Before Bedtime</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="relative bg-white border border-gray-200 sm:border-2 sm:border-gray-300 rounded-lg p-1.5 sm:p-4 lg:p-8">
          <div className="overflow-x-auto -mx-1 px-1">
            <div className="h-[280px] sm:h-[400px]" style={{ minWidth: `${Math.max(chartData.length * (isMobile ? 45 : 90), 320)}px` }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <ComposedChart
                  data={convertedChartData.map((reading, i) => ({
                    date: new Date(chartData[i].date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'numeric',
                    }),
                    fullDate: new Date(chartData[i].date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    }),
                    fasting: reading.fasting,
                    afterBreakfast: reading.afterBreakfast,
                    beforeLunch: reading.beforeLunch,
                    afterLunch: reading.afterLunch,
                    beforeDinner: reading.beforeDinner,
                    afterDinner: reading.afterDinner,
                    beforeBedtime: reading.beforeBedtime,
                  }))}
                  margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                  <XAxis
                    dataKey="date"
                    stroke="#374151"
                    style={{ fontSize: '10px', fontWeight: 'bold' }}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    domain={yAxis.domain}
                    ticks={yAxis.ticks}
                    stroke="#374151"
                    style={{ fontSize: '10px' }}
                    tick={{ fontSize: 10 }}
                    width={35}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                      maxWidth: '220px',
                    }}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                    formatter={(value) => [`${value} ${unit}`]}
                  />

                  {/* Bars for each time slot */}
                  <Bar dataKey="fasting" name="Fasting" fill="#2563eb" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="afterBreakfast" name="After Breakfast" fill="#9ca3af" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="beforeLunch" name="Before Lunch" fill="#eab308" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="afterLunch" name="After Lunch" fill="#dc2626" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="beforeDinner" name="Before Dinner" fill="#16a34a" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="afterDinner" name="After Dinner" fill="#1e3a8a" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="beforeBedtime" name="Before Bedtime" fill="#c2410c" radius={[2, 2, 0, 0]} />

                  {/* Trend line for After Lunch */}
                  <Line
                    type="monotone"
                    dataKey="afterLunch"
                    name="After Lunch (Trend)"
                    stroke="#dc2626"
                    strokeWidth={2}
                    dot={{ fill: '#dc2626', stroke: '#fff', strokeWidth: 1, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        {/* Y-axis label shown below chart on mobile for context */}
        <p className="text-[10px] text-gray-400 mt-1 sm:hidden text-center">Values in {unit}</p>
      </Card>

      {/* Health Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-6">
        <Card title={<span className="flex items-center gap-2"><Lightbulb className="w-5 h-5" />Your Progress</span>}>
          <div className="space-y-3 sm:space-y-4">
            {stats.normalDays >= stats.totalDays * 0.7 ? (
              <div className="p-3 sm:p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                <p className="text-xs sm:text-sm text-green-800">
                  <strong>Excellent!</strong> You're maintaining good control {Math.round((stats.normalDays / stats.totalDays) * 100)}% of the time. Keep it up!
                </p>
              </div>
            ) : stats.normalDays >= stats.totalDays * 0.5 ? (
              <div className="p-3 sm:p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                <p className="text-xs sm:text-sm text-yellow-800">
                  <strong>Good progress!</strong> You're in control {Math.round((stats.normalDays / stats.totalDays) * 100)}% of the time. Let's aim for 70% or higher.
                </p>
              </div>
            ) : (
              <div className="p-3 sm:p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                <p className="text-xs sm:text-sm text-red-800">
                  <strong>Needs Attention:</strong> Your blood sugar is in range only {Math.round((stats.normalDays / stats.totalDays) * 100)}% of the time. Please consult your doctor.
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card title={<span className="flex items-center gap-2"><Target className="w-5 h-5" />Next Steps</span>}>
          <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">▸</span>
              <span>Continue logging your blood sugar daily</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">▸</span>
              <span>Take your medications as prescribed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">▸</span>
              <span>Maintain a balanced diet and exercise regularly</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">▸</span>
              <span>Schedule your next appointment with your doctor</span>
            </li>
          </ul>
        </Card>
      </div>
      </>)}
    </div>
  );
};

export default ViewTrends;
