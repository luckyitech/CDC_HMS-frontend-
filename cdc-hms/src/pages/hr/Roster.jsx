import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Send, Plus, Pencil, Archive, RotateCcw, Check, X, AlertTriangle, Moon } from 'lucide-react';
import { useUserContext } from '../../contexts/UserContext';
import { canEditRoster, canEditShiftTypes } from '../../utils/permissions';
import hrService from '../../services/hrService';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import Modal from '../../components/shared/Modal';
import ConfirmActionModal from '../../components/shared/ConfirmActionModal';
import { notify } from '../../utils/notify';
import { Pill } from '../../components/hr/hrFormat';
import { Section, inputCls, buttonCls, primaryButtonCls } from '../../components/hr/hrUi';
import {
  SHIFT_COLOURS, OFF_CHIP, LEAVE_CHIP, ROSTER_ROLE_LABEL, addDays, mondayOf, clinicToday,
  dayHead, longDay, weekTitle, hoursText, timesText, warningText,
} from '../../components/hr/roster/rosterFormat';

/**
 * Roster — /hr/roster (HR Tier 3 Phase 4, mockup D; T3-5/6/7 a, RO-1…RO-12).
 *
 * Week: one department's Monday–Sunday grid of nurses, lab and front office in
 * the viewer's hr.roster scope. A draft touches nothing; Publish makes every
 * shift from today on the person's expected hours for the day, so attendance
 * and stars follow it. After that, a change goes live at once. Days before
 * today are read-only. Leave and public holidays fill in by themselves; the
 * warnings (rest under 11 h, cover under the minimum, a shift on leave) never
 * block anything.
 *
 * Shift types: HR's clinic-wide list (hr.roster.shifts to change).
 */

const Chip = ({ cell, small = false }) => {
  if (!cell) return null;
  const cls = cell.isOff ? OFF_CHIP : (SHIFT_COLOURS[cell.colour]?.chip || SHIFT_COLOURS.slate.chip);
  return (
    <span className={`inline-flex max-w-full flex-col rounded-md border px-1.5 py-0.5 text-left leading-tight ${cls}`}>
      <span className="truncate text-[11px] font-semibold">{cell.name}{cell.overnight && <Moon className="ml-0.5 inline h-3 w-3 -mt-0.5" aria-label="runs past midnight" />}</span>
      {!small && !cell.isOff && <span className="text-[10px] tabular-nums opacity-80">{timesText(cell)}</span>}
    </span>
  );
};

