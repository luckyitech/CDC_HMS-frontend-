import { useState, useEffect } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import Card from "../shared/Card";
import { usePatientContext } from "../../contexts/PatientContext";

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

// Slot definitions used for chart bars and legend
const SLOTS = [
  { key: "fasting", name: "Fasting (Morning)", color: "#2563eb" },
  { key: "afterBreakfast", name: "After Breakfast", color: "#9ca3af" },
  { key: "beforeLunch", name: "Before Lunch", color: "#eab308" },
  { key: "afterLunch", name: "After Lunch", color: "#dc2626" },
  { key: "beforeDinner", name: "Before Dinner", color: "#16a34a" },
  { key: "afterDinner", name: "After Dinner", color: "#1e3a8a" },
  { key: "beforeBedtime", name: "Before Bedtime", color: "#c2410c" },
];

/**
 * Transform backend array into per-day objects for the chart.
 * Values converted from mg/dL to mmol/L (÷18).
 */
const transformReadingsForChart = (readings) => {
  const grouped = {};
  readings.forEach((r) => {
    if (!grouped[r.date]) grouped[r.date] = { date: r.date };
    const key = BACKEND_TO_FRONTEND[r.timeSlot] || r.timeSlot;
    grouped[r.date][key] = r.value / 18;
  });
  return Object.values(grouped).sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
};

/**
 * Reusable glycemic chart panel.
 *
 * @param {object}   patient           - Patient object (must have .uhid and .name)
 * @param {function} [getDataForPeriod] - Optional callback(period) → chartData[].
 *                                        When provided the panel uses it instead of
 *                                        fetching from the API (used for demo mode).
 */
