import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  ClipboardList,
  Users,
  Clock,
  Activity,
  AlertTriangle,
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
import { useAppointmentContext } from '../../contexts/AppointmentContext';

const formatArrival = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
};

// Reusable label+value field for the mobile card view.
// Centralises the label style — change once here, applies everywhere.
const Field = ({ label, children, span2 = false }) => (
  <div className={span2 ? 'col-span-2' : ''}>
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
    {children}
  </div>
);

const QueueManagement = () => {
  const { queue, loading, fetchQueue, removeFromQueue, updateQueueStatus, getLocalQueueStats } = useQueueContext();
  const { autoCompleteAppointmentOnDischarge } = useAppointmentContext();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [patientToRemove, setPatientToRemove] = useState(null);
  const [removalReason, setRemovalReason] = useState('');
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [dischargePatient, setDischargePatient] = useState(null);
  const [discharging, setDischarging] = useState(false);
  const [finalCharges, setFinalCharges] = useState([]);
  const [finalProcedures, setFinalProcedures] = useState([]);
  const [dischargeComment, setDischargeComment] = useState('');

  // Only show active entries — hide Completed and Removed
  const activeQueue = queue.filter(p => p.status !== 'Completed' && p.status !== 'Removed');

  // Use local stats (synchronous) for display
  const stats = getLocalQueueStats();

  const getStatusColor = (status) => {
    switch (status) {
      case 'Awaiting Triage':  return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'In Triage':        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Awaiting Doctor':  return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'With Doctor':      return 'bg-green-100 text-green-700 border-green-300';
      case 'Pending Billing':  return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'Completed':        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:                 return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const handleDischargeClick = (patient) => {
    setDischargePatient(patient);
    setFinalCharges(patient.selectedCharges || []);
    setFinalProcedures(patient.selectedProcedures || []);
    setDischargeComment('');
    setShowDischargeModal(true);
  };

  const toggleFinalCharge = (item) =>
    setFinalCharges(prev => prev.includes(item) ? prev.filter(c => c !== item) : [...prev, item]);

  const toggleFinalProcedure = (item) =>
    setFinalProcedures(prev => prev.includes(item) ? prev.filter(p => p !== item) : [...prev, item]);

  const confirmDischarge = async () => {
    if (!dischargePatient) return;
    setDischarging(true);
    const result = await updateQueueStatus(dischargePatient.id, 'Completed', null, {
      finalCharges,
      finalProcedures,
      dischargeComment: dischargeComment.trim() || null,
    });
    setDischarging(false);
    if (result.success) {
      // Auto-complete today's appointment (scheduled or checked-in) — non-blocking
      autoCompleteAppointmentOnDischarge(dischargePatient.uhid).catch(() => {});
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

  const handleRemoveClick = (id, name) => {
    setPatientToRemove({ id, name });
    setRemovalReason('');
    setShowConfirmModal(true);
  };

  const confirmRemove = async () => {
    if (patientToRemove) {
      const result = await removeFromQueue(patientToRemove.id, removalReason.trim() || null);
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
      setRemovalReason('');
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
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-4 lg:p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5" />
            <p className="text-sm opacity-90">Waiting for Triage</p>
          </div>
          <p className="text-3xl lg:text-4xl font-bold mt-2">{stats.waiting}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 lg:p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5" />
            <p className="text-sm opacity-90">In Triage</p>
          </div>
          <p className="text-3xl lg:text-4xl font-bold mt-2">{stats.inTriage}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-4 lg:p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5" />
            <p className="text-sm opacity-90">Awaiting Doctor</p>
          </div>
          <p className="text-3xl lg:text-4xl font-bold mt-2">{stats.awaitingDoctor}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 lg:p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <p className="text-sm opacity-90">With Doctor</p>
          </div>
          <p className="text-3xl lg:text-4xl font-bold mt-2">{stats.withDoctor}</p>
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
          <>
            {/* Card list — mobile & tablet (< xl) */}
            <div className="xl:hidden space-y-3">
              {activeQueue.map((patient, index) => (
                <div
                  key={patient.id}
                  className={`border rounded-xl overflow-hidden ${patient.priority === 'Urgent' ? 'border-red-300' : 'border-gray-200'}`}
                >
                  {/* Card header — queue number + patient name */}
                  <div className={`flex items-center gap-3 px-4 py-3 ${patient.priority === 'Urgent' ? 'bg-red-50' : 'bg-gray-50'} border-b border-gray-100`}>
                    <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-800 text-sm leading-tight truncate">
                        {patient.name}
                        {patient.age && <span className="text-xs text-gray-500 font-normal ml-1">({patient.age}y)</span>}
                      </p>
                    </div>
                    {patient.priority === 'Urgent' && (
                      <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-300 uppercase tracking-wide">
                        Urgent
                      </span>
                    )}
                  </div>

                  {/* Card body — labelled fields in a grid */}
                  <div className="bg-white px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                    <Field label="UHID">
                      <p className="text-sm font-semibold text-primary">{patient.uhid}</p>
                    </Field>
                    <Field label="Status">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${getStatusColor(patient.status)}`}>
                        {patient.status}
                      </span>
                    </Field>
                    <Field label="Priority">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${getPriorityColor(patient.priority)}`}>
                        {patient.priority}
                      </span>
                    </Field>
                    <Field label="Est. Wait">
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {patient.estimatedWait || '—'}
                      </p>
                    </Field>
                    <Field label="Assigned Doctor" span2>
                      <p className="text-sm text-gray-700 font-medium">{patient.assignedDoctorName || '—'}</p>
                    </Field>
                    {patient.reason && (
                      <Field label="Reason" span2>
                        <p className="text-sm text-gray-600 truncate">{patient.reason}</p>
                      </Field>
                    )}
                    <Field label="Arrival" span2>
                      <p className="text-sm text-gray-600">{formatArrival(patient.createdAt)}</p>
                    </Field>
                  </div>

                  {/* Card footer — actions */}
                  <div className="flex gap-2 px-4 py-3 bg-gray-50 border-t border-gray-100">
                    {patient.status === 'Pending Billing' && (
                      <Button
                        variant="primary"
                        className="flex-1 text-xs py-1.5 bg-amber-600 hover:bg-amber-700 border-amber-600"
                        onClick={() => handleDischargeClick(patient)}
                        disabled={loading}
                      >
                        <Receipt className="w-3.5 h-3.5 mr-1" />
                        Confirm & Discharge
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="text-xs py-1.5 px-3"
                      onClick={() => handleRemoveClick(patient.id, patient.name)}
                      disabled={loading}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Table — desktop only (xl+) */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">#</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">UHID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Patient Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Arrival</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Est. Wait</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Assigned Doctor</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activeQueue.map((patient, index) => (
                    <tr key={patient.id} className={`hover:bg-gray-50 ${patient.priority === 'Urgent' ? 'bg-red-50' : ''}`}>
                      <td className="px-6 py-4 font-bold text-gray-800 text-sm">{index + 1}</td>
                      <td className="px-6 py-4 font-medium text-primary text-sm">{patient.uhid}</td>
                      <td className="px-6 py-4 font-semibold text-sm">
                        {patient.name}
                        {patient.age && <span className="text-xs text-gray-500 ml-1">({patient.age}y)</span>}
                      </td>
                      <td className="px-6 py-4 text-sm">{formatArrival(patient.createdAt)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{patient.estimatedWait || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${getPriorityColor(patient.priority)}`}>
                          {patient.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${getStatusColor(patient.status)}`}>
                          {patient.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 font-medium">{patient.assignedDoctorName || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{patient.reason}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {patient.status === 'Pending Billing' && (
                            <Button
                              variant="primary"
                              className="text-xs py-1 px-3 bg-amber-600 hover:bg-amber-700 border-amber-600"
                              onClick={() => handleDischargeClick(patient)}
                              disabled={loading}
                            >
                              <Receipt className="w-3 h-3 mr-1" />
                              Confirm & Discharge
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            className="text-xs py-1 px-3"
                            onClick={() => handleRemoveClick(patient.id, patient.name)}
                            disabled={loading}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 rounded-full">
                  <Receipt className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Confirm & Discharge</h3>
                  <p className="text-sm text-gray-500">{dischargePatient.name} · {dischargePatient.uhid}</p>
                </div>
              </div>
              <button
                onClick={() => { setShowDischargeModal(false); setDischargePatient(null); setDischargeComment(''); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
              {/* Charges */}
              <div>
                <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 pb-1 border-b">Charges</h4>
                {dischargePatient.selectedCharges?.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {dischargePatient.selectedCharges.map(item => (
                      <label
                        key={item}
                        className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                          finalCharges.includes(item)
                            ? 'bg-green-50 border-green-400 text-gray-800'
                            : 'bg-red-50 border-red-300 text-gray-400 line-through'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={finalCharges.includes(item)}
                          onChange={() => toggleFinalCharge(item)}
                          className="w-4 h-4 accent-green-600 cursor-pointer flex-shrink-0"
                        />
                        <span className="text-sm font-medium leading-tight">{item}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No charges selected</p>
                )}
              </div>

              {/* Procedures */}
              <div>
                <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 pb-1 border-b">Procedures</h4>
                {dischargePatient.selectedProcedures?.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {dischargePatient.selectedProcedures.map(item => (
                      <label
                        key={item}
                        className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                          finalProcedures.includes(item)
                            ? 'bg-green-50 border-green-400 text-gray-800'
                            : 'bg-red-50 border-red-300 text-gray-400 line-through'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={finalProcedures.includes(item)}
                          onChange={() => toggleFinalProcedure(item)}
                          className="w-4 h-4 accent-green-600 cursor-pointer flex-shrink-0"
                        />
                        <span className="text-sm font-medium leading-tight">{item}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No procedures selected</p>
                )}
              </div>

              {/* Comment — only shown when staff unchecks an item */}
              {(() => {
                const itemsRemoved =
                  (dischargePatient.selectedCharges || []).some(c => !finalCharges.includes(c)) ||
                  (dischargePatient.selectedProcedures || []).some(p => !finalProcedures.includes(p));
                if (!itemsRemoved) return null;
                return (
                  <div>
                    <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-2 pb-1 border-b">
                      Reason for Removal <span className="text-red-500">*</span>
                    </h4>
                    <textarea
                      value={dischargeComment}
                      onChange={(e) => setDischargeComment(e.target.value)}
                      placeholder="e.g. Patient declined eye check-up, requested reschedule..."
                      rows={3}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
                    />
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0">
              <button
                onClick={() => { setShowDischargeModal(false); setDischargePatient(null); setDischargeComment(''); }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              {(() => {
                const itemsRemoved =
                  (dischargePatient.selectedCharges || []).some(c => !finalCharges.includes(c)) ||
                  (dischargePatient.selectedProcedures || []).some(p => !finalProcedures.includes(p));
                const commentRequired = itemsRemoved && !dischargeComment.trim();
                return (
                  <button
                    onClick={confirmDischarge}
                    disabled={discharging || commentRequired}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {discharging ? 'Discharging…' : 'Confirm & Discharge'}
                  </button>
                );
              })()}
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
                  setRemovalReason('');
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-700 mb-4">
              Are you sure you want to remove <span className="font-semibold">{patientToRemove.name}</span> from the queue?
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-600 mb-1">Reason for removal</label>
              <textarea
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value)}
                placeholder="e.g. Patient left before being seen..."
                rows={3}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowConfirmModal(false);
                  setPatientToRemove(null);
                  setRemovalReason('');
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