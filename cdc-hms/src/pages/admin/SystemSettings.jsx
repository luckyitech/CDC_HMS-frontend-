import { useState, useEffect } from 'react';
import { KeyRound, Check } from 'lucide-react';
import Card from '../../components/shared/Card';
import Spinner from '../../components/shared/Spinner';
import Toggle from '../../components/shared/Toggle';
import ConfirmActionModal from '../../components/shared/ConfirmActionModal';
import settingsService from '../../services/settingsService';
import { notify } from '../../utils/notify';

const ROLE_LABELS = { doctor: 'Doctors', staff: 'Staff', lab: 'Lab technicians', nurse: 'Nurses' };

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

  // Shortening the interval can bring people due who were fine a moment ago, so
  // the recomputed counts come straight back from the server.
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
    enabled, interval, intervalLabel, intervalOptions = [], affectedRoles = [],
    minimumPasswordAgeDays = 0, dueCount = 0, dueSoonCount = 0, totalStaff = 0,
  } = rotation;
  const roleList = affectedRoles.map((r) => ROLE_LABELS[r] || r).join(', ');
  const period = (intervalLabel || '').replace(/^every /, '');

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">System Settings</h2>
        <p className="text-gray-600 mt-1">Clinic-wide policies and access controls</p>
      </div>

      {/* Card is used without its `title` prop so the switch can sit on the
          header row itself, which is where a settings toggle belongs. */}
      <Card>
        <div className="flex items-center justify-between gap-4 pb-4 border-b">
          <div className="flex items-center gap-3">
            <KeyRound className="w-5 h-5 text-gray-700 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Staff password policy</h3>
              <p className="text-sm text-gray-500">{roleList}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-sm text-gray-700">{enabled ? 'On' : 'Off'}</span>
            <Toggle
              checked={enabled}
              disabled={saving}
              onChange={handleToggle}
              label="Scheduled password rotation"
            />
          </div>
        </div>

        <p className="mt-5 text-sm text-gray-600 leading-relaxed max-w-prose">
          Each person must set a new password on the schedule below. The clock runs from
          when they last changed their own, so a password set on a Saturday still lasts the
          full period. Anyone overdue is held on the Change Password screen at their next
          login. Administrators and patients are not affected.
        </p>

        {/* One segmented control rather than three separate cards — the options
            are mutually exclusive, so they should read as one choice. */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 border rounded-lg overflow-hidden">
          {intervalOptions.map((opt, i) => {
            const isSelected = opt.value === interval;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={saving}
                aria-pressed={isSelected}
                onClick={() => applyInterval(opt.value)}
                className={`relative p-4 text-left transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  i > 0 ? 'border-t sm:border-t-0 sm:border-l' : ''
                } ${isSelected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}
              >
                {isSelected && (
                  <Check className="absolute top-3 right-3 w-4 h-4 text-primary" strokeWidth={3} />
                )}
                <span className={`block text-sm ${isSelected ? 'font-semibold text-primary' : 'text-gray-700'}`}>
                  {opt.description}
                </span>
                <span className="block mt-0.5 text-xs text-gray-500">{opt.duration}</span>
              </button>
            );
          })}
        </div>

        {/* Expiries are staggered, so there is no clinic-wide rotation date to
            show. What the admin can act on is who is due and who is next. */}
        <div className="mt-6 pt-5 border-t flex gap-10">
          <div>
            <p className="text-2xl font-semibold text-gray-800 leading-none">
              {dueCount}
              <span className="text-base font-normal text-gray-400"> / {totalStaff}</span>
            </p>
            <p className="mt-1.5 text-sm text-gray-500">Due now</p>
          </div>
          <div className="border-l pl-10">
            <p className="text-2xl font-semibold text-gray-800 leading-none">{dueSoonCount}</p>
            <p className="mt-1.5 text-sm text-gray-500">Due within 7 days</p>
          </div>
        </div>

        {minimumPasswordAgeDays > 0 && (
          <p className="mt-4 text-xs text-gray-400 leading-relaxed">
            A password someone has just chosen is never expired within its first{' '}
            {minimumPasswordAgeDays} days, even if you shorten the interval.
          </p>
        )}
      </Card>

      <ConfirmActionModal
        isOpen={confirmingEnable}
        onClose={() => setConfirmingEnable(false)}
        onConfirm={() => applyRotation(true)}
        title="Turn on scheduled password rotation?"
        message={
          dueCount > 0
            ? `This takes effect immediately. ${dueCount} of ${totalStaff} active staff have a password older than one ${period} — or have never set their own — and will be held on the Change Password screen at their next login until they set a new one. After that each person rotates ${intervalLabel}, counted from their own last change.`
            : `This takes effect immediately. ${roleList} will be asked to set a new password ${intervalLabel}, counted from their own last change.`
        }
        confirmLabel="Turn on"
      />
    </div>
  );
};

export default SystemSettings;
