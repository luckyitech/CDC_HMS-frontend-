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

  // Mock blood sugar data with 8 readings per day
  const getBloodSugarData = (period) => {
    const baseData = {
      "7days": [
        {
          date: "2024-12-02",
          fasting: 6.5,
          beforeBreakfast: 6.8,
          twoHrsAfterBreakfast: 8.2,
          beforeLunch: 5.8,
          twoHrsAfterLunch: 7.5,
          beforeDinner: 6.2,
          twoHrsAfterDinner: 8.5,
          beforeBedtime: 7.0,
        },
        {
          date: "2024-12-03",
          fasting: 6.2,
          beforeBreakfast: 6.5,
          twoHrsAfterBreakfast: 7.8,
          beforeLunch: 5.5,
          twoHrsAfterLunch: 7.2,
          beforeDinner: 6.0,
          twoHrsAfterDinner: 8.2,
          beforeBedtime: 6.8,
        },
        {
          date: "2024-12-04",
          fasting: 7.0,
          beforeBreakfast: 7.2,
          twoHrsAfterBreakfast: 9.0,
          beforeLunch: 6.5,
          twoHrsAfterLunch: 8.5,
          beforeDinner: 6.8,
          twoHrsAfterDinner: 9.2,
          beforeBedtime: 7.5,
        },
        {
          date: "2024-12-05",
          fasting: 6.8,
          beforeBreakfast: 7.0,
          twoHrsAfterBreakfast: 8.6,
          beforeLunch: 6.2,
          twoHrsAfterLunch: 8.0,
          beforeDinner: 6.5,
          twoHrsAfterDinner: 8.8,
          beforeBedtime: 7.2,
        },
        {
          date: "2024-12-06",
          fasting: 6.4,
          beforeBreakfast: 6.7,
          twoHrsAfterBreakfast: 8.0,
          beforeLunch: 5.6,
          twoHrsAfterLunch: 7.4,
          beforeDinner: 6.2,
          twoHrsAfterDinner: 8.3,
          beforeBedtime: 6.9,
        },
        {
          date: "2024-12-07",
          fasting: 7.2,
          beforeBreakfast: 7.4,
          twoHrsAfterBreakfast: 9.2,
          beforeLunch: 6.8,
          twoHrsAfterLunch: 8.8,
          beforeDinner: 7.0,
          twoHrsAfterDinner: 9.5,
          beforeBedtime: 7.8,
        },
        {
          date: "2024-12-08",
          fasting: 6.9,
          beforeBreakfast: 7.1,
          twoHrsAfterBreakfast: 8.5,
          beforeLunch: 6.4,
          twoHrsAfterLunch: 8.2,
          beforeDinner: 6.7,
          twoHrsAfterDinner: 8.7,
          beforeBedtime: 7.3,
        },
      ],
      "14days": Array.from({ length: 14 }, (_, i) => ({
        date: new Date(2024, 10, 25 + i).toISOString().split("T")[0],
        fasting: 6.0 + Math.random() * 1.5,
        beforeBreakfast: 6.3 + Math.random() * 1.5,
        twoHrsAfterBreakfast: 7.5 + Math.random() * 2.0,
        beforeLunch: 5.5 + Math.random() * 1.5,
        twoHrsAfterLunch: 7.0 + Math.random() * 2.0,
        beforeDinner: 6.0 + Math.random() * 1.5,
        twoHrsAfterDinner: 8.0 + Math.random() * 2.0,
        beforeBedtime: 6.5 + Math.random() * 1.5,
      })),
      "30days": Array.from({ length: 30 }, (_, i) => ({
        date: new Date(2024, 10, 9 + i).toISOString().split("T")[0],
        fasting: 6.0 + Math.random() * 1.5,
        beforeBreakfast: 6.3 + Math.random() * 1.5,
        twoHrsAfterBreakfast: 7.5 + Math.random() * 2.0,
        beforeLunch: 5.5 + Math.random() * 1.5,
        twoHrsAfterLunch: 7.0 + Math.random() * 2.0,
        beforeDinner: 6.0 + Math.random() * 1.5,
        twoHrsAfterDinner: 8.0 + Math.random() * 2.0,
        beforeBedtime: 6.5 + Math.random() * 1.5,
      })),
      all: Array.from({ length: 90 }, (_, i) => ({
        date: new Date(2024, 8, 10 + i).toISOString().split("T")[0],
        fasting: 6.0 + Math.random() * 1.5,
        beforeBreakfast: 6.3 + Math.random() * 1.5,
        twoHrsAfterBreakfast: 7.5 + Math.random() * 2.0,
        beforeLunch: 5.5 + Math.random() * 1.5,
        twoHrsAfterLunch: 7.0 + Math.random() * 2.0,
        beforeDinner: 6.0 + Math.random() * 1.5,
        twoHrsAfterDinner: 8.0 + Math.random() * 2.0,
        beforeBedtime: 6.5 + Math.random() * 1.5,
      })),
    };
    return baseData[period] || baseData["7days"];
  };

  const bloodSugarData = selectedPatient ? getBloodSugarData(filterPeriod) : [];

  const maxValue = 12; // mmol/L scale matching PowerPoint

  const getBarColor = (reading) => {
    const colors = {
      fasting: "bg-blue-600",
      beforeBreakfast: "bg-orange-500",
      twoHrsAfterBreakfast: "bg-gray-400",
      beforeLunch: "bg-yellow-500",
      twoHrsAfterLunch: "bg-red-600",
      beforeDinner: "bg-green-600",
      twoHrsAfterDinner: "bg-blue-900",
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

            {/* Legend */}
            <div className="flex flex-wrap gap-6 mb-6 text-sm font-semibold">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 rounded"></div>
                <span>Fasting</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-orange-500 rounded"></div>
                <span>Before Breakfast</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-400 rounded"></div>
                <span>2h After Breakfast</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-yellow-500 rounded"></div>
                <span>Before Lunch</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-600 rounded"></div>
                <span>Before Dinner</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-900 rounded"></div>
                <span>2h After Dinner</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-orange-700 rounded"></div>
                <span>Before Bedtime</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12 h-1 bg-blue-500"></div>
                <span className="font-bold">2h After Lunch</span>
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

              {/* Chart area */}
              <div className="ml-12 overflow-x-auto">
                <div className="relative" style={{ minWidth: `${bloodSugarData.length * 180}px`, height: '600px' }}>
                  {/* Grid lines */}
                  {[0, 2, 4, 6, 8, 10, 12].map((val, i) => (
                    <div
                      key={i}
                      className="absolute w-full border-t border-gray-300"
                      style={{ bottom: `${(val / 12) * 100}%` }}
                    />
                  ))}

                  {/* Trend line SVG */}
                  <svg
                    className="absolute inset-0 w-full h-full"
                    style={{ zIndex: 5 }}
                  >
                    <polyline
                      points={bloodSugarData
                        .map((reading, index) => {
                          const x =
                            ((index * 8 + 4.5) / (bloodSugarData.length * 8)) *
                            100;
                          const y =
                            100 - (reading.twoHrsAfterLunch / maxValue) * 100;
                          return `${x}%,${y}%`;
                        })
                        .join(" ")}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="4"
                    />
                    {/* Data points */}
                    {bloodSugarData.map((reading, index) => {
                      const x =
                        ((index * 8 + 4.5) / (bloodSugarData.length * 8)) * 100;
                      const y =
                        100 - (reading.twoHrsAfterLunch / maxValue) * 100;
                      return (
                        <circle
                          key={index}
                          cx={`${x}%`}
                          cy={`${y}%`}
                          r="5"
                          fill="#3b82f6"
                        />
                      );
                    })}
                  </svg>

                  {/* Bars */}
                  <div className="absolute inset-0 flex">
                    {bloodSugarData.map((reading, dateIndex) => {
                      const readings = [
                        { key: "fasting", value: reading.fasting },
                        {
                          key: "beforeBreakfast",
                          value: reading.beforeBreakfast,
                        },
                        {
                          key: "twoHrsAfterBreakfast",
                          value: reading.twoHrsAfterBreakfast,
                        },
                        { key: "beforeLunch", value: reading.beforeLunch },
                        {
                          key: "twoHrsAfterLunch",
                          value: reading.twoHrsAfterLunch,
                        },
                        { key: "beforeDinner", value: reading.beforeDinner },
                        {
                          key: "twoHrsAfterDinner",
                          value: reading.twoHrsAfterDinner,
                        },
                        { key: "beforeBedtime", value: reading.beforeBedtime },
                      ];

                      return (
                        <div
                          key={dateIndex}
                          className="flex-1 flex items-end pb-12"
                        >
                          {readings.map((r, i) => (
                            <div
                              key={i}
                              className="flex-1 flex flex-col justify-end items-center px-1"
                            >
                              <div
                                className={`w-full ${getBarColor(
                                  r.key
                                )} rounded-t-sm transition-all duration-300 relative group cursor-pointer hover:opacity-80`}
                                style={{
                                  height: `${(r.value / maxValue) * 85}%`, // Changed from 100% to 85% to account for padding
                                  minHeight: "40px", // Minimum height so bars are always visible
                                  minWidth: "20px",
                                  maxWidth: "35px",
                                }}
                              >
                                {filterPeriod === "7days" && (
                                  <span className="text-[10px] text-white font-bold block text-center mt-1">
                                    {r.value.toFixed(1)}
                                  </span>
                                )}
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none">
                                  {r.value.toFixed(1)} mmol/L
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>

                  {/* X-axis labels */}
                  <div className="absolute bottom-0 w-full flex">
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

            {/* Column Headers */}
            <div className="mt-8 grid grid-cols-9 gap-2 text-xs font-semibold text-gray-700 text-center bg-gray-100 p-4 rounded-lg">
              <div>Date | Time</div>
              <div>
                Fasting / B. Breakfast
                <br />
                <span className="text-blue-600 cursor-pointer hover:underline">
                  +See Trends
                </span>
              </div>
              <div>
                2 Hrs After B.Fast
                <br />
                <span className="text-blue-600 cursor-pointer hover:underline">
                  +See Trends
                </span>
              </div>
              <div>
                B. Lunch
                <br />
                <span className="text-blue-600 cursor-pointer hover:underline">
                  +See Trends
                </span>
              </div>
              <div>
                2 Hours After lunch
                <br />
                <span className="text-blue-600 cursor-pointer hover:underline">
                  +See Trends
                </span>
              </div>
              <div>
                Before Dinner
                <br />
                <span className="text-blue-600 cursor-pointer hover:underline">
                  +See Trends
                </span>
              </div>
              <div>
                2 hours After dinner
                <br />
                <span className="text-blue-600 cursor-pointer hover:underline">
                  +See Trends
                </span>
              </div>
              <div>
                Before Bedtime
                <br />
                <span className="text-blue-600 cursor-pointer hover:underline">
                  +See Trends
                </span>
              </div>
              <div>Notes</div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GlycemicCharts;
