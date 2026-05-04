import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import patientService from "../../services/patientService";

const LIMIT = 20;

const getRiskColor = (risk) => {
  switch (risk) {
    case "High":   return "bg-red-100 text-red-700 border-red-300";
    case "Medium": return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case "Low":    return "bg-green-100 text-green-700 border-green-300";
    default:       return "bg-gray-100 text-gray-700 border-gray-300";
  }
};

const getHbA1cColor = (value) => {
  const n = parseFloat(value);
  if (n < 7) return "text-green-600 font-semibold";
  if (n < 8) return "text-yellow-600 font-semibold";
  return "text-red-600 font-semibold";
};

const MyPatients = () => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm]   = useState("");
  const [filterRisk, setFilterRisk]   = useState("all");
  const [page, setPage]               = useState(1);
  const [patients, setPatients]       = useState([]);
  const [pagination, setPagination]   = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading]         = useState(true);
  const [stats, setStats]             = useState({ total: 0, lowRisk: 0, mediumRisk: 0, highRisk: 0 });

  // Debounced search term — waits 400ms after user stops typing before hitting API
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 whenever search or filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterRisk]);

  // Fetch patients from API whenever page, search, or filter changes
  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterRisk !== "all") params.riskLevel = filterRisk.charAt(0).toUpperCase() + filterRisk.slice(1);

      const res = await patientService.getAll(params);
      if (res.success) {
        setPatients(res.data.patients || []);
        setPagination(res.data.pagination || { total: 0, totalPages: 1 });
      }
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filterRisk]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Fetch stats once on mount
  useEffect(() => {
    patientService.getStats().then(res => {
      if (res.success) {
        const d = res.data;
        setStats({
          total:      d.total      ?? 0,
          lowRisk:    d.lowRisk    ?? 0,
          mediumRisk: d.mediumRisk ?? 0,
          highRisk:   d.highRisk   ?? 0,
        });
      }
    }).catch(() => {});
  }, []);

  const { total, totalPages } = pagination;
  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to   = Math.min(page * LIMIT, total);

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">My Patients</h2>
        <Button onClick={() => navigate("/doctor/dashboard")}>Back to Dashboard</Button>
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search Patients</label>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by name, UHID, or phone..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Risk Level</label>
            <select
              value={filterRisk}
              onChange={e => setFilterRisk(e.target.value)}
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
      <Card title={loading ? "Loading..." : `Patient List (${total})`}>
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading patients...</div>
        ) : patients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No patients found matching your search.</p>
          </div>
        ) : (
          <>
            {/* Card list — mobile & tablet */}
            <div className="xl:hidden space-y-3">
              {patients.map((patient) => (
                <div key={patient.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 text-sm truncate">{patient.name}</p>
                      <p className="text-xs text-gray-500">{patient.phone}</p>
                    </div>
                  </div>
                  <div className="bg-white px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">UHID</p>
                      <p className="text-sm font-semibold text-primary">{patient.uhid}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Age / Gender</p>
                      <p className="text-sm text-gray-700">{patient.age} yrs · {patient.gender}</p>
                    </div>
                    {patient.nextVisit && (
                      <div className="col-span-2">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Next Visit</p>
                        <p className="text-sm font-medium text-gray-800">
                          {new Date(patient.nextVisit).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        {patient.nextVisitBooked && (
                          <p className="text-xs text-gray-400">
                            Booked {new Date(patient.nextVisitBooked).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <Button variant="outline" className="w-full text-xs py-1.5" onClick={() => navigate(`/doctor/patient-profile/${patient.uhid}`)}>
                      View Profile
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Table — desktop */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">UHID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Age/Gender</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Next Visit</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {patients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-medium text-primary text-sm">{patient.uhid}</td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-800">{patient.name}</p>
                        <p className="text-xs text-gray-500">{patient.phone}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{patient.age} yrs · {patient.gender}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {patient.nextVisit
                          ? <>
                              <p className="font-medium text-gray-800">
                                {new Date(patient.nextVisit).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                              {patient.nextVisitBooked && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  Booked {new Date(patient.nextVisitBooked).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              )}
                            </>
                          : <span className="text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-6 py-4">
                        <Button variant="outline" className="text-xs py-1 px-3" onClick={() => navigate(`/doctor/patient-profile/${patient.uhid}`)}>
                          View Profile
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                {total === 0 ? "No results" : `Showing ${from}–${to} of ${total} patients`}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .map((p, idx, arr) => (
                    <div key={p} className="flex items-center gap-1">
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-2 text-gray-400">…</span>
                      )}
                      <button
                        onClick={() => setPage(p)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${
                          p === page ? "bg-primary text-white border-primary" : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    </div>
                  ))
                }
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default MyPatients;
