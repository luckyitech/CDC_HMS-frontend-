import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import leaveService from '../../../services/leaveService';
import Spinner from '../../shared/Spinner';
import { notify } from '../../../utils/notify';
import { monthLabel, shiftMonth, thisMonth, roleLabel } from '../hrFormat';

/**
 * TeamCalendar — /hr/calendar (B27 phase 5, mockup 5C).
 *
 * A month of who is away. Approved leave is green, pending amber; public
 * holidays and weekend days (weight 0) are shaded. Names and dates are always
 * shown so staff can arrange cover; the LEAVE TYPE is redacted server-side for
 * anyone without leave.manage (Sick is always "Away"; other types only if HR
 * ticked them on the settings). A cadre-clash strip warns when more of one
 * cadre are away on a day than the policy allows.
 *
 * Every internal role may open it. The server decides what each viewer sees.
 */
const CADRES = [['', 'All cadres'], ['doctor', 'Doctors'], ['nurse', 'Nurses'], ['lab', 'Lab'], ['staff', 'Reception / staff']];

const eachDate = (from, to) => {
  const out = [];
  let d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end) { out.push(d.toISOString().slice(0, 10)); d = new Date(d.getTime() + 86400000); }
  return out;
};
const dayNum = (iso) => Number(iso.slice(8, 10));
const shortDay = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Collapse the per-day clash rows into "14–15 Oct: 2 nurses away (…)" lines. */
const collapseClashes = (clashes = []) => {
  const groups = {};
  for (const c of clashes) {
    const key = `${c.cadre}|${[...c.names].sort().join(',')}|${c.count}`;
    (groups[key] ||= { cadre: c.cadre, count: c.count, names: c.names, dates: [] }).dates.push(c.date);
  }
  return Object.values(groups).map((g) => {
    const dates = g.dates.sort();
    return { ...g, from: dates[0], to: dates[dates.length - 1] };
  }).sort((a, b) => a.from.localeCompare(b.from));
};

const TeamCalendar = () => {
  const [month, setMonth] = useState(thisMonth());
  const [cadre, setCadre] = useState('');
  const [data, setData] = useState(null);

  const from = `${month}-01`;
  const to = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  }, [month]);

  const load = useCallback(async () => {
    setData(null);
    try {
      const res = await leaveService.calendar({ from, to, ...(cadre ? { cadre } : {}) });
      setData(res.data);
    } catch (e) {
      notify('error', e?.message || 'Could not load the team calendar');
      setData({ rows: [], holidays: [], weekendDays: [], clashes: [], from, to, manage: false });
    }
  }, [from, to, cadre]);
  useEffect(() => { load(); }, [load]);

  const dates = useMemo(() => (data ? eachDate(data.from, data.to) : []), [data]);
  const n = dates.length || 1;
  const slot = 100 / n;
  const holidayName = useMemo(() => Object.fromEntries((data?.holidays || []).map((h) => [h.date, h.name])), [data]);
  const weekendSet = useMemo(() => new Set(data?.weekendDays || []), [data]);
  const idx = (iso) => Math.max(0, dates.indexOf(iso));
  const clashLines = useMemo(() => collapseClashes(data?.clashes), [data]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-base font-semibold text-gray-800">{monthLabel(month)}</h3>
        <div className="flex items-center gap-2">
          <select value={cadre} onChange={(e) => setCadre(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" aria-label="Cadre">
            {CADRES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button type="button" aria-label="Previous month" className="rounded-lg border border-gray-300 p-1.5 hover:bg-gray-50" onClick={() => setMonth((m) => shiftMonth(m, -1))}><ChevronLeft className="w-4 h-4" /></button>
          <button type="button" aria-label="Next month" className="rounded-lg border border-gray-300 p-1.5 hover:bg-gray-50" onClick={() => setMonth((m) => shiftMonth(m, 1))}><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {data === null ? <Spinner /> : (
        <>
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              {/* Header — day numbers */}
              <div className="grid" style={{ gridTemplateColumns: '150px 1fr' }}>
                <div />
                <div className="relative flex h-5">
                  {dates.map((d) => (
                    <div key={d} className={`flex items-center justify-center text-[10px] ${holidayName[d] ? 'text-gray-500' : weekendSet.has(d) ? 'text-gray-300' : 'text-gray-400'}`} style={{ width: `${slot}%` }}>{dayNum(d)}</div>
                  ))}
                </div>
              </div>

              {data.rows.length === 0 ? (
                <p className="text-sm text-gray-500 py-6">Nobody is booked away this month{cadre ? ' in this cadre' : ''}.</p>
              ) : data.rows.map((r) => (
                <div key={r.userId} className="grid items-center border-t border-gray-100" style={{ gridTemplateColumns: '150px 1fr' }}>
                  <div className="py-1.5 pr-2 text-sm text-gray-800 truncate">
                    {r.name} <span className="text-gray-400 text-xs">{roleLabel(r.role)}</span>
                  </div>
                  <div className="relative h-6">
                    {/* Background: weekend / holiday shading */}
                    {dates.map((d) => (
                      <div key={d} className="absolute top-0 bottom-0"
                        style={{
                          left: `${idx(d) * slot}%`, width: `${slot}%`,
                          background: holidayName[d] ? '#f3f4f6' : weekendSet.has(d) ? 'repeating-linear-gradient(45deg,#f5f5f4,#f5f5f4 3px,#eeecea 3px,#eeecea 6px)' : 'transparent',
                        }}
                        title={holidayName[d] || ''}
                      >{holidayName[d] ? <span className="block text-center text-[9px] leading-6 text-gray-400">H</span> : null}</div>
                    ))}
                    {/* Segments */}
                    {r.segments.map((seg, i) => {
                      const a = idx(seg.from); const b = idx(seg.to);
                      const left = a * slot; const width = (b - a + 1) * slot;
                      const cls = seg.state === 'approved' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-amber-100 text-amber-800 border-amber-300';
                      return (
                        <div key={i} className={`absolute top-0.5 bottom-0.5 rounded border px-1 text-[10px] leading-5 overflow-hidden whitespace-nowrap ${cls}`}
                          style={{ left: `${left}%`, width: `${width}%` }} title={`${seg.label} · ${shortDay(seg.from)}–${shortDay(seg.to)} · ${seg.state}`}>
                          {seg.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {clashLines.length > 0 && (
            <div className="mt-3 space-y-1">
              {clashLines.map((c, i) => (
                <div key={i} className="flex items-start gap-2 bg-amber-50 text-amber-800 text-xs rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 flex-none mt-0.5" />
                  <span>
                    <b>{c.from === c.to ? shortDay(c.from) : `${shortDay(c.from)} – ${shortDay(c.to)}`}:</b> {c.count} {roleLabel(c.cadre).toLowerCase()}s away ({c.names.join(', ')}) — over the “{data.maxCadreAwayPerDay} away/day” guideline. Warning only.
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500 mt-3">
            <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-300" /> Approved</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-amber-100 border border-amber-300" /> Pending</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-gray-100" /> Holiday (H)</span>
            <span>Weekend hatched.</span>
            {!data.manage && <span>Some leave shows as “Away” — the type is private.</span>}
          </div>
        </>
      )}
    </div>
  );
};

export default TeamCalendar;
