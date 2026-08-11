import { useState } from 'react';
import Card from '../../components/shared/Card';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import Button from '../../components/shared/Button';
import StatusBadge from '../../components/shared/StatusBadge';
import { LAB_STATUS_TONES, PRIORITY_TONES, SEVERITY_SOLID_TONES } from '../../utils/statusStyles';
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

  return (
    <div>
      <PageHeader
        title="Lab Dashboard"
        subtitle="Welcome back, Lab Technician"
        actions={
          <>
            <Button onClick={() => navigate('/lab/enter-results')}>➕ Enter Results</Button>
            <Button variant="outline" onClick={() => navigate('/lab/pending-tests')}>📋 View Queue</Button>
          </>
        }
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <StatCard title="Pending Tests" value={dashboardData.stats.pendingTests} gradient="from-yellow-500 to-yellow-600" sub="Awaiting processing" />
        <StatCard title="Completed Today" value={dashboardData.stats.completedToday} gradient="from-green-500 to-green-600" sub="Tests processed" />
        <StatCard title="Critical Results" value={dashboardData.stats.criticalResults} gradient="from-red-500 to-red-600" sub="Need attention" />
        <StatCard title="This Week" value={dashboardData.stats.totalThisWeek} gradient="from-blue-500 to-blue-600" sub="Total tests" />
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
                      <StatusBadge solid tone={SEVERITY_SOLID_TONES[alert.severity] || 'warning'}>
                        {alert.severity}
                      </StatusBadge>
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
                    <StatusBadge tone={LAB_STATUS_TONES[test.status]}>
                      {test.status}
                    </StatusBadge>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4">
                    <StatusBadge tone={PRIORITY_TONES[test.priority]}>
                      {test.priority}
                    </StatusBadge>
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