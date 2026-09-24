import { useState, useEffect } from 'react';
import hrService from '../../services/hrService';
import { notify } from '../../utils/notify';
import { dayLabel } from './hrFormat';

/**
 * WorkHours — per-person working hours (HR Suite, B21; hr.write).
 *
 * Table: Person · Mon–Fri · Sat · Sun · Grace · Edit. The edit drawer holds one
 * row per weekday (start, end, off, grace) plus dated overrides (a single day:
 * off, or different hours). Saving REPLACES the weekday pattern; a weekday
 * left "clinic default" gets no row and falls back to the clinic-wide hours.
 * The future shift roster writes dated rows into the same table.
 */
const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const inputCls = 'rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-primary';

/** hoursDefault {'1-5':['08:00','17:00'], 6:[...], 0:'off'} → { weekday: {start,end} | 'off' | null } */
const expandDefault = (def = {}) => {
  const out = {};
  for (const [k, v] of Object.entries(def)) {
    const m = /^(\d)(?:-(\d))?$/.exec(String(k));
    if (!m) continue;
    const a = Number(m[1]); const b = m[2] != null ? Number(m[2]) : a;
    for (let d = a; d <= b; d++) out[d] = v === 'off' ? 'off' : Array.isArray(v) ? { start: v[0], end: v[1] } : null;
  }
  return out;
};

const describeDay = (row, def) => {
  if (row) return row.isOff ? 'Off' : `${row.startTime} – ${row.endTime}`;
  if (def === 'off') return 'Off';
  if (def?.start) return `${def.start} – ${def.end}`;
  return '—';
};