const CellPicker = ({ open, onClose, person, date, cell, types, onLeave, holiday, onPick, busy }) => (
  <Modal isOpen={open} onClose={onClose} title={person ? `${person.name.split(' ')[0]} · ${longDay(date)}` : ''}>
    {(onLeave || holiday) && (
      <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
        {onLeave ? 'On approved leave this day — a shift here will show a warning.' : `Public holiday (${holiday}) — a shift here means they are expected in.`}
      </p>
    )}
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {types.map((t) => {
        const current = cell && !cell.isOff && cell.shiftTypeId === t.id;
        return (
          <button key={t.id} type="button" disabled={busy} onClick={() => onPick({ shiftTypeId: t.id })}
            className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm hover:bg-gray-50 ${current ? 'border-primary ring-1 ring-primary' : 'border-gray-200'}`}>
            <Chip cell={{ ...t, isOff: false }} small />
            <span className="text-xs tabular-nums text-gray-500">{t.startTime}–{t.endTime}</span>
          </button>
        );
      })}
      <button type="button" disabled={busy} onClick={() => onPick({ off: true })}
        className={`rounded-lg border px-3 py-2 text-left text-sm hover:bg-gray-50 ${cell?.isOff ? 'border-primary ring-1 ring-primary' : 'border-gray-200'}`}>
        <Chip cell={{ isOff: true, name: 'Off' }} small /> <span className="ml-1 text-xs text-gray-500">not expected in</span>
      </button>
      {cell && (
        <button type="button" disabled={busy} onClick={() => onPick({ clear: true })}
          className="rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50">
          Clear <span className="block text-[11px] text-gray-400">their usual working hours apply</span>
        </button>
      )}
    </div>
    {!types.length && <p className="mt-3 text-xs text-gray-500">No shift types yet — add them on the Shift types tab first.</p>}
  </Modal>
);

const WeekView = ({ types: allTypes }) => {
  const today = clinicToday();
  const [departments, setDepartments] = useState(null);
  const [department, setDepartment] = useState('');
  const [weekStart, setWeekStart] = useState(addDays(mondayOf(today), 7));
  const [data, setData] = useState(null);
  const [picking, setPicking] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [cover, setCover] = useState('');

  useEffect(() => {
    hrService.rosterDepartments()
      .then((res) => {
        const list = res?.data?.departments || [];
        setDepartments(list);
        if (list.length) setDepartment(String(list[0].id));
      })
      .catch((err) => { notify('error', err.message || 'Could not load departments'); setDepartments([]); });
  }, []);

  const load = useCallback(async () => {
    if (!department) return;
    try {
      const res = await hrService.rosterWeek(department, weekStart);
      setData(res?.data || null);
      setCover(String(res?.data?.week?.minCover ?? 0));
    } catch (err) { notify('error', err.message || 'Could not load the roster'); setData(null); }
  }, [department, weekStart]);
  useEffect(() => { setData(null); load(); }, [load]);

  const cellOf = useMemo(() => {
    const m = new Map();
    (data?.cells || []).forEach((c) => m.set(`${c.UserId}|${c.date}`, c));
    return m;
  }, [data]);
  const leaveSet = useMemo(() => new Set((data?.leave || []).map((l) => `${l.userId}|${l.date}`)), [data]);
  const warnKeys = useMemo(() => new Set((data?.warnings || []).filter((w) => w.userId).map((w) => `${w.userId}|${w.date}`)), [data]);
  const nameOf = (id) => data?.people.find((p) => p.id === id)?.name || 'Someone';

  if (!departments) return <Spinner />;
  if (!departments.length) return <Section><p className="text-sm text-gray-500">No department is within your roster reach yet. Departments are added under Departments &amp; positions.</p></Section>;

  const published = data?.week?.status === 'published';
  const pick = async (body) => {
    setBusy(true);
    try {
      const res = await hrService.rosterSetCell({ department, weekStart, userId: picking.person.id, date: picking.date, ...body });
      if (res?.data?.live && res?.data?.changed) notify('success', 'Saved — this week is published, so the change is live');
      setPicking(null);
      await load();
    } catch (err) { notify('error', err.message || 'Could not save the shift'); }
    finally { setBusy(false); }
  };
  const copy = async () => {
    setBusy(true);
    try {
      const res = await hrService.rosterCopy({ department, weekStart });
      const n = res?.data?.copied || 0;
      notify(n ? 'success' : 'info', n ? `Copied ${n} shift${n === 1 ? '' : 's'} from last week` : 'Nothing to copy — no empty days left to fill from last week');
      await load();
    } catch (err) { notify('error', err.message || 'Could not copy last week'); }
    finally { setBusy(false); }
  };
  const publish = async () => {
    setBusy(true);
    try {
      const res = await hrService.rosterPublish({ department, weekStart });
      notify('success', `Published — ${res?.data?.published || 0} shift${res?.data?.published === 1 ? '' : 's'} now set the expected hours for ${res?.data?.people || 0} ${res?.data?.people === 1 ? 'person' : 'people'}`);
      setConfirmPublish(false);
      await load();
    } catch (err) { notify('error', err.message || 'Could not publish'); }
    finally { setBusy(false); }
  };
  const saveCover = async () => {
    if (String(data?.week?.minCover) === cover) return;
    try {
      await hrService.rosterUpdateWeek({ department, weekStart, minCover: Number(cover) || 0 });
      await load();
    } catch (err) { notify('error', err.message || 'Could not save the minimum'); }
  };

  const dates = data?.dates || [];
  const coverCount = (date) => (data?.cells || []).filter((c) => c.date === date && !c.isOff).length;
  const min = data?.week?.minCover || 0;

  return (
    <div className="space-y-4">
      <Section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={buttonCls} aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-sm font-semibold text-gray-800">Week of {weekTitle(weekStart)}</span>
            <button type="button" className={buttonCls} aria-label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight className="h-4 w-4" /></button>
            {weekStart !== mondayOf(today) && <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setWeekStart(mondayOf(today))}>This week</button>}
            {data && (published ? <Pill tone="ok">published</Pill> : <Pill tone="warn">draft</Pill>)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Department" className="rounded-lg border border-gray-300 px-2 py-2 text-sm" value={department} onChange={(e) => setDepartment(e.target.value)}>
              {departments.map((d) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
            </select>
            <button type="button" className={buttonCls} disabled={busy || !data} onClick={copy}><Copy className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />Copy last week</button>
            {(!published || data?.unpublished > 0) && (
              <button type="button" className={primaryButtonCls} disabled={busy || !data} onClick={() => setConfirmPublish(true)}>
                <Send className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />{published ? `Publish ${data.unpublished} new` : 'Publish week'}
              </button>
            )}
          </div>
        </div>
        {data && (
          <p className="mt-2 text-xs text-gray-500">
            {published
              ? `Published${data.week.publishedBy ? ` by ${data.week.publishedBy}` : ''}. Changes you make now take effect straight away and the person is told.`
              : 'Draft — nothing here changes anyone\'s expected hours until you publish.'}
          </p>
        )}
      </Section>

      {!data ? <Spinner /> : (
        <Section>
          {!data.people.length ? (
            <p className="text-sm text-gray-500">Nobody to roster here. The roster covers nurses, lab and front office; doctors keep their appointment schedule.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-xs">
                <thead>
                  <tr>
                    <th scope="col" className="sticky left-0 z-10 bg-white px-2 py-2 text-left font-semibold text-gray-500">Person</th>
                    {dates.map((d) => {
                      const h = dayHead(d);
                      return (
                        <th key={d} scope="col" className={`px-1 py-2 text-left font-semibold ${d === today ? 'text-primary' : 'text-gray-500'}`}>
                          {h.wd} {h.day}
                          {data.holidays[d] && <span className="block truncate text-[10px] font-normal text-amber-700" title={data.holidays[d]}>{data.holidays[d]}</span>}
                        </th>
                      );
                    })}
                    <th scope="col" className="px-2 py-2 text-right font-semibold text-gray-500">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {data.people.map((p) => (
                    <tr key={p.id} className="border-t border-gray-100">
                      <th scope="row" className="sticky left-0 z-10 bg-white px-2 py-1.5 text-left font-normal">
                        <span className="block max-w-[9rem] truncate text-sm font-semibold text-gray-800">{p.name}</span>
                        <span className="block text-[11px] text-gray-400">{p.position || ROSTER_ROLE_LABEL[p.role] || p.role}</span>
                      </th>
                      {dates.map((d) => {
                        const key = `${p.id}|${d}`;
                        const cell = cellOf.get(key);
                        const onLeave = leaveSet.has(key);
                        const past = d < today;
                        const warned = warnKeys.has(key);
                        return (
                          <td key={d} className={`px-1 py-1.5 align-top ${data.holidays[d] ? 'bg-amber-50/40' : ''}`}>
                            <button type="button" disabled={past}
                              onClick={() => setPicking({ person: p, date: d })}
                              aria-label={`${p.name}, ${longDay(d)}: ${cell ? `${cell.name} ${timesText(cell)}` : onLeave ? 'on leave' : 'not rostered'}${past ? ' (past)' : ''}`}
                              className={`flex min-h-[2.5rem] w-full flex-col items-start gap-0.5 rounded-md p-0.5 text-left ${past ? 'cursor-default opacity-50' : 'hover:bg-gray-50'} ${warned ? 'outline outline-2 outline-red-400' : ''}`}>
                              {onLeave && <span className={`rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${LEAVE_CHIP}`}>Leave</span>}
                              {cell ? <Chip cell={cell} /> : (!onLeave && !past && <span className="px-1 text-[11px] text-gray-300">+</span>)}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-600">{hoursText(p.minutes)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-gray-200">
                    <th scope="row" className="sticky left-0 z-10 bg-white px-2 py-2 text-left text-[11px] font-semibold text-gray-500">On shift</th>
                    {dates.map((d) => {
                      const n = coverCount(d);
                      const low = min > 0 && n < min;
                      return <td key={d} className={`px-2 py-2 tabular-nums ${low ? 'font-semibold text-red-600' : 'text-gray-500'}`}>{n}{low ? ` · below ${min}` : ''}</td>;
                    })}
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
            <label htmlFor="roster-min-cover">Minimum on shift per day</label>
            <input id="roster-min-cover" type="number" min="0" max="50" className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm" value={cover}
              onChange={(e) => setCover(e.target.value)} onBlur={saveCover} />
            <span className="text-gray-400">0 = no check. A warning only — a short day can still be published.</span>
          </div>
        </Section>
      )}

      {data?.warnings?.length > 0 && (
        <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3" role="status">
          {data.warnings.map((w, i) => (
            <p key={i} className="flex items-start gap-2 text-xs text-amber-800"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />{warningText(w, nameOf)}</p>
          ))}
        </div>
      )}
      <p className="text-[11px] text-gray-400">Leave and public holidays fill in by themselves (leave never shows its type). A blank day means their usual working hours apply; Off means nobody expects them in. A shift that ends before it starts runs past midnight — the check-out tap the next morning closes it.</p>

      <CellPicker open={!!picking} onClose={() => setPicking(null)} busy={busy}
        person={picking?.person} date={picking?.date}
        cell={picking ? cellOf.get(`${picking.person.id}|${picking.date}`) : null}
        onLeave={picking ? leaveSet.has(`${picking.person.id}|${picking.date}`) : false}
        holiday={picking ? data?.holidays?.[picking.date] : null}
        types={(data?.types || allTypes || []).filter((t) => t.status === 'active')} onPick={pick} />

      <ConfirmActionModal isOpen={confirmPublish} onClose={() => setConfirmPublish(false)} onConfirm={publish}
        title={published ? 'Publish the new shifts?' : 'Publish this week?'}
        message={`Every shift from today on becomes that person's expected hours for the day — attendance, stars and "not yet in" follow it — and each person is told their shifts are published. ${published ? '' : 'Publishing cannot be undone; later changes go live as you make them.'}`}
        confirmLabel="Publish" />
    </div>
  );
};

const COLOUR_KEYS = Object.keys(SHIFT_COLOURS);

const ShiftTypeRow = ({ t, editable, onSave }) => {
  const [edit, setEdit] = useState(null);
  if (edit) {
    return (
      <li className="flex flex-wrap items-center gap-2 border-t border-gray-100 py-2 first:border-0">
        <input aria-label="Shift name" className={`${inputCls} min-w-[9rem] flex-1`} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
        <input aria-label="Starts" type="time" className="rounded-lg border border-gray-300 px-2 py-2 text-sm" value={edit.startTime} onChange={(e) => setEdit({ ...edit, startTime: e.target.value })} />
        <input aria-label="Ends" type="time" className="rounded-lg border border-gray-300 px-2 py-2 text-sm" value={edit.endTime} onChange={(e) => setEdit({ ...edit, endTime: e.target.value })} />
        <select aria-label="Colour" className="rounded-lg border border-gray-300 px-2 py-2 text-sm" value={edit.colour} onChange={(e) => setEdit({ ...edit, colour: e.target.value })}>
          {COLOUR_KEYS.map((c) => <option key={c} value={c}>{SHIFT_COLOURS[c].label}</option>)}
        </select>
        <button type="button" className={buttonCls} aria-label="Save" onClick={async () => { if (await onSave(t, edit)) setEdit(null); }}><Check className="h-3.5 w-3.5" /></button>
        <button type="button" className={buttonCls} aria-label="Cancel" onClick={() => setEdit(null)}><X className="h-3.5 w-3.5" /></button>
      </li>
    );
  }
  return (
    <li className={`flex flex-wrap items-center gap-3 border-t border-gray-100 py-2 text-sm first:border-0 ${t.status !== 'active' ? 'opacity-50' : ''}`}>
      <span className="min-w-[9rem] flex-1"><Chip cell={{ ...t, isOff: false }} /></span>
      <span className="w-28 text-xs tabular-nums text-gray-500">{hoursText(t.minutes)}{t.overnight ? ' · overnight' : ''}</span>
      {t.status !== 'active' && <Pill tone="warn">archived</Pill>}
      {editable && (
        <span className="flex gap-1">
          {t.status === 'active' && <button type="button" className={buttonCls} aria-label={`Edit ${t.name}`} onClick={() => setEdit({ name: t.name, startTime: t.startTime, endTime: t.endTime, colour: t.colour })}><Pencil className="h-3.5 w-3.5" /></button>}
          <button type="button" className={buttonCls} aria-label={t.status === 'active' ? `Archive ${t.name}` : `Restore ${t.name}`}
            onClick={() => onSave(t, { status: t.status === 'active' ? 'archived' : 'active' })}>
            {t.status === 'active' ? <Archive className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
          </button>
        </span>
      )}
    </li>
  );
};

const ShiftTypes = ({ editable, types, setTypes }) => {
  const [form, setForm] = useState({ name: '', startTime: '07:00', endTime: '14:00', colour: 'blue' });
  const save = async (t, body) => {
    try {
      const res = await hrService.updateShiftType(t.id, body);
      setTypes((list) => list.map((x) => (x.id === t.id ? res.data : x)));
      return true;
    } catch (err) { notify('error', err.message || 'Could not save'); return false; }
  };
  const add = async (e) => {
    e.preventDefault();
    try {
      const res = await hrService.addShiftType({ ...form, name: form.name.trim() });
      setTypes((list) => [...list, res.data]);
      setForm((f) => ({ ...f, name: '' }));
    } catch (err) { notify('error', err.message || 'Could not add the shift'); }
  };
  if (!types) return <Spinner />;
  const active = types.filter((t) => t.status === 'active');
  const archived = types.filter((t) => t.status !== 'active');
  return (
    <Section title="The clinic's shifts">
      {!types.length && <p className="mb-2 text-sm text-gray-500">No shifts yet. Add the clinic&apos;s real shifts — e.g. Morning 07:00–14:00, Night 19:00–07:00.</p>}
      <ul>{[...active, ...archived].map((t) => <ShiftTypeRow key={t.id} t={t} editable={editable} onSave={save} />)}</ul>
      {editable ? (
        <form onSubmit={add} className="mt-3 flex flex-wrap gap-2">
          <input aria-label="New shift name" placeholder="Shift name, e.g. Morning" className={`${inputCls} min-w-[9rem] flex-1`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input aria-label="New shift starts" type="time" className="rounded-lg border border-gray-300 px-2 py-2 text-sm" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          <input aria-label="New shift ends" type="time" className="rounded-lg border border-gray-300 px-2 py-2 text-sm" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          <select aria-label="New shift colour" className="rounded-lg border border-gray-300 px-2 py-2 text-sm" value={form.colour} onChange={(e) => setForm({ ...form, colour: e.target.value })}>
            {COLOUR_KEYS.map((c) => <option key={c} value={c}>{SHIFT_COLOURS[c].label}</option>)}
          </select>
          <button type="submit" className={buttonCls} disabled={form.name.trim().length < 1}><Plus className="-mt-0.5 inline h-3.5 w-3.5" /> Add</button>
        </form>
      ) : (
        <p className="mt-3 text-xs text-gray-500">Changing the shifts needs &quot;Shift types&quot;.</p>
      )}
      <p className="mt-3 text-[11px] text-gray-400">A shift that ends at or before its start runs past midnight. Editing a shift changes future picks only — days already rostered keep the times they were given. Archive a shift you no longer use; it stays on past weeks.</p>
    </Section>
  );
};

const Roster = () => {
  const { currentUser } = useUserContext();
  const canRoster = canEditRoster(currentUser);
  const canTypes = canEditShiftTypes(currentUser);
  const [tab, setTab] = useState(canRoster ? 'week' : 'types');
  const [types, setTypes] = useState(null);

  useEffect(() => {
    if (!canRoster && !canTypes) return;
    hrService.shiftTypes(true)
      .then((res) => setTypes(res?.data?.types || []))
      .catch((err) => { notify('error', err.message || 'Could not load shift types'); setTypes([]); });
  }, [canRoster, canTypes]);

  if (!canRoster && !canTypes) {
    return (
      <div className="p-4">
        <PageHeader title="Roster" />
        <p className="text-sm text-gray-500">You don&apos;t have access to the roster.</p>
      </div>
    );
  }
  const tabs = [...(canRoster ? [{ key: 'week', label: 'Week' }] : []), { key: 'types', label: 'Shift types' }];

  return (
    <div className="max-w-6xl space-y-4 p-4">
      <PageHeader title="Roster" subtitle="Weekly shifts for nurses, lab and front office — published shifts set each day's expected hours" />
      <div className="flex gap-1 border-b border-gray-200" role="tablist">
        {tabs.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'week' ? <WeekView types={types} /> : <ShiftTypes editable={canTypes} types={types} setTypes={setTypes} />}
    </div>
  );
};

export default Roster;
