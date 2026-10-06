import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Lock, RefreshCw } from 'lucide-react';
import { useUserContext } from '../../../contexts/UserContext';
import { canSetLeavePolicy, canSetHolidays, canSetEntitlements } from '../../../utils/permissions';
import leaveService from '../../../services/leaveService';
import Spinner from '../../shared/Spinner';
import ConfirmActionModal from '../../shared/ConfirmActionModal';
import { notify } from '../../../utils/notify';
import { Pill, hhmmOf, dayLabel } from '../hrFormat';
import { Section, SwitchRow, Field, inputCls, buttonCls, primaryButtonCls } from '../hrUi';
import PolicyTable from '../leave/PolicyTable';
import DayWeights from '../leave/DayWeights';
import HolidayList from '../leave/HolidayList';
import EntitlementGrid from '../leave/EntitlementGrid';
import { MONTHS, DAYS_IN_MONTH } from '../leave/leaveFormat';

/**
 * LeaveSettingsPanel — Settings → Leave (/hr/settings/leave/:tab?year=).
 * Was the /hr/leave-settings page (B27 phase 1; mockup 1 + revisions A, D)
 * until the three setup pages were merged (6 Oct 2026). Its Alerts and
 * Credentials & reminders tabs moved to Settings → Alerts & reminders; the
 * Year selector sits beside the sub-tabs (`subTabs`, rendered by the page).
 *
 * Tabs (`tab`): Leave policy · Public holidays · Staff entitlements.
 *
 * The policy is per year and a DRAFT until HR publishes it; until a year is
 * published, leave for that year counts exactly as it did before B27. A year
 * that has ended is frozen (its balances would change with it) — the server
 * refuses, and the screen says so rather than offering buttons that fail.
 *
 * Gates (the API enforces the same): Leave policy needs leave.policy, Public
 * holidays leave.holidays, Staff entitlements leave.entitlements.
 */
/** The policy view from the API → the editable form. */
const toForm = (view) => {
  if (!view?.policy) return null;
  const p = view.policy;
  return {
    weekWeights: { ...p.weekWeights },
    countingMode: p.countingMode,
    allowNegative: !!p.allowNegative,
    carryExpiry: p.carryExpiry || '',
    minNoticeDays: p.minNoticeDays ?? 0,
    maxCadreAwayPerDay: p.maxCadreAwayPerDay ?? '',
    blockDoctorSlots: !!p.blockDoctorSlots,
    visibleTypes: [...(p.visibleTypes || [])],
    types: Object.fromEntries(view.types.map((t) => [t.key, { ...t.row }])),
  };
};

/** Carry-expiry picker: month + day, or never. */
const MonthDay = ({ value, onChange, disabled }) => {
  const [m, d] = value ? value.split('-').map(Number) : [0, 0];
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <span className="inline-flex items-center gap-1">
      <select value={m ? String(d) : ''} disabled={disabled || !m} onChange={(e) => onChange(`${pad(m)}-${pad(e.target.value)}`)}
        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-50" aria-label="Carried days expire — day">
        {!m && <option value="">—</option>}
        {m > 0 && Array.from({ length: DAYS_IN_MONTH[m - 1] }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}
      </select>
      <select value={m ? String(m) : ''} disabled={disabled}
        onChange={(e) => {
          const nm = Number(e.target.value);
          if (!nm) { onChange(''); return; }
          const nd = Math.min(d || DAYS_IN_MONTH[nm - 1], DAYS_IN_MONTH[nm - 1]);
          onChange(`${pad(nm)}-${pad(nd)}`);
        }}
        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-50" aria-label="Carried days expire — month">
        <option value="">Never</option>
        {MONTHS.map((name, i) => <option key={name} value={String(i + 1)}>{name}</option>)}
      </select>
    </span>
  );
};

/** "Annual has its own: 14 days" — per-type notice is set in the table's Notice column (phase 1b). */
const noticeHint = (types, rows) => {
  const own = types.filter((t) => rows[t.key]?.enabled && rows[t.key]?.minNoticeDays != null)
    .map((t) => `${t.name} ${rows[t.key].minNoticeDays}`);
  return own.length
    ? `Warns when a request is made at shorter notice. Types with their own (Notice column): ${own.join(', ')} days.`
    : 'Warns when a request is made at shorter notice. A type can set its own in the Notice column.';
};

