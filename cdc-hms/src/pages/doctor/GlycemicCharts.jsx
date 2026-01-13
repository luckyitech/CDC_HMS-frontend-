import { useState, useEffect } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
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
              <div className="overflow-x-auto">
                <div style={{ minWidth: `${bloodSugarData.length * 150}px`, height: '500px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={bloodSugarData.map(reading => ({
                        date: new Date(reading.date).toLocaleDateString("en-US", {
                          month: "numeric",
                          day: "numeric",
                        }),
                        fasting: reading.fasting,
                        afterBreakfast: reading.afterBreakfast,
                        beforeLunch: reading.beforeLunch,
                        afterLunch: reading.afterLunch,
                        beforeDinner: reading.beforeDinner,
                        afterDinner: reading.afterDinner,
                        beforeBedtime: reading.beforeBedtime,
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#374151"
                        style={{ fontSize: '14px', fontWeight: 'bold' }}
                      />
                      <YAxis 
                        domain={[0, 12]}
                        ticks={[0, 2, 4, 6, 8, 10, 12]}
                        stroke="#374151"
                        style={{ fontSize: '14px', fontWeight: 'bold' }}
                        label={{ 
                          value: 'Blood Sugar (mmol/L)', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { fontSize: '14px', fontWeight: 'bold', fill: '#374151' }
                        }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1f2937', 
                          border: 'none', 
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                        formatter={(value) => `${value.toFixed(1)} mmol/L`}
                      />
                      
                      {/* Bars for each time slot */}
                      <Bar dataKey="fasting" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="afterBreakfast" fill="#9ca3af" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="beforeLunch" fill="#eab308" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="afterLunch" fill="#dc2626" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="beforeDinner" fill="#16a34a" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="afterDinner" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="beforeBedtime" fill="#c2410c" radius={[4, 4, 0, 0]} />
                      
                      {/* Trend line for After Lunch */}
                      <Line 
                        type="monotone" 
                        dataKey="afterLunch" 
                        stroke="#dc2626" 
                        strokeWidth={4}
                        dot={{ fill: '#dc2626', stroke: '#fff', strokeWidth: 2, r: 6 }}
                        activeDot={{ r: 8 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
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