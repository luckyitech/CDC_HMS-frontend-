import { useState, useEffect, useCallback, useMemo } from 'react';
import { Pencil, Search } from 'lucide-react';
import leaveService from '../../../services/leaveService';
import Spinner from '../../shared/Spinner';
import Modal from '../../shared/Modal';
import { notify } from '../../../utils/notify';
import { Pill } from '../hrFormat';
import { Field, inputCls, cellInputCls, buttonCls, primaryButtonCls } from '../hrUi';
import DayWeights from './DayWeights';
import { fmtDays, WEEK_ORDER, weightLabel } from './leaveFormat';

/**
 * EntitlementGrid — every member of staff × leave type for one year (B27,
 * D1 + D3, mockup 1 "Staff entitlements").
 *
 * The figures are what the staff file and the wizards will use: the year's
 * policy (a draft is previewed), pro-rated for joiners and leavers, or the
 * person's override. A figure in blue differs from the clinic default and
 * carries a reason. Click a person to override their days, the days carried
 * in, or their own working week (a part-timer's Mon–Wed) — every change needs
 * a reason and is logged on the Leave policy trail and on their file.
 *
 * Props: year, canEdit
 */
const weekLine = (w) => WEEK_ORDER.filter(({ d }) => Number(w[d] ?? w[String(d)] ?? 0) > 0)
  .map(({ d, short }) => (Number(w[d] ?? w[String(d)]) === 1 ? short : `${short} ${weightLabel(w[d] ?? w[String(d)])}`)).join(', ');

const OverrideModal = ({ person, types, year, policyWeek, onClose, onSaved }) => {
  const [rows, setRows] = useState({});
  const [ownWeek, setOwnWeek] = useState(false);
  const [week, setWeek] = useState(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!person) return;
    const init = {};
    for (const t of types) {
      const o = person.cells[t.key]?.override;
      init[t.key] = { entitled: o?.entitled ?? '', carriedOver: o?.carriedOver ?? '' };
    }
    setRows(init);
    setOwnWeek(!!person.weekOverride);
    setWeek(person.weekOverride || policyWeek || { 0: 0, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 });
    setReason('');
  }, [person, types, policyWeek]);

  if (!person) return null;

  const save = async () => {
    if (reason.trim().length < 3) { notify('error', 'Say why this person differs from the policy.'); return; }
    setSaving(true);
    try {
      const balances = types.map((t) => ({
        leaveType: t.key,
        entitled: rows[t.key]?.entitled === '' ? null : rows[t.key]?.entitled,
        carriedOver: rows[t.key]?.carriedOver === '' ? null : rows[t.key]?.carriedOver,
      }));
      const res = await leaveService.saveEntitlement(person.id, year, {
        balances, weekOverride: ownWeek ? week : null, reason: reason.trim(),
      });
      if (res?.success) { notify('success', `${person.name}'s ${year} entitlement saved.`); onSaved(res.data); }
    } catch (e) { notify('error', e?.message || 'Could not save'); }
    finally { setSaving(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={`${person.name} · ${year}`} size="lg">
      <p className="text-sm text-gray-600 mb-3">
        Leave a box empty to follow the clinic policy. Entering the policy's own figure also means "follow the policy", so a later policy change still reaches them.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
              <th className="text-left font-semibold py-1.5 pr-2">Type</th>
              <th className="text-left font-semibold py-1.5 px-2">Policy gives</th>
              <th className="text-left font-semibold py-1.5 px-2 w-28">Days</th>
              <th className="text-left font-semibold py-1.5 px-2 w-28">Carried in</th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => {
              const cell = person.cells[t.key] || {};
              const policyFigure = cell.override ? null : cell.entitled;
              return (
                <tr key={t.key} className="border-b border-gray-100">
                  <td className="py-1.5 pr-2 text-gray-800">{t.name}</td>
                  <td className="py-1.5 px-2 text-gray-500 tabular-nums">
                    {t.grant === 'unlimited' || !t.enabled ? (t.enabled ? 'No limit' : 'Switched off') : `${fmtDays(t.days)}${person.cells[t.key]?.proRated ? ` (pro-rata ${fmtDays(policyFigure)})` : ''}`}
                  </td>
                  <td className="py-1.5 px-2">
                    <input type="number" min="0" max="366" step="0.25" value={rows[t.key]?.entitled ?? ''} placeholder="policy"
                      onChange={(e) => setRows((r) => ({ ...r, [t.key]: { ...r[t.key], entitled: e.target.value } }))} className={cellInputCls} aria-label={`${t.name} days`} />
                  </td>
                  <td className="py-1.5 px-2">
                    <input type="number" min="0" max="366" step="0.25" value={rows[t.key]?.carriedOver ?? ''} placeholder={fmtDays(cell.carriedIn || 0)}
                      onChange={(e) => setRows((r) => ({ ...r, [t.key]: { ...r[t.key], carriedOver: e.target.value } }))} className={cellInputCls} aria-label={`${t.name} carried in`} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-200 pt-3 mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-800 mb-2">
          <input type="checkbox" checked={ownWeek} onChange={(e) => setOwnWeek(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
          Their own working week (e.g. a part-timer)
        </label>
        {ownWeek && week && <DayWeights value={week} onChange={setWeek} />}
        <p className="text-[11px] text-gray-400 mt-1">Days worth 0 are never charged as leave for them. Without this they count on the clinic week.</p>
      </div>

      <Field label="Reason (required)" hint="Recorded with the change, on the Leave policy trail and on their staff file.">
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className={inputCls} placeholder="Contract gives 25 days · part-time Mon–Wed from October · …" />
      </Field>
      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={onClose} className={buttonCls}>Cancel</button>
        <button type="button" onClick={save} disabled={saving} className={primaryButtonCls}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </Modal>
  );
};

const EntitlementGrid = ({ year, canEdit }) => {
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setData(null);
    try {
      const res = await leaveService.entitlements(year);
      setData(res?.data || null);
    } catch (e) { notify('error', e?.message || 'Could not load entitlements'); setData({ people: [], types: [] }); }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  // Columns: types switched on with a yearly or per-event allowance. "No
  // limit" types have nothing to show per person.
  const columns = useMemo(() => (data?.types || []).filter((t) => t.enabled && t.grant && t.grant !== 'unlimited'), [data]);
  const editableTypes = useMemo(() => (data?.types || []).filter((t) => t.enabled || (data?.people || []).some((p) => p.cells[t.key]?.override)), [data]);
  const people = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data?.people || []).filter((p) => !term || `${p.name} ${p.employeeId || ''} ${p.position || ''}`.toLowerCase().includes(term));
  }, [data, q]);

  if (!data) return <Spinner />;
  if (data.policyStatus === 'none') {
    return <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-600">There is no {year} leave policy yet. Start one on the Leave policy tab — entitlements follow from it.</div>;
  }

  const saved = (row) => {
    setData((d) => ({ ...d, people: d.people.map((p) => (p.id === row.id ? row : p)) }));
    setEditing(null);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Staff entitlements {year}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {data.policyStatus === 'draft' ? `Previewing the ${year} draft — these apply once it is published. ` : ''}
            <span className="text-primary font-semibold">Blue</span> = differs from the clinic default (an override with a reason).
            {data.proRate ? ' Joiners and leavers are pro-rated.' : ''}
          </p>
        </div>
        <label className="relative sm:w-56">
          <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a person" className={`${inputCls} pl-8`} aria-label="Find a person" />
        </label>
      </div>
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
              <th className="text-left font-semibold py-1.5 pr-2">Person</th>
              {columns.map((t) => <th key={t.key} className="text-right font-semibold py-1.5 px-2 whitespace-nowrap">{t.name}<span className="block normal-case font-normal text-gray-400">{fmtDays(t.days)}</span></th>)}
              <th className="text-right font-semibold py-1.5 px-2 whitespace-nowrap">Carried in</th>
              <th className="text-left font-semibold py-1.5 px-2">Week</th>
              {canEdit && <th className="py-1.5" />}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {people.map((p) => {
              const carried = Object.values(p.cells).reduce((s, c) => s + (Number(c.carriedIn) || 0), 0);
              const carriedOverride = Object.values(p.cells).some((c) => c.override && c.override.carriedOver !== null);
              return (
                <tr key={p.id} className={`border-b border-gray-100 ${canEdit ? 'hover:bg-gray-50 cursor-pointer' : ''}`} onClick={canEdit ? () => setEditing(p) : undefined}>
                  <td className="py-1.5 pr-2">
                    <span className="text-gray-800">{p.name}</span>
                    <small className="block text-[11px] text-gray-500">{[p.employeeId, p.position].filter(Boolean).join(' · ')}</small>
                  </td>
                  {columns.map((t) => {
                    const c = p.cells[t.key] || {};
                    const over = c.source === 'override';
                    return (
                      <td key={t.key} className={`py-1.5 px-2 text-right ${over ? 'text-primary font-semibold' : 'text-gray-800'}`} title={over ? c.override?.reason || '' : ''}>
                        {c.unlimited ? '∞' : fmtDays(c.entitled)}{over && ' ✎'}
                        {c.proRated && <small className="block text-[10px] font-normal text-gray-500">pro-rata</small>}
                      </td>
                    );
                  })}
                  <td className={`py-1.5 px-2 text-right ${carriedOverride ? 'text-primary font-semibold' : 'text-gray-800'}`}>{fmtDays(carried)}</td>
                  <td className="py-1.5 px-2 text-xs">{p.weekOverride ? <Pill tone="warn">{weekLine(p.weekOverride)}</Pill> : <span className="text-gray-400">Clinic</span>}</td>
                  {canEdit && <td className="py-1.5 text-right"><Pencil className="w-3.5 h-3.5 text-gray-400 inline" /></td>}
                </tr>
              );
            })}
            {people.length === 0 && <tr><td colSpan={columns.length + 4} className="py-4 text-center text-gray-500">No one matches.</td></tr>}
          </tbody>
        </table>
      </div>
      {editing && (
        <OverrideModal person={editing} types={editableTypes} year={year} policyWeek={data.weekWeights} onClose={() => setEditing(null)} onSaved={saved} />
      )}
    </div>
  );
};

export default EntitlementGrid;
