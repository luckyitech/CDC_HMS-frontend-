import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  ClipboardList,
  Users,
  Clock,
  Activity,
  AlertTriangle,
  UserCheck,
  Trash2,
  X,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Receipt,
} from 'lucide-react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import { useQueueContext } from '../../contexts/QueueContext';

const formatArrival = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
};

const QueueManagement = () => {
  const { queue, loading, fetchQueue, callNextPatient, removeFromQueue, updateQueueStatus, getLocalQueueStats } = useQueueContext();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [patientToRemove, setPatientToRemove] = useState(null);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [dischargePatient, setDischargePatient] = useState(null);
  const [discharging, setDischarging] = useState(false);

  // Only show active (non-Completed) entries in the current queue
  const activeQueue = queue.filter(p => p.status !== 'Completed');

  // Use local stats (synchronous) for display
  const stats = getLocalQueueStats();

  const getStatusColor = (status) => {
    switch (status) {
      case 'Waiting':         return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'In Triage':       return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'With Doctor':     return 'bg-green-100 text-green-700 border-green-300';
      case 'Pending Billing': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'Completed':       return 'bg-gray-100 text-gray-700 border-gray-300';
      default:                return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const handleDischargeClick = (patient) => {
    setDischargePatient(patient);
    setShowDischargeModal(true);
  };

  const confirmDischarge = async () => {
    if (!dischargePatient) return;
    setDischarging(true);
    const result = await updateQueueStatus(dischargePatient.id, 'Completed');
    setDischarging(false);
    if (result.success) {
      toast.success(`${dischargePatient.name} discharged successfully`, {
        duration: 3000,
        icon: <CheckCircle2 className="w-5 h-5" />,
        style: { background: '#D1FAE5', color: '#065F46', fontWeight: 'bold', padding: '16px' },
      });
    } else {
      toast.error(result.message || 'Failed to discharge patient', {
        duration: 3000,
        style: { background: '#FEE2E2', color: '#991B1B', fontWeight: 'bold', padding: '16px' },
      });
    }
    setShowDischargeModal(false);
    setDischargePatient(null);
  };

  const getPriorityColor = (priority) => {
    return priority === 'Urgent' 
      ? 'bg-red-100 text-red-700 border-red-300' 
      : 'bg-green-100 text-green-700 border-green-300';
  };

  const handleCallNext = async () => {
    const result = await callNextPatient();
    if (result.success) {
      toast.success(`${result.patient?.name || 'Patient'} called for consultation`, {
        duration: 3000,
        icon: <UserCheck className="w-5 h-5" />,
        style: {
          background: '#D1FAE5',
          color: '#065F46',
          fontWeight: 'bold',
          padding: '16px',
        },
      });
    } else {
      toast.error(result.message || 'Failed to call next patient', {
        duration: 3000,
        icon: <AlertTriangle className="w-5 h-5" />,
        style: {
          background: '#FEE2E2',
          color: '#991B1B',
          fontWeight: 'bold',
          padding: '16px',
        },
      });
    }
  };

  const handleRemoveClick = (id, name) => {
    setPatientToRemove({ id, name });
    setShowConfirmModal(true);
  };

  const confirmRemove = async () => {
    if (patientToRemove) {
      const result = await removeFromQueue(patientToRemove.id);
      if (result.success) {
        toast.success(`${patientToRemove.name} removed from queue`, {
          duration: 3000,
          icon: <CheckCircle2 className="w-5 h-5" />,
          style: {
            background: '#D1FAE5',
            color: '#065F46',
            fontWeight: 'bold',
            padding: '16px',
          },
        });
      } else {
        toast.error(result.message || 'Failed to remove from queue', {
          duration: 3000,
          icon: <AlertTriangle className="w-5 h-5" />,
          style: {
            background: '#FEE2E2',
            color: '#991B1B',
            fontWeight: 'bold',
            padding: '16px',
          },
        });
      }
      setShowConfirmModal(false);
      setPatientToRemove(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-8 h-8 text-primary" />
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Queue Management</h2>
        </div>
        <Button variant="outline" onClick={fetchQueue} disabled={loading} className="flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 lg:p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5" />
            <p className="text-sm opacity-90">Total in Queue</p>
          </div>
          <p className="text-3xl lg:text-4xl font-bold mt-2">{stats.total}</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-4 lg:p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5" />
            <p className="text-sm opacity-90">Waiting</p>
          </div>
          <p className="text-3xl lg:text-4xl font-bold mt-2">{stats.waiting}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 lg:p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5" />
            <p className="text-sm opacity-90">In Progress</p>
          </div>
          <p className="text-3xl lg:text-4xl font-bold mt-2">{stats.inTriage + stats.withDoctor}</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-4 lg:p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <p className="text-sm opacity-90">Urgent</p>
          </div>
          <p className="text-3xl lg:text-4xl font-bold mt-2">{stats.urgent}</p>
        </div>
      </div>

      {/* Queue Table */}
      <Card title="Current Queue">
        {loading && activeQueue.length === 0 ? (
          <div className="flex items-center justify-center gap-3 py-12 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading queue...</span>
          </div>
        ) : activeQueue.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">#</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">UHID</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Patient Name</th>
                  <th className="hidden md:table-cell px-3 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Arrival</th>
                  <th className="hidden md:table-cell px-3 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Est. Wait</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Priority</th>
                  <th className="hidden sm:table-cell px-3 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                  <th className="hidden lg:table-cell px-3 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Reason</th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activeQueue.map((patient, index) => (
                  <tr key={patient.id} className={`hover:bg-gray-50 ${patient.priority === 'Urgent' ? 'bg-red-50' : ''}`}>
                    <td className="px-3 lg:px-6 py-4 font-bold text-gray-800 text-sm">{index + 1}</td>
                    <td className="px-3 lg:px-6 py-4 font-medium text-primary text-sm">{patient.uhid}</td>
                    <td className="px-3 lg:px-6 py-4 font-semibold text-sm">
                      {patient.name}
                      {patient.age && <span className="text-xs text-gray-500 ml-1">({patient.age}y)</span>}
                    </td>
                    <td className="hidden md:table-cell px-3 lg:px-6 py-4 text-sm">{formatArrival(patient.createdAt)}</td>
                    <td className="hidden md:table-cell px-3 lg:px-6 py-4 text-sm text-gray-500">
                      {patient.estimatedWait || '—'}
                    </td>
                    <td className="px-3 lg:px-6 py-4">
                      <span className={`px-2 lg:px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(patient.priority)}`}>
                        {patient.priority}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-3 lg:px-6 py-4">
                      <span className={`px-2 lg:px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(patient.status)}`}>
                        {patient.status}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-3 lg:px-6 py-4 text-sm text-gray-600">{patient.reason}</td>
                    <td className="px-3 lg:px-6 py-4">
                      <div className="flex gap-2">
                        {patient.status === 'Waiting' && index === 0 && (
                          <Button
                            variant="primary"
                            className="text-xs py-1 px-2 lg:px-3"
                            onClick={handleCallNext}
                            disabled={loading}
                          >
                            <UserCheck className="w-3 h-3 lg:mr-1" />
                            <span className="hidden lg:inline">Call Next</span>
                          </Button>
                        )}
                        {patient.status === 'Pending Billing' && (
                          <Button
                            variant="primary"
                            className="text-xs py-1 px-2 lg:px-3 bg-amber-600 hover:bg-amber-700 border-amber-600"
                            onClick={() => handleDischargeClick(patient)}
                            disabled={loading}
                          >
                            <Receipt className="w-3 h-3 lg:mr-1" />
                            <span className="hidden lg:inline">Confirm & Discharge</span>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          className="text-xs py-1 px-2 lg:px-3"
                          onClick={() => handleRemoveClick(patient.id, patient.name)}
                          disabled={loading}
                        >
                          <Trash2 className="w-3 h-3 lg:mr-1" />
                          <span className="hidden lg:inline">Remove</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl font-semibold text-gray-800 mb-2">Queue is empty</p>
            <p className="text-gray-600">Patients will appear here once added via Triage.</p>
          </div>
        )}
      </Card>

      {/* Confirm & Discharge Modal */}
      {showDischargeModal && dischargePatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 rounded-full">
                  <Receipt className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-green-800">Confirm & Discharge</h3>
                  <p className="text-sm text-gray-500">{dischargePatient.name} · {dischargePatient.uhid}</p>
                </div>
              </div>
              <button
                onClick={() => { setShowDischargeModal(false); setDischargePatient(null); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body — doctor's selections (read-only) */}
            <div className="p-5 space-y-5">
              {/* Charges */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Charges
                </h4>
                {dischargePatient.selectedCharges?.length > 0 ? (
                  <ul className="space-y-1.5">
                    {dischargePatient.selectedCharges.map(item => (
                      <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 italic">No charges selected</p>
                )}
              </div>

              {/* Procedures */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Procedures
                </h4>
                {dischargePatient.selectedProcedures?.length > 0 ? (
                  <ul className="space-y-1.5">
                    {dischargePatient.selectedProcedures.map(item => (
                      <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 italic">No procedures selected</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 border-t">
              <button
                onClick={() => { setShowDischargeModal(false); setDischargePatient(null); }}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDischarge}
                disabled={discharging}
                className="flex-1 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold disabled:opacity-60"
              >
                {discharging ? 'Discharging…' : 'Confirm & Discharge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && patientToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Confirm Removal</h3>
              </div>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setPatientToRemove(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-gray-700 mb-6">
              Are you sure you want to remove <span className="font-semibold">{patientToRemove.name}</span> from the queue?
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowConfirmModal(false);
                  setPatientToRemove(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={confirmRemove}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueManagement;