import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import { useUserContext } from '../../contexts/UserContext';
import { usePatientContext } from '../../contexts/PatientContext';
import { useQueueContext } from '../../contexts/QueueContext';
import { useNavigate } from 'react-router-dom';

const StaffDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useUserContext();
  const { getPatientStats } = usePatientContext();
  const { getQueueByStatus, getQueueStats } = useQueueContext();
  
  const stats = getPatientStats();
  const queueStats = getQueueStats();
  const waitingPatients = getQueueByStatus('Waiting');

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Staff Dashboard</h2>
          <p className="text-gray-600 mt-1">Welcome back, {currentUser?.name || 'Staff'}!</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate('/staff/create-patient')}>+ Register Patient</Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold opacity-90">Total Patients</h3>
            <span className="text-4xl">👥</span>
          </div>
          <p className="text-5xl font-bold">{stats.total}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold opacity-90">Waiting Queue</h3>
            <span className="text-4xl">⏳</span>
          </div>
          <p className="text-5xl font-bold">{queueStats.waiting}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold opacity-90">Active Patients</h3>
            <span className="text-4xl">✅</span>
          </div>
          <p className="text-5xl font-bold">{stats.active}</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold opacity-90">High Risk</h3>
            <span className="text-4xl">⚠️</span>
          </div>
          <p className="text-5xl font-bold">{stats.highRisk}</p>
        </div>
      </div>

      {/* Waiting Patients */}
      <Card title="Patients Waiting for Triage">
        {waitingPatients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">UHID</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Patient Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Arrival Time</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {waitingPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-primary">{patient.uhid}</td>
                    <td className="px-6 py-4 font-semibold">{patient.name}</td>
                    <td className="px-6 py-4 text-sm">{patient.arrivalTime}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        patient.priority === 'Urgent' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {patient.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Button 
                        variant="primary" 
                        className="text-xs py-1 px-3"
                        onClick={() => navigate('/staff/triage')}
                      >
                        Start Triage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No patients waiting for triage</p>
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Card title="Quick Actions">
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/staff/create-patient')}
              className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition border-l-4 border-blue-500"
            >
              <p className="font-semibold text-blue-700">Register New Patient</p>
            </button>
            <button 
              onClick={() => navigate('/staff/patients')}
              className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition border-l-4 border-green-500"
            >
              <p className="font-semibold text-green-700">Search Patient</p>
            </button>
            <button 
              onClick={() => navigate('/staff/queue')}
              className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition border-l-4 border-purple-500"
            >
              <p className="font-semibold text-purple-700">Manage Queue</p>
            </button>
          </div>
        </Card>

        <Card title="Today's Statistics" className="md:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">New Registrations</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">8</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Completed Triage</p>
              <p className="text-3xl font-bold text-green-600 mt-2">15</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">In Queue</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{queueStats.total}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600">Appointments Booked</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">12</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StaffDashboard;