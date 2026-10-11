import { useState, useEffect, useCallback } from "react";
import SelectMenu from '../../components/shared/SelectMenu';
import Pagination from '../../components/shared/Pagination';
import { useNavigate } from "react-router-dom";
import Card from "../../components/shared/Card";
import PageHeader from "../../components/shared/PageHeader";
import Button from "../../components/shared/Button";
import patientService from "../../services/patientService";

const LIMIT = 20;

// basePath keeps navigation inside the current portal — the doctor portal by
// default, or "/radiology" when this same page is mounted in the Radiology suite.
const MyPatients = ({ basePath = "/doctor" }) => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm]   = useState("");
  const [filterRisk, setFilterRisk]   = useState("all");
  const [page, setPage]               = useState(1);
  const [patients, setPatients]       = useState([]);
  const [pagination, setPagination]   = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading]         = useState(true);

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

  const { total, totalPages } = pagination;
  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to   = Math.min(page * LIMIT, total);

  return (
    <div>
      <PageHeader
        title="My Patients"
      />

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
            <SelectMenu
              value={filterRisk}
              onChange={e => setFilterRisk(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
            >
              <option value="all">All Patients</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </SelectMenu>
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
                    <Button variant="outline" className="w-full text-xs py-1.5" onClick={() => navigate(`${basePath}/patient-profile/${patient.uhid}`)}>
                      View Profile
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Table — desktop */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full">
                <thead className="ui-thead">
                  <tr>
                    <th className="px-6 py-3 text-left">UHID</th>
                    <th className="px-6 py-3 text-left">Name</th>
                    <th className="px-6 py-3 text-left">Age/Gender</th>
                    <th className="px-6 py-3 text-left">Next Visit</th>
                    <th className="px-6 py-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {patients.map((patient) => (
                    <tr key={patient.id} className="ui-hover transition">
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
                        <Button variant="outline" className="text-xs py-1 px-3" onClick={() => navigate(`${basePath}/patient-profile/${patient.uhid}`)}>
                          View Profile
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage}
              summary={total === 0 ? "No results" : `Showing ${from}–${to} of ${total} patients`} />
          </>
        )}
      </Card>
    </div>
  );
};

export default MyPatients;
