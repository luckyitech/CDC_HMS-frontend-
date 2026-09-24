import { useState, useEffect } from 'react';
import { Smartphone } from 'lucide-react';
import hrService from '../../services/hrService';
import { notify } from '../../utils/notify';
import ConfirmActionModal from '../shared/ConfirmActionModal';
import { dayLabel, hhmmOf } from './hrFormat';

/**
 * RememberedPhones — the phones that check a person in without signing in
 * (HR Suite, B21). Shown on the staff file's Access tab for hr.write holders;
 * the person's own list lives on the HR dashboard. Revoking is immediate: the
 * next tap from that phone asks for a sign-in.
 */
const RememberedPhones = ({ userId, canRevoke }) => {
  const [devices, setDevices] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    hrService.devicesOf(userId)
      .then((res) => { if (!cancelled) setDevices(res?.data || []); })
      .catch(() => { if (!cancelled) setDevices([]); });   // a 403 here just hides the list
    return () => { cancelled = true; };
  }, [userId]);

  const revoke = async () => {
    const d = confirm; setConfirm(null);
    try {
      await hrService.revokeDevice(d.id);
      setDevices((prev) => prev.filter((x) => x.id !== d.id));
      notify('success', 'Phone removed — it will ask for a sign-in at the next tap.');
    } catch (e) { notify('error', e?.message || 'Could not remove the phone'); }
  };

  if (devices === null) return null;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-1">Remembered phones</h3>
      <p className="text-xs text-gray-400 mb-3">Phones that check this person in at the entrance tag without signing in. Remove one if it is lost, replaced or shared.</p>
      {devices.length === 0 ? <p className="text-sm text-gray-500">None.</p> : devices.map((d) => (
        <div key={d.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0 text-sm">
          <Smartphone className="w-4 h-4 text-gray-400 flex-none" />
          <div className="flex-1 min-w-0 text-gray-800">{d.label}
            <div className="text-[11px] text-gray-500">Remembered {dayLabel(String(d.createdAt).slice(0, 10), true)} · last used {dayLabel(String(d.lastSeenAt).slice(0, 10))} {hhmmOf(d.lastSeenAt)}{d.lastIp ? ` · ${d.lastIp}` : ''}</div>
          </div>
          {canRevoke && <button type="button" onClick={() => setConfirm(d)} className="text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg px-2 py-1 hover:bg-gray-50">Revoke</button>}
        </div>
      ))}
      <ConfirmActionModal isOpen={!!confirm} onClose={() => setConfirm(null)} onConfirm={revoke} title="Revoke this phone?" message={`"${confirm?.label}" will no longer check this person in without signing in.`} confirmLabel="Revoke" confirmVariant="danger" />
    </div>
  );
};

export default RememberedPhones;
