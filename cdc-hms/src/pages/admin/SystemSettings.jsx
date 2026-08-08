import { useState, useEffect } from 'react';
import { ShieldCheck, CalendarClock, AlertTriangle, Users } from 'lucide-react';
import Card from '../../components/shared/Card';
import Spinner from '../../components/shared/Spinner';
import ConfirmActionModal from '../../components/shared/ConfirmActionModal';
import settingsService from '../../services/settingsService';
import { notify } from '../../utils/notify';

const ROLE_LABELS = { doctor: 'Doctors', staff: 'Staff', lab: 'Lab technicians' };

// 'YYYY-MM-DD' → 'Monday, 10 August 2026'. Split rather than new Date(str) so a
// plain date string is never shifted a day by the browser's timezone.
const formatDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
};

// A plain on/off switch. Kept local — this is the only page that has one so far.
const Toggle = ({ checked, disabled, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-7 w-14 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
      checked ? 'bg-green-500' : 'bg-gray-300'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-300 ${
        checked ? 'translate-x-7' : 'translate-x-0'
      }`}
    />
  </button>
);

const SystemSettings = () => {
  const [rotation, setRotation] = useState(null);  // null = loading
  const [saving, setSaving] = useState(false);
  const [confirmingEnable, setConfirmingEnable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    settingsService.getPasswordRotation()
      .then((res) => { if (!cancelled && res.success) setRotation(res.data); })
      .catch((err) => {
        if (!cancelled) {
          setRotation({ error: true });
          notify('error', err.message || 'Failed to load system settings');
        }
      });
    return () => { cancelled = true; };
  }, []);

  const save = async (changes, onSuccess) => {
    setSaving(true);
    try {
      const res = await settingsService.setPasswordRotation(changes);
      if (res.success) {
        setRotation(res.data);
        onSuccess(res.data);
      }
    } catch (err) {
      notify('error', err.message || 'Failed to update the setting');
    } finally {
      setSaving(false);
      setConfirmingEnable(false);
    }
  };

  const applyRotation = (enabled) => save({ enabled }, (data) =>
    notify('success', enabled
      ? `Password rotation is on. Staff will be asked for a new password ${data.intervalLabel}.`
      : 'Password rotation is off. Staff keep their current passwords.')
  );

  // Shortening the interval can expire people who were fine a moment ago, so
  // the recomputed due count comes straight back from the server and the
  // banner below updates with it.
  const applyInterval = (interval) => {
    if (interval === rotation.interval) return;
    save({ interval }, (data) =>
      notify('success', `Staff will now set a new password ${data.intervalLabel}.`)
    );
  };

  // Turning it ON locks people out of their work until they pick a new
  // password, so it asks first and says how many people that is. Turning it
  // OFF only removes a restriction — no confirmation needed.
  const handleToggle = (next) => {
    if (next) setConfirmingEnable(true);
    else applyRotation(false);
  };

  if (rotation === null) {
    return <div className="flex items-center justify-center h-64"><Spinner /></div>;
  }

  const {
    enabled, interval, intervalLabel, intervalOptions = [], rotationDay,
    affectedRoles = [], nextRotation, dueCount = 0, totalStaff = 0,
  } = rotation;
  const roleList = affectedRoles.map((r) => ROLE_LABELS[r] || r).join(', ');

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-6">System Settings</h2>

      <Card title="🔐 Staff Password Policy">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Scheduled password rotation
            </h4>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              Requires {roleList.toLowerCase()} to set a new password {intervalLabel}.
              Anyone whose password predates the current period is sent to the Change
              Password screen at their next login and cannot use the rest of the system
              until they set a new one.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Rotation always falls on a {rotationDay}. Administrators and patients are
              not affected.
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 pt-1">
            <Toggle checked={enabled} disabled={saving} onChange={handleToggle} />
            <span className={`text-xs font-bold uppercase tracking-wide ${enabled ? 'text-green-600' : 'text-gray-400'}`}>
              {enabled ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* How often. Editable whether or not the feature is on, so the admin
            can line the schedule up before switching it on. */}
        <fieldset className="mt-6">
          <legend className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
            How often
          </legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {intervalOptions.map((opt) => {
              const isSelected = opt.value === interval;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={saving}
                  onClick={() => applyInterval(opt.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                    isSelected
                      ? 'border-primary bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <span className={`block text-sm font-semibold ${isSelected ? 'text-primary' : 'text-gray-800'}`}>
                    {opt.description}
                  </span>
                  <span className="block mt-0.5 text-xs text-gray-500">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-800">
              <CalendarClock className="w-4 h-4" />
              Next rotation
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-800">{formatDate(nextRotation)}</p>
          </div>

          <div className={`p-4 rounded-lg border-l-4 ${dueCount > 0 ? 'bg-amber-50 border-amber-500' : 'bg-gray-50 border-gray-400'}`}>
            <p className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${dueCount > 0 ? 'text-amber-800' : 'text-gray-600'}`}>
              <Users className="w-4 h-4" />
              Due for a change
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-800">
              {dueCount} of {totalStaff} active staff
            </p>
          </div>
        </div>

        {enabled && dueCount > 0 && (
          <div className="mt-4 p-4 bg-amber-50 rounded-lg border-l-4 border-amber-500 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">
              <strong>{dueCount}</strong> {dueCount === 1 ? 'person is' : 'people are'} currently
              being asked to set a new password before they can work. This clears itself as they
              log in and change it — no action needed from you.
            </p>
          </div>
        )}
      </Card>

      <ConfirmActionModal
        isOpen={confirmingEnable}
        onClose={() => setConfirmingEnable(false)}
        onConfirm={() => applyRotation(true)}
        title="Turn on scheduled password rotation?"
        message={
          dueCount > 0
            ? `This takes effect immediately. ${dueCount} of ${totalStaff} active staff will be sent to the Change Password screen at their next login and cannot use the system until they set a new password. After that they rotate ${intervalLabel}.`
            : `This takes effect immediately. ${roleList} will be asked to set a new password ${intervalLabel}, before they can use the system.`
        }
        confirmLabel="Turn on"
      />
    </div>
  );
};

export default SystemSettings;
