import { useEffect, useState } from 'react';
import { Network, MapPin, Smartphone, BellRing, Plus, X, Loader2, Lock } from 'lucide-react';
import Card from '../../shared/Card';
import Toggle from '../../shared/Toggle';
import ConfirmActionModal from '../../shared/ConfirmActionModal';
import { Field, SwitchRow, inputCls, buttonCls, primaryButtonCls } from '../../hr/hrUi';
import signinService from '../../../services/signinService';
import { notify } from '../../../utils/notify';

// Monday first, as the clinic reads a week; values are the server's weekday numbers.
const DAYS = [[1, 'Monday'], [2, 'Tuesday'], [3, 'Wednesday'], [4, 'Thursday'], [5, 'Friday'], [6, 'Saturday'], [0, 'Sunday']];
const PROVIDER_LABELS = { ipapi: 'ipapi.co (no key needed)', ipinfo: 'ipinfo.io (your token)' };

const CardHead = ({ Icon, title, subtitle, right }) => (
  <div className="flex items-start justify-between gap-4 mb-4">
    <div className="flex items-start gap-3">
      <Icon className="w-5 h-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {right}
  </div>
);

// Module scope, never inside the tab: a component declared in render remounts
// on every keystroke (hrUi.jsx note).
const DayHoursRow = ({ label, value, onChange, disabled }) => {
  const off = value === 'off';
  const [start, end] = off ? ['07:00', '19:00'] : value;
  return (
    <div className="grid grid-cols-[96px_1fr] items-center gap-2 text-sm">
      <span className="text-gray-700">{label}</span>
      <span className="inline-flex items-center gap-2 flex-wrap">
        <select value={off ? 'off' : 'hours'} disabled={disabled} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          onChange={(e) => onChange(e.target.value === 'off' ? 'off' : [start, end])}>
          <option value="hours">Between</option>
          <option value="off">No sign-ins expected</option>
        </select>
        {!off && (
          <>
            <input type="time" value={start} disabled={disabled} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              onChange={(e) => onChange([e.target.value, end])} aria-label={`${label} from`} />
            <span className="text-gray-400">–</span>
            <input type="time" value={end} disabled={disabled} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              onChange={(e) => onChange([start, e.target.value])} aria-label={`${label} until`} />
          </>
        )}
      </span>
    </div>
  );
};

/**
 * System Settings → Sign-in security (16 Oct 2026, Emu). The clinic's own
 * networks, whether outside addresses are looked up, whether the device is
 * asked for its location at sign-in, and when a sign-in is flagged. Shown to
 * holders of "Change sign-in security settings" (IT and security) and the main
 * admin account; every change is in the Activity Log.
 */
