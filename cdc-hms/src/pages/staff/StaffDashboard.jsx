import toast, { Toaster } from 'react-hot-toast';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  UserPlus, 
  Search, 
  ClipboardList,
  Activity,
  Calendar,
  FileText,
  Stethoscope
} from 'lucide-react';
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
      <Toaster position="top-right" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Staff Dashboard</h2>
          <p className="text-gray-600 mt-1">Welcome back, {currentUser?.name || 'Staff'}!</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate('/staff/create-patient')}>
            <UserPlus className="w-4 h-4 mr-2" />
            Register Patient
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-xl p-4 lg:p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm lg:text-lg font-semibold opacity-90">Total Patients</h3>
            <Users className="w-6 h-6 lg:w-8 lg:h-8" />
          </div>
          <p className="text-4xl lg:text-5xl font-bold">{stats.total}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-xl p-4 lg:p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm lg:text-lg font-semibold opacity-90">Waiting Queue</h3>
            <Clock className="w-6 h-6 lg:w-8 lg:h-8" />
          </div>
          <p className="text-4xl lg:text-5xl font-bold">{queueStats.waiting}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-xl p-4 lg:p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm lg:text-lg font-semibold opacity-90">Active Patients</h3>
            <CheckCircle className="w-6 h-6 lg:w-8 lg:h-8" />
          </div>
          <p className="text-4xl lg:text-5xl font-bold">{stats.active}</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-xl p-4 lg:p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm lg:text-lg font-semibold opacity-90">High Risk</h3>
            <AlertTriangle className="w-6 h-6 lg:w-8 lg:h-8" />
          </div>
          <p className="text-4xl lg:text-5xl font-bold">{stats.highRisk}</p>
        </div>
      </div>

      {/* Waiting Patients */}
      <Card title={
        <span className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5" />
          Patients Waiting for Triage
        </span>
      }>
        {waitingPatients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">UHID</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Patient Name</th>
                  <th className="hidden md:table-cell px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Arrival Time</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Priority</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {waitingPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="px-4 lg:px-6 py-4 font-medium text-primary text-sm">{patient.uhid}</td>
                    <td className="px-4 lg:px-6 py-4 font-semibold text-sm">{patient.name}</td>
                    <td className="hidden md:table-cell px-4 lg:px-6 py-4 text-sm">{patient.arrivalTime}</td>
                    <td className="px-4 lg:px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        patient.priority === 'Urgent' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {patient.priority}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <Button 
                        variant="primary" 
                        className="text-xs py-1 px-3"
                        onClick={() => navigate('/staff/triage')}
                      >
                        {/* <Stethoscope className="w-3 h-3 mr-1" /> */}
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
            <div className="flex justify-center mb-3">
              <CheckCircle className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-500">No patients waiting for triage</p>
          </div>
        )}
      </Card>

      {/* Quick Actions & Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Card title={
          <span className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Quick Actions
          </span>
        }>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/staff/create-patient')}
              className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition border-l-4 border-blue-500 flex items-center gap-3"
            >
              <UserPlus className="w-5 h-5 text-blue-600" />
              <p className="font-semibold text-blue-700">Register New Patient</p>
            </button>
            <button 
              onClick={() => navigate('/staff/patients')}
              className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition border-l-4 border-green-500 flex items-center gap-3"
            >
              <Search className="w-5 h-5 text-green-600" />
              <p className="font-semibold text-green-700">Search Patient</p>
            </button>
            <button 
              onClick={() => navigate('/staff/queue')}
              className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition border-l-4 border-purple-500 flex items-center gap-3"
            >
              <ClipboardList className="w-5 h-5 text-purple-600" />
              <p className="font-semibold text-purple-700">Manage Queue</p>
            </button>
          </div>
        </Card>

        <Card title={
          <span className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Today's Statistics
          </span>
        } className="md:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-gray-600">New Registrations</p>
              </div>
              <p className="text-3xl font-bold text-blue-600">8</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm text-gray-600">Completed Triage</p>
              </div>
              <p className="text-3xl font-bold text-green-600">15</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList className="w-5 h-5 text-purple-600" />
                <p className="text-sm text-gray-600">In Queue</p>
              </div>
              <p className="text-3xl font-bold text-purple-600">{queueStats.total}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                <p className="text-sm text-gray-600">Appointments Booked</p>
              </div>
              <p className="text-3xl font-bold text-orange-600">12</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StaffDashboard;