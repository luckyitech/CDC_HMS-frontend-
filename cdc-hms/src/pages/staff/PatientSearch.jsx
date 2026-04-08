import { useState } from "react";
import toast from "react-hot-toast";
import {
  Search,
  UserCircle,
  UserPlus,
  AlertCircle,
  X,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import { useQueueContext } from "../../contexts/QueueContext";
import { useNavigate } from "react-router-dom";
import patientService from "../../services/patientService";

const RESULTS_PER_PAGE = 20;

const PatientSearch = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [queuePriority, setQueuePriority] = useState("Normal");
  const [queueReason, setQueueReason] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });

  const { addToQueue, isInQueue } = useQueueContext();
  const navigate = useNavigate();

  const doSearch = async (term, pageNum = 1) => {
    setIsSearching(true);
    try {
      const response = await patientService.getAll({
        search: term,
        page: pageNum,
        limit: RESULTS_PER_PAGE,
      });
      if (response.success) {
        const patients = response.data.patients || response.data || [];
        const pag = response.data.pagination || {};
        setSearchResults(patients);
        setPagination({ total: pag.total || patients.length, totalPages: pag.totalPages || 1 });
        setHasSearched(true);
        setPage(pageNum);

        if (patients.length === 0 && pageNum === 1) {
          toast.error("No patients found", {
            duration: 3000,
            icon: <Search className="w-5 h-5" />,
            style: { background: "#FEE2E2", color: "#991B1B", fontWeight: "bold", padding: "16px" },
          });
        } else if (pageNum === 1) {
          toast.success(`Found ${pag.total || patients.length} patient${(pag.total || patients.length) !== 1 ? "s" : ""}`, {
            duration: 2000,
            icon: <CheckCircle2 className="w-5 h-5" />,
            style: { background: "#D1FAE5", color: "#065F46", fontWeight: "bold", padding: "16px" },
          });
        }
      }
    } catch {
      toast.error("Search failed. Please try again.", {
        duration: 3000,
        style: { background: "#FEE2E2", color: "#991B1B", fontWeight: "bold", padding: "16px" },
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      toast.error("Please enter a search term", {
        duration: 3000,
        icon: <AlertCircle className="w-5 h-5" />,
        style: { background: "#FEE2E2", color: "#991B1B", fontWeight: "bold", padding: "16px" },
      });
      return;
    }
    doSearch(searchTerm, 1);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const handlePageChange = (newPage) => {
    doSearch(searchTerm, newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddToQueueClick = (patient) => {
    setSelectedPatient(patient);
    setQueuePriority("Normal");
    setQueueReason("");
    setShowQueueModal(true);
  };

  const handleConfirmAddToQueue = async () => {
    if (selectedPatient) {
      const result = await addToQueue(selectedPatient, queuePriority, queueReason);
      if (result.success) {
        toast.success(`${selectedPatient.name} added to queue!`, {
          duration: 3000,
          icon: <CheckCircle2 className="w-5 h-5" />,
          style: { background: "#D1FAE5", color: "#065F46", fontWeight: "bold", padding: "16px" },
        });
        setShowQueueModal(false);
        setSelectedPatient(null);
      } else {
        toast.error(result.message, {
          duration: 3000,
          icon: <AlertCircle className="w-5 h-5" />,
          style: { background: "#FEE2E2", color: "#991B1B", fontWeight: "bold", padding: "16px" },
        });
      }
    }
  };

  const from = (page - 1) * RESULTS_PER_PAGE + 1;
  const to = Math.min(page * RESULTS_PER_PAGE, pagination.total);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Search className="w-8 h-8 text-primary" />
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Patient Search</h2>
      </div>

      {/* Search Input */}
      <Card title="Search Patient">
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by name, UHID, phone, email, or ID/passport number..."
            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary text-base"
          />
          <Button onClick={handleSearch} className="sm:w-auto flex items-center justify-center" disabled={isSearching}>
            {isSearching
              ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              : <Search className="w-4 h-4 mr-2" />}
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </div>
      </Card>

      {/* Results */}
      {hasSearched && (
        <Card
          title={
            searchResults.length > 0
              ? `Search Results — Showing ${from}–${to} of ${pagination.total} patients`
              : "Search Results (0)"
          }
          className="mt-6"
        >
          {searchResults.length > 0 ? (
            <>
              {/* Mobile: card list */}
              <div className="md:hidden space-y-3">
                {searchResults.map((patient) => (
                  <div key={patient.id} className="p-4 border border-gray-200 rounded-lg bg-white">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-bold text-gray-800">{patient.name}</p>
                        <p className="text-xs text-primary font-semibold">{patient.uhid}</p>
                        {patient.email && <p className="text-xs text-gray-500 mt-0.5">{patient.email}</p>}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                        patient.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                      }`}>{patient.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 mb-3">
                      <span><span className="font-semibold">Age:</span> {patient.age} yrs · {patient.gender}</span>
                      <span><span className="font-semibold">Phone:</span> {patient.phone || "-"}</span>
                      <span><span className="font-semibold">Type:</span> {patient.diagnosis || "-"}</span>
                      <span><span className="font-semibold">ID:</span> {patient.idNumber || "-"}</span>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => navigate(`/staff/patient-profile/${patient.uhid}`)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold border-2 border-primary text-primary rounded-lg hover:bg-blue-50 transition"
                      >
                        <UserCircle className="w-4 h-4" /> View
                      </button>
                      {isInQueue(patient.uhid) ? (
                        <button disabled className="flex-1 flex items-center justify-center py-2.5 text-sm font-semibold bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed">
                          In Queue
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddToQueueClick(patient)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-blue-700 transition"
                        >
                          <UserPlus className="w-4 h-4" /> Add to Queue
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">UHID</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Name</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Age/Gender</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Phone</th>
                      <th className="hidden lg:table-cell px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Diagnosis</th>
                      <th className="hidden xl:table-cell px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">ID / Passport</th>
                      <th className="hidden xl:table-cell px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {searchResults.map((patient) => (
                      <tr key={patient.id} className="hover:bg-gray-50">
                        <td className="px-4 lg:px-6 py-4 font-medium text-primary text-sm">{patient.uhid}</td>
                        <td className="px-4 lg:px-6 py-4 text-sm">
                          <p className="font-semibold">{patient.name}</p>
                          {patient.email && <p className="text-xs text-gray-500 mt-0.5">{patient.email}</p>}
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm">{patient.age} yrs &middot; {patient.gender}</td>
                        <td className="px-4 lg:px-6 py-4 text-sm">{patient.phone}</td>
                        <td className="hidden lg:table-cell px-4 lg:px-6 py-4">
                          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">{patient.diagnosis}</span>
                        </td>
                        <td className="hidden xl:table-cell px-4 lg:px-6 py-4 text-sm text-gray-600">{patient.idNumber || "-"}</td>
                        <td className="hidden xl:table-cell px-4 lg:px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            patient.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                          }`}>{patient.status}</span>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex gap-2">
                            <Button variant="outline" className="text-xs py-1 px-3"
                              onClick={() => navigate(`/staff/patient-profile/${patient.uhid}`)}>
                              <UserCircle className="w-3 h-3 mr-1" /> View
                            </Button>
                            {isInQueue(patient.uhid) ? (
                              <Button variant="secondary" className="text-xs py-1 px-3" disabled>In Queue</Button>
                            ) : (
                              <Button variant="primary" className="text-xs py-1 px-3"
                                onClick={() => handleAddToQueueClick(patient)}>
                                <UserPlus className="w-3 h-3 mr-1" /> Add
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Showing {from}–{to} of {pagination.total} patients
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1 || isSearching}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-semibold text-gray-700">
                      Page {page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === pagination.totalPages || isSearching}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <Search className="w-16 h-16 text-gray-400" />
              </div>
              <p className="text-xl font-semibold text-gray-800 mb-2">No patients found</p>
              <p className="text-gray-600">Try searching with a different term</p>
            </div>
          )}
        </Card>
      )}

      {!hasSearched && (
        <Card className="mt-6">
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <UserCircle className="w-20 h-20 text-gray-400" />
            </div>
            <p className="text-xl font-semibold text-gray-800 mb-2">Search for a patient</p>
            <p className="text-gray-600">
              Enter name, UHID, phone, email, or ID/passport number to find patient records
            </p>
          </div>
        </Card>
      )}

      {/* Add to Queue Modal */}
      {showQueueModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Add to Queue
              </h3>
              <button
                onClick={() => { setShowQueueModal(false); setSelectedPatient(null); }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="font-semibold text-gray-800">{selectedPatient.name}</p>
              <p className="text-sm text-gray-600">UHID: {selectedPatient.uhid}</p>
              <p className="text-sm text-gray-600">{selectedPatient.age} yrs &middot; {selectedPatient.gender}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input type="radio" name="priority" value="Normal"
                    checked={queuePriority === "Normal"} onChange={(e) => setQueuePriority(e.target.value)} className="mr-2" />
                  <span className="text-sm">Normal</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input type="radio" name="priority" value="Urgent"
                    checked={queuePriority === "Urgent"} onChange={(e) => setQueuePriority(e.target.value)} className="mr-2" />
                  <span className="text-sm text-red-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Urgent
                  </span>
                </label>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for Visit</label>
              <input
                type="text"
                value={queueReason}
                onChange={(e) => setQueueReason(e.target.value)}
                placeholder="e.g., Routine checkup, Follow-up, Emergency"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1"
                onClick={() => { setShowQueueModal(false); setSelectedPatient(null); }}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1" onClick={handleConfirmAddToQueue}>
                <UserPlus className="w-4 h-4 mr-2" /> Add to Queue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientSearch;
