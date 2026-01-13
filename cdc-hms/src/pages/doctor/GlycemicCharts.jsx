import { useState, useEffect } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import { usePatientContext } from '../../contexts/PatientContext';

const GlycemicCharts = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { getPatientByUHID } = usePatientContext();
  
  // Get patient from navigation state
  const patientUHID = location.state?.patientUHID;
  const fromConsultation = location.state?.fromConsultation;
  
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [filterPeriod, setFilterPeriod] = useState("7days");

  // Auto-select patient if coming from Consultations
  useEffect(() => {
    if (patientUHID) {
      const patient = getPatientByUHID(patientUHID);
      if (patient) {
        setSelectedPatient(patient);
      }
    }
  }, [patientUHID, getPatientByUHID]);

  // Mock patients
  const [patients] = useState([
    {
      id: 1,
      uhid: "CDC001",
      name: "John Doe",
      age: 45,
      lastReading: "145 mg/dL",
    },
    {
      id: 2,
      uhid: "CDC003",
      name: "Ali Hassan",
      age: 38,
      lastReading: "168 mg/dL",
    },
    {
      id: 3,
      uhid: "CDC005",
      name: "Mary Johnson",
      age: 61,
      lastReading: "152 mg/dL",
    },
  ]);

  // Mock blood sugar data with 7 readings per day (CORRECTED)
  const getBloodSugarData = (period) => {
    const baseData = {
      "7days": [
        {
          date: "2024-12-02",
          fasting: 6.5,
          afterBreakfast: 8.2,
          beforeLunch: 5.8,
          afterLunch: 7.5,
          beforeDinner: 6.2,
          afterDinner: 8.5,
          beforeBedtime: 7.0,
        },
        {
          date: "2024-12-03",
          fasting: 6.2,
          afterBreakfast: 7.8,
          beforeLunch: 5.5,
          afterLunch: 7.2,
          beforeDinner: 6.0,
          afterDinner: 8.2,
          beforeBedtime: 6.8,
        },
        {
          date: "2024-12-04",
          fasting: 7.0,
          afterBreakfast: 9.0,
          beforeLunch: 6.5,
          afterLunch: 8.5,
          beforeDinner: 6.8,
          afterDinner: 9.2,
          beforeBedtime: 7.5,
        },
        {
          date: "2024-12-05",
          fasting: 6.8,
          afterBreakfast: 8.6,
          beforeLunch: 6.2,
          afterLunch: 8.0,
          beforeDinner: 6.5,
          afterDinner: 8.8,
          beforeBedtime: 7.2,
        },
        {
          date: "2024-12-06",
          fasting: 6.4,
          afterBreakfast: 8.0,
          beforeLunch: 5.6,
          afterLunch: 7.4,
          beforeDinner: 6.2,
          afterDinner: 8.3,
          beforeBedtime: 6.9,
        },
        {
          date: "2024-12-07",
          fasting: 7.2,
          afterBreakfast: 9.2,
          beforeLunch: 6.8,
          afterLunch: 8.8,
          beforeDinner: 7.0,
          afterDinner: 9.5,
          beforeBedtime: 7.8,
        },
        {
          date: "2024-12-08",
          fasting: 6.9,
          afterBreakfast: 8.5,
          beforeLunch: 6.4,
          afterLunch: 8.2,
          beforeDinner: 6.7,
          afterDinner: 8.7,
          beforeBedtime: 7.3,
        },
      ],
      "14days": Array.from({ length: 14 }, (_, i) => ({
        date: new Date(2024, 10, 25 + i).toISOString().split("T")[0],
        fasting: 6.0 + Math.random() * 1.5,
        afterBreakfast: 7.5 + Math.random() * 2.0,
        beforeLunch: 5.5 + Math.random() * 1.5,
        afterLunch: 7.0 + Math.random() * 2.0,
        beforeDinner: 6.0 + Math.random() * 1.5,
        afterDinner: 8.0 + Math.random() * 2.0,
        beforeBedtime: 6.5 + Math.random() * 1.5,
      })),
      "30days": Array.from({ length: 30 }, (_, i) => ({
        date: new Date(2024, 10, 9 + i).toISOString().split("T")[0],
        fasting: 6.0 + Math.random() * 1.5,
        afterBreakfast: 7.5 + Math.random() * 2.0,
        beforeLunch: 5.5 + Math.random() * 1.5,
        afterLunch: 7.0 + Math.random() * 2.0,
        beforeDinner: 6.0 + Math.random() * 1.5,
        afterDinner: 8.0 + Math.random() * 2.0,
        beforeBedtime: 6.5 + Math.random() * 1.5,
      })),
      all: Array.from({ length: 90 }, (_, i) => ({
        date: new Date(2024, 8, 10 + i).toISOString().split("T")[0],
        fasting: 6.0 + Math.random() * 1.5,
        afterBreakfast: 7.5 + Math.random() * 2.0,
        beforeLunch: 5.5 + Math.random() * 1.5,
        afterLunch: 7.0 + Math.random() * 2.0,
        beforeDinner: 6.0 + Math.random() * 1.5,
        afterDinner: 8.0 + Math.random() * 2.0,
        beforeBedtime: 6.5 + Math.random() * 1.5,
      })),
    };
    return baseData[period] || baseData["7days"];
  };

  const bloodSugarData = selectedPatient ? getBloodSugarData(filterPeriod) : [];

  const maxValue = 12; // mmol/L scale matching PowerPoint

  // Conversion helper: mg/dL to mmol/L
  // Formula: mmol/L = mg/dL ÷ 18
  // Example: 126 mg/dL = 7.0 mmol/L
  // Note: Patient logs in mg/dL, chart displays in mmol/L
  const convertToMmol = (mgdl) => mgdl / 18;

  const getBarColor = (reading) => {
    const colors = {
      fasting: "bg-blue-600",
      afterBreakfast: "bg-gray-400",
      beforeLunch: "bg-yellow-500",
      afterLunch: "bg-red-600",
      beforeDinner: "bg-green-600",
      afterDinner: "bg-blue-900",
      beforeBedtime: "bg-orange-700",
    };
    return colors[reading] || "bg-gray-500";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">
          Glycemic Charts
        </h2>
        {fromConsultation && (
          <Button 
            variant="outline" 
            onClick={() => navigate('/doctor/consultations')}
          >
            ← Back to Consultation
          </Button>
        )}
      </div>

      {!selectedPatient && !fromConsultation ? (
        <Card title="Select Patient to View Charts">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.map((patient) => (
              <button
                key={patient.id}
                onClick={() => setSelectedPatient(patient)}
                className="text-left p-6 border-2 border-gray-200 rounded-lg hover:border-primary hover:bg-blue-50 transition"
              >
                <p className="font-bold text-primary text-lg">{patient.uhid}</p>
                <p className="font-semibold text-gray-800 text-xl mt-2">
                  {patient.name}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {patient.age} years
                </p>
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-3xl font-bold text-gray-800">
                {selectedPatient.name} - Sugar Trends
              </h3>
              <div className="flex gap-2">
                {["7days", "14days", "30days", "all"].map((period) => (
                  <button
                    key={period}
                    onClick={() => setFilterPeriod(period)}
                    className={`px-6 py-3 rounded-lg font-semibold transition ${
                      filterPeriod === period
                        ? "bg-primary text-white shadow-lg"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {period === "all" ? "All" : period.replace("days", " days")}
                  </button>
                ))}
              </div>
            </div>

            {/* Legend - UPDATED TO 7 SLOTS */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-600">
                  <span className="font-semibold">Blood Sugar Levels (mmol/L)</span>
                  <span className="ml-4 text-xs">• Target Range: 4-7 mmol/L (72-126 mg/dL)</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-6 text-sm font-semibold">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 rounded"></div>
                <span>Fasting (Morning)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-400 rounded"></div>
                <span>After Breakfast</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-yellow-500 rounded"></div>
                <span>Before Lunch</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12 h-1 bg-red-600"></div>
                <span className="font-bold">After Lunch (Trend Line)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-600 rounded"></div>
                <span>Before Dinner</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-900 rounded"></div>
                <span>After Dinner</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-orange-700 rounded"></div>
                <span>Before Bedtime</span>
              </div>
            </div>
            </div>

            {/* Chart */}
            <div className="relative bg-white border-2 border-gray-300 rounded-lg p-8">
              {/* Y-axis */}
              <div className="absolute left-4 top-12 bottom-16 w-8 flex flex-col justify-between text-sm font-semibold text-gray-700">
                <span>12</span>
                <span>10</span>
                <span>8</span>
                <span>6</span>
                <span>4</span>
                <span>2</span>
                <span>0</span>
              </div>

              {/* Y-axis label */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-bold text-gray-700 whitespace-nowrap">
                Blood Sugar (mmol/L)
              </div>

              {/* Chart area */}
              <div className="ml-12 overflow-x-auto">
                <div className="relative flex" style={{ minWidth: 'max-content', height: '500px' }}>
                  {/* Grid lines */}
                  {[0, 2, 4, 6, 8, 10, 12].map((val, i) => (
                    <div
                      key={i}
                      className="absolute w-full border-t border-gray-300"
                      style={{ bottom: `${(val / 12) * 100}%` }}
                    />
                  ))}

                  {/* Trend line - connecting After Lunch values */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ zIndex: 10 }}
                  >
                    {bloodSugarData.length > 1 && (
                      <path
                        d={bloodSugarData
                          .map((reading, index) => {
                            // Calculate position of After Lunch bar (4th bar = index 3)
                            const groupWidth = 7 * 24; // Approximate: 7 bars × 24px each
                            const groupGap = 32; // mr-8 = 32px
                            const barIndex = 3; // After Lunch is 4th bar (index 3)
                            const barWidth = 24; // Approximate bar width
                            
                            const x = index * (groupWidth + groupGap) + (barIndex * barWidth) + (barWidth / 2);
                            const chartHeight = 452; // Height of usable chart area
                            const y = chartHeight - (reading.afterLunch / maxValue) * chartHeight;
                            
                            return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                          })
                          .join(" ")}
                        stroke="#dc2626"
                        strokeWidth="3"
                        fill="none"
                      />
                    )}
                  </svg>

                  {/* Bars - UPDATED TO 7 READINGS */}
                  <div className="absolute inset-0 flex gap-8">
                    {bloodSugarData.map((reading, dateIndex) => {
                      const readings = [
                        { key: "fasting", value: reading.fasting },
                        { key: "afterBreakfast", value: reading.afterBreakfast },
                        { key: "beforeLunch", value: reading.beforeLunch },
                        { key: "afterLunch", value: reading.afterLunch },
                        { key: "beforeDinner", value: reading.beforeDinner },
                        { key: "afterDinner", value: reading.afterDinner },
                        { key: "beforeBedtime", value: reading.beforeBedtime },
                      ];

                      return (
                        <div
                          key={dateIndex}
                          className="flex flex-col items-center mr-8"
                          style={{ flex: '0 0 auto' }}
                        >
                          {/* Bar group */}
                          <div className="flex items-end" style={{ minHeight: '452px' }}>
                            {readings.map((r, i) => {
                              const chartHeight = 500;
                              const paddingBottom = 48;
                              const usableHeight = chartHeight - paddingBottom;
                              const barHeight = (r.value / maxValue) * usableHeight;
                              
                              return (
                                <div
                                  key={i}
                                  className="flex flex-col justify-end items-center relative"
                                >
                                  <div
                                    className={`${getBarColor(
                                      r.key
                                    )} rounded-t-sm transition-all duration-300 relative group cursor-pointer hover:opacity-80`}
                                    style={{
                                      height: `${barHeight}px`,
                                      minWidth: "20px",
                                      maxWidth: "28px",
                                    }}
                                  >
                                    {filterPeriod === "7days" && barHeight > 30 && (
                                      <span className="text-[9px] text-white font-bold block text-center mt-1">
                                        {r.value.toFixed(1)}
                                      </span>
                                    )}
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none z-10">
                                      {r.value.toFixed(1)} mmol/L
                                    </div>
                                    
                                    {/* Red dot on top of After Lunch bar */}
                                    {r.key === "afterLunch" && (
                                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-lg z-20"></div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Date label directly under this group */}
                          <div className="mt-3 text-center">
                            <div className="text-sm font-bold text-gray-800 bg-gray-100 px-3 py-1 rounded">
                              {new Date(reading.date).toLocaleDateString("en-US", {
                                month: "numeric",
                                day: "numeric",
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* X-axis labels - HIDDEN (dates now under each group) */}
                  <div className="absolute bottom-0 w-full flex hidden">
                    {bloodSugarData.map((reading, index) => (
                      <div
                        key={index}
                        className="flex-1 text-center text-sm font-semibold text-gray-700"
                      >
                        {new Date(reading.date).toLocaleDateString("en-US", {
                          month: "numeric",
                          day: "numeric",
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Column Headers - UPDATED TO 7 SLOTS */}
            <div className="mt-8 grid grid-cols-8 gap-2 text-xs font-semibold text-gray-700 text-center bg-gray-100 p-4 rounded-lg">
              <div>Date | Time</div>
              <div>Fasting (Morning)</div>
              <div>After Breakfast</div>
              <div>Before Lunch</div>
              <div>After Lunch</div>
              <div>Before Dinner</div>
              <div>After Dinner</div>
              <div>Before Bedtime</div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GlycemicCharts;