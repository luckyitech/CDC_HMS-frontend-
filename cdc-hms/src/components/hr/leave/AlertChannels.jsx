import { useState, useEffect } from 'react';
import { Bell, Mail, MessageCircle, UserRound } from 'lucide-react';
import hrService from '../../../services/hrService';
import Spinner from '../../shared/Spinner';
import { notify } from '../../../utils/notify';
import { primaryButtonCls } from '../hrUi';

/**
 * AlertChannels — which HR alerts go out by bell and by email (B27, D9,
 * revision D). Stored in the `hr.alerts` setting through /api/hr/settings, so
 * changing it needs hr.settings and every change lands on the HR Suite trail.
 *
 * WhatsApp is shown but greyed until the HMS WhatsApp number is registered
 * (B18). The person's own profile always shows everything — not a channel
 * anyone can switch off.
 *
 * Props: canEdit
 */
const EVENTS = [
  { key: 'leave_to_approve',      label: 'You are asked to approve leave',          group: 'Leave' },
  { key: 'leave_acknowledge',     label: 'You are told about a colleague\'s leave', group: 'Leave', hint: 'acknowledger' },
  { key: 'leave_decided',         label: 'Your leave is approved or declined',       group: 'Leave' },
  { key: 'leave_info_requested',  label: 'More information is asked for',            group: 'Leave' },
  { key: 'leave_info_replied',    label: 'The applicant replies',                    group: 'Leave' },
  { key: 'leave_cancelled',       label: 'Leave is withdrawn or cancelled',          group: 'Leave' },
  { key: 'leave_cover_request',   label: 'Someone asks you to cover their work',     group: 'Leave' },
  { key: 'leave_cover_answered',  label: 'Your cover answers',                       group: 'Leave' },
  { key: 'change_request_new',    label: 'Someone asks to change their profile',     group: 'Profile', hint: 'to HR' },
  { key: 'change_request_decided', label: 'Your profile change is decided',          group: 'Profile' },
  { key: 'expiry_self',           label: 'Your licence or certificate is expiring',  group: 'Credentials' },
  { key: 'expiry_hr',             label: 'Someone\'s licence or certificate is expiring', group: 'Credentials', hint: 'to HR' },
];

const Check = ({ checked, onChange, disabled, label }) => (
  <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} aria-label={label}
    className="h-4 w-4 rounded border-gray-300 text-primary disabled:opacity-40" />
);

const AlertChannels = ({ canEdit }) => {
  const [alerts, setAlerts] = useState(null);
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    hrService.settings()
      .then((res) => { setAlerts(res?.data?.alerts || {}); setSaved(JSON.stringify(res?.data?.alerts || {})); })
      .catch((e) => { notify('error', e?.message || 'Could not load alert settings'); setAlerts({}); });
  }, []);

  if (!alerts) return <Spinner />;
  const dirty = JSON.stringify(alerts) !== saved;
  const set = (event, channel, value) => setAlerts((a) => ({ ...a, [event]: { ...a[event], [channel]: value } }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await hrService.saveSettings({ alerts });
      if (res?.success) { setAlerts(res.data.alerts); setSaved(JSON.stringify(res.data.alerts)); notify('success', 'Alert channels saved.'); }
    } catch (e) { notify('error', e?.message || 'Could not save'); }
    finally { setSaving(false); }
  };

  let lastGroup = null;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 max-w-3xl">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Leave and HR alerts</h3>
      <p className="text-xs text-gray-500 mb-3">
        Who hears about what, and how. Emails come from the clinic address and never name the type or reason of sick leave.
        Alerts start going out as each part arrives — leave with the application wizard, profile and credential alerts after that.
        WhatsApp joins once the HMS WhatsApp number is registered.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
              <th className="text-left font-semibold py-1.5 pr-2">Event</th>
              <th className="font-semibold py-1.5 px-2 text-center"><Bell className="w-3.5 h-3.5 inline" /> Bell</th>
              <th className="font-semibold py-1.5 px-2 text-center"><Mail className="w-3.5 h-3.5 inline" /> Email</th>
              <th className="font-semibold py-1.5 px-2 text-center text-gray-400"><MessageCircle className="w-3.5 h-3.5 inline" /> WhatsApp</th>
              <th className="font-semibold py-1.5 px-2 text-center"><UserRound className="w-3.5 h-3.5 inline" /> Profile</th>
            </tr>
          </thead>
          <tbody>
            {EVENTS.map((e) => {
              const row = alerts[e.key] || {};
              const header = e.group !== lastGroup ? e.group : null;
              lastGroup = e.group;
              return [
                header && (
                  <tr key={`g-${header}`}><td colSpan={5} className="pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{header}</td></tr>
                ),
                <tr key={e.key} className="border-b border-gray-100">
                  <td className="py-1.5 pr-2 text-gray-800">{e.label}{e.hint && <span className="text-gray-400"> · {e.hint}</span>}</td>
                  <td className="py-1.5 px-2 text-center"><Check checked={!!row.bell} onChange={(v) => set(e.key, 'bell', v)} disabled={!canEdit} label={`${e.label} — bell`} /></td>
                  <td className="py-1.5 px-2 text-center"><Check checked={!!row.email} onChange={(v) => set(e.key, 'email', v)} disabled={!canEdit} label={`${e.label} — email`} /></td>
                  <td className="py-1.5 px-2 text-center text-[11px] text-gray-400" title="Once the HMS WhatsApp number is registered">not yet</td>
                  <td className="py-1.5 px-2 text-center text-[11px] text-gray-500">always</td>
                </tr>,
              ];
            })}
          </tbody>
        </table>
      </div>
      {canEdit ? (
        <div className="flex justify-end mt-3">
          <button type="button" onClick={save} disabled={!dirty || saving} className={primaryButtonCls}>{saving ? 'Saving…' : 'Save alerts'}</button>
        </div>
      ) : (
        <p className="text-xs text-amber-700 mt-3">Changing alerts needs the "HR Suite settings" permission.</p>
      )}
    </div>
  );
};

export default AlertChannels;
