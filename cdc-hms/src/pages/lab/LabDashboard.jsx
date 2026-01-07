import { useState } from 'react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import { useNavigate } from 'react-router-dom';

const LabDashboard = () => {
  const navigate = useNavigate();

  // Mock dashboard data
  const [dashboardData] = useState({
    stats: {
      pendingTests: 12,
      completedToday: 8,
      criticalResults: 3,
      totalThisWeek: 45,
    },
    recentTests: [
      { id: 1, patient: 'John Doe', uhid: 'CDC001', test: 'HbA1c', status: 'Pending', priority: 'Routine', orderedBy: 'Dr. Ahmed Hassan', orderDate: '2024-12-09' },
      { id: 2, patient: 'Mary Johnson', uhid: 'CDC005', test: 'Fasting Glucose', status: 'In Progress', priority: 'Urgent', orderedBy: 'Dr. Ahmed Hassan', orderDate: '2024-12-09' },
      { id: 3, patient: 'Ali Hassan', uhid: 'CDC003', test: 'Lipid Profile', status: 'Completed', priority: 'Routine', orderedBy: 'Dr. Sarah Kamau', orderDate: '2024-12-08' },
      { id: 4, patient: 'Grace Wanjiru', uhid: 'CDC007', test: 'Kidney Function', status: 'Pending', priority: 'Urgent', orderedBy: 'Dr. Ahmed Hassan', orderDate: '2024-12-09' },
      { id: 5, patient: 'Peter Ochieng', uhid: 'CDC009', test: 'Liver Function', status: 'Completed', priority: 'Routine', orderedBy: 'Dr. James Omondi', orderDate: '2024-12-08' },
    ],
    criticalAlerts: [
      { id: 1, patient: 'John Doe', uhid: 'CDC001', test: 'HbA1c', result: '10.2%', normalRange: '<7%', severity: 'High' },
      { id: 2, patient: 'Mary Johnson', uhid: 'CDC005', test: 'Fasting Glucose', result: '245 mg/dL', normalRange: '70-100 mg/dL', severity: 'Critical' },
      { id: 3, patient: 'Grace Wanjiru', uhid: 'CDC007', test: 'Creatinine', result: '3.5 mg/dL', normalRange: '0.6-1.2 mg/dL', severity: 'High' },
    ],
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Completed': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-700 border-red-300';
      case 'Routine': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical': return 'bg-red-500 text-white';
      case 'High': return 'bg-orange-500 text-white';
      default: return 'bg-yellow-500 text-white';
    }
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Lab Dashboard</h2>
          <p className="text-gray-600 mt-1">Welcome back, Lab Technician</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate('/lab/enter-results')}>
            ➕ Enter Results
          </Button>
          <Button variant="outline" onClick={() => navigate('/lab/pending-tests')}>
            📋 View Queue
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Pending Tests</p>
          <p className="text-4xl font-bold mt-2">{dashboardData.stats.pendingTests}</p>
          <p className="text-xs opacity-75 mt-1">Awaiting processing</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Completed Today</p>
          <p className="text-4xl font-bold mt-2">{dashboardData.stats.completedToday}</p>
          <p className="text-xs opacity-75 mt-1">Tests processed</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Critical Results</p>
          <p className="text-4xl font-bold mt-2">{dashboardData.stats.criticalResults}</p>
          <p className="text-xs opacity-75 mt-1">Need attention</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">This Week</p>
          <p className="text-4xl font-bold mt-2">{dashboardData.stats.totalThisWeek}</p>
          <p className="text-xs opacity-75 mt-1">Total tests</p>
        </div>
      </div>

      {/* Critical Alerts */}
      {dashboardData.criticalAlerts.length > 0 && (
        <Card title="🚨 Critical Results - Immediate Attention Required" className="mb-6">
          <div className="space-y-3">
            {dashboardData.criticalAlerts.map((alert) => (
              <div key={alert.id} className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <p className="font-bold text-gray-800">{alert.patient} ({alert.uhid})</p>
                    </div>
                    <div className="text-sm text-gray-700">
                      <p><strong>Test:</strong> {alert.test}</p>
                      <p><strong>Result:</strong> <span className="text-red-600 font-bold">{alert.result}</span></p>
                      <p><strong>Normal Range:</strong> {alert.normalRange}</p>
                    </div>
                  </div>
                  <Button variant="outline" className="text-sm whitespace-nowrap">
                    Notify Doctor
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={() => navigate('/lab/critical-alerts')}>
              View All Critical Results →
            </Button>
          </div>
        </Card>
      )}

      {/* Recent Tests */}
      <Card title="🔬 Recent Test Orders">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Patient</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">UHID</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Test</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Priority</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Ordered By</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {dashboardData.recentTests.map((test) => (
                <tr key={test.id} className="hover:bg-gray-50">
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium text-gray-800">
                    {test.patient}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-primary font-semibold">
                    {test.uhid}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm">{test.test}</td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(test.status)}`}>
                      {test.status}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(test.priority)}`}>
                      {test.priority}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm">{test.orderedBy}</td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm">
                    {new Date(test.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4">
                    <Button 
                      variant="outline" 
                      className="text-xs py-1 px-3"
                      onClick={() => navigate('/lab/enter-results')}
                    >
                      {test.status === 'Completed' ? 'View' : 'Process'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-center">
          <Button variant="outline" onClick={() => navigate('/lab/test-history')}>
            View All Tests →
          </Button>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <button
          onClick={() => navigate('/lab/pending-tests')}
          className="bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 rounded-xl shadow-lg p-6 text-white text-left transition-all hover:scale-105"
        >
          <div className="text-4xl mb-3">📋</div>
          <p className="font-bold text-lg">Pending Tests</p>
          <p className="text-sm opacity-90 mt-1">{dashboardData.stats.pendingTests} tests waiting</p>
        </button>

        <button
          onClick={() => navigate('/lab/enter-results')}
          className="bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl shadow-lg p-6 text-white text-left transition-all hover:scale-105"
        >
          <div className="text-4xl mb-3">✍️</div>
          <p className="font-bold text-lg">Enter Results</p>
          <p className="text-sm opacity-90 mt-1">Record test values</p>
        </button>

        <button
          onClick={() => navigate('/lab/generate-reports')}
          className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl shadow-lg p-6 text-white text-left transition-all hover:scale-105"
        >
          <div className="text-4xl mb-3">📄</div>
          <p className="font-bold text-lg">Generate Reports</p>
          <p className="text-sm opacity-90 mt-1">Create lab reports</p>
        </button>

        <button
          onClick={() => navigate('/lab/critical-alerts')}
          className="bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl shadow-lg p-6 text-white text-left transition-all hover:scale-105"
        >
          <div className="text-4xl mb-3">🚨</div>
          <p className="font-bold text-lg">Critical Alerts</p>
          <p className="text-sm opacity-90 mt-1">{dashboardData.stats.criticalResults} results flagged</p>
        </button>
      </div>
    </div>
  );
};

export default LabDashboard;