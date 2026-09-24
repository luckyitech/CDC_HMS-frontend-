import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useUserContext } from '../../contexts/UserContext';
import { useHrContext } from '../../contexts/HrContext';
import { canWriteHr, passesAdminGate, PERMISSIONS } from '../../utils/permissions';
import hrService from '../../services/hrService';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import ConfirmActionModal from '../../components/shared/ConfirmActionModal';
import { notify } from '../../utils/notify';
import WorkHours from '../../components/hr/WorkHours';
import { Pill, hhmmOf, dayLabel } from '../../components/hr/hrFormat';

/**
 * HrSettings — /hr/settings (HR Suite, B21).
 *
 * Entrance tags (register with a write-once key, retire, test a tap URL),
 * check-in rules and clinic-wide hours, working hours per person, and the
 * recent-changes audit (SettingChangeLogs, area "HR Suite").
 *
 * Gates: hr.write to open the page; config.write (admin / admin.access) to
 * save rules or register a tag — the same split the API enforces.
 *
 * `Field` lives at module scope on purpose: defined inside render it would
 * remount the input on every keystroke (the WhatsAppSettingsTab bug, A5).
 */
const Field = ({ label, hint, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-gray-400 mt-1">{hint}</span>}
  </label>
);
const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-primary disabled:bg-gray-50 disabled:text-gray-500';

const Toggle = ({ label, checked, onChange, disabled }) => (
  <label className={`flex items-center justify-between gap-3 py-1.5 text-sm ${disabled ? 'opacity-60' : ''}`}>
    <span className="text-gray-700">{label}</span>
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-none items-center rounded-full transition-colors ${checked ? 'bg-green-600' : 'bg-gray-300'}`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  </label>
);

const Section = ({ title, children, className = '' }) => (
  <section className={`bg-white rounded-xl border border-gray-200 p-4 ${className}`}>
    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">{title}</h3>
    {children}
  </section>
);

/** hoursDefault JSON ⇄ the three-line form (Mon–Fri · Sat · Sun). */
const defaultsToForm = (def = {}) => {
  const pick = (keys) => { for (const k of keys) if (def[k] !== undefined) return def[k]; return undefined; };
  const asRow = (v) => (v === 'off' || v === undefined ? { off: true, start: '08:00', end: '17:00' } : { off: false, start: v[0], end: v[1] });
  return { weekdays: asRow(pick(['1-5', '1'])), sat: asRow(pick(['6'])), sun: asRow(pick(['0'])) };
};
const formToDefaults = (f) => ({
  '1-5': f.weekdays.off ? 'off' : [f.weekdays.start, f.weekdays.end],
  6: f.sat.off ? 'off' : [f.sat.start, f.sat.end],
  0: f.sun.off ? 'off' : [f.sun.start, f.sun.end],
});

const HoursRow = ({ label, row, onChange, disabled }) => (
  <div className="grid grid-cols-[80px_1fr] items-center gap-2 text-sm">
    <span className="text-gray-700">{label}</span>
    <span className="inline-flex items-center gap-2 flex-wrap">
      <select value={row.off ? 'off' : 'hours'} onChange={(e) => onChange({ ...row, off: e.target.value === 'off' })} disabled={disabled} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
        <option value="hours">Hours</option><option value="off">Off</option>
      </select>
      {!row.off && (
        <>
          <input type="time" value={row.start} onChange={(e) => onChange({ ...row, start: e.target.value })} disabled={disabled} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" /> –
          <input type="time" value={row.end} onChange={(e) => onChange({ ...row, end: e.target.value })} disabled={disabled} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
        </>
      )}
    </span>
  </div>
);

const HrSettings = () => {
  const { currentUser } = useUserContext();
  const { settings, loadSettings, setSettings, invalidate } = useHrContext();
  const canOpen = canWriteHr(currentUser);
  const canConfig = passesAdminGate(currentUser, PERMISSIONS.CONFIG_WRITE);

  const [form, setForm] = useState(null);
  const [hoursForm, setHoursForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tags, setTags] = useState(null);
  const [tagForm, setTagForm] = useState({ label: '', location: '', uid: '', key: '' });
  const [keyShown, setKeyShown] = useState(false);
  const [savingTag, setSavingTag] = useState(false);
  const [testTag, setTestTag] = useState('');
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [retire, setRetire] = useState(null);

  useEffect(() => {
    if (!canOpen) return;
    loadSettings().catch((e) => notify('error', e?.message || 'Could not load settings'));
    hrService.tags().then((res) => setTags(res?.data || [])).catch((e) => notify('error', e?.message || 'Could not load tags'));
  }, [canOpen, loadSettings]);

  useEffect(() => {
    if (!settings) return;
    setForm({
      autoCheckin: settings.autoCheckin, confirmCheckout: settings.confirmCheckout, positiveFeedback: settings.positiveFeedback,
      debounceSeconds: settings.debounceSeconds, minSessionMinutes: settings.minSessionMinutes, graceMinutes: settings.graceMinutes,
      geo: settings.geo, deviceDays: settings.deviceDays,
    });
    setHoursForm(defaultsToForm(settings.hoursDefault));
  }, [settings]);

  if (!canOpen) {
    return (
      <div>
        <PageHeader title="Time & Attendance settings" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-600">
          HR settings are for people who can amend attendance (hr.write). Ask an administrator if you need it.
        </div>
      </div>
    );
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const saveRules = async () => {
    for (const k of ['weekdays', 'sat', 'sun']) {
      const r = hoursForm[k];
      if (!r.off && r.start >= r.end) { notify('error', 'Clinic hours: end must be after start.'); return; }
    }
    setSaving(true);
    try {
      const res = await hrService.saveSettings({ ...form, hoursDefault: formToDefaults(hoursForm) });
      if (res?.success) {
        notify('success', 'HR settings saved.');
        invalidate();                       // cached months depend on the default hours
        const fresh = await hrService.settings();
        if (fresh?.success) setSettings(fresh.data);
      } else notify('error', res?.message || 'Could not save.');
    } catch (e) { notify('error', e?.message || 'Could not save.'); }
    finally { setSaving(false); }
  };

  const generateKey = async () => {
    try {
      const res = await hrService.newTagKey();
      if (res?.success) { setTagForm((f) => ({ ...f, key: res.data.key })); setKeyShown(true); }
    } catch (e) { notify('error', e?.message || 'Could not generate a key'); }
  };

  const saveTag = async (e) => {
    e.preventDefault();
    setSavingTag(true);
    try {
      const res = await hrService.createTag({ label: tagForm.label.trim(), location: tagForm.location.trim() || undefined, uid: tagForm.uid.trim().toUpperCase(), key: tagForm.key.trim().toUpperCase() });
      if (res?.success) {
        setTags((prev) => [...(prev || []), res.data]);
        notify('success', `Tag "${res.data.label}" registered. Write the key into the tag now — it will not be shown again.`, { duration: 8000 });
        setTagForm({ label: '', location: '', uid: '', key: '' }); setKeyShown(false);
        const fresh = await hrService.settings(); if (fresh?.success) setSettings(fresh.data);
      } else notify('error', res?.message || 'Could not register the tag.');
    } catch (err) { notify('error', err?.message || 'Could not register the tag.'); }
    finally { setSavingTag(false); }
  };

  const doRetire = async () => {
    const t = retire; setRetire(null);
    try {
      const res = await hrService.updateTag(t.id, { status: t.status === 'retired' ? 'active' : 'retired' });
      if (res?.success) { setTags((prev) => prev.map((x) => (x.id === t.id ? res.data : x))); notify('success', `Tag "${t.label}" ${res.data.status}.`); }
    } catch (e) { notify('error', e?.message || 'Could not update the tag'); }
  };

  const runTest = async () => {
    if (!testTag || !testUrl.trim()) { notify('error', 'Choose a tag and paste the URL a tap opened.'); return; }
    setTestResult(null);
    try {
      const res = await hrService.testTag(testTag, testUrl.trim());
      setTestResult(res?.data || { ok: false, message: res?.message });
    } catch (e) { setTestResult({ ok: false, message: e?.message || 'Test failed' }); }
  };

  return (
    <div>
      <PageHeader title="Time & Attendance settings" subtitle="Entrance tags, check-in rules, working hours" />
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <div className="space-y-4">
          <Section title="Entrance tags">
            {tags === null ? <Spinner /> : tags.length === 0 ? <p className="text-sm text-gray-500 mb-3">No tag registered yet.</p> : (
              <div className="overflow-x-auto mb-3">
                <table className="w-full text-sm">
                  <thead><tr className="text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
                    <th className="text-left py-1.5 pr-2 font-semibold">Label</th><th className="text-left py-1.5 px-2 font-semibold">UID</th><th className="text-left py-1.5 px-2 font-semibold">Last tap</th><th className="text-right py-1.5 px-2 font-semibold">Counter</th><th className="text-left py-1.5 px-2 font-semibold">Status</th><th className="py-1.5" />
                  </tr></thead>
                  <tbody className="tabular-nums">
                    {tags.map((t) => (
                      <tr key={t.id} className="border-b border-gray-100">
                        <td className="py-1.5 pr-2 text-gray-800">{t.label}{t.location && <small className="block text-gray-500 font-normal">{t.location}</small>}</td>
                        <td className="py-1.5 px-2 font-mono text-xs">{t.uid}</td>
                        <td className="py-1.5 px-2">{t.lastTapAt ? `${dayLabel(String(t.lastTapAt).slice(0, 10))} ${hhmmOf(t.lastTapAt)}` : '—'}</td>
                        <td className="py-1.5 px-2 text-right">{t.lastCounter?.toLocaleString?.() ?? t.lastCounter}</td>
                        <td className="py-1.5 px-2">{t.status === 'active' ? (t.lastTapAt ? <Pill tone="ok">Active</Pill> : <Pill>Not mounted</Pill>) : <Pill>Retired</Pill>}</td>
                        <td className="py-1.5 text-right"><button type="button" onClick={() => setRetire(t)} className="text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg px-2 py-1 hover:bg-gray-50">{t.status === 'active' ? 'Retire' : 'Reactivate'}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="border-t border-gray-200 pt-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Register a tag</h4>
              {!canConfig && <p className="text-xs text-amber-700 mb-2">Registering a tag (its key) needs the configuration permission — an administrator can do this.</p>}
              <form onSubmit={saveTag} className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Label"><input value={tagForm.label} onChange={(e) => setTagForm((f) => ({ ...f, label: e.target.value }))} placeholder="Main entrance" className={inputCls} disabled={!canConfig} required /></Field>
                  <Field label="Location (optional)"><input value={tagForm.location} onChange={(e) => setTagForm((f) => ({ ...f, location: e.target.value }))} placeholder="Front door, phone height" className={inputCls} disabled={!canConfig} /></Field>
                </div>
                <Field label="Tag UID (14 hex)" hint="Read it from the tag with TagWriter's Read screen."><input value={tagForm.uid} onChange={(e) => setTagForm((f) => ({ ...f, uid: e.target.value }))} placeholder="04A1B2C3D4E5F6" className={`${inputCls} font-mono`} disabled={!canConfig} required pattern="[0-9A-Fa-f]{14}" /></Field>
                <Field label="Tag key K1 (32 hex)" hint="Shown once — write it into the tag with NXP TagWriter before leaving this page.">
                  <div className="flex gap-2">
                    <input value={tagForm.key} onChange={(e) => { setTagForm((f) => ({ ...f, key: e.target.value })); setKeyShown(false); }} placeholder="paste from TagWriter, or generate" className={`${inputCls} font-mono`} disabled={!canConfig} required pattern="[0-9A-Fa-f]{32}" />
                    <button type="button" onClick={generateKey} disabled={!canConfig} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap hover:bg-gray-50 disabled:opacity-60">Generate</button>
                  </div>
                  {keyShown && <span className="block text-[11px] text-amber-700 mt-1">Copy this key now. After saving it is stored encrypted and never displayed again.</span>}
                </Field>
                <button type="submit" disabled={!canConfig || savingTag} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{savingTag ? 'Saving…' : 'Save tag'}</button>
              </form>
            </div>

            <div className="border-t border-gray-200 pt-3 mt-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Test a tap URL</h4>
              <p className="text-xs text-gray-500 mb-2">Tap the tag with any phone, copy the URL it opened and paste it here. Verifies the signature against the stored key without using up the counter.</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <select value={testTag} onChange={(e) => setTestTag(e.target.value)} className={`${inputCls} sm:w-48`}>
                  <option value="">Choose tag…</option>
                  {(tags || []).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <input value={testUrl} onChange={(e) => setTestUrl(e.target.value)} placeholder="https://cdiabetescentre.com/hr/tap?uid=…&ctr=…&cmac=…" className={`${inputCls} font-mono text-xs`} />
                <button type="button" onClick={runTest} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap hover:bg-gray-50">Test</button>
              </div>
              {testResult && (
                <p className={`text-sm mt-2 ${testResult.ok && !testResult.replay ? 'text-green-700' : testResult.ok ? 'text-amber-700' : 'text-red-700'}`}>{testResult.message}</p>
              )}
            </div>
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Rules">
            {!form || !hoursForm ? <Spinner /> : (
              <div className="space-y-3">
                {!canConfig && <p className="text-xs text-amber-700">Changing rules needs the configuration permission — an administrator can do this.</p>}
                <Toggle label="First tap of the day checks in immediately" checked={form.autoCheckin} onChange={(v) => set('autoCheckin', v)} disabled={!canConfig} />
                <Toggle label="Check-out asks for confirmation" checked={form.confirmCheckout} onChange={(v) => set('confirmCheckout', v)} disabled={!canConfig} />
                <Toggle label="Positive feedback on tap (mood lines)" checked={form.positiveFeedback} onChange={(v) => set('positiveFeedback', v)} disabled={!canConfig} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Ignore repeat taps within (seconds)"><input type="number" min="0" max="3600" value={form.debounceSeconds} onChange={(e) => set('debounceSeconds', e.target.value)} className={inputCls} disabled={!canConfig} /></Field>
                  <Field label="Shortest session counted (minutes)"><input type="number" min="0" max="720" value={form.minSessionMinutes} onChange={(e) => set('minSessionMinutes', e.target.value)} className={inputCls} disabled={!canConfig} /></Field>
                  <Field label="Grace (minutes)" hint="Late / early counted after this."><input type="number" min="0" max="240" value={form.graceMinutes} onChange={(e) => set('graceMinutes', e.target.value)} className={inputCls} disabled={!canConfig} /></Field>
                  <Field label="Remembered phones expire after (days)" hint="Unused for this long → sign in again."><input type="number" min="1" max="3650" value={form.deviceDays} onChange={(e) => set('deviceDays', e.target.value)} className={inputCls} disabled={!canConfig} /></Field>
                </div>
                <Field label="Phone location">
                  <select value={form.geo} onChange={(e) => set('geo', e.target.value)} className={inputCls} disabled={!canConfig}>
                    <option value="log">Log only (asks the phone once; never enforced)</option>
                    <option value="off">Off (no location prompt)</option>
                  </select>
                </Field>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Clinic-wide default hours</span>
                  <div className="space-y-1.5">
                    <HoursRow label="Mon – Fri" row={hoursForm.weekdays} onChange={(r) => setHoursForm((h) => ({ ...h, weekdays: r }))} disabled={!canConfig} />
                    <HoursRow label="Saturday" row={hoursForm.sat} onChange={(r) => setHoursForm((h) => ({ ...h, sat: r }))} disabled={!canConfig} />
                    <HoursRow label="Sunday" row={hoursForm.sun} onChange={(r) => setHoursForm((h) => ({ ...h, sun: r }))} disabled={!canConfig} />
                  </div>
                  <span className="block text-[11px] text-gray-400 mt-1">Applies to anyone without their own hours below. Missed check-outs are closed at clinic midnight and flagged.</span>
                </div>
                <button type="button" onClick={saveRules} disabled={!canConfig || saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save rules'}</button>
              </div>
            )}
          </Section>

          <Section title="Working hours per person">
            <WorkHours canEdit={canOpen} />
          </Section>

          <Section title="Recent changes">
            {!settings ? <Spinner /> : (settings.recentChanges || []).length === 0 ? <p className="text-sm text-gray-500">No changes recorded yet.</p> : (
              <ul className="divide-y divide-gray-100">
                {settings.recentChanges.map((c) => (
                  <li key={c.id} className="py-2 text-sm">
                    <span className="text-gray-800">{c.label}</span>
                    {c.oldValue != null && c.newValue != null && <span className="text-gray-500">: {String(c.oldValue)} → {String(c.newValue)}</span>}
                    <small className="block text-[11px] text-gray-500">{c.changedByName} · {dayLabel(String(c.changedAt).slice(0, 10), true)} {hhmmOf(c.changedAt)}</small>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={() => loadSettings({ force: true })} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"><RefreshCw className="w-3 h-3" /> Refresh</button>
          </Section>
        </div>
      </div>

      <ConfirmActionModal
        isOpen={!!retire}
        onClose={() => setRetire(null)}
        onConfirm={doRetire}
        title={retire?.status === 'active' ? 'Retire this tag?' : 'Reactivate this tag?'}
        message={retire?.status === 'active' ? `Taps on "${retire?.label}" will be refused until it is reactivated. Past sessions keep their door.` : `Taps on "${retire?.label}" will be accepted again.`}
        confirmLabel={retire?.status === 'active' ? 'Retire' : 'Reactivate'}
        confirmVariant={retire?.status === 'active' ? 'danger' : 'primary'}
      />
    </div>
  );
};

export default HrSettings;
