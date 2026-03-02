import { useState, useMemo, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import { usePatientContext } from "../../contexts/PatientContext";
import GlycemicChartPanel from "../../components/doctor/GlycemicChartPanel";

// Demo data generator — returns mock readings per period (for presentations)
const DEMO_DATA = {
  "7days": [
    { date: "2024-12-02", fasting: 6.5, afterBreakfast: 8.2, beforeLunch: 5.8, afterLunch: 7.5, beforeDinner: 6.2, afterDinner: 8.5, beforeBedtime: 7.0 },
    { date: "2024-12-03", fasting: 6.2, afterBreakfast: 7.8, beforeLunch: 5.5, afterLunch: 7.2, beforeDinner: 6.0, afterDinner: 8.2, beforeBedtime: 6.8 },
    { date: "2024-12-04", fasting: 7.0, afterBreakfast: 9.0, beforeLunch: 6.5, afterLunch: 8.5, beforeDinner: 6.8, afterDinner: 9.2, beforeBedtime: 7.5 },
    { date: "2024-12-05", fasting: 6.8, afterBreakfast: 8.6, beforeLunch: 6.2, afterLunch: 8.0, beforeDinner: 6.5, afterDinner: 8.8, beforeBedtime: 7.2 },
    { date: "2024-12-06", fasting: 6.4, afterBreakfast: 8.0, beforeLunch: 5.6, afterLunch: 7.4, beforeDinner: 6.2, afterDinner: 8.3, beforeBedtime: 6.9 },
    { date: "2024-12-07", fasting: 7.2, afterBreakfast: 9.2, beforeLunch: 6.8, afterLunch: 8.8, beforeDinner: 7.0, afterDinner: 9.5, beforeBedtime: 7.8 },
    { date: "2024-12-08", fasting: 6.9, afterBreakfast: 8.5, beforeLunch: 6.4, afterLunch: 8.2, beforeDinner: 6.7, afterDinner: 8.7, beforeBedtime: 7.3 },
  ],
  "14days": Array.from({ length: 14 }, (_, i) => ({
    date: new Date(2024, 10, 25 + i).toISOString().split("T")[0],
    fasting: 6.0 + Math.random() * 1.5, afterBreakfast: 7.5 + Math.random() * 2.0,
    beforeLunch: 5.5 + Math.random() * 1.5, afterLunch: 7.0 + Math.random() * 2.0,
    beforeDinner: 6.0 + Math.random() * 1.5, afterDinner: 8.0 + Math.random() * 2.0,
    beforeBedtime: 6.5 + Math.random() * 1.5,
  })),
  "30days": Array.from({ length: 30 }, (_, i) => ({
    date: new Date(2024, 10, 9 + i).toISOString().split("T")[0],
    fasting: 6.0 + Math.random() * 1.5, afterBreakfast: 7.5 + Math.random() * 2.0,
    beforeLunch: 5.5 + Math.random() * 1.5, afterLunch: 7.0 + Math.random() * 2.0,
    beforeDinner: 6.0 + Math.random() * 1.5, afterDinner: 8.0 + Math.random() * 2.0,
    beforeBedtime: 6.5 + Math.random() * 1.5,
  })),
  all: Array.from({ length: 90 }, (_, i) => ({
    date: new Date(2024, 8, 10 + i).toISOString().split("T")[0],
    fasting: 6.0 + Math.random() * 1.5, afterBreakfast: 7.5 + Math.random() * 2.0,
    beforeLunch: 5.5 + Math.random() * 1.5, afterLunch: 7.0 + Math.random() * 2.0,
    beforeDinner: 6.0 + Math.random() * 1.5, afterDinner: 8.0 + Math.random() * 2.0,
    beforeBedtime: 6.5 + Math.random() * 1.5,
  })),
};

const GlycemicCharts = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { uhid: urlUHID } = useParams();
  const { getPatientByUHID } = usePatientContext();

  // Get patient from URL params OR navigation state (flexible!)
  const patientUHID = urlUHID || location.state?.patientUHID;
  const fromConsultation = location.state?.fromConsultation;

  const [manualPatient, setManualPatient] = useState(null);
  const [demoMode, setDemoMode] = useState(false);

  // Derive patient from URL/state or manual selection
  const selectedPatient = useMemo(() => {
    if (patientUHID) {
      return getPatientByUHID(patientUHID) || null;
    }
    return manualPatient;
  }, [patientUHID, getPatientByUHID, manualPatient]);

  // Stable callback for demo data — only used when demoMode is ON
  const getDemoData = useCallback(
    (period) => DEMO_DATA[period] || DEMO_DATA["7days"],
    []
  );

  // Mock patients for standalone page selection
  const [patients] = useState([
    { id: 1, uhid: "CDC001", name: "John Doe", age: 45, lastReading: "145 mg/dL" },
    { id: 2, uhid: "CDC003", name: "Ali Hassan", age: 38, lastReading: "168 mg/dL" },
    { id: 3, uhid: "CDC005", name: "Mary Johnson", age: 61, lastReading: "152 mg/dL" },
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">
          Glycemic Charts
        </h2>
        {fromConsultation && (
          <Button
            variant="outline"
            onClick={() => navigate(`/doctor/consultation/${patientUHID}`)}
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
                onClick={() => setManualPatient(patient)}
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
          {/* Demo Mode Toggle */}
          <Card>
            <div className="flex items-center justify-between p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="demoMode"
                  checked={demoMode}
                  onChange={(e) => setDemoMode(e.target.checked)}
                  className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary cursor-pointer"
                />
                <label
                  htmlFor="demoMode"
                  className="font-semibold text-gray-800 cursor-pointer flex items-center gap-2"
                >
                  📊 Use Demo Data (For Presentation)
                </label>
              </div>
              {demoMode && (
                <div className="px-4 py-2 bg-orange-500 text-white rounded-lg font-bold text-sm animate-pulse">
                  🎬 DEMO MODE ACTIVE - Showing Sample Data
                </div>
              )}
            </div>
          </Card>

          {/* Chart Panel (reusable component) */}
          <GlycemicChartPanel
            patient={selectedPatient}
            getDataForPeriod={demoMode ? getDemoData : undefined}
          />
        </div>
      )}
    </div>
  );
};

export default GlycemicCharts;