const Editor = ({ person, rows, hoursDefault, graceDefault, onClose, onSaved }) => {
  const def = expandDefault(hoursDefault);
  const [days, setDays] = useState({});
  const [overrides, setOverrides] = useState([]);
  const [newDate, setNewDate] = useState('');
  const [newKind, setNewKind] = useState('off');
  const [newStart, setNewStart] = useState('08:00');
  const [newEnd, setNewEnd] = useState('17:00');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = {};
    for (const n of ORDER) {
      const r = rows.find((x) => x.date == null && x.weekday === n);
      d[n] = r
        ? { mode: r.isOff ? 'off' : 'custom', start: r.startTime || '', end: r.endTime || '', grace: r.graceMinutes ?? '' }
        : { mode: 'default', start: def[n]?.start || '08:00', end: def[n]?.end || '17:00', grace: '' };
    }
    setDays(d);
    setOverrides(rows.filter((x) => x.date).map((x) => ({ date: x.date, isOff: x.isOff, startTime: x.startTime, endTime: x.endTime })));
    // `def` is derived from hoursDefault, which is stable for the editor's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, person?.id]);

  const setDay = (n, patch) => setDays((prev) => ({ ...prev, [n]: { ...prev[n], ...patch } }));

  const addOverride = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) { notify('error', 'Choose a date for the override.'); return; }
    if (newKind === 'hours' && newStart >= newEnd) { notify('error', 'End must be after start.'); return; }
    setOverrides((prev) => [...prev.filter((o) => o.date !== newDate), { date: newDate, isOff: newKind === 'off', startTime: newKind === 'off' ? null : newStart, endTime: newKind === 'off' ? null : newEnd }]);
    setNewDate('');
  };

  const save = async () => {
    const weekdays = [];
    for (const n of ORDER) {
      const d = days[n];
      if (!d || d.mode === 'default') continue;
      if (d.mode === 'custom' && (!d.start || !d.end || d.start >= d.end)) { notify('error', `${WD[n]}: end must be after start.`); return; }
      weekdays.push({ weekday: n, isOff: d.mode === 'off', startTime: d.mode === 'off' ? null : d.start, endTime: d.mode === 'off' ? null : d.end, graceMinutes: d.grace === '' ? null : Number(d.grace) });
    }
    // Overrides are replaced as a set: rows removed here are retired server-side.
    const existing = rows.filter((x) => x.date).map((x) => x.date);
    const payload = [
      ...overrides.map((o) => ({ ...o })),
      ...existing.filter((d) => !overrides.some((o) => o.date === d)).map((date) => ({ date, remove: true })),
    ];
    setBusy(true);
    try {
      const res = await hrService.setWorkHours(person.id, { weekdays, overrides: payload });
      if (res?.success) { notify('success', `Working hours saved for ${person.name}.`); onSaved(res.data); }
      else notify('error', res?.message || 'Could not save.');
    } catch (e) { notify('error', e?.message || 'Could not save.'); }
    finally { setBusy(false); }
  };

  if (!Object.keys(days).length) return null;
  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h5 className="text-sm font-bold text-gray-800">{person.role === 'doctor' ? 'Dr ' : ''}{person.name}</h5>
      <p className="text-xs text-gray-500 mb-3">"Clinic default" follows the clinic-wide hours; set a day only where this person differs. Grace blank = clinic grace ({graceDefault} min).</p>
      <div className="space-y-1.5">
        {ORDER.map((n) => {
          const d = days[n];
          return (
            <div key={n} className="grid grid-cols-[88px_130px_1fr_70px] items-center gap-2 text-sm">
              <span className="text-gray-700">{WD[n].slice(0, 3)}</span>
              <select value={d.mode} onChange={(e) => setDay(n, { mode: e.target.value })} className={inputCls}>
                <option value="default">Clinic default</option>
                <option value="custom">Set hours</option>
                <option value="off">Off</option>
              </select>
              <span className="tabular-nums text-gray-600">
                {d.mode === 'custom' ? (
                  <span className="inline-flex items-center gap-1">
                    <input type="time" value={d.start} onChange={(e) => setDay(n, { start: e.target.value })} className={inputCls} /> –
                    <input type="time" value={d.end} onChange={(e) => setDay(n, { end: e.target.value })} className={inputCls} />
                  </span>
                ) : d.mode === 'off' ? 'Off' : (def[n] === 'off' ? 'Off (clinic)' : def[n] ? `${def[n].start} – ${def[n].end} (clinic)` : '— (clinic has no hours)')}
              </span>
              <input type="number" min="0" max="240" placeholder="grace" value={d.grace} onChange={(e) => setDay(n, { grace: e.target.value })} className={`${inputCls} w-full`} disabled={d.mode === 'default'} title="Grace minutes for this day" />
            </div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-gray-200 pt-3">
        <h6 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Date overrides (one day)</h6>
        {overrides.length === 0 && <p className="text-xs text-gray-500 mb-2">None.</p>}
        {overrides.map((o) => (
          <div key={o.date} className="flex items-center gap-3 text-sm py-1">
            <span className="w-28 text-gray-800">{dayLabel(o.date, true)}</span>
            <span className="tabular-nums text-gray-600">{o.isOff ? 'Off' : `${o.startTime} – ${o.endTime}`}</span>
            <button type="button" onClick={() => setOverrides((prev) => prev.filter((x) => x.date !== o.date))} className="text-xs text-red-600 hover:underline ml-auto">Remove</button>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className={inputCls} />
          <select value={newKind} onChange={(e) => setNewKind(e.target.value)} className={inputCls}><option value="off">Off</option><option value="hours">Different hours</option></select>
          {newKind === 'hours' && (
            <>
              <input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} className={inputCls} /> –
              <input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className={inputCls} />
            </>
          )}
          <button type="button" onClick={addOverride} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white">Add</button>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button type="button" onClick={save} disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Saving…' : 'Save working hours'}</button>
        <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button>
      </div>
    </div>
  );
};

const WorkHours = ({ canEdit }) => {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = () => hrService.workHoursAll().then((res) => setData(res?.data || null)).catch((e) => notify('error', e?.message || 'Could not load working hours'));
  useEffect(() => { load(); }, []);

  if (!data) return <p className="text-sm text-gray-500">Loading…</p>;
  const def = expandDefault(data.hoursDefault);
  const rowFor = (rows, n) => rows.find((x) => x.date == null && x.weekday === n);
  const monFri = (rows) => {
    const parts = [1, 2, 3, 4, 5].map((n) => describeDay(rowFor(rows, n), def[n]));
    return parts.every((p) => p === parts[0]) ? parts[0] : 'varies';
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
            <th className="text-left py-1.5 pr-2 font-semibold">Person</th><th className="text-left py-1.5 px-2 font-semibold">Mon–Fri</th><th className="text-left py-1.5 px-2 font-semibold">Sat</th><th className="text-left py-1.5 px-2 font-semibold">Sun</th><th className="text-left py-1.5 px-2 font-semibold">Grace</th><th className="py-1.5" />
          </tr></thead>
          <tbody className="tabular-nums">
            {data.people.map(({ person, rows }) => {
              const custom = rows.some((r) => r.date == null);
              const grace = rows.find((r) => r.date == null && r.graceMinutes != null)?.graceMinutes;
              return (
                <tr key={person.id} className={`border-b border-gray-100 ${editing?.id === person.id ? 'bg-blue-50' : ''}`}>
                  <td className="py-1.5 pr-2 text-gray-800">{person.role === 'doctor' ? 'Dr ' : ''}{person.name}{!custom && <small className="block text-gray-400 font-normal">clinic default</small>}</td>
                  <td className="py-1.5 px-2">{monFri(rows)}</td>
                  <td className="py-1.5 px-2">{describeDay(rowFor(rows, 6), def[6])}</td>
                  <td className="py-1.5 px-2">{describeDay(rowFor(rows, 0), def[0])}</td>
                  <td className="py-1.5 px-2">{grace ?? data.graceMinutes} min</td>
                  <td className="py-1.5 text-right">{canEdit && <button type="button" onClick={() => setEditing(editing?.id === person.id ? null : person)} className="text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg px-2 py-1 hover:bg-gray-50">Edit</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing && (
        <Editor
          person={editing}
          rows={data.people.find((p) => p.person.id === editing.id)?.rows || []}
          hoursDefault={data.hoursDefault}
          graceDefault={data.graceMinutes}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      <p className="text-xs text-gray-500 mt-3">Per weekday, with a date-specific override for a single day. The shift roster (later) writes dated rows into the same table. Defaults for a new account come from the clinic-wide hours.</p>
    </div>
  );
};

export default WorkHours;
