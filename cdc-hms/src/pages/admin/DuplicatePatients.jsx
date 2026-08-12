import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Copy, CheckCircle, AlertCircle, Info } from 'lucide-react';
import patientService from '../../services/patientService';
import Spinner from '../../components/shared/Spinner';

// ─── Utilities ────────────────────────────────────────────────────────────────

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const normalize = (s) => (s || '').trim().toLowerCase();

const sameDate = (a, b) => {
  if (!a || !b) return false;
  return new Date(a).toDateString() === new Date(b).toDateString();
};

const buildComparison = (a, b) => [
  { label: 'Name',         aVal: a.name || '—',             bVal: b.name || '—',             match: !!a.name && normalize(a.name) === normalize(b.name) },
  { label: 'Date of Birth', aVal: formatDate(a.dateOfBirth), bVal: formatDate(b.dateOfBirth), match: sameDate(a.dateOfBirth, b.dateOfBirth) },
  { label: 'Gender',       aVal: a.gender || '—',           bVal: b.gender || '—',           match: !!a.gender && normalize(a.gender) === normalize(b.gender) },
  { label: 'Phone',        aVal: a.phone || '—',            bVal: b.phone || '—',            match: !!a.phone && a.phone === b.phone },
];

const getHint = (fields) => {
  const matchCount = fields.filter((f) => f.match).length;
  const total = fields.length;
  if (matchCount >= total - 1) return {
    color: 'amber', Icon: AlertCircle,
    text: 'Most or all details match — this could be the same person registered twice. Please verify before taking action.',
  };
  if (matchCount <= 1) return {
    color: 'blue', Icon: Info,
    text: 'Most details differ — these could be different people (e.g. family members) sharing the same ID. Please verify before taking action.',
  };
  return {
    color: 'gray', Icon: Info,
    text: 'Some details match and some differ — please contact the patients to verify before taking action.',
  };
};

// ─── ComparisonSection ────────────────────────────────────────────────────────

const HINT_STYLES = {
  amber: { banner: 'bg-amber-50 border-amber-200 text-amber-800', icon: 'text-amber-500' },
  blue:  { banner: 'bg-blue-50 border-blue-200 text-blue-800',   icon: 'text-blue-500'  },
  gray:  { banner: 'bg-gray-50 border-gray-200 text-gray-700',   icon: 'text-gray-400'  },
};

