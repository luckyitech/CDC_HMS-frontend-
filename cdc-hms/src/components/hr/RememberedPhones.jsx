import { useState, useEffect, useCallback } from 'react';
import { Smartphone } from 'lucide-react';
import hrService from '../../services/hrService';
import { notify } from '../../utils/notify';
import ConfirmActionModal from '../shared/ConfirmActionModal';
import Modal from '../shared/Modal';
import { dayLabel, hhmmOf } from './hrFormat';

/**
 * RememberedPhones — the phone that checks a person in at the entrance tag
 * (HR Suite, B21). On the staff file's Access tab for hr.tags and
 * hr.devices.register holders; the person's own list lives on My attendance.
 *
 * Since 17 Oct 2026 (Emu) only hr.devices.register holders register a phone:
 * "Register a phone" issues a one-time code the person enters on their phone
 * at the tap page (10 minutes, works once). One phone per person — the new
 * one replaces the old. Revoking is immediate: the next tap asks for a code.
 */
const RememberedPhones = ({ userId, firstName, canRevoke, canRegister }) => {
  const [devices, setDevices] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [issued, setIssued] = useState(null);   // { code, expiresAt }
  const [askReplace, setAskReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(() => hrService.devicesOf(userId)
    .then((res) => setDevices(res?.data || []))
    .catch(() => setDevices([])), [userId]);   // a 403 here just hides the list

  useEffect(() => { if (userId) load(); }, [userId, load]);

  // The code's countdown, only while it is on screen.
  useEffect(() => {
    if (!issued) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [issued]);

  const revoke = async () => {
    const d = confirm; setConfirm(null);
    try {
      await hrService.revokeDevice(d.id);
      setDevices((prev) => prev.filter((x) => x.id !== d.id));
      notify('success', 'Phone removed — it will no longer check this person in.');
    } catch (e) { notify('error', e?.message || 'Could not remove the phone'); }
  };

  const issue = async () => {
    setAskReplace(false);
    setBusy(true);
    try {
      const res = await hrService.phoneCode(userId);
      setNow(Date.now());
      setIssued(res.data);
    } catch (e) { notify('error', e?.message || 'Could not create a registration code'); }
    finally { setBusy(false); }
  };

  const closeCode = () => { setIssued(null); load(); };

  if (devices === null) return null;
  const who = firstName || 'this person';
  const left = issued ? Math.max(0, Math.round((new Date(issued.expiresAt).getTime() - now) / 1000)) : 0;
  const shown = issued ? `${issued.code.slice(0, 4)}-${issued.code.slice(4)}` : '';

  return (
    <div className="ui-surface p-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="text-sm font-semibold text-gray-800">Check-in phone</h3>
        {canRegister && (
          <button type="button" disabled={busy} onClick={() => (devices.length ? setAskReplace(true) : issue())}
            className="text-xs font-semibold text-primary border border-primary/30 rounded-lg px-2 py-1 hover:bg-primary/5 disabled:opacity-60">
            {devices.length ? 'Register a new phone' : 'Register a phone'}
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-3">The phone that checks {who} in at the entrance tag. It can only check in and out — it never signs in to the HMS. Remove it if it is lost, replaced or shared.</p>
      {devices.length === 0 ? <p className="text-sm text-gray-500">None registered.</p> : devices.map((d) => (
        <div key={d.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0 text-sm">
          <Smartphone className="w-4 h-4 text-gray-400 flex-none" />
          <div className="flex-1 min-w-0 text-gray-800">{d.label}
            <div className="text-[11px] text-gray-500">
              {d.registeredBy ? `Registered by ${d.registeredBy}` : 'Remembered by themselves'} {dayLabel(String(d.createdAt).slice(0, 10), true)} · last used {dayLabel(String(d.lastSeenAt).slice(0, 10))} {hhmmOf(d.lastSeenAt)}{d.lastIp ? ` · ${d.lastIp}` : ''}
            </div>
          </div>
          {canRevoke && <button type="button" onClick={() => setConfirm(d)} className="text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg px-2 py-1 hover:bg-gray-50">Revoke</button>}
        </div>
      ))}

      <ConfirmActionModal isOpen={!!confirm} onClose={() => setConfirm(null)} onConfirm={revoke} title="Revoke this phone?" message={`"${confirm?.label}" will no longer check ${who} in.`} confirmLabel="Revoke" confirmVariant="danger" />
      <ConfirmActionModal isOpen={askReplace} onClose={() => setAskReplace(false)} onConfirm={issue} title="Register a new phone?"
        message={`One phone per person: when ${who} enters the code on the new phone, "${devices[0]?.label}" stops checking them in.`} confirmLabel="Get a code" />

      <Modal isOpen={!!issued} onClose={closeCode} title={`Register ${who}'s phone`}>
        {issued && (
          <div className="flex flex-col gap-3 text-sm text-gray-700">
            <p>On <b>{who}'s own phone</b>, tap the entrance tag (or open <span className="font-mono text-xs">/hr/tap</span>) and enter:</p>
            <div className={`text-center text-3xl font-bold tracking-[0.25em] tabular-nums rounded-xl py-4 ${left ? 'bg-gray-50 text-gray-900' : 'bg-gray-50 text-gray-300 line-through'}`}>{shown}</div>
            <p className="text-xs text-gray-500 text-center">
              {left ? `Works once · ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} left` : 'This code has expired — close and get a new one.'}
            </p>
            <p className="text-xs text-gray-500">Watch it being entered on their phone, not someone else's. {who} and HR are told when the phone is registered.</p>
            <button type="button" onClick={closeCode} className="self-end rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Done</button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RememberedPhones;
