import { useState } from 'react';
import toast from 'react-hot-toast';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import { useNavigate } from 'react-router-dom';

const GenerateReports = () => {
  const navigate = useNavigate();
  const [selectedPatient, setSelectedPatient] = useState('');
  const [reportType, setReportType] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [includeGraphs, setIncludeGraphs] = useState(true);
  const [includeHistory, setIncludeHistory] = useState(true);

  // Mock patients with test history
  const [patients] = useState([
    { id: 1, name: 'John Doe', uhid: 'CDC001', testsCount: 12 },
    { id: 2, name: 'Mary Johnson', uhid: 'CDC005', testsCount: 8 },
    { id: 3, name: 'Ali Hassan', uhid: 'CDC003', testsCount: 15 },
    { id: 4, name: 'Grace Wanjiru', uhid: 'CDC007', testsCount: 6 },
  ]);

  const reportTypes = [
    { 
      value: 'quest-labs', 
      label: 'Quest Diagnostics Report', 
      icon: '🔬',
      description: 'Standard laboratory report format with all test results'
    },
    { 
      value: 'medical-summary', 
      label: 'Medical Summary Report', 
      icon: '📋',
      description: 'Comprehensive medical summary including trends and analysis'
    },
    { 
      value: 'single-test', 
      label: 'Single Test Report', 
      icon: '📄',
      description: 'Individual test result report'
    },
    { 
      value: 'comparative', 
      label: 'Comparative Analysis', 
      icon: '📊',
      description: 'Compare test results over time'
    },
  ];

  const handleGenerate = () => {
    if (!selectedPatient) {
      toast.error('Please select a patient', {
        duration: 3000,
        position: 'top-right',
        icon: '❌',
        style: {
          background: '#EF4444',
          color: '#FFFFFF',
          fontWeight: 'bold',
          padding: '16px',
        },
      });
      return;
    }
    if (!reportType) {
      toast.error('Please select report type', {
        duration: 3000,
        position: 'top-right',
        icon: '❌',
        style: {
          background: '#EF4444',
          color: '#FFFFFF',
          fontWeight: 'bold',
          padding: '16px',
        },
      });
      return;
    }
    if (!dateRange.from || !dateRange.to) {
      toast.error('Please select date range', {
        duration: 3000,
        position: 'top-right',
        icon: '❌',
        style: {
          background: '#EF4444',
          color: '#FFFFFF',
          fontWeight: 'bold',
          padding: '16px',
        },
      });
      return;
    }

    const patient = patients.find(p => p.id === parseInt(selectedPatient));
    const report = reportTypes.find(r => r.value === reportType);

    toast.success(
      `Report Generated Successfully!\n\nPatient: ${patient.name}\nReport Type: ${report.label}\nDate Range: ${dateRange.from} to ${dateRange.to}`,
      {
        duration: 4000,
        position: 'top-right',
        icon: '✅',
        style: {
          background: '#10B981',
          color: '#FFFFFF',
          fontWeight: 'bold',
          padding: '16px',
          whiteSpace: 'pre-line',
        },
      }
    );
  };

  // Mock recently generated reports
  const [recentReports] = useState([
    {
      id: 1,
      patient: 'John Doe',
      uhid: 'CDC001',
      type: 'Quest Diagnostics Report',
      generatedDate: '2024-12-09',
      generatedBy: 'Tech. Sarah Mwangi',
      status: 'Ready',
    },
    {
      id: 2,
      patient: 'Mary Johnson',
      uhid: 'CDC005',
      type: 'Medical Summary Report',
      generatedDate: '2024-12-08',
      generatedBy: 'Tech. John Kamau',
      status: 'Ready',
    },
    {
      id: 3,
      patient: 'Ali Hassan',
      uhid: 'CDC003',
      type: 'Comparative Analysis',
      generatedDate: '2024-12-08',
      generatedBy: 'Tech. Sarah Mwangi',
      status: 'Ready',
    },
  ]);

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Generate Reports</h2>
        <Button variant="outline" onClick={() => navigate('/lab/dashboard')}>
          ← Back to Dashboard
        </Button>
      </div>

      {/* Report Generation Form */}
      <Card title="📄 Create New Report">
        <div className="space-y-6">
          {/* Select Patient */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select Patient
            </label>
            <select
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary text-base"
            >
              <option value="">-- Select Patient --</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name} ({patient.uhid}) - {patient.testsCount} tests
                </option>
              ))}
            </select>
          </div>

          {/* Report Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select Report Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {reportTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setReportType(type.value)}
                  className={`p-4 border-2 rounded-lg text-left transition hover:shadow-md ${
                    reportType === type.value
                      ? 'border-primary bg-blue-50'
                      : 'border-gray-200 hover:border-primary'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{type.icon}</span>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">{type.label}</p>
                      <p className="text-xs text-gray-600 mt-1">{type.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Report Options */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">Report Options</p>
            
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <input
                type="checkbox"
                checked={includeGraphs}
                onChange={(e) => setIncludeGraphs(e.target.checked)}
                className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <div>
                <p className="font-semibold text-gray-800">Include Graphs & Charts</p>
                <p className="text-xs text-gray-600">Visual representation of test trends</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <input
                type="checkbox"
                checked={includeHistory}
                onChange={(e) => setIncludeHistory(e.target.checked)}
                className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <div>
                <p className="font-semibold text-gray-800">Include Test History</p>
                <p className="text-xs text-gray-600">Previous test results for comparison</p>
              </div>
            </label>
          </div>

          {/* Generate Button */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleGenerate}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              ✓ Generate Report
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedPatient('');
                setReportType('');
                setDateRange({ from: '', to: '' });
                setIncludeGraphs(true);
                setIncludeHistory(true);
              }}
              className="flex-1"
            >
              🔄 Reset
            </Button>
          </div>
        </div>
      </Card>

      {/* Recently Generated Reports */}
      <Card title="📋 Recently Generated Reports" className="mt-6">
        <div className="space-y-3">
          {recentReports.map((report) => (
            <div
              key={report.id}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-lg">{report.patient}</p>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <p><strong>UHID:</strong> {report.uhid}</p>
                    <p><strong>Report Type:</strong> {report.type}</p>
                    <p><strong>Generated:</strong> {new Date(report.generatedDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })} by {report.generatedBy}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="text-sm py-2 px-4">
                    👁️ View
                  </Button>
                  <Button variant="outline" className="text-sm py-2 px-4">
                    📥 Download
                  </Button>
                  <Button variant="outline" className="text-sm py-2 px-4">
                    📧 Email
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Report Templates Info */}
      <Card title="📚 Report Templates Guide" className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
            <p className="font-bold text-gray-800 mb-2">🔬 Quest Diagnostics Report</p>
            <p className="text-gray-600">
              Standard format including patient demographics, test results with reference ranges, 
              and quality control information.
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
            <p className="font-bold text-gray-800 mb-2">📋 Medical Summary Report</p>
            <p className="text-gray-600">
              Comprehensive summary with trend analysis, recommendations, and historical comparison 
              of test results.
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
            <p className="font-bold text-gray-800 mb-2">📄 Single Test Report</p>
            <p className="text-gray-600">
              Focused report for a specific test type, useful for quick review or insurance purposes.
            </p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
            <p className="font-bold text-gray-800 mb-2">📊 Comparative Analysis</p>
            <p className="text-gray-600">
              Side-by-side comparison of test results over time with graphical representation of trends.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default GenerateReports;