const ComparisonSection = ({ fields, hint }) => {
  const styles = HINT_STYLES[hint.color];
  const { Icon } = hint;
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left text-gray-400 font-medium pb-1 pr-4">Field</th>
              <th className="text-left text-gray-400 font-medium pb-1 pr-4">Patient A</th>
              <th className="text-left text-gray-400 font-medium pb-1">Patient B</th>
            </tr>
          </thead>
          <tbody>
            {fields.map(({ label, aVal, bVal, match }) => (
              <tr key={label} className="border-t border-gray-100">
                <td className="text-gray-500 py-1.5 pr-4">{label}</td>
                <td className={`py-1.5 pr-4 font-medium ${match ? 'text-green-700' : 'text-red-600'}`}>{aVal}</td>
                <td className={`py-1.5 font-medium ${match ? 'text-green-700' : 'text-red-600'}`}>{bVal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={`flex items-start gap-2 border rounded-lg px-3 py-2 text-xs ${styles.banner}`}>
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${styles.icon}`} />
        <span><strong>Hint:</strong> {hint.text}</span>
      </div>
    </div>
  );
};

// ─── PatientCard ──────────────────────────────────────────────────────────────

const PatientCard = ({ patient }) => (
  <div className="flex-1 min-w-0 bg-gray-50 rounded-lg p-4 space-y-1.5">
    <div className="flex items-center gap-2">
      <span className="font-semibold text-gray-900">{patient.name}</span>
      {patient.hasPortalAccount && (
        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Portal</span>
      )}
    </div>
    <div className="text-xs text-gray-500 font-mono">{patient.uhid}</div>
    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-gray-600 mt-2">
      <span className="text-gray-400">Gender</span>      <span>{patient.gender || '—'}</span>
      <span className="text-gray-400">DOB</span>         <span>{formatDate(patient.dateOfBirth)}</span>
      <span className="text-gray-400">Phone</span>       <span>{patient.phone || '—'}</span>
      <span className="text-gray-400">Registered</span>  <span>{formatDate(patient.registeredAt)}</span>
      <span className="text-gray-400">By</span>          <span className="truncate">{patient.registeredBy}</span>
    </div>
  </div>
);

// ─── Action Panels ────────────────────────────────────────────────────────────

const PanelButtons = ({ onConfirm, onCancel, submitting, confirmLabel, confirmClass }) => (
  <div className="flex gap-2">
    <button onClick={onConfirm} disabled={submitting}
      className={`px-3 py-1.5 text-white text-sm rounded-lg disabled:opacity-50 transition-colors ${confirmClass}`}>
      {submitting ? '...' : confirmLabel}
    </button>
    <button onClick={onCancel} disabled={submitting}
      className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors">
      Cancel
    </button>
  </div>
);

const PatientRadioList = ({ name, patients, value, onChange }) => (
  <div className="flex flex-col gap-2">
    {patients.map((p) => (
      <label key={p.uhid} className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="radio" name={name} value={p.uhid}
          checked={value === p.uhid} onChange={() => onChange(p.uhid)}
          className="accent-blue-600" />
        {p.name} ({p.uhid})
      </label>
    ))}
  </div>
);

const MergePanel = ({ action, onConfirm, onCancel, submitting }) => (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm space-y-2">
    <p className="text-gray-800">
      This will move <strong>all records</strong> from <strong>{action.discardName}</strong> to{' '}
      <strong>{action.keepName}</strong> and deactivate <strong>{action.discardName}</strong>. This cannot be undone.
    </p>
    <PanelButtons onConfirm={onConfirm} onCancel={onCancel} submitting={submitting}
      confirmLabel={submitting ? 'Merging…' : 'Confirm Merge'}
      confirmClass="bg-red-600 hover:bg-red-700" />
  </div>
);

const UpdateIdPanel = ({ patients, targetUhid, setTargetUhid, newIdNumber, setNewIdNumber, onConfirm, onCancel, submitting }) => (
  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
    <p className="text-sm font-medium text-gray-700">Update ID Number</p>
    <div className="space-y-2">
      <p className="text-xs text-gray-500">Which patient needs their ID updated?</p>
      <PatientRadioList name="targetUhid" patients={patients} value={targetUhid} onChange={setTargetUhid} />
    </div>
    <div className="space-y-1">
      <label className="text-xs text-gray-500">New ID number (leave blank to clear)</label>
      <input type="text" value={newIdNumber} onChange={(e) => setNewIdNumber(e.target.value)}
        placeholder="Enter correct ID or leave blank"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
    <PanelButtons onConfirm={onConfirm} onCancel={onCancel} submitting={submitting}
      confirmLabel={submitting ? 'Saving…' : 'Save'}
      confirmClass="bg-blue-600 hover:bg-blue-700" />
  </div>
);

const FlagPanel = ({ patients, targetUhid, setTargetUhid, onConfirm, onCancel, submitting }) => (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
    <p className="text-sm font-medium text-blue-800">Flag for Follow-up</p>
    <p className="text-xs text-blue-700">
      Select the patient whose ID needs to be verified. Their ID number will be cleared so staff
      know to update it when the patient next visits. The patient will remain active in the system.
    </p>
    <PatientRadioList name="flagUhid" patients={patients} value={targetUhid} onChange={setTargetUhid} />
    <PanelButtons onConfirm={onConfirm} onCancel={onCancel} submitting={submitting}
      confirmLabel={submitting ? 'Flagging…' : 'Confirm Flag'}
      confirmClass="bg-blue-600 hover:bg-blue-700" />
  </div>
);

// ─── PairCard ─────────────────────────────────────────────────────────────────

const PairCard = ({ pair, onResolved }) => {
  const [a, b] = pair;
  const [action, setAction]       = useState(null);
  const [targetUhid, setTargetUhid] = useState(a.uhid);
  const [newIdNumber, setNewIdNumber] = useState('');
  const [submitting, setSubmitting]  = useState(false);

  const fields = useMemo(() => buildComparison(a, b), [a, b]);
  const hint   = useMemo(() => getHint(fields), [fields]);

  const resetAction = () => {
    setAction(null);
    setNewIdNumber('');
    setTargetUhid(a.uhid);
  };

  const withSubmit = (fn) => async () => {
    setSubmitting(true);
    try {
      await fn();
      onResolved();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Something went wrong. Please try again.');
      resetAction();
    } finally {
      setSubmitting(false);
    }
  };

  const handleMerge = withSubmit(async () => {
    await patientService.mergePatients(action.keepUhid, action.discardUhid);
    toast.success(`${action.discardName} merged into ${action.keepName} and deactivated.`);
  });

  const handleUpdateId = withSubmit(async () => {
    await patientService.update(targetUhid, { idNumber: newIdNumber.trim() || null });
    toast.success('ID number updated successfully.');
  });

  const handleFlag = withSubmit(async () => {
    await patientService.update(targetUhid, { idNumber: null });
    toast.success('Patient flagged. Their ID has been cleared — update it when they next visit.');
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Copy className="w-4 h-4 text-red-400" />
        <span>Shared ID: <span className="font-mono font-medium text-gray-800">{a.idNumber}</span></span>
      </div>

      {/* Patient cards */}
      <div className="flex flex-col sm:flex-row gap-3">
        <PatientCard patient={a} />
        <div className="flex items-center justify-center text-gray-300 font-bold text-sm">vs</div>
        <PatientCard patient={b} />
      </div>

      {/* Comparison + hint */}
      <ComparisonSection fields={fields} hint={hint} />

      {/* Action buttons */}
      {!action && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
          <button onClick={() => setAction({ type: 'merge', keepUhid: a.uhid, discardUhid: b.uhid, keepName: a.name, discardName: b.name })}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Keep {a.name} ({a.uhid})
          </button>
          <button onClick={() => setAction({ type: 'merge', keepUhid: b.uhid, discardUhid: a.uhid, keepName: b.name, discardName: a.name })}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Keep {b.name} ({b.uhid})
          </button>
          <button onClick={() => setAction({ type: 'update-id' })}
            className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-blue-50 transition-colors">
            Update ID
          </button>
          <button onClick={() => setAction({ type: 'flag' })}
            className="px-3 py-1.5 text-sm border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors">
            Flag for Follow-up
          </button>
        </div>
      )}

      {action?.type === 'merge' && (
        <MergePanel action={action} onConfirm={handleMerge} onCancel={resetAction} submitting={submitting} />
      )}
      {action?.type === 'update-id' && (
        <UpdateIdPanel patients={[a, b]} targetUhid={targetUhid} setTargetUhid={setTargetUhid}
          newIdNumber={newIdNumber} setNewIdNumber={setNewIdNumber}
          onConfirm={handleUpdateId} onCancel={resetAction} submitting={submitting} />
      )}
      {action?.type === 'flag' && (
        <FlagPanel patients={[a, b]} targetUhid={targetUhid} setTargetUhid={setTargetUhid}
          onConfirm={handleFlag} onCancel={resetAction} submitting={submitting} />
      )}
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const DuplicatePatients = () => {
  const [pairs, setPairs]     = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDuplicates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await patientService.getDuplicates();
      setPairs(res?.data || []);
    } catch {
      toast.error('Failed to load duplicate patients. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDuplicates(); }, [loadDuplicates]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Duplicate Patients</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Patients sharing the same ID number, Passport, or Birth Certificate
          </p>
        </div>
        {!loading && (
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${
            pairs.length === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {pairs.length === 0 ? 'No duplicates found' : `${pairs.length} pair${pairs.length !== 1 ? 's' : ''} found`}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : pairs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <CheckCircle className="w-12 h-12 text-green-500" />
          <p className="text-lg font-medium text-gray-700">All clear</p>
          <p className="text-sm text-gray-400">No patients currently share an ID number.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pairs.map((pair) => (
            <PairCard key={pair[0].idNumber} pair={pair} onResolved={loadDuplicates} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DuplicatePatients;