const SigninSecurityTab = () => {
  const [cfg, setCfg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [net, setNet] = useState({ value: '', label: '' });
  const [token, setToken] = useState('');
  const [alerts, setAlerts] = useState(null);   // the alerts card's form
  const [confirmLock, setConfirmLock] = useState(false);

  const adopt = (data) => {
    setCfg(data);
    setAlerts({ alertChannels: data.alertChannels, rules: data.rules, hours: data.hours });
  };

  useEffect(() => {
    signinService.getSettings().then((r) => adopt(r.data))
      .catch((err) => notify('error', err?.message || 'Could not load the sign-in security settings.'));
  }, []);

  const save = async (changes, msg) => {
    setSaving(true);
    try {
      const res = await signinService.saveSettings(changes);
      setCfg((c) => ({ ...c, ...res.data }));
      if (changes.alertChannels || changes.rules || changes.hours) {
        setAlerts({ alertChannels: res.data.alertChannels, rules: res.data.rules, hours: res.data.hours });
      }
      // Re-read what depends on the change: whether "your address" is now a
      // clinic network, and whether the lock is still on (removing the last
      // network switches it off).
      signinService.getSettings().then((r) => setCfg((c) => ({ ...c, ...r.data }))).catch(() => {});
      if (msg) notify('success', msg);
      return true;
    } catch (err) {
      notify('error', err?.message || 'Could not save.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (!cfg || !alerts) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  const networks = cfg.networks || [];
  const you = cfg.yourAddress;
  const addNetwork = async (entry) => {
    const value = entry.value.trim();
    if (!value) { notify('error', 'Enter an address, e.g. 197.248.95.205, or a range, e.g. 197.248.95.0/24.'); return; }
    const ok = await save({ networks: [...networks, { value, label: entry.label.trim() || 'Clinic' }] }, 'Clinic network added.');
    if (ok) setNet({ value: '', label: '' });
  };
  const removeNetwork = (value) => save({ networks: networks.filter((n) => n.value !== value) }, 'Clinic network removed.');

  const setRule = (name, v) => setAlerts((a) => ({ ...a, rules: { ...a.rules, [name]: v } }));
  const setChannel = (name, v) => setAlerts((a) => ({ ...a, alertChannels: { ...a.alertChannels, [name]: v } }));
  const setDay = (day, v) => setAlerts((a) => ({ ...a, hours: { ...a.hours, [day]: v } }));
  const alertsDirty = JSON.stringify(alerts) !== JSON.stringify({ alertChannels: cfg.alertChannels, rules: cfg.rules, hours: cfg.hours });

  return (
    <div className="space-y-4">
      {/* ── Clinic networks ─────────────────────────────────────────── */}
      <Card>
        <CardHead Icon={Network} title="Clinic networks"
          subtitle="The clinic's own internet addresses. A sign-in from one of these is marked In clinic; anything else is Outside. Ask your internet provider, or add the address shown below from a clinic computer." />

        {you && (
          <div className="ui-surface px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-gray-700">
              Your current address: <span className="font-mono font-semibold text-gray-900">{you.ip}</span>
              {you.matches && <span className="ml-2 text-green-700">— already a clinic network</span>}
              {!you.public && <span className="ml-2 text-gray-500">— a private address (inside a local network), not usable here</span>}
            </span>
            {you.public && !you.matches && (
              <button type="button" className={buttonCls} disabled={saving}
                onClick={() => addNetwork({ value: you.ip, label: 'Clinic' })}>
                Add as clinic network
              </button>
            )}
          </div>
        )}

        {networks.length === 0 ? (
          <p className="text-sm text-gray-500 mb-4">None yet — until one is added every sign-in reads as Outside.</p>
        ) : (
          <ul className="divide-y divide-gray-100 mb-4">
            {networks.map((n) => (
              <li key={n.value} className="flex items-center justify-between py-2 text-sm">
                <span><span className="font-mono text-gray-900">{n.value}</span><span className="ml-3 text-gray-500">{n.label}</span></span>
                <button type="button" className="p-1 text-gray-400 hover:text-red-600" aria-label={`Remove ${n.value}`}
                  disabled={saving} onClick={() => removeNetwork(n.value)}>
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px_auto] gap-3 items-end">
          <Field label="Address or range">
            <input className={inputCls} value={net.value} onChange={(e) => setNet({ ...net, value: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') addNetwork(net); }} placeholder="197.248.95.205" />
          </Field>
          <Field label="Label">
            <input className={inputCls} value={net.label} onChange={(e) => setNet({ ...net, label: e.target.value })} placeholder="Main line" />
          </Field>
          <button type="button" className={`${buttonCls} inline-flex items-center gap-1.5`} disabled={saving} onClick={() => addNetwork(net)}>
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">One address (197.248.95.205) or a range (197.248.95.0/24).</p>
      </Card>

      {/* ── Network lock ────────────────────────────────────────────── */}
      <Card>
        <CardHead Icon={Lock} title="Network lock"
          subtitle="Outside the clinic's networks, only people with remote access can sign in or keep working. Someone without it who leaves the clinic network is signed out at their next action. Patients and the main admin account are never locked."
          right={<Toggle checked={!!cfg.lockOutside} disabled={saving || (!cfg.lockOutside && networks.length === 0)} label="Network lock"
            onChange={(v) => (v ? setConfirmLock(true) : save({ lockOutside: false }, 'The network lock is off — everyone can sign in from anywhere.'))} />} />
        {networks.length === 0 && (
          <p className="text-sm text-amber-700 mb-3">Add the clinic's network above first — without it every sign-in is outside.</p>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">Who can work outside the clinic</p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>The main admin account <span className="text-gray-400">(always)</span></li>
              {(cfg.remoteHolders || []).map((p) => (
                <li key={p.id}>{p.name} <span className="text-gray-400">· {p.role}</span></li>
              ))}
            </ul>
            <p className="text-[11px] text-gray-400 mt-2">
              Grant it on a person's Permissions tab → IT and security → Remote access. Full administrator access does not include it.
            </p>
          </div>
          <div>
            <SwitchRow label="Entrance-tag phones may check in from anywhere" checked={!!cfg.lockTapExempt} disabled={saving}
              onChange={(v) => save({ lockTapExempt: v }, v ? 'Remembered phones can check in from any network.' : 'Remembered phones follow the network lock.')}
              hint="Off: a phone must be on the clinic Wi-Fi to check in. On: phones on mobile data can check in — but a remembered phone can then open the HMS from anywhere." />
            <p className="text-xs text-gray-500 mt-3">
              You are {cfg.yourAddress?.matches ? 'on the clinic network' : 'outside the clinic network'};
              {cfg.youAreExempt ? ' your account can work outside the clinic.' : ' your account cannot work outside the clinic.'}
            </p>
          </div>
        </div>
      </Card>

      {/* ── Location lookup ─────────────────────────────────────────── */}
      <Card>
        <CardHead Icon={MapPin} title="Where outside sign-ins come from"
          subtitle="Looks up the approximate place of an address outside the clinic — country, town and network. Only the address is sent, once; the answer is kept. The country is reliable; the town is a guess (phone-data addresses often read as Nairobi)."
          right={<Toggle checked={!!cfg.lookupEnabled} disabled={saving} label="Look up outside addresses"
            onChange={(v) => save({ lookupEnabled: v }, v ? 'Location lookup is on.' : 'Location lookup is off.')} />} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Lookup service">
            <select className={inputCls} value={cfg.lookupProvider} disabled={saving}
              onChange={(e) => save({ lookupProvider: e.target.value }, 'Lookup service saved.')}>
              {(cfg.providers || ['ipapi', 'ipinfo']).map((p) => <option key={p} value={p}>{PROVIDER_LABELS[p] || p}</option>)}
            </select>
          </Field>
          {cfg.lookupProvider === 'ipinfo' && (
            <Field label="ipinfo token" hint={cfg.lookupTokenSet ? 'Set — leave blank to keep it.' : 'Not set.'}>
              <div className="flex gap-2">
                <input type="password" autoComplete="off" className={inputCls} value={token} onChange={(e) => setToken(e.target.value)} />
                <button type="button" className={buttonCls} disabled={saving || !token.trim()}
                  onClick={async () => { if (await save({ lookupToken: token.trim() }, 'Token saved.')) setToken(''); }}>Save</button>
              </div>
            </Field>
          )}
        </div>
      </Card>

      {/* ── Device location ─────────────────────────────────────────── */}
      <Card>
        <CardHead Icon={Smartphone} title="Ask the device for its location at sign-in"
          subtitle="The browser asks the person to share their location once they are signed in. It never stops or slows a sign-in; if they say no, the sign-in records Declined. Tell staff before switching this on."
          right={<Toggle checked={cfg.gpsMode === 'ask'} disabled={saving} label="Ask the device for its location"
            onChange={(v) => save({ gpsMode: v ? 'ask' : 'off' }, v ? 'Staff will be asked for their location at sign-in.' : 'Staff are no longer asked for their location.')} />} />
      </Card>

      {/* ── Alerts ──────────────────────────────────────────────────── */}
      <Card>
        <CardHead Icon={BellRing} title="Suspicious sign-in alerts"
          subtitle="Sent to the people granted “Receives suspicious sign-in alerts” (IT and security) and the main admin account. A flagged sign-in is marked on the Sign-ins page whether or not alerts are on."
          right={<Toggle checked={!!cfg.alertsEnabled} disabled={saving} label="Send suspicious sign-in alerts"
            onChange={(v) => save({ alertsEnabled: v }, v ? 'Alerts are on.' : 'Alerts are off.')} />} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Flag a sign-in when</p>
            <SwitchRow label="It is from a device this person has not used before" checked={alerts.rules.newDevice} onChange={(v) => setRule('newDevice', v)} disabled={saving}
              hint="Their first sign-in after this was switched on sets what is normal." />
            <SwitchRow label="It is from a country they have not signed in from" checked={alerts.rules.newCountry} onChange={(v) => setRule('newCountry', v)} disabled={saving}
              hint="Needs the location lookup above." />
            <SwitchRow label="It is from outside the clinic network" checked={alerts.rules.outsideClinic} onChange={(v) => setRule('outsideClinic', v)} disabled={saving}
              hint="Every outside sign-in — leave off if staff routinely work from home." />
            <SwitchRow label="There are repeated wrong passwords on one account" checked={alerts.rules.failedAttempts} onChange={(v) => setRule('failedAttempts', v)} disabled={saving} />
            {alerts.rules.failedAttempts && (
              <div className="grid grid-cols-2 gap-3 mt-2 mb-2">
                <Field label="Wrong passwords">
                  <input type="number" min={2} max={50} className={inputCls} value={alerts.rules.failedCount}
                    onChange={(e) => setRule('failedCount', Number(e.target.value))} disabled={saving} />
                </Field>
                <Field label="Within (minutes)">
                  <input type="number" min={1} max={1440} className={inputCls} value={alerts.rules.failedWindowMinutes}
                    onChange={(e) => setRule('failedWindowMinutes', Number(e.target.value))} disabled={saving} />
                </Field>
              </div>
            )}
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mt-4 mb-1">Send alerts by</p>
            <SwitchRow label="Notification bell" checked={alerts.alertChannels.bell} onChange={(v) => setChannel('bell', v)} disabled={saving} />
            <SwitchRow label="Email" checked={alerts.alertChannels.email} onChange={(v) => setChannel('email', v)} disabled={saving} />
          </div>

          <div>
            <SwitchRow label="Flag sign-ins outside these hours" checked={alerts.rules.outsideHours} onChange={(v) => setRule('outsideHours', v)} disabled={saving}
              hint="A clinic open around the clock leaves this off. Times are clinic time." />
            {alerts.rules.outsideHours && (
              <div className="space-y-2 mt-3">
                {DAYS.map(([d, label]) => (
                  <DayHoursRow key={d} label={label} value={alerts.hours[d]} disabled={saving} onChange={(v) => setDay(d, v)} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-5">
          <button type="button" className={primaryButtonCls} disabled={saving || !alertsDirty}
            onClick={() => save(alerts, 'Alert rules saved.')}>
            Save alert rules
          </button>
        </div>
      </Card>

      <ConfirmActionModal
        isOpen={confirmLock}
        onClose={() => setConfirmLock(false)}
        onConfirm={async () => { setConfirmLock(false); await save({ lockOutside: true }, 'The network lock is on.'); }}
        title="Switch on the network lock?"
        message={`From now on, only the main admin account${(cfg.remoteHolders || []).length ? ` and ${cfg.remoteHolders.length} ${cfg.remoteHolders.length === 1 ? 'person' : 'people'} with remote access` : ''} can sign in or keep working from outside the clinic network. Anyone else working from outside is signed out at their next action.`}
        confirmLabel="Switch on"
        confirmVariant="primary"
      />
    </div>
  );
};

export default SigninSecurityTab;
