import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import hrService from '../../../services/hrService';
import leaveService from '../../../services/leaveService';
import Spinner from '../../shared/Spinner';
import { notify } from '../../../utils/notify';
import { Section, inputCls, primaryButtonCls } from '../hrUi';

/**
 * CredentialsReminders — Leave settings → "Credentials & reminders" tab
 * (B27 phase 5, mockup 5D). All three settings live in the HR Suite settings
 * (utils/hrConfig, area "HR Suite"), so this needs hr.settings and every change
 * lands on the HR trail.
 *
 *  - CPD targets: points per calendar year, per cadre (0 = no target).
 *  - Expiry reminders: which days before expiry a reminder goes out.
 *  - Team calendar: which leave types show their name to non-managers. Sick is
 *    locked private (health data) and can never be ticked.
 *
 * Props: canEdit
 */
const CADRES = [['doctor', 'Doctor'], ['nurse', 'Nurse'], ['lab', 'Lab'], ['staff', 'Reception / staff']];
const LOCKED = new Set(['Sick']);   // mirrors leaveService.PRIVATE_TYPES

const CredentialsReminders = ({ canEdit }) => {
  const [cfg, setCfg] = useState(null);      // { cpdTargets, expiryThresholds, calendarVisibleTypes }
  const [types, setTypes] = useState([]);    // active leave types
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newDay, setNewDay] = useState('');

  useEffect(() => {
    Promise.all([hrService.settings(), leaveService.types()])
      .then(([s, t]) => {
        const c = {
          cpdTargets: { doctor: 0, nurse: 0, lab: 0, staff: 0, ...(s?.data?.cpdTargets || {}) },
          expiryThresholds: [...(s?.data?.expiryThresholds || [60, 30, 7, 0])],
          calendarVisibleTypes: [...(s?.data?.calendarVisibleTypes || [])],
        };
        setCfg(c); setSaved(JSON.stringify(c));
        setTypes((t?.data || []).filter((x) => x.status === 'active'));
      })
      .catch((e) => { notify('error', e?.message || 'Could not load settings'); setCfg({ cpdTargets: {}, expiryThresholds: [], calendarVisibleTypes: [] }); });
  }, []);

  if (!cfg) return <Spinner />;
  const dirty = JSON.stringify(cfg) !== saved;

  const setTarget = (cadre, v) => setCfg((c) => ({ ...c, cpdTargets: { ...c.cpdTargets, [cadre]: v } }));
  const removeDay = (d) => setCfg((c) => ({ ...c, expiryThresholds: c.expiryThresholds.filter((x) => x !== d) }));
  const addDay = () => {
    const d = parseInt(newDay, 10);
    if (!Number.isInteger(d) || d < 0 || d > 3650) { notify('error', 'Give a whole number of days'); return; }
    setCfg((c) => ({ ...c, expiryThresholds: [...new Set([...c.expiryThresholds, d])].sort((a, b) => b - a) }));
    setNewDay('');
  };
  const toggleType = (key, on) => setCfg((c) => ({
    ...c, calendarVisibleTypes: on ? [...new Set([...c.calendarVisibleTypes, key])] : c.calendarVisibleTypes.filter((k) => k !== key),
  }));

  const save = async () => {
    setSaving(true);
    try {
      const targets = Object.fromEntries(CADRES.map(([k]) => [k, Number(cfg.cpdTargets[k]) || 0]));
      const res = await hrService.saveSettings({
        cpdTargets: targets,
        expiryThresholds: cfg.expiryThresholds,
        calendarVisibleTypes: cfg.calendarVisibleTypes,
      });
      if (res?.success) {
        const c = {
          cpdTargets: { doctor: 0, nurse: 0, lab: 0, staff: 0, ...(res.data.cpdTargets || {}) },
          expiryThresholds: [...(res.data.expiryThresholds || [])],
          calendarVisibleTypes: [...(res.data.calendarVisibleTypes || [])],
        };
        setCfg(c); setSaved(JSON.stringify(c));
        notify('success', 'Credentials & reminders saved.');
      }
    } catch (e) { notify('error', e?.message || 'Could not save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <Section title="CPD targets — points per calendar year">
        <table className="w-full text-sm max-w-sm">
          <tbody>
            {CADRES.map(([key, label]) => (
              <tr key={key} className="border-b border-gray-100 last:border-0">
                <td className="py-1.5 text-gray-700">{label}</td>
                <td className="py-1.5 text-right">
                  <input type="number" min="0" max="1000" className={`${inputCls} w-24 text-right`} disabled={!canEdit}
                    value={cfg.cpdTargets[key] ?? 0} onChange={(e) => setTarget(key, e.target.value)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[11px] text-gray-400 mt-2">0 = no target (the CPD bar just tallies points). Counted per calendar year, reset 1 Jan. The bar fills with verified points only.</p>
      </Section>

      <Section title="Expiry reminders">
        <p className="text-xs text-gray-500 mb-2">A reminder goes out this many days before a licence or staff document expires, then stops — no nagging after expiry. Sent to the person and to holders of “Verify CPD &amp; credentials”.</p>
        <div className="flex flex-wrap items-center gap-2">
          {cfg.expiryThresholds.length === 0 && <span className="text-sm text-gray-400">No reminders.</span>}
          {cfg.expiryThresholds.map((d) => (
            <span key={d} className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1">
              {d === 0 ? 'On the day' : `${d} days`}
              {canEdit && <button type="button" aria-label={`Remove ${d}`} onClick={() => removeDay(d)} className="hover:text-blue-900"><X className="w-3 h-3" /></button>}
            </span>
          ))}
          {canEdit && (
            <span className="inline-flex items-center gap-1">
              <input type="number" min="0" max="3650" value={newDay} onChange={(e) => setNewDay(e.target.value)} placeholder="days" className={`${inputCls} w-20`} />
              <button type="button" onClick={addDay} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"><Plus className="w-3.5 h-3.5" /> Add</button>
            </span>
          )}
        </div>
      </Section>

      <Section title="Team calendar — leave types staff can see">
        <p className="text-xs text-gray-500 mb-2">A ticked type shows its <b>name</b> to everyone on the team calendar. An unticked one shows as <b>“Away”</b> (dates only) to non-managers; holders of “See everyone’s leave” always see the real type (sick leave only with “Sick-leave details”).</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {types.map((t) => {
            const locked = LOCKED.has(t.key);
            return (
              <label key={t.key} className={`inline-flex items-center gap-2 ${locked ? 'opacity-60' : ''}`}>
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary disabled:opacity-40"
                  checked={!locked && cfg.calendarVisibleTypes.includes(t.key)} disabled={!canEdit || locked}
                  onChange={(e) => toggleType(t.key, e.target.checked)} />
                {t.name}
                {locked && <span className="rounded-full bg-red-50 text-red-700 text-[10px] font-semibold px-2 py-0.5">private — health data</span>}
              </label>
            );
          })}
        </div>
      </Section>

      {canEdit ? (
        <div className="flex justify-end">
          <button type="button" onClick={save} disabled={!dirty || saving} className={primaryButtonCls}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      ) : (
        <p className="text-xs text-amber-700">Changing these needs the “HR Suite settings” permission.</p>
      )}
    </div>
  );
};

export default CredentialsReminders;
