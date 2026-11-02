import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { KeyRound, Check, Inbox, MessageCircle, Layers, Mail, Puzzle, ShieldCheck } from 'lucide-react';
import Card from '../../components/shared/Card';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import Toggle from '../../components/shared/Toggle';
import SwitcherTabs from '../../components/shared/SwitcherTabs';
import ConfirmActionModal from '../../components/shared/ConfirmActionModal';
import LabInboxSettingsTab from '../../components/admin/settings/LabInboxSettingsTab';
import WhatsAppSettingsTab from '../../components/admin/settings/WhatsAppSettingsTab';
import PermissionPresetsTab from '../../components/admin/settings/PermissionPresetsTab';
import EmailSettingsTab from '../../components/admin/settings/EmailSettingsTab';
import SpecialistModulesTab from '../../components/admin/settings/SpecialistModulesTab';
import SigninSecurityTab from '../../components/admin/settings/SigninSecurityTab';
import { useUserContext } from '../../contexts/UserContext';
import { passesAdminGate, canEditSigninSecurity, PERMISSIONS } from '../../utils/permissions';

// The settings page is tabbed — one tab per settings area. Add an entry here
// (and a component) to grow it; the password policy stays the first tab.
// `gate` decides who sees the tab: most need config.write (or admin.access);
// Sign-in security needs its own IT and security grant (16 Oct 2026), so
// someone holding only that sees only that tab.
const configGate = (u) => passesAdminGate(u, PERMISSIONS.CONFIG_WRITE);
const SETTINGS_TABS = [
  { id: 'password', label: 'Password policy', Icon: KeyRound, gate: configGate },
  { id: 'labInbox', label: 'Lab Inbox',       Icon: Inbox, gate: configGate },
  { id: 'whatsapp', label: 'WhatsApp',        Icon: MessageCircle, gate: configGate },
  { id: 'email',    label: 'Email',           Icon: Mail, gate: configGate },
  { id: 'presets',  label: 'Permission presets', Icon: Layers, gate: configGate },
  { id: 'modules',  label: 'Specialist modules', Icon: Puzzle, gate: configGate },
  { id: 'signin',   label: 'Sign-in security', Icon: ShieldCheck, gate: canEditSigninSecurity },
];
import settingsService from '../../services/settingsService';
import { notify } from '../../utils/notify';

const ROLE_LABELS = { doctor: 'Doctors', staff: 'Staff', lab: 'Lab technicians', nurse: 'Nurses' };

const SystemSettings = () => {
  const { currentUser } = useUserContext();
  const tabs = SETTINGS_TABS.filter((t) => t.gate(currentUser));
  const canConfig = configGate(currentUser);
  // ?tab=signin opens a tab directly (the Sign-ins page links to Sign-in security).
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(() => {
    const wanted = searchParams.get('tab');
    return tabs.find((t) => t.id === wanted)?.id || tabs[0]?.id || 'password';
  });
  const [rotation, setRotation] = useState(null);  // null = loading
  const [saving, setSaving] = useState(false);
  const [confirmingEnable, setConfirmingEnable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Someone who holds only Sign-in security never reads the password policy.
    if (!canConfig) { setRotation({}); return undefined; }
    settingsService.getPasswordRotation()
      .then((res) => { if (!cancelled && res.success) setRotation(res.data); })
      .catch((err) => {
        if (!cancelled) {
          setRotation({ error: true });
          notify('error', err.message || 'Failed to load system settings');
        }
      });
    return () => { cancelled = true; };
  }, [canConfig]);

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
    <div>
      <PageHeader title="System Settings" subtitle="Clinic-wide policies and access controls" />

      <SwitcherTabs tabs={tabs} active={tab} onChange={setTab} className="mb-4" />

      {tab === 'labInbox' && <LabInboxSettingsTab />}
      {tab === 'whatsapp' && <WhatsAppSettingsTab />}
      {tab === 'email'    && <EmailSettingsTab />}
      {tab === 'presets'  && <PermissionPresetsTab currentUser={currentUser} />}
      {tab === 'modules'  && <SpecialistModulesTab />}
      {tab === 'signin'   && <SigninSecurityTab />}

      {/* Card is used without its `title` prop so the switch can sit on the
          header row itself, which is where a settings toggle belongs. */}
      {tab === 'password' && (
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
                } ${isSelected ? 'bg-blue-50' : 'bg-white ui-hover'}`}
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
      )}

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
