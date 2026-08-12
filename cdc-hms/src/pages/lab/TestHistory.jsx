import { useState } from "react";
import Card from "../../components/shared/Card";
import PageHeader from "../../components/shared/PageHeader";
import StatCard from "../../components/shared/StatCard";
import Button from "../../components/shared/Button";
import StatusBadge from "../../components/shared/StatusBadge";
import { LAB_RESULT_TONES } from "../../utils/statusStyles";
import { useNavigate } from "react-router-dom";
import { useLabContext } from "../../contexts/LabContext";
import LabTestDetailsModal from "../../components/lab/LabTestDetailsModal";
import LabTestPrint from "../../components/lab/LabTestPrint";

const TestHistory = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTest, setFilterTest] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("all");
  const [selectedTest, setSelectedTest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Mock test history data
  const { labTests } = useLabContext();
  const testHistory = labTests;

  // Filter logic
  const filteredTests = testHistory.filter((test) => {
    const matchesSearch =
      test.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.uhid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.testType?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTest = filterTest === "all" || test.testType === filterTest;
    const matchesStatus =
      filterStatus === "all" || test.interpretation === filterStatus;

    let matchesDate = true;
    if (filterDate !== "all") {
      const testDate = new Date(test.completedDate);
      const today = new Date();
      const daysDiff = Math.floor((today - testDate) / (1000 * 60 * 60 * 24));

      if (filterDate === "today") matchesDate = daysDiff === 0;
      if (filterDate === "week") matchesDate = daysDiff <= 7;
      if (filterDate === "month") matchesDate = daysDiff <= 30;
    }

    return matchesSearch && matchesTest && matchesStatus && matchesDate;
  });

  // Get unique test types
  const testTypes = ["all", ...new Set(testHistory.map((t) => t.testType))];

  const handleView = (test) => {
    setSelectedTest(test);
    setShowDetailsModal(true);
  };

  const handlePrint = (test) => {
    setSelectedTest(test);
    setShowPrintModal(true);
  };

  return (
    <div>
      <PageHeader
        title="Test History"
        actions={
          <Button variant="outline" onClick={() => navigate("/lab/dashboard")}>
            ← Back to Dashboard
          </Button>
        }
      />

      {/* Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <StatCard title="Total Tests" value={testHistory.length} gradient="from-blue-500 to-blue-600" />
        <StatCard title="Normal" value={testHistory.filter((t) => t.interpretation === "Normal").length} gradient="from-green-500 to-green-600" />
        <StatCard title="Abnormal" value={testHistory.filter((t) => t.interpretation === "Abnormal").length} gradient="from-yellow-500 to-yellow-600" />
        <StatCard title="Critical" value={testHistory.filter((t) => t.interpretation === "Critical").length} gradient="from-red-500 to-red-600" />
      </div>

      {/* Search and Filters */}
      <Card title="🔍 Search & Filter">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Name, UHID, Test..."
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          {/* Filter by Test */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Test Type
            </label>
            <select
              value={filterTest}
              onChange={(e) => setFilterTest(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            >
              {testTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "all" ? "All Tests" : type}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Status */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="all">All Status</option>
              <option value="Normal">Normal</option>
              <option value="Abnormal">Abnormal</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          {/* Filter by Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Date Range
            </label>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Showing <strong>{filteredTests.length}</strong> of{" "}
          <strong>{testHistory.length}</strong> tests
        </div>
      </Card>

      {/* Test History Table */}
      <Card title="📋 Test Records" className="mt-6">
        {filteredTests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-6xl mb-4">🔍</p>
            <p className="text-xl font-semibold text-gray-800 mb-2">
              No tests found
            </p>
            <p className="text-gray-600">
              Try adjusting your search or filter criteria
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Patient
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Test
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Result
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Status
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Date
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Completed By
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTests.map((test) => (
                  <tr key={test.id} className="hover:bg-blue-50">
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <p className="text-sm font-semibold text-gray-800">
                        {test.patientName}
                      </p>
                      <p className="text-xs text-primary font-semibold">
                        {test.uhid}
                      </p>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium">
                      {test.testType}
                    </td>
                    {/* <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium">
                      {test.test}
                    </td> */}
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <p className="text-sm font-bold text-gray-800">
                        {Object.values(test.results).join(", ")}
                      </p>
                      <p className="text-xs text-gray-500">
                        Range: {test.normalRange}
                      </p>
                    </td>

                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <StatusBadge tone={LAB_RESULT_TONES[test.interpretation]}>
                        {test.interpretation}
                      </StatusBadge>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm">
                      {new Date(test.completedDate).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm">
                      {test.completedBy}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="text-xs py-1 px-3"
                          onClick={() => handleView(test)}
                        >
                          View
                        </Button>
                        <Button
                          variant="outline"
                          className="text-xs py-1 px-3"
                          onClick={() => handlePrint(test)}
                        >
                          Print
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Modals */}
            {showDetailsModal && (
              <LabTestDetailsModal
                test={selectedTest}
                onClose={() => {
                  setShowDetailsModal(false);
                  setSelectedTest(null);
                }}
              />
            )}

            {showPrintModal && (
              <LabTestPrint
                test={selectedTest}
                onClose={() => {
                  setShowPrintModal(false);
                  setSelectedTest(null);
                }}
              />
            )}
          </div>
        )}
      </Card>

      {/* Export Options */}
      <Card title="📤 Export Options" className="mt-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" className="flex-1">
            📄 Export to PDF
          </Button>
          <Button variant="outline" className="flex-1">
            📊 Export to Excel
          </Button>
          <Button variant="outline" className="flex-1">
            📧 Email Report
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default TestHistory;
