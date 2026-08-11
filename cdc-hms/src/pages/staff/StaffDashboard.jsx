import { useState, useEffect, useMemo } from 'react';
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
  Stethoscope,
  Package
} from 'lucide-react';
import Card from '../../components/shared/Card';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import Button from '../../components/shared/Button';
import RecordUseModal from '../../components/stock/RecordUseModal';
import { useUserContext } from '../../contexts/UserContext';
import { usePatientContext } from '../../contexts/PatientContext';
import { useQueueContext } from '../../contexts/QueueContext';
import { useNavigate } from 'react-router-dom';


const StaffDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useUserContext();
  const { getPatientStats } = usePatientContext();
  const { queue, getLocalQueueStats, getQueueByStatus } = useQueueContext();

  const [patientStats, setPatientStats] = useState({ total: 0, active: 0, highRisk: 0, registeredToday: 0 });
  // Point-of-care stock use — open to all clinical roles, no stock permission
  // needed (scanning a shelf label anywhere opens the same modal).
  const [showRecordUse, setShowRecordUse] = useState(false);

  // Fetch patient stats from API once on mount
  useEffect(() => {
    getPatientStats().then(data => {
      if (data) setPatientStats(data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // getPatientStats is a stable context function — safe to omit

  // Queue stats computed from local state — always in sync, no extra API call
  const queueStats = getLocalQueueStats();
  const waitingPatients = getQueueByStatus('Awaiting Triage');

  // New patients registered today — from API stats
  const newRegistrationsToday = patientStats.registeredToday ?? 0;

  // Queue entries completed today
  const todayStr = new Date().toDateString();
  const completedTriageToday = useMemo(
    () => queue.filter(q => q.status === 'Completed' && new Date(q.updatedAt).toDateString() === todayStr).length,
    [queue, todayStr]
  );

  return (
    <div>
      <PageHeader
        title="Staff Dashboard"
        subtitle={`Welcome back, ${currentUser?.name || 'Staff'}!`}
        actions={
          <Button onClick={() => navigate('/staff/create-patient')}>
            <UserPlus className="w-4 h-4 mr-2" />
            Register Patient
          </Button>
        }
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <StatCard title="Total Patients" value={patientStats.total ?? 0} icon={Users} gradient="from-blue-500 to-blue-600" />
        <StatCard title="Waiting Queue" value={queueStats.waiting} icon={Clock} gradient="from-green-500 to-green-600" />
        <StatCard title="Active Patients" value={patientStats.active ?? 0} icon={CheckCircle} gradient="from-purple-500 to-purple-600" />
        <StatCard title="High Risk" value={patientStats.highRisk ?? 0} icon={AlertTriangle} gradient="from-red-500 to-red-600" />
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
                  <tr key={patient.id} className="hover:bg-blue-50">
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
            <button
              onClick={() => setShowRecordUse(true)}
              className="w-full text-left px-4 py-3 bg-amber-50 hover:bg-amber-100 rounded-lg transition border-l-4 border-amber-500 flex items-center gap-3"
            >
              <Package className="w-5 h-5 text-amber-600" />
              <p className="font-semibold text-amber-700">Record Stock Use</p>
            </button>
          </div>
        </Card>

        {showRecordUse && <RecordUseModal onClose={() => setShowRecordUse(false)} />}

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
              <p className="text-3xl font-bold text-blue-600">{newRegistrationsToday}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm text-gray-600">Discharged Today</p>
              </div>
              <p className="text-3xl font-bold text-green-600">{completedTriageToday}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList className="w-5 h-5 text-purple-600" />
                <p className="text-sm text-gray-600">In Queue</p>
              </div>
              <p className="text-3xl font-bold text-purple-600">{queueStats.total}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <p className="text-sm text-gray-600">Awaiting Doctor</p>
              </div>
              <p className="text-3xl font-bold text-purple-600">{queueStats.awaitingDoctor}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                <p className="text-sm text-gray-600">With Doctor</p>
              </div>
              <p className="text-3xl font-bold text-orange-600">{queueStats.withDoctor}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StaffDashboard;