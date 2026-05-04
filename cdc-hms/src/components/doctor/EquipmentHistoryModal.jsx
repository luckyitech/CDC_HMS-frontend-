import { Zap, Radio, Calendar, User, RefreshCw, Clock, FileText, PenLine } from 'lucide-react';
import Modal from '../shared/Modal';

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

const daysInUse = (startDate, endDate) => {
  if (!startDate || !endDate) return null;
  const days = Math.floor((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
  return days >= 0 ? days : null;
};

const TYPE_LABELS = {
  new:         'New Patient Device',
  'pre-owned': 'Pre-owned Device',
  replacement: 'Replacement',
  upgrade:     'Upgrade',
};

// ── Detail field ──────────────────────────────────────────────────────────────
const Detail = ({ label, value, sub, Icon }) => (
  <div>
    <p className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-1 mb-0.5">
      {Icon && <Icon className="w-3 h-3" />} {label}
    </p>
    <p className="text-sm font-semibold text-gray-800">{value || '—'}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

// ── Single archived record card ───────────────────────────────────────────────
const HistoryCard = ({ item, index, isPump }) => {
  const days = daysInUse(item.startDate, item.endDate);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {isPump
            ? <Zap className="w-4 h-4 text-blue-500" />
            : <Radio className="w-4 h-4 text-purple-500" />}
          <span className="font-bold text-gray-800 text-sm">
            #{index + 1} — Serial: {item.serialNo || '—'}
          </span>
          {item.type && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold border border-blue-200">
              {TYPE_LABELS[item.type] || item.type}
            </span>
          )}
        </div>
        {days !== null && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {days} days in use
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">

        {isPump && (
          <>
            <Detail label="Model"        value={item.model        || 'Not specified'} />
            <Detail label="Manufacturer" value={item.manufacturer || 'Not specified'} />
          </>
        )}

        <Detail
          label="Period in Use"
          Icon={Calendar}
          value={`${formatDate(item.startDate)} → ${formatDate(item.endDate)}`}
        />
        <Detail
          label="Warranty"
          value={`${formatDate(item.warrantyStartDate)} – ${formatDate(item.warrantyEndDate)}`}
        />

        <Detail
          label="Added By"
          Icon={User}
          value={item.addedBy || '—'}
          sub={formatDate(item.addedDate)}
        />
        <Detail
          label="Replaced By"
          Icon={RefreshCw}
          value={item.archivedBy || '—'}
          sub={formatDate(item.archivedDate)}
        />

        {item.reason && (
          <div className="sm:col-span-2">
            <Detail label="Reason for Replacement" Icon={FileText} value={item.reason} />
          </div>
        )}

      </div>
    </div>
  );
};

// ── Field name formatter ──────────────────────────────────────────────────────
const FIELD_LABELS = {
  serialNo:          'Serial Number',
  model:             'Model',
  manufacturer:      'Manufacturer',
  type:              'Type',
  startDate:         'Start Date',
  warrantyStartDate: 'Warranty Start',
  warrantyEndDate:   'Warranty End',
  careLinkCountry:   'CareLink Country',
  careLinkEmail:     'CareLink Email',
  careLinkPassword:  'CareLink Password',
};

const formatDateTime = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

// ── Edit history section ──────────────────────────────────────────────────────
const EditHistorySection = ({ edits }) => {
  if (!edits.length) return (
    <div className="text-center py-8 text-gray-400">
      <PenLine className="w-8 h-8 mx-auto mb-2 text-gray-300" />
      <p className="text-sm text-gray-500">No edits recorded yet.</p>
    </div>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b-2 border-gray-200">
            {['Date & Time', 'Field Changed', 'Old Value', 'New Value', 'Changed By'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {edits.map((entry, i) => (
            <tr key={entry.id} className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDateTime(entry.changedAt)}</td>
              <td className="px-4 py-3 text-xs font-semibold text-gray-700">{FIELD_LABELS[entry.field] || entry.field || '—'}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{entry.oldValue || '—'}</td>
              <td className="px-4 py-3 text-xs font-semibold text-gray-800">{entry.newValue || '—'}</td>
              <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{entry.changedBy || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Modal ─────────────────────────────────────────────────────────────────────
// Props:
//   isOpen     — boolean
//   onClose    — () => void
//   history    — full history array (all devices)
//   auditLog   — full audit log array (all devices)
//   deviceType — 'pump' | 'transmitter'
const EquipmentHistoryModal = ({ isOpen, onClose, history = [], auditLog = [], deviceType }) => {
  const isPump   = deviceType === 'pump';
  const Icon     = isPump ? Zap : Radio;
  const label    = isPump ? 'Insulin Pump History' : 'Transmitter History';
  const filtered = history.filter((item) => item.deviceType === deviceType);
  const edits    = auditLog.filter((e) => e.deviceType === deviceType && e.action === 'edit');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${isPump ? 'text-blue-500' : 'text-purple-500'}`} />
          <span>{label}</span>
          <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
            {filtered.length} archived
          </span>
        </div>
      }
    >
      <div className="space-y-6">

        {/* Replaced devices */}
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Icon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-semibold text-gray-500">No archived {isPump ? 'pumps' : 'transmitters'}</p>
            <p className="text-sm mt-1">Replaced devices will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item, index) => (
              <HistoryCard key={item.id} item={item} index={index} isPump={isPump} />
            ))}
          </div>
        )}

        {/* Edit history */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <PenLine className="w-4 h-4 text-gray-500" />
            <h4 className="font-bold text-gray-700">Edit History</h4>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-semibold">
              {edits.length} {edits.length === 1 ? 'change' : 'changes'}
            </span>
          </div>
          <EditHistorySection edits={edits} />
        </div>

      </div>
    </Modal>
  );
};

export default EquipmentHistoryModal;