const GlycemicChartPanel = ({ patient, getDataForPeriod }) => {
  const { getBloodSugarReadings } = usePatientContext();
  const [filterPeriod, setFilterPeriod] = useState("7days");
  const [chartData, setChartData] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Fetch data from API or use external provider when period changes
  useEffect(() => {
    if (getDataForPeriod) {
      setChartData(getDataForPeriod(filterPeriod));
      setDataLoading(false);
      return;
    }
    if (!patient) return;

    let cancelled = false;
    const fetchData = async () => {
      setDataLoading(true);
      const periodDays = { "7days": 7, "14days": 14, "30days": 30, all: 365 };
      const days = periodDays[filterPeriod] || 7;
      const readings = await getBloodSugarReadings(patient.uhid, { days });
      if (!cancelled) {
        setChartData(
          readings?.length > 0 ? transformReadingsForChart(readings) : []
        );
        setDataLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.uhid, filterPeriod, getDataForPeriod]);

  // Compute summary stats from current data
  const stats = (() => {
    if (chartData.length === 0) return null;
    let total = 0,
      count = 0;
    chartData.forEach((day) => {
      Object.keys(day).forEach((key) => {
        if (key !== "date" && day[key] > 0) {
          total += day[key];
          count++;
        }
      });
    });
    if (count === 0) return null;
    const average = total / count;
    let status = "Good",
      color = "green";
    if (average > 7) {
      status = "Above Target";
      color = "yellow";
    }
    if (average > 8.5) {
      status = "High";
      color = "red";
    }
    if (average < 4 && average > 0) {
      status = "Low";
      color = "orange";
    }
    return {
      average,
      status,
      color,
      dataPoints: count,
      daysLogged: chartData.length,
    };
  })();

  const periodLabel =
    filterPeriod === "all"
      ? "Overall"
      : filterPeriod.replace("days", "-Day");

  // Color helpers for stats card
  const colorClasses = {
    green: { bg: "bg-green-50 border-green-500", text: "text-green-700" },
    yellow: { bg: "bg-yellow-50 border-yellow-500", text: "text-yellow-700" },
    red: { bg: "bg-red-50 border-red-500", text: "text-red-700" },
    orange: { bg: "bg-orange-50 border-orange-500", text: "text-orange-700" },
  };

  return (
    <Card>
      {/* Header with period filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h3 className="text-xl lg:text-2xl font-bold text-gray-800">
          {patient?.name} - Sugar Trends
        </h3>
        <div className="flex gap-2 flex-wrap">
          {["7days", "14days", "30days", "all"].map((period) => (
            <button
              key={period}
              onClick={() => setFilterPeriod(period)}
              className={`px-4 py-2 rounded-lg font-semibold transition text-sm ${
                filterPeriod === period
                  ? "bg-primary text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {period === "all" ? "All" : period.replace("days", " Days")}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stat */}
      {stats && (
        <div
          className={`mb-6 p-4 rounded-lg border-2 ${
            colorClasses[stats.color]?.bg || "bg-gray-50 border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-1">
                {periodLabel} Average
              </div>
              <div className="text-3xl font-bold text-gray-800">
                {stats.average.toFixed(1)}
                <span className="text-sm font-normal text-gray-600 ml-1">
                  mmol/L
                </span>
              </div>
            </div>
            <div className="text-right">
              <div
                className={`text-sm font-semibold flex items-center gap-1 justify-end ${
                  colorClasses[stats.color]?.text || "text-gray-600"
                }`}
              >
                {stats.status === "Good" && (
                  <CheckCircle className="w-4 h-4" />
                )}
                {(stats.status === "Above Target" ||
                  stats.status === "Low") && (
                  <AlertTriangle className="w-4 h-4" />
                )}
                {stats.status === "High" && <XCircle className="w-4 h-4" />}
                {stats.status}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.dataPoints} readings over {stats.daysLogged} days
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-600">
            Blood Sugar Levels (mmol/L)
          </span>
          <span className="text-xs text-gray-500">
            Target: 4-7 mmol/L (72-126 mg/dL)
          </span>
        </div>
        <div className="flex flex-wrap gap-4 text-sm font-semibold">
          {SLOTS.map((slot) => (
            <div key={slot.key} className="flex items-center gap-2">
              {slot.key === "afterLunch" ? (
                <div
                  className="w-8 h-1"
                  style={{ backgroundColor: slot.color }}
                ></div>
              ) : (
                <div
                  className="w-5 h-5 rounded"
                  style={{ backgroundColor: slot.color }}
                ></div>
              )}
              <span>
                {slot.name}
                {slot.key === "afterLunch" ? " (Trend)" : ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Loading */}
      {dataLoading && (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading blood sugar data...</p>
        </div>
      )}

      {/* Empty */}
      {!dataLoading && chartData.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg mb-2">
            No blood sugar data available
          </p>
          <p className="text-gray-400 text-sm">
            Patient has not logged any readings for this period.
          </p>
        </div>
      )}

      {/* Chart */}
      {!dataLoading && chartData.length > 0 && (
        <div className="relative bg-white border-2 border-gray-300 rounded-lg p-4 lg:p-8">
          <div className="overflow-x-auto">
            <div
              style={{
                minWidth: `${Math.max(chartData.length * 150, 500)}px`,
                height: "500px",
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData.map((reading) => ({
                    date: new Date(reading.date).toLocaleDateString("en-US", {
                      month: "numeric",
                      day: "numeric",
                    }),
                    fullDate: new Date(reading.date).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    ),
                    ...Object.fromEntries(
                      SLOTS.map((s) => [s.key, reading[s.key]])
                    ),
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                  <XAxis
                    dataKey="date"
                    stroke="#374151"
                    style={{ fontSize: "14px", fontWeight: "bold" }}
                  />
                  <YAxis
                    domain={[0, 12]}
                    ticks={[0, 2, 4, 6, 8, 10, 12]}
                    stroke="#374151"
                    style={{ fontSize: "14px", fontWeight: "bold" }}
                    label={{
                      value: "Blood Sugar (mmol/L)",
                      angle: -90,
                      position: "insideLeft",
                      style: {
                        fontSize: "14px",
                        fontWeight: "bold",
                        fill: "#374151",
                      },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    labelFormatter={(label, payload) =>
                      payload?.[0]?.payload?.fullDate || label
                    }
                    formatter={(value) => `${value.toFixed(1)} mmol/L`}
                  />

                  {/* Bars for each time slot */}
                  {SLOTS.map((slot) => (
                    <Bar
                      key={slot.key}
                      dataKey={slot.key}
                      name={slot.name}
                      fill={slot.color}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}

                  {/* Trend line for After Lunch */}
                  <Line
                    type="monotone"
                    dataKey="afterLunch"
                    name="After Lunch (Trend)"
                    stroke="#dc2626"
                    strokeWidth={4}
                    dot={{
                      fill: "#dc2626",
                      stroke: "#fff",
                      strokeWidth: 2,
                      r: 6,
                    }}
                    activeDot={{ r: 8 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default GlycemicChartPanel;