/** The Leave policy trail. `refreshKey` changes after every save so it follows along. */
const RecentChanges = ({ refreshKey = 0 }) => {
  const [rows, setRows] = useState(null);
  const load = useCallback(() => {
    leaveService.changes().then((res) => setRows(res?.data || [])).catch(() => setRows([]));
  }, []);
  // The server writes the trail just after answering the save — a moment's
  // grace so the newest lines are there.
  useEffect(() => { const id = setTimeout(load, refreshKey ? 400 : 0); return () => clearTimeout(id); }, [load, refreshKey]);
  return (
    <Section title="Recent changes" actions={<button type="button" onClick={load} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"><RefreshCw className="w-3 h-3" /> Refresh</button>}>
      {rows === null ? <Spinner /> : rows.length === 0 ? <p className="text-sm text-gray-500">No changes recorded yet.</p> : (
        <ul className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
          {rows.map((c) => (
            <li key={c.id} className="py-2 text-sm">
              <span className="text-gray-800">{c.label}</span>
              {c.newValue != null && <span className="text-gray-500">: {c.oldValue && c.oldValue !== '—' ? `${c.oldValue} → ` : ''}{c.newValue}</span>}
              <small className="block text-[11px] text-gray-500">{c.changedByName} · {dayLabel(String(c.changedAt).slice(0, 10), true)} {hhmmOf(c.changedAt)}</small>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
};

const LeaveSettingsPanel = ({ tab, subTabs }) => {
  const { currentUser } = useUserContext();
  // HR Tier 3 Phase 0: each tab its own control (leave.policy carries holidays
  // and entitlements, so a policy holder still sees all three).
  const canPolicy = canSetLeavePolicy(currentUser);
  const canHolidays = canSetHolidays(currentUser);
  const canEntitlements = canSetEntitlements(currentUser);
  const canLeaveTabs = canPolicy || canHolidays || canEntitlements;
  const [params, setParams] = useSearchParams();

  const [years, setYears] = useState(null);         // [{ year, status }]
  const [thisYear, setThisYear] = useState(null);
  const year = Number(params.get('year')) || thisYear;

  const [view, setView] = useState(null);
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null);         // JSON of the last loaded/saved form
  const [busy, setBusy] = useState(false);
  const [newType, setNewType] = useState('');
  const [confirm, setConfirm] = useState(null);     // { kind: 'publish'|'copy'|'retireType', … }
  const [trailKey, setTrailKey] = useState(0);

  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    next.set(k, String(v));
    setParams(next, { replace: true });
  };

  const loadYears = useCallback(async () => {
    try {
      const res = await leaveService.policies();
      setYears(res?.data?.years || []);
      setThisYear(res?.data?.thisYear || new Date().getFullYear());
    } catch (e) { notify('error', e?.message || 'Could not load leave policies'); setYears([]); setThisYear(new Date().getFullYear()); }
  }, []);

  const loadView = useCallback(async () => {
    if (!year) return;
    setView(null);
    try {
      const res = await leaveService.policy(year);
      const v = res?.data || null;
      setView(v);
      const f = toForm(v);
      setForm(f);
      setSaved(JSON.stringify(f));
    } catch (e) { notify('error', e?.message || 'Could not load the leave policy'); }
  }, [year]);

  useEffect(() => { if (canLeaveTabs) loadYears(); else setThisYear(new Date().getFullYear()); }, [canLeaveTabs, loadYears]);
  useEffect(() => { if (canPolicy && tab === 'policy') loadView(); }, [canPolicy, tab, loadView]);

  const dirty = form && JSON.stringify(form) !== saved;
  const edit = view?.editability || {};
  const locked = !edit.canEdit;
  const sourceYears = useMemo(() => (years || []).filter((y) => y.status !== 'none' && y.year !== year), [years, year]);

  // The Settings page only shows these sub-tabs to their holders (settingsTabs.js).
  if (!canLeaveTabs) return null;

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setType = (key, patch) => setForm((f) => ({ ...f, types: { ...f.types, [key]: { ...f.types[key], ...patch } } }));
  const toggleVisible = (key, on) => setForm((f) => ({
    ...f, visibleTypes: on ? [...new Set([...f.visibleTypes, key])] : f.visibleTypes.filter((k) => k !== key),
  }));

  const payload = () => ({
    ...form,
    carryExpiry: form.carryExpiry || null,
    maxCadreAwayPerDay: form.maxCadreAwayPerDay === '' ? null : form.maxCadreAwayPerDay,
  });

  const afterWrite = async (res, message) => {
    if (res?.success) {
      setView(res.data);
      const f = toForm(res.data);
      setForm(f);
      setSaved(JSON.stringify(f));
      notify('success', message);
      loadYears();
      setTrailKey((k) => k + 1);
      return true;
    }
    return false;
  };

  const save = async () => {
    setBusy(true);
    try {
      await afterWrite(await leaveService.savePolicy(year, payload()), view.policy.status === 'published' ? `${year} policy saved — it applies now.` : `${year} draft saved.`);
    } catch (e) {
      notify('error', e?.data?.errors?.length > 1 ? e.data.errors.slice(0, 4).join('\n') : (e?.message || 'Could not save'));
    } finally { setBusy(false); }
  };

  const publish = async () => {
    setConfirm(null);
    setBusy(true);
    try {
      if (dirty) {
        const s = await leaveService.savePolicy(year, payload());
        if (!s?.success) return;
      }
      await afterWrite(await leaveService.publishPolicy(year), `${year} policy published.`);
    } catch (e) {
      notify('error', e?.data?.errors?.length > 1 ? e.data.errors.slice(0, 4).join('\n') : (e?.message || 'Could not publish'));
    } finally { setBusy(false); }
  };

  const copy = async (from) => {
    setConfirm(null);
    setBusy(true);
    try {
      await afterWrite(await leaveService.copyPolicy(year, from), `${year} draft started from ${from}.`);
    } catch (e) { notify('error', e?.message || 'Could not copy'); }
    finally { setBusy(false); }
  };

  const addType = async (e) => {
    e.preventDefault();
    if (newType.trim().length < 2) return;
    try {
      const res = await leaveService.createType(newType.trim());
      if (res?.success) {
        notify('success', `"${res.data.name}" added — set its rules and save.`);
        setNewType('');
        const v = (await leaveService.policy(year))?.data;
        if (v) {
          setView(v);
          // Keep what HR has typed; add the new type's row switched on.
          setForm((f) => {
            const fresh = toForm(v);
            const next = { ...(f || fresh), types: { ...fresh.types, ...(f?.types || {}) } };
            next.types[res.data.key] = { ...fresh.types[res.data.key], enabled: true, grant: 'up_front', days: 0 };
            // Offered to staff by default; HR can untick it below.
            next.visibleTypes = [...new Set([...(next.visibleTypes || []), res.data.key])];
            return next;
          });
        }
      }
    } catch (err) { notify('error', err?.message || 'Could not add the leave type'); }
  };

  const retireType = async (t) => {
    setConfirm(null);
    try {
      const res = await leaveService.updateType(t.id, { status: 'retired' });
      if (res?.success) { notify('success', `${t.name} retired.`); loadView(); }
    } catch (e) { notify('error', e?.message || 'Could not retire'); }
  };

  // ---- header: year + copy ----
  const yearOptions = (years || []).map((y) => y.year);
  if (year && !yearOptions.includes(year)) yearOptions.push(year);
  yearOptions.sort((a, b) => b - a);
  const statusOf = (y) => (years || []).find((x) => x.year === y)?.status;

  const header = (
    <div className="flex flex-wrap items-center gap-2">
      <select value={year || ''} onChange={(e) => setParam('year', e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" aria-label="Year">
        {yearOptions.map((y) => (
          <option key={y} value={y}>{y}{statusOf(y) === 'published' ? ' · published' : statusOf(y) === 'draft' ? ' · draft' : statusOf(y) === 'none' ? ' · not started' : ''}</option>
        ))}
      </select>
    </div>
  );

  // ---- the policy tab ----
  const policyTab = () => {
    if (!view) return <Spinner />;
    if (!view.exists) {
      return (
        <Section>
          <p className="text-sm text-gray-700 mb-3">There is no {year} leave policy yet.</p>
          {edit.canCreate ? (
            sourceYears.length ? (
              <div className="flex flex-wrap gap-2">
                {sourceYears.map((y) => (
                  <button key={y.year} type="button" disabled={busy} onClick={() => copy(y.year)} className={primaryButtonCls}>Start from {y.year}</button>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500">There is no earlier policy to start from.</p>
          ) : <p className="text-sm text-amber-700">{edit.reason}</p>}
        </Section>
      );
    }
    const p = view.policy;
    const published = p.status === 'published';
    return (
      <div className="space-y-4">
        {view.editability.ended && (
          <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700"><Lock className="w-4 h-4 mt-0.5 flex-none" /> {edit.reason}</div>
        )}
        {!view.editability.ended && published && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-900">
            {year} is published: saving a change here changes everyone's {year} balances from now on. To correct one person, use Staff entitlements instead.
          </div>
        )}

        <Section
          title={`Leave types and clinic defaults — ${year}`}
          actions={published
            ? <Pill tone="ok">Published{p.publishedBy ? ` by ${p.publishedBy}` : ''}{p.publishedAt ? ` · ${dayLabel(String(p.publishedAt).slice(0, 10), true)}` : ''}</Pill>
            : <Pill tone="warn">Draft · not yet published</Pill>}
        >
          <PolicyTable types={view.types} rows={form.types} onChange={setType} disabled={locked} clinicNotice={form.minNoticeDays}
            onRetire={locked ? null : (t) => setConfirm({ kind: 'retireType', type: t })} />
          {!locked && (
            <form onSubmit={addType} className="flex flex-wrap items-center gap-2 mt-3">
              <input value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="New leave type, e.g. Hajj" className={`${inputCls} sm:w-64`} aria-label="New leave type name" maxLength={80} />
              <button type="submit" disabled={newType.trim().length < 2} className={`${buttonCls} inline-flex items-center gap-1`}><Plus className="w-3.5 h-3.5" /> Add leave type</button>
            </form>
          )}
          <p className="text-[11px] text-gray-400 mt-2">Pro-rata: someone who joins or leaves during the year gets the share of it they are employed, to the quarter day. Maternity and paternity are a full allowance per event and are never pro-rated. Carried days only come from a yearly allowance. Notice left blank uses the clinic's minimum notice.</p>
        </Section>

        <div className="grid lg:grid-cols-2 gap-4 items-start">
          <Section title="How days are counted">
            <DayWeights value={form.weekWeights} onChange={(v) => setF('weekWeights', v)} disabled={locked} label="Clinic default" />
            <p className="text-[11px] text-gray-400 mt-1">1 = a full day of leave, ½ = half, 0 = never charged (e.g. Sunday).</p>
            <div className="mt-3 space-y-1.5 text-sm">
              <label className="flex items-start gap-2">
                <input type="radio" name="mode" checked={form.countingMode === 'clinic_week'} disabled={locked} onChange={() => setF('countingMode', 'clinic_week')} className="mt-1" />
                <span>Everyone uses the clinic week above <span className="block text-[11px] text-gray-400">A part-timer can still have their own week on Staff entitlements.</span></span>
              </label>
              <label className="flex items-start gap-2">
                <input type="radio" name="mode" checked={form.countingMode === 'own_hours'} disabled={locked} onChange={() => setF('countingMode', 'own_hours')} className="mt-1" />
                <span>Each person's working days from their HR hours (days off = 0)
                  <span className="block text-[11px] text-gray-500">A day someone isn't expected in by their HR hours (Settings → Attendance → Working hours) costs nothing. Anyone with a personal week on Staff entitlements uses that instead.</span></span>
              </label>
            </div>
            <div className="mt-3 border-t border-gray-100 pt-2">
              <SwitchRow label="Public holidays are never counted" checked disabled hint="Always on." onChange={() => {}} />
              <SwitchRow label="Allow a negative balance" checked={form.allowNegative} disabled={locked} onChange={(v) => setF('allowNegative', v)} hint="Off: a request larger than what is left is refused." />
            </div>
          </Section>

          <div className="space-y-4">
            <Section title="Year end and rules">
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-gray-700">Carried days expire on</span>
                  <MonthDay value={form.carryExpiry} onChange={(v) => setF('carryExpiry', v)} disabled={locked} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Minimum notice (days)" hint={noticeHint(view.types, form.types)}>
                    <input type="number" min="0" max="365" value={form.minNoticeDays} disabled={locked} onChange={(e) => setF('minNoticeDays', e.target.value === '' ? 0 : Number(e.target.value))} className={inputCls} />
                  </Field>
                  <Field label="Most of one cadre away per day" hint="Warns only. Blank = no warning.">
                    <input type="number" min="1" max="50" value={form.maxCadreAwayPerDay} disabled={locked} onChange={(e) => setF('maxCadreAwayPerDay', e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} />
                  </Field>
                </div>
                <SwitchRow label="Block a doctor's appointment slots when their leave is approved" checked={form.blockDoctorSlots} disabled={locked} onChange={(v) => setF('blockDoctorSlots', v)} />
              </div>
            </Section>

            <Section title="Leave types staff can see">
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {view.types.map((t) => (
                  <label key={t.key} className={`flex items-center gap-1.5 ${form.types[t.key]?.enabled ? '' : 'text-gray-400'}`}>
                    <input type="checkbox" checked={form.visibleTypes.includes(t.key)} disabled={locked} onChange={(e) => toggleVisible(t.key, e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                    {t.name}
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">Hidden types still exist: HR can record them and charge days to them.</p>
            </Section>
          </div>
        </div>

        {!locked && (
          <div className="flex flex-wrap justify-end items-center gap-2">
            {dirty && <span className="text-xs text-amber-700 mr-auto">Unsaved changes</span>}
            {!published && sourceYears.length > 0 && (
              <select value="" disabled={busy} onChange={(e) => e.target.value && setConfirm({ kind: 'copy', from: Number(e.target.value) })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm" aria-label="Copy from another year">
                <option value="">Copy from…</option>
                {sourceYears.map((y) => <option key={y.year} value={y.year}>{y.year}</option>)}
              </select>
            )}
            <button type="button" onClick={save} disabled={busy || !dirty} className={buttonCls}>{published ? 'Save changes' : 'Save draft'}</button>
            {!published && (
              <button type="button" onClick={() => setConfirm({ kind: 'publish' })} disabled={busy} className={primaryButtonCls}>Publish {year} policy</button>
            )}
          </div>
        )}

        <RecentChanges refreshKey={trailKey} />
      </div>
    );
  };

  const confirmProps = (() => {
    if (!confirm) return { isOpen: false };
    if (confirm.kind === 'publish') {
      return {
        title: `Publish the ${year} leave policy?`,
        message: (
          <span className="block space-y-2 text-sm">
            <span className="block">From now on {year} leave is counted by this policy: the weekday values, public holidays, half days, pro-rata and carry-over.</span>
            {view?.overridePeople > 0 && (
              <span className="block">{view.overridePeople} {view.overridePeople === 1 ? 'person has an entitlement' : 'people have entitlements'} set on the staff file before the policy — they keep those figures until you change them on Staff entitlements.</span>
            )}
            <span className="block">Leave already recorded keeps the days it was recorded with. Publishing cannot be undone; the policy can still be edited until the year ends.</span>
            {dirty && <span className="block font-semibold">Your unsaved changes are saved first.</span>}
          </span>
        ),
        confirmLabel: `Publish ${year}`,
        onConfirm: publish,
      };
    }
    if (confirm.kind === 'copy') {
      return {
        title: `Copy the ${confirm.from} policy into ${year}?`,
        message: `The ${year} draft is replaced with ${confirm.from}'s rules (types, day values, year-end rules, visible types). Public holidays are dated, so they are not copied.${dirty ? ' Your unsaved changes are lost.' : ''}`,
        confirmLabel: 'Copy',
        onConfirm: () => copy(confirm.from),
      };
    }
    return {
      title: `Retire ${confirm.type.name}?`,
      message: `${confirm.type.name} disappears from every policy and from the screens where staff choose a type. Leave already recorded as ${confirm.type.name} keeps it.`,
      confirmLabel: 'Retire',
      confirmVariant: 'danger',
      onConfirm: () => retireType(confirm.type),
    };
  })();

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        {subTabs}
        {header}
      </div>

      {tab === 'policy' && (year ? policyTab() : <Spinner />)}
      {tab === 'holidays' && year && <HolidayList year={year} canEdit={canHolidays} />}
      {tab === 'entitlements' && year && <EntitlementGrid year={year} canEdit={canEntitlements} />}

      <ConfirmActionModal isOpen={!!confirm} onClose={() => setConfirm(null)} {...confirmProps} />
    </div>
  );
};

export default LeaveSettingsPanel;
