import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import useNotificationSound from '../../hooks/useNotificationSound';
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
  Plus,
  Minus,
  Package,
} from 'lucide-react';
import Card from '../../components/shared/Card';
import StatCard from '../../components/shared/StatCard';
import Button from '../../components/shared/Button';
import StatusBadge from '../../components/shared/StatusBadge';
import { QUEUE_STATUS_TONES, QUEUE_PRIORITY_TONES } from '../../utils/statusStyles';
import { useQueueContext } from '../../contexts/QueueContext';
import { useAppointmentContext } from '../../contexts/AppointmentContext';
import { BatchScanBox } from '../../components/stock/stockUi';
import stockService from '../../services/stockService';
import TriageWorklist from '../../components/nursing/TriageWorklist';
import SwitcherTabs from '../../components/shared/SwitcherTabs';

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
  const { play } = useNotificationSound();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [patientToRemove, setPatientToRemove] = useState(null);
  const [removalReason, setRemovalReason] = useState('');
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [dischargePatient, setDischargePatient] = useState(null);
  const [discharging, setDischarging] = useState(false);
  const [finalCharges, setFinalCharges] = useState([]);
  const [finalProcedures, setFinalProcedures] = useState([]);
  const [dischargeComment, setDischargeComment] = useState('');
  // Supplies scanned onto the charge sheet at checkout. Each line:
  // { stockBatchId, stockItemId, name, unit, labelCode, expiryDate,
  //   isHighAlert, levels:[{locationId,locationName,quantity}], locationId, quantity }
  const [supplies, setSupplies] = useState([]);

  // Only show active entries — hide Completed and Removed
  const activeQueue = queue.filter(p => p.status !== 'Completed' && p.status !== 'Removed');

  // ── Notification sound — play when a new patient joins the active queue ──
  const prevActiveIds = useRef(null);

  useEffect(() => {
    const currentIds = new Set(activeQueue.map(q => q.id));

    // Skip the very first render — no sound on page load
    if (prevActiveIds.current === null) {
      prevActiveIds.current = currentIds;
      return;
    }

    const hasNewPatient = [...currentIds].some(id => !prevActiveIds.current.has(id));
    if (hasNewPatient) play('new');

    prevActiveIds.current = currentIds;
  }, [activeQueue, play]);

  // Use local stats (synchronous) for display
  const stats = getLocalQueueStats();

  const handleDischargeClick = (patient) => {
    setDischargePatient(patient);
    setFinalCharges(patient.selectedCharges || []);
    setFinalProcedures(patient.selectedProcedures || []);
    setDischargeComment('');
    setSupplies([]);              // supplies are scanned fresh at checkout
    setShowDischargeModal(true);
  };

  const toggleFinalCharge = (item) =>
    setFinalCharges(prev => prev.includes(item) ? prev.filter(c => c !== item) : [...prev, item]);

  const toggleFinalProcedure = (item) =>
    setFinalProcedures(prev => prev.includes(item) ? prev.filter(p => p !== item) : [...prev, item]);

  // Available units of a supply line at its chosen location (for the cap/hint).
  const availableAt = (line) =>
    line.levels.find(l => String(l.locationId) === String(line.locationId))?.quantity ?? 0;

  // FEFO nudge (advisory, always shown): flag a line when it isn't the
  // earliest-expiring batch of that item at its chosen location.
  const evaluateFefo = async (stockBatchId, stockItemId, locationId) => {
    if (!locationId) return;
    try {
      const res = await stockService.getFefoSuggestion(stockItemId, locationId);
      const sugg = res.success ? res.data.suggestion : null;
      const warn = sugg && sugg.stockBatchId !== stockBatchId ? sugg : null;
      setSupplies(prev => prev.map(s => s.stockBatchId === stockBatchId ? { ...s, fefoWarn: warn } : s));
    } catch {
      /* the nudge is best-effort — never block checkout on it */
    }
  };

  // A scanned STK- shelf label lands here. Same batch scanned again → +1.
  const handleSupplyScanned = (data) => {
    const held = (data.levels || []).filter(l => l.quantity > 0);
    if (held.length === 0) {
      toast.error(`No stock of ${data.item.name} is held anywhere`, {
        style: { background: '#FEE2E2', color: '#991B1B', fontWeight: 'bold', padding: '16px' },
      });
      return;
    }
    let targetLocation;
    setSupplies(prev => {
      const idx = prev.findIndex(s => s.stockBatchId === data.batch.id);
      if (idx !== -1) {
        targetLocation = prev[idx].locationId;
        return prev.map((s, i) => i === idx ? { ...s, quantity: s.quantity + 1 } : s);
      }
      targetLocation = held.length === 1 ? held[0].locationId : (held[0]?.locationId ?? '');
      return [...prev, {
        stockBatchId: data.batch.id,
        stockItemId:  data.item.id,
        name:         data.item.name,
        unit:         data.item.unit,
        labelCode:    data.batch.labelCode,
        expiryDate:   data.batch.expiryDate,
        isHighAlert:  data.item.isHighAlert,
        levels:       held,
        locationId:   targetLocation,
        quantity:     1,
        fefoWarn:     null,
      }];
    });
    evaluateFefo(data.batch.id, data.item.id, targetLocation);
  };

  const setSupply = (idx, patch) =>
    setSupplies(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  const removeSupply = (idx) =>
    setSupplies(prev => prev.filter((_, i) => i !== idx));

  const confirmDischarge = async () => {
    if (!dischargePatient) return;

    // Guard the supply lines before touching stock.
    for (const s of supplies) {
      if (!s.locationId) {
        toast.error(`Choose where "${s.name}" comes from`, {
          style: { background: '#FEE2E2', color: '#991B1B', fontWeight: 'bold', padding: '16px' },
        });
        return;
      }
      if (Number(s.quantity) < 1) {
        toast.error(`"${s.name}" needs a quantity of at least 1`, {
          style: { background: '#FEE2E2', color: '#991B1B', fontWeight: 'bold', padding: '16px' },
        });
        return;
      }
    }

    setDischarging(true);

    // Dispense the supplies FIRST — if stock can't be taken (expired, short),
    // stop before discharging so the bill never claims un-dispensed stock.
    if (supplies.length > 0) {
      try {
        const disp = await stockService.checkoutDispense(
          dischargePatient.uhid,
          supplies.map(s => ({
            stockBatchId: s.stockBatchId,
            locationId:   Number(s.locationId),
            quantity:     Number(s.quantity),
          })),
          // The visit. If saving the discharge below fails and this whole flow
          // is retried, the server recognises the repeat and refuses rather
          // than sending the same supplies out a second time.
          dischargePatient.id,
        );
        if (!disp.success) {
          setDischarging(false);
          toast.error(disp.message || 'Could not dispense supplies', {
            style: { background: '#FEE2E2', color: '#991B1B', fontWeight: 'bold', padding: '16px' },
          });
          return;
        }
      } catch (err) {
        // Already dispensed for this visit — this is a retry after the discharge
        // save failed, so the supplies are out and the right thing to do is
        // carry on and finish the discharge. Treating it as an error would
        // leave the visit permanently undischargeable.
        if (!err?.data?.alreadyDispensed) {
          setDischarging(false);
          toast.error(err?.message || 'Could not dispense supplies', {
            style: { background: '#FEE2E2', color: '#991B1B', fontWeight: 'bold', padding: '16px' },
          });
          return;
        }
      }
    }

    const finalSupplies = supplies.map(s => ({
      name: s.name, quantity: Number(s.quantity), labelCode: s.labelCode, stockBatchId: s.stockBatchId,
    }));

    const result = await updateQueueStatus(dischargePatient.id, 'Completed', null, {
      finalCharges,
      finalProcedures,
      finalSupplies,
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
      // Stay open on failure. The supplies have already left stock by this
      // point, so closing sent reception back to the queue to start the whole
      // discharge again — which is how the same supplies got dispensed twice.
      return;
    }
    setShowDischargeModal(false);
    setDischargePatient(null);
  };

  const handleRemoveClick = (id, name) => {
    setPatientToRemove({ id, name });
    setRemovalReason('');
    setShowConfirmModal(true);
  };

  const confirmRemove = async () => {
    if (!removalReason.trim()) {
      toast.error('Please provide a reason for removal');
      return;
    }
    if (patientToRemove) {
      const result = await removeFromQueue(patientToRemove.id, removalReason.trim());
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

  const [tab, setTab] = useState("queue");

  return (
    <div>
      {/* Tabs + refresh. The page title isn't repeated here — the nav (and, for
          staff, the page switcher) already names this section. */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <SwitcherTabs
          active={tab}
          onChange={setTab}
          tabs={[{ id: "queue", label: "Queue" }, { id: "triage", label: "Triage" }]}
        />
        <Button variant="outline" onClick={fetchQueue} disabled={loading} className="flex items-center gap-2 flex-shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </Button>
      </div>

      {tab === "triage" ? (
        <TriageWorklist />
      ) : (
      <>
      {/* Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <StatCard title="Waiting for Triage" value={stats.waiting} icon={Clock} gradient="from-yellow-500 to-yellow-600" />
        <StatCard title="In Triage" value={stats.inTriage} icon={Activity} gradient="from-blue-500 to-blue-600" />
        <StatCard title="Awaiting Doctor" value={stats.awaitingDoctor} icon={Users} gradient="from-purple-500 to-purple-600" />
        <StatCard title="With Doctor" value={stats.withDoctor} icon={AlertTriangle} gradient="from-green-500 to-green-600" />
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
                      <StatusBadge size="xs" tone={QUEUE_STATUS_TONES[patient.status]}>
                        {patient.status}
                      </StatusBadge>
                    </Field>
                    <Field label="Priority">
                      <StatusBadge size="xs" tone={QUEUE_PRIORITY_TONES[patient.priority] || 'success'}>
                        {patient.priority}
                      </StatusBadge>
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
                    <tr key={patient.id} className={`hover:bg-blue-50 ${patient.priority === 'Urgent' ? 'bg-red-50' : ''}`}>
                      <td className="px-6 py-4 font-bold text-gray-800 text-sm">{index + 1}</td>
                      <td className="px-6 py-4 font-medium text-primary text-sm">{patient.uhid}</td>
                      <td className="px-6 py-4 font-semibold text-sm">
                        {patient.name}
                        {patient.age && <span className="text-xs text-gray-500 ml-1">({patient.age}y)</span>}
                      </td>
                      <td className="px-6 py-4 text-sm">{formatArrival(patient.createdAt)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{patient.estimatedWait || '—'}</td>
                      <td className="px-6 py-4">
                        <StatusBadge tone={QUEUE_PRIORITY_TONES[patient.priority] || 'success'}>
                          {patient.priority}
                        </StatusBadge>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge tone={QUEUE_STATUS_TONES[patient.status]}>
                          {patient.status}
                        </StatusBadge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 font-medium">{patient.assignedDoctorName || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{patient.reason}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2 w-36">
                          {patient.status === 'Pending Billing' && (
                            <Button
                              variant="primary"
                              className="text-xs py-1 px-3 bg-amber-600 hover:bg-amber-700 border-amber-600 w-full"
                              onClick={() => handleDischargeClick(patient)}
                              disabled={loading}
                            >
                              <Receipt className="w-3 h-3 mr-1" />
                              Confirm & Discharge
                            </Button>
                          )}
                          <button
                            onClick={() => handleRemoveClick(patient.id, patient.name)}
                            disabled={loading}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border-2 border-red-300 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all duration-200 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                          >
                            <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                            Remove
                          </button>
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
      </>
      )}

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
                onClick={() => { setShowDischargeModal(false); setDischargePatient(null); setDischargeComment(''); setSupplies([]); }}
                className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-gray-600"
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

              {/* Supplies — scanned onto the bill at checkout. Finalising
                  dispenses them from stock against this patient. */}
              <div>
                <div className="flex items-center gap-2 mb-3 pb-1 border-b">
                  <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wide">Supplies</h4>
                  <span className="text-xs text-gray-400">scan each item the patient is taking</span>
                </div>

                <BatchScanBox onResolved={handleSupplyScanned} />

                {supplies.length > 0 ? (
                  <div className="space-y-2">
                    {supplies.map((s, idx) => (
                      <div key={s.stockBatchId} className="flex flex-wrap items-center gap-3 p-2.5 rounded-lg border border-gray-200">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {s.name}
                            {s.isHighAlert && (
                              <span className="ml-2 text-[11px] font-bold text-red-600">HIGH ALERT</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">
                            {s.labelCode}{s.expiryDate && ` · exp ${s.expiryDate}`}
                          </p>
                          {s.levels.length > 1 ? (
                            <select
                              value={s.locationId}
                              onChange={(e) => { setSupply(idx, { locationId: e.target.value }); evaluateFefo(s.stockBatchId, s.stockItemId, Number(e.target.value)); }}
                              className="mt-1 text-xs border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-primary"
                            >
                              {s.levels.map(l => (
                                <option key={l.locationId} value={l.locationId}>
                                  {l.locationName} ({l.quantity} held)
                                </option>
                              ))}
                            </select>
                          ) : (
                            <p className="text-xs text-gray-400">
                              from {s.levels[0]?.locationName} ({availableAt(s)} held)
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            aria-label="Decrease"
                            onClick={() => setSupply(idx, { quantity: Math.max(1, Number(s.quantity) - 1) })}
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-blue-50"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={s.quantity}
                            onChange={(e) => setSupply(idx, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                            className="w-12 text-center text-sm font-semibold border border-gray-300 rounded-lg py-1 focus:outline-none focus:border-primary"
                          />
                          <button
                            type="button"
                            aria-label="Increase"
                            onClick={() => setSupply(idx, { quantity: Number(s.quantity) + 1 })}
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-blue-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Remove"
                            onClick={() => removeSupply(idx)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {s.fefoWarn && (
                          <div className="w-full basis-full flex items-start gap-1.5 mt-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <span>
                              An earlier-expiring batch is here: <span className="font-mono">{s.fefoWarn.labelCode}</span>
                              {s.fefoWarn.expiryDate && ` (exp ${s.fefoWarn.expiryDate})`} — use it first if you can.
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" />
                      Finalising removes these from stock, recorded against {dischargePatient.name}. Unticking a
                      charge above only edits the bill; removing a supply here also removes it from the dispense.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No supplies scanned — the patient is taking nothing home.</p>
                )}
              </div>

              {/* Doctor's instructions — read-only for billing staff */}
              {dischargePatient.doctorNotes && (
                <div>
                  <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-2 pb-1 border-b">Doctor's Instructions</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-900 whitespace-pre-wrap">
                    {dischargePatient.doctorNotes}
                  </div>
                </div>
              )}

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
                onClick={() => { setShowDischargeModal(false); setDischargePatient(null); setDischargeComment(''); setSupplies([]); }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-blue-50"
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
                    {discharging ? 'Discharging…' : supplies.length > 0 ? 'Finalise & Discharge' : 'Confirm & Discharge'}
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
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Reason for removal <span className="text-red-500">*</span>
              </label>
              <textarea
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value)}
                placeholder="e.g. Patient left before being seen..."
                rows={3}
                className={`w-full px-3 py-2 border-2 rounded-lg text-sm focus:outline-none focus:border-primary resize-none ${
                  removalReason.trim() ? 'border-gray-300' : 'border-red-300'
                }`}
              />
              {!removalReason.trim() && (
                <p className="text-xs text-red-500 mt-1">This field is required</p>
              )}
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