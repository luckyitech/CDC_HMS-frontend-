import { useState } from 'react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import { useUserContext } from '../../contexts/UserContext';

const DoctorDashboard = () => {
  const { currentUser } = useUserContext();
  
  // Mock data
  const stats = [
    { title: 'Today\'s Patients', value: '12', icon: '👥', gradient: 'from-blue-500 to-blue-600' },
    { title: 'Waiting', value: '5', icon: '⏳', gradient: 'from-cyan-500 to-cyan-600' },
    { title: 'Completed', value: '7', icon: '✅', gradient: 'from-green-500 to-green-600' },
    { title: 'Follow-ups', value: '3', icon: '📅', gradient: 'from-purple-500 to-purple-600' },
  ];

  const [todayPatients] = useState([
    { id: 1, uhid: 'CDC001', name: 'John Doe', age: 45, time: '09:00 AM', status: 'Completed', bloodSugar: '145 mg/dL' },
    { id: 2, uhid: 'CDC002', name: 'Jane Smith', age: 52, time: '09:30 AM', status: 'Completed', bloodSugar: '132 mg/dL' },
    { id: 3, uhid: 'CDC003', name: 'Ali Hassan', age: 38, time: '10:00 AM', status: 'In Progress', bloodSugar: '168 mg/dL' },
    { id: 4, uhid: 'CDC005', name: 'Mary Johnson', age: 61, time: '10:30 AM', status: 'Waiting', bloodSugar: '152 mg/dL' },
    { id: 5, uhid: 'CDC007', name: 'Grace Wanjiru', age: 47, time: '11:00 AM', status: 'Waiting', bloodSugar: '178 mg/dL' },
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'In Progress':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Waiting':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getBloodSugarColor = (value) => {
    const numValue = parseInt(value);
    if (numValue < 140) return 'text-green-600';
    if (numValue < 180) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Doctor Dashboard</h2>
          <p className="text-gray-600 mt-1">Welcome back, {currentUser?.name || 'Doctor'}</p>
        </div>
        <div className="flex gap-3">
          {/* <Button className="text-sm">📋 View Schedule</Button> */}
          {/* <Button variant="outline" className="text-sm">📊 Reports</Button> */}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
        {stats.map((stat) => (
          <div key={stat.title} className={`bg-gradient-to-br ${stat.gradient} rounded-xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300 hover:shadow-2xl`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base lg:text-lg font-semibold opacity-90">{stat.title}</h3>
              <span className="text-3xl lg:text-4xl">{stat.icon}</span>
            </div>
            <p className="text-4xl lg:text-5xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Today's Appointments */}
      <Card title="📅 Today's Appointments">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Time</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">UHID</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Patient Name</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase hidden md:table-cell">Age</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase hidden lg:table-cell">Blood Sugar</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {todayPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 lg:px-6 py-4 text-sm font-semibold text-gray-700">{patient.time}</td>
                  <td className="px-4 lg:px-6 py-4 font-medium text-primary text-sm">{patient.uhid}</td>
                  <td className="px-4 lg:px-6 py-4 text-sm font-medium">{patient.name}</td>
                  <td className="px-4 lg:px-6 py-4 text-sm text-gray-600 hidden md:table-cell">{patient.age} yrs</td>
                  <td className={`px-4 lg:px-6 py-4 text-sm font-semibold hidden lg:table-cell ${getBloodSugarColor(patient.bloodSugar)}`}>
                    {patient.bloodSugar}
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(patient.status)}`}>
                      {patient.status}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    {patient.status === 'Waiting' && (
                      <Button variant="primary" className="text-xs py-1 px-3">
                        Start Consultation
                      </Button>
                    )}
                    {patient.status === 'In Progress' && (
                      <Button variant="secondary" className="text-xs py-1 px-3">
                        Continue
                      </Button>
                    )}
                    {patient.status === 'Completed' && (
                      <Button variant="outline" className="text-xs py-1 px-3">
                        View Notes
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Card title="⚡ Quick Actions">
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition border-l-4 border-blue-500">
              <p className="font-semibold text-blue-700">📝 Write Prescription</p>
            </button>
            <button className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition border-l-4 border-green-500">
              <p className="font-semibold text-green-700">🔬 Order Lab Tests</p>
            </button>
            <button className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition border-l-4 border-purple-500">
              <p className="font-semibold text-purple-700">📅 Schedule Follow-up</p>
            </button>
          </div>
        </Card>

        <Card title="🚨 Alerts" className="md:col-span-2">
          <div className="space-y-3">
            <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
              <p className="font-semibold text-red-700">High Priority</p>
              <p className="text-sm text-red-600 mt-1">Grace Wanjiru (CDC007) - Blood sugar 178 mg/dL</p>
            </div>
            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
              <p className="font-semibold text-yellow-700">Pending Lab Results</p>
              <p className="text-sm text-yellow-600 mt-1">3 patients awaiting HbA1c results</p>
            </div>
            <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
              <p className="font-semibold text-blue-700">Follow-up Reminder</p>
              <p className="text-sm text-blue-600 mt-1">John Doe due for 3-month review tomorrow</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DoctorDashboard;