import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import { usePatientContext } from "../../contexts/PatientContext"; // IMPORT CONTEXT!

const MyPatients = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // USE CONTEXT INSTEAD OF MOCK DATA!
  const { patients, getPatientsByRiskLevel } = usePatientContext();

  // Filter patients based on search and risk level
  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.uhid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone.includes(searchTerm);

    const matchesFilter =
      filterStatus === "all" ||
      patient.riskLevel.toLowerCase() === filterStatus;

    return matchesSearch && matchesFilter;
  });

  // Calculate statistics from context data
  const stats = {
    total: patients.length,
    lowRisk: getPatientsByRiskLevel('Low').length,
    mediumRisk: getPatientsByRiskLevel('Medium').length,
    highRisk: getPatientsByRiskLevel('High').length,
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case "High":
        return "bg-red-100 text-red-700 border-red-300";
      case "Medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "Low":
        return "bg-green-100 text-green-700 border-green-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getHbA1cColor = (value) => {
    const numValue = parseFloat(value);
    if (numValue < 7) return "text-green-600 font-semibold";
    if (numValue < 8) return "text-yellow-600 font-semibold";
    return "text-red-600 font-semibold";
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">
          My Patients
        </h2>
        <Button onClick={() => navigate("/doctor/dashboard")}>
          Back to Dashboard
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Total Patients</p>
          <p className="text-4xl font-bold mt-2">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Low Risk</p>
          <p className="text-4xl font-bold mt-2">{stats.lowRisk}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Medium Risk</p>
          <p className="text-4xl font-bold mt-2">{stats.mediumRisk}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">High Risk</p>
          <p className="text-4xl font-bold mt-2">{stats.highRisk}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search Patients
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, UHID, or phone..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Filter by Risk Level
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
            >
              <option value="all">All Patients</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Patient List */}
      <Card title={`Patient List (${filteredPatients.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                  UHID
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                  Name
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase hidden md:table-cell">
                  Age/Gender
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase hidden lg:table-cell">
                  Diabetes Type
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase hidden lg:table-cell">
                  HbA1c
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                  Risk Level
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase hidden xl:table-cell">
                  Next Visit
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 lg:px-6 py-4 font-medium text-primary text-sm">
                    {patient.uhid}
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <p className="font-semibold text-gray-800">
                      {patient.name}
                    </p>
                    <p className="text-xs text-gray-500">{patient.phone}</p>
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                    {patient.age} yrs â€¢ {patient.gender}
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-sm hidden lg:table-cell">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                      {patient.diabetesType}
                    </span>
                  </td>
                  <td
                    className={`px-4 lg:px-6 py-4 text-sm hidden lg:table-cell ${getHbA1cColor(
                      patient.hba1c
                    )}`}
                  >
                    {patient.hba1c}
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRiskColor(
                        patient.riskLevel
                      )}`}
                    >
                      {patient.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-sm text-gray-600 hidden xl:table-cell">
                    {patient.nextVisit}
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <Button
                      variant="outline"
                      className="text-xs py-1 px-3"
                      onClick={() =>
                        navigate(`/doctor/patient-profile/${patient.uhid}`)
                      }
                    >
                      View Profile
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPatients.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No patients found matching your search.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default MyPatients;