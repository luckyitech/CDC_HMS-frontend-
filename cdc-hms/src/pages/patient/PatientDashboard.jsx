import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import { useUserContext } from '../../contexts/UserContext';

const PatientDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useUserContext();

  // Mock patient data
  const [patientData] = useState({
    name: currentUser?.name || 'John Doe',
    uhid: 'CDC001',
    lastReading: {
      value: 145,
      time: '8:30 AM',
      date: 'Today',
      type: 'Fasting'
    },
    weeklyAverage: 152,
    daysLoggedThisWeek: 5,
    nextAppointment: {
      date: '2024-12-15',
      time: '10:00 AM',
      doctor: 'Dr. Ahmed Hassan'
    },
    recentReadings: [
      { date: '2024-12-08', time: '8:30 AM', type: 'Fasting', value: 145, status: 'elevated' },
      { date: '2024-12-07', time: '2:00 PM', type: 'After Lunch', value: 178, status: 'high' },
      { date: '2024-12-07', time: '8:00 AM', type: 'Fasting', value: 138, status: 'normal' },
    ]
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'normal': return 'text-green-600 bg-green-50';
      case 'elevated': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div>
      {/* Welcome Header */}
      <div className="mb-6">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">
          Welcome back, {patientData.name}!
        </h2>
        <p className="text-gray-600 mt-1">UHID: {patientData.uhid}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
        {/* Last Reading */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Last Reading</p>
          <p className="text-4xl font-bold mt-2">{patientData.lastReading.value}</p>
          <p className="text-xs opacity-75 mt-1">mg/dL</p>
          <p className="text-sm mt-3 opacity-90">
            {patientData.lastReading.type} • {patientData.lastReading.time}
          </p>
        </div>

        {/* Weekly Average */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Weekly Average</p>
          <p className="text-4xl font-bold mt-2">{patientData.weeklyAverage}</p>
          <p className="text-xs opacity-75 mt-1">mg/dL</p>
          <p className="text-sm mt-3 opacity-90">Last 7 days</p>
        </div>

        {/* Days Logged */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Days Logged</p>
          <p className="text-4xl font-bold mt-2">{patientData.daysLoggedThisWeek}/7</p>
          <p className="text-xs opacity-75 mt-1">This Week</p>
          <p className="text-sm mt-3 opacity-90">Keep it up! 🎯</p>
        </div>

        {/* Next Appointment */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Next Appointment</p>
          <p className="text-2xl font-bold mt-2">{patientData.nextAppointment.date}</p>
          <p className="text-xs opacity-75 mt-1">{patientData.nextAppointment.time}</p>
          <p className="text-sm mt-3 opacity-90">{patientData.nextAppointment.doctor}</p>
        </div>
      </div>

      {/* Recent Readings */}
      <Card title="Recent Blood Sugar Readings">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Reading</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {patientData.recentReadings.map((reading, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">{reading.date}</td>
                  <td className="px-6 py-4 text-sm">{reading.time}</td>
                  <td className="px-6 py-4 text-sm">{reading.type}</td>
                  <td className="px-6 py-4 text-sm font-semibold">{reading.value} mg/dL</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(reading.status)}`}>
                      {reading.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-center">
          <Button onClick={() => navigate('/patient/trends')} variant="outline">
            View Full History
          </Button>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Card title="Quick Actions">
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/patient/log-blood-sugar')}
              className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition border-l-4 border-blue-500"
            >
              <p className="font-semibold text-blue-700">Log Blood Sugar</p>
            </button>
            <button 
              onClick={() => navigate('/patient/book-appointment')}
              className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition border-l-4 border-green-500"
            >
              <p className="font-semibold text-green-700">Book Appointment</p>
            </button>
            <button 
              onClick={() => navigate('/patient/prescriptions')}
              className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition border-l-4 border-purple-500"
            >
              <p className="font-semibold text-purple-700">View Prescriptions</p>
            </button>
          </div>
        </Card>

        <Card title="Health Tips" className="md:col-span-2">
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
              <p className="font-semibold text-blue-700">Stay Hydrated</p>
              <p className="text-sm text-blue-600 mt-1">Drink at least 8 glasses of water daily</p>
            </div>
            <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
              <p className="font-semibold text-green-700">Regular Exercise</p>
              <p className="text-sm text-green-600 mt-1">30 minutes of walking can help control blood sugar</p>
            </div>
            <div className="p-4 bg-purple-50 border-l-4 border-purple-500 rounded-lg">
              <p className="font-semibold text-purple-700">Medication Reminder</p>
              <p className="text-sm text-purple-600 mt-1">Take your medications as prescribed</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PatientDashboard;