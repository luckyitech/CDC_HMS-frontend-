import { useState } from 'react';
import Card from '../../components/shared/Card';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import Button from '../../components/shared/Button';
import StatusBadge from '../../components/shared/StatusBadge';
import { PRIORITY_TONES, LAB_STATUS_TONES } from '../../utils/statusStyles';
import { useNavigate } from 'react-router-dom';

const PendingTests = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterTest, setFilterTest] = useState('all');

  // Mock pending tests data
  const [pendingTests] = useState([
    {
      id: 1,
      patient: 'John Doe',
      uhid: 'CDC001',
      age: 45,
      gender: 'Male',
      test: 'HbA1c',
      sampleType: 'Blood',
      orderedBy: 'Dr. Ahmed Hassan',
      orderDate: '2024-12-09',
      orderTime: '09:30 AM',
      priority: 'Routine',
      status: 'Sample Collected',
      notes: 'Patient is fasting',
    },
    {
      id: 2,
      patient: 'Mary Johnson',
      uhid: 'CDC005',
      age: 61,
      gender: 'Female',
      test: 'Fasting Glucose',
      sampleType: 'Blood',
      orderedBy: 'Dr. Ahmed Hassan',
      orderDate: '2024-12-09',
      orderTime: '08:15 AM',
      priority: 'Urgent',
      status: 'Sample Collected',
      notes: 'Repeat test - previous result was borderline',
    },
    {
      id: 3,
      patient: 'Grace Wanjiru',
      uhid: 'CDC007',
      age: 47,
      gender: 'Female',
      test: 'Kidney Function',
      sampleType: 'Blood',
      orderedBy: 'Dr. Ahmed Hassan',
      orderDate: '2024-12-09',
      orderTime: '10:00 AM',
      priority: 'Urgent',
      status: 'Pending Sample',
      notes: 'Check creatinine levels',
    },
    {
      id: 4,
      patient: 'Ali Hassan',
      uhid: 'CDC003',
      age: 38,
      gender: 'Male',
      test: 'Lipid Profile',
      sampleType: 'Blood',
      orderedBy: 'Dr. Sarah Kamau',
      orderDate: '2024-12-09',
      orderTime: '11:30 AM',
      priority: 'Routine',
      status: 'Sample Collected',
      notes: 'Patient is on statins',
    },
    {
      id: 5,
      patient: 'Peter Ochieng',
      uhid: 'CDC009',
      age: 52,
      gender: 'Male',
      test: 'Liver Function',
      sampleType: 'Blood',
      orderedBy: 'Dr. James Omondi',
      orderDate: '2024-12-09',
      orderTime: '09:00 AM',
      priority: 'Routine',
      status: 'Sample Collected',
      notes: '',
    },
    {
      id: 6,
      patient: 'Sarah Muthoni',
      uhid: 'CDC011',
      age: 55,
      gender: 'Female',
      test: 'Thyroid Function',
      sampleType: 'Blood',
      orderedBy: 'Dr. Ahmed Hassan',
      orderDate: '2024-12-09',
      orderTime: '10:45 AM',
      priority: 'Routine',
      status: 'Pending Sample',
      notes: '',
    },
    {
      id: 7,
      patient: 'James Kariuki',
      uhid: 'CDC013',
      age: 43,
      gender: 'Male',
      test: 'Random Glucose',
      sampleType: 'Blood',
      orderedBy: 'Dr. Sarah Kamau',
      orderDate: '2024-12-08',
      orderTime: '03:30 PM',
      priority: 'Urgent',
      status: 'Sample Collected',
      notes: 'Patient reported dizziness',
    },
    {
      id: 8,
      patient: 'Lucy Wangari',
      uhid: 'CDC015',
      age: 39,
      gender: 'Female',
      test: 'Urine Analysis',
      sampleType: 'Urine',
      orderedBy: 'Dr. Ahmed Hassan',
      orderDate: '2024-12-08',
      orderTime: '02:00 PM',
      priority: 'Routine',
      status: 'Sample Collected',
      notes: 'Check for proteinuria',
    },
  ]);

  // Filter and search
  const filteredTests = pendingTests.filter((test) => {
    const matchesSearch = 
      test.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.uhid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.test.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = filterPriority === 'all' || test.priority === filterPriority;
    const matchesTest = filterTest === 'all' || test.test === filterTest;

    return matchesSearch && matchesPriority && matchesTest;
  });

  // Get unique test types for filter
  const testTypes = ['all', ...new Set(pendingTests.map(t => t.test))];

  return (
    <div>
      <PageHeader
        title="Pending Tests Queue"
      />

      {/* Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <StatCard title="Total Pending" value={pendingTests.length} gradient="from-yellow-500 to-yellow-600" />
        <StatCard title="Urgent" value={pendingTests.filter(t => t.priority === 'Urgent').length} gradient="from-red-500 to-red-600" />
        <StatCard title="Sample Collected" value={pendingTests.filter(t => t.status === 'Sample Collected').length} gradient="from-green-500 to-green-600" />
        <StatCard title="Awaiting Sample" value={pendingTests.filter(t => t.status === 'Pending Sample').length} gradient="from-blue-500 to-blue-600" />
      </div>

      {/* Search and Filters */}
      <Card title="🔍 Search & Filter">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search (Name, UHID, Test)
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          {/* Filter by Priority */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Filter by Priority
            </label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="all">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="Routine">Routine</option>
            </select>
          </div>

          {/* Filter by Test Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Filter by Test Type
            </label>
            <select
              value={filterTest}
              onChange={(e) => setFilterTest(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            >
              {testTypes.map((type) => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All Tests' : type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Showing <strong>{filteredTests.length}</strong> of <strong>{pendingTests.length}</strong> tests
        </div>
      </Card>

      {/* Pending Tests List */}
      <Card title="📋 Test Queue" className="mt-6">
        {filteredTests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-6xl mb-4">📭</p>
            <p className="text-xl font-semibold text-gray-800 mb-2">No pending tests found</p>
            <p className="text-gray-600">All tests have been processed or no tests match your filters</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTests.map((test) => (
              <div
                key={test.id}
                className={`p-4 sm:p-6 border-2 rounded-lg transition hover:shadow-lg ${
                  test.priority === 'Urgent' ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-primary'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Test Info */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <StatusBadge tone={PRIORITY_TONES[test.priority]}>
                        {test.priority}
                      </StatusBadge>
                      <StatusBadge tone={LAB_STATUS_TONES[test.status]}>
                        {test.status}
                      </StatusBadge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-gray-600">Patient</p>
                        <p className="text-lg font-bold text-gray-800">{test.patient}</p>
                        <p className="text-sm text-gray-600">
                          {test.uhid} &middot; {test.age}y &middot; {test.gender}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600">Test Ordered</p>
                        <p className="text-lg font-bold text-primary">{test.test}</p>
                        <p className="text-sm text-gray-600">Sample: {test.sampleType}</p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600">Ordered By</p>
                        <p className="text-sm font-semibold text-gray-800">{test.orderedBy}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(test.orderDate).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })} at {test.orderTime}
                        </p>
                      </div>

                      {test.notes && (
                        <div>
                          <p className="text-sm text-gray-600">Notes</p>
                          <p className="text-sm text-gray-800">{test.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 lg:items-end">
                    <Button
                      onClick={() => navigate('/lab/enter-results')}
                      className="w-full lg:w-auto text-sm"
                      disabled={test.status === 'Pending Sample'}
                    >
                      {test.status === 'Sample Collected' ? '✍️ Enter Results' : '⏳ Awaiting Sample'}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full lg:w-auto text-sm"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Help Section */}
      <Card title="💡 Quick Guide" className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
            <p className="font-bold text-gray-800 mb-1">🔴 Urgent Priority</p>
            <p className="text-gray-600">Process these tests immediately. Results needed ASAP for patient care decisions.</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-gray-400">
            <p className="font-bold text-gray-800 mb-1">⚪ Routine Priority</p>
            <p className="text-gray-600">Process within normal turnaround time (24-48 hours).</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
            <p className="font-bold text-gray-800 mb-1">✅ Sample Collected</p>
            <p className="text-gray-600">Sample is ready for processing. You can enter results.</p>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
            <p className="font-bold text-gray-800 mb-1">⏳ Pending Sample</p>
            <p className="text-gray-600">Waiting for sample collection. Cannot process yet.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PendingTests;