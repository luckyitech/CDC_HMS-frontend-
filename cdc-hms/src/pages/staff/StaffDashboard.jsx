import { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle,
  UserPlus,
  Search,
  ClipboardList,
  Activity,
  Calendar,
  FileText,
  Package
} from 'lucide-react';
import Card from '../../components/shared/Card';
import PageHeader from '../../components/shared/PageHeader';
import RecordUseModal from '../../components/stock/RecordUseModal';
import TodaysWorkload from '../../components/staff/TodaysWorkload';
import { useUserContext } from '../../contexts/UserContext';
import { usePatientContext } from '../../contexts/PatientContext';
import { useQueueContext } from '../../contexts/QueueContext';
import { useNavigate } from 'react-router-dom';


const StaffDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useUserContext();
  const { getPatientStats } = usePatientContext();
  const { queue, getLocalQueueStats } = useQueueContext();

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
      />

      {/* Today's workload — every patient through the clinic today, tabbed by
          doctor. (Replaced the old "Patients Waiting for Triage" worklist,
          which now lives in Queue Management → Triage.) */}
      <TodaysWorkload />

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