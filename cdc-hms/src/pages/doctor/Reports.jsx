import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import { usePatientContext } from "../../contexts/PatientContext";

const Reports = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { getPatientByUHID } = usePatientContext();

  const patientUHID = location.state?.patientUHID;
  const fromConsultation = location.state?.fromConsultation;

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState("thisMonth");
  const [selectedReportType, setSelectedReportType] = useState("all");

  // Auto-select patient if coming from Consultations
  useEffect(() => {
    if (patientUHID) {
      const patient = getPatientByUHID(patientUHID);
      if (patient) {
        setSelectedPatient(patient);
      }
    }
  }, [patientUHID, getPatientByUHID]);

  // Mock reports data
  const [reports] = useState([
    {
      id: 1,
      title: "Monthly Patient Summary - November 2024",
      type: "Patient Summary",
      date: "2024-12-01",
      patients: 45,
      status: "Generated",
      size: "2.3 MB",
    },
    {
      id: 2,
      title: "Glycemic Control Report - Q4 2024",
      type: "Glycemic Analysis",
      date: "2024-11-28",
      patients: 87,
      status: "Generated",
      size: "4.1 MB",
    },
    {
      id: 3,
      title: "Medication Adherence Report - November 2024",
      type: "Medication Report",
      date: "2024-11-25",
      patients: 52,
      status: "Generated",
      size: "1.8 MB",
    },
    {
      id: 4,
      title: "High-Risk Patients Report",
      type: "Risk Assessment",
      date: "2024-11-20",
      patients: 12,
      status: "Generated",
      size: "890 KB",
    },
    {
      id: 5,
      title: "HbA1c Trends Analysis - October 2024",
      type: "Glycemic Analysis",
      date: "2024-11-15",
      patients: 78,
      status: "Generated",
      size: "3.2 MB",
    },
  ]);

  // Statistics
  const statistics = {
    totalPatients: 87,
    averageHbA1c: "7.4%",
    controlledPatients: 52,
    highRiskPatients: 12,
    averageFasting: "148 mg/dL",
    averagePostMeal: "185 mg/dL",
  };

  const filteredReports = reports.filter((report) => {
    if (selectedReportType === "all") return true;
    return report.type === selectedReportType;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "Generated":
        return "bg-green-100 text-green-700 border-green-300";
      case "Processing":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "Failed":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">
            Reports & Analytics
          </h2>
          {selectedPatient && fromConsultation && (
            <p className="text-gray-600 mt-1">
              For: {selectedPatient.name} ({selectedPatient.uhid})
            </p>
          )}
        </div>
        <div className="flex gap-3">
          {fromConsultation && (
            <Button
              variant="outline"
              onClick={() => navigate(`/doctor/consultation/${patientUHID}`)}
            >
              ← Back to Consultation
            </Button>
          )}
          <Button>📊 Generate New Report</Button>
          <Button variant="outline">📤 Export All</Button>
        </div>
      </div>

      {/* Overview Statistics */}
      <Card title="📈 Current Month Overview" className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-600 uppercase font-semibold">
              Total Patients
            </p>
            <p className="text-3xl font-bold text-blue-700 mt-2">
              {statistics.totalPatients}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-600 uppercase font-semibold">
              Avg HbA1c
            </p>
            <p className="text-3xl font-bold text-purple-700 mt-2">
              {statistics.averageHbA1c}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-600 uppercase font-semibold">
              Controlled
            </p>
            <p className="text-3xl font-bold text-green-700 mt-2">
              {statistics.controlledPatients}
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-600 uppercase font-semibold">
              High Risk
            </p>
            <p className="text-3xl font-bold text-red-700 mt-2">
              {statistics.highRiskPatients}
            </p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-600 uppercase font-semibold">
              Avg Fasting
            </p>
            <p className="text-2xl font-bold text-yellow-700 mt-2">
              {statistics.averageFasting}
            </p>
          </div>
          <div className="bg-cyan-50 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-600 uppercase font-semibold">
              Avg Post-Meal
            </p>
            <p className="text-2xl font-bold text-cyan-700 mt-2">
              {statistics.averagePostMeal}
            </p>
          </div>
        </div>
      </Card>

      {/* Quick Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <button className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white text-left hover:scale-105 transition-all">
          <div className="text-4xl mb-3">👥</div>
          <p className="font-semibold text-lg">Patient Summary</p>
          <p className="text-sm opacity-90 mt-1">
            Generate monthly patient report
          </p>
        </button>

        <button className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white text-left hover:scale-105 transition-all">
          <div className="text-4xl mb-3">📊</div>
          <p className="font-semibold text-lg">Glycemic Analysis</p>
          <p className="text-sm opacity-90 mt-1">Blood sugar trends & HbA1c</p>
        </button>

        <button className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white text-left hover:scale-105 transition-all">
          <div className="text-4xl mb-3">💊</div>
          <p className="font-semibold text-lg">Medication Report</p>
          <p className="text-sm opacity-90 mt-1">Prescriptions & adherence</p>
        </button>

        <button className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white text-left hover:scale-105 transition-all">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="font-semibold text-lg">Risk Assessment</p>
          <p className="text-sm opacity-90 mt-1">High-risk patient analysis</p>
        </button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Time Period
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
            >
              <option value="thisWeek">This Week</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="last3Months">Last 3 Months</option>
              <option value="last6Months">Last 6 Months</option>
              <option value="thisYear">This Year</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Report Type
            </label>
            <select
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
            >
              <option value="all">All Reports</option>
              <option value="Patient Summary">Patient Summary</option>
              <option value="Glycemic Analysis">Glycemic Analysis</option>
              <option value="Medication Report">Medication Report</option>
              <option value="Risk Assessment">Risk Assessment</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Generated Reports */}
      <Card title={`📋 Generated Reports (${filteredReports.length})`}>
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-primary transition"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-gray-800">{report.title}</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                      report.status
                    )}`}
                  >
                    {report.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <span>📅 {report.date}</span>
                  <span>👥 {report.patients} patients</span>
                  <span>📦 {report.size}</span>
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                    {report.type}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-3 md:mt-0">
                <Button variant="outline" className="text-xs py-2 px-4">
                  👁️ View
                </Button>
                <Button variant="outline" className="text-xs py-2 px-4">
                  📥 Download
                </Button>
                <Button variant="outline" className="text-xs py-2 px-4">
                  📧 Email
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredReports.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No reports found for the selected filters.
            </p>
          </div>
        )}
      </Card>

      {/* Chart Placeholder - Future Enhancement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card title="📊 HbA1c Trends">
          <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
            <p className="text-gray-500">
              Chart will be implemented with backend data
            </p>
          </div>
        </Card>

        <Card title="📈 Blood Sugar Distribution">
          <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
            <p className="text-gray-500">
              Chart will be implemented with backend data
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
