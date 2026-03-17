import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import { usePatientContext } from "../../contexts/PatientContext"; // IMPORT CONTEXT!

const ITEMS_PER_PAGE = 15;

const MyPatients = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // USE CONTEXT INSTEAD OF MOCK DATA!
  const { patients, getPatientsByRiskLevel } = usePatientContext();

  // Filter patients based on search and risk level
  const filteredPatients = patients.filter((patient) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      (patient.name || '').toLowerCase().includes(search) ||
      (patient.uhid || '').toLowerCase().includes(search) ||
      (patient.phone || '').includes(searchTerm);

    const matchesFilter =
      filterStatus === "all" ||
      (patient.riskLevel || '').toLowerCase() === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE);
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 lg:p-6 text-white">
          <p className="text-xs lg:text-sm opacity-90">Total Patients</p>
          <p className="text-3xl lg:text-4xl font-bold mt-1 lg:mt-2">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 lg:p-6 text-white">
          <p className="text-xs lg:text-sm opacity-90">Low Risk</p>
          <p className="text-3xl lg:text-4xl font-bold mt-1 lg:mt-2">{stats.lowRisk}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-4 lg:p-6 text-white">
          <p className="text-xs lg:text-sm opacity-90">Medium Risk</p>
          <p className="text-3xl lg:text-4xl font-bold mt-1 lg:mt-2">{stats.mediumRisk}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-4 lg:p-6 text-white">
          <p className="text-xs lg:text-sm opacity-90">High Risk</p>
          <p className="text-3xl lg:text-4xl font-bold mt-1 lg:mt-2">{stats.highRisk}</p>
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
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
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
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
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
        {filteredPatients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No patients found matching your search.</p>
          </div>
        ) : (
          <>
            {/* Card list — mobile & tablet (< xl) */}
            <div className="xl:hidden space-y-3">
              {paginatedPatients.map((patient) => (
                <div key={patient.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 text-sm truncate">{patient.name}</p>
                      <p className="text-xs text-gray-500">{patient.phone}</p>
                    </div>
                    <span className={`flex-shrink-0 ml-2 px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${getRiskColor(patient.riskLevel)}`}>
                      {patient.riskLevel}
                    </span>
                  </div>
                  {/* Body */}
                  <div className="bg-white px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">UHID</p>
                      <p className="text-sm font-semibold text-primary">{patient.uhid}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Age / Gender</p>
                      <p className="text-sm text-gray-700">{patient.age} yrs · {patient.gender}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Diabetes Type</p>
                      <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">{patient.diabetesType || '—'}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">HbA1c</p>
                      <p className={`text-sm ${getHbA1cColor(patient.hba1c)}`}>{patient.hba1c || '—'}</p>
                    </div>
                    {patient.nextVisit && (
                      <div className="col-span-2">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Next Visit</p>
                        <p className="text-sm text-gray-600">{patient.nextVisit}</p>
                      </div>
                    )}
                  </div>
                  {/* Footer */}
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <Button
                      variant="outline"
                      className="w-full text-xs py-1.5"
                      onClick={() => navigate(`/doctor/patient-profile/${patient.uhid}`)}
                    >
                      View Profile
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Table — desktop only (xl+) */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">UHID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Age/Gender</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Diabetes Type</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">HbA1c</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Risk Level</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Next Visit</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-medium text-primary text-sm">{patient.uhid}</td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-800">{patient.name}</p>
                        <p className="text-xs text-gray-500">{patient.phone}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{patient.age} yrs · {patient.gender}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">{patient.diabetesType}</span>
                      </td>
                      <td className={`px-6 py-4 text-sm ${getHbA1cColor(patient.hba1c)}`}>{patient.hba1c}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${getRiskColor(patient.riskLevel)}`}>
                          {patient.riskLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{patient.nextVisit}</td>
                      <td className="px-6 py-4">
                        <Button
                          variant="outline"
                          className="text-xs py-1 px-3"
                          onClick={() => navigate(`/doctor/patient-profile/${patient.uhid}`)}
                        >
                          View Profile
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredPatients.length)} of {filteredPatients.length} patients
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${
                        page === currentPage
                          ? "bg-primary text-white border-primary"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default MyPatients;