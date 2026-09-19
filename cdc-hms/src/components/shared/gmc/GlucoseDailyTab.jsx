import { useState, useMemo, useEffect } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip,
  ReferenceArea, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  SOURCE_META, BAND, DIARY_META, SourceSwatch, ChartCard, Empty, PointShape, DiaryShape, PointTip, bandOf, dayHeading, fmtWhen,
  minutesOfDay, OVERLAY_COLORS, OVERLAY_MAX,
} from './gmcShared';

/**
 * Daily graph — one day at a time, the way a CGM report shows a single day:
 * time of day across the bottom (00:00 · 06:00 · 12:00 · 18:00 · 00:00), glucose
 * up the side on a fixed clinical scale, the target band shaded, and the
 * patient's diary (meals, activity, insulin, symptoms) overlaid along the base
 * so a spike can be read against what was eaten or done. A date picker with
 * previous / next steps through the days in the current window.
 *
 * Overlay mode — the "modal day": the doctor picks a date range and every day in
 * it is drawn on the SAME 24-hour clock, each day its own colour, so day-to-day
 * pattern (a recurring pre-lunch dip, a bad Sunday) reads at a glance. Colour
 * encodes the day here, so the per-source shapes and the diary are dropped in
 * this mode to keep the plot legible; single-day view keeps them.
 *
 * Per-day figures (n, mean, in-range, lows) are counted here from that day's
 * readings — a convenience summary of one day, distinct from the server's
 * window-wide consensus metrics on the Indices tab.
 */
const addDays = (iso, n) => { const [y, mo, d] = iso.split('-').map(Number); const dt = new Date(y, mo - 1, d + n); const p = (x) => String(x).padStart(2, '0'); return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`; };
const HOUR_TICKS = [0, 360, 720, 1080, 1440];
const fmtHour = (v) => (v >= 1440 ? '00:00' : `${String(Math.floor(v / 60)).padStart(2, '0')}:00`);

// A soft ceiling: past this many lines the colours get hard to tell apart, so
// we show a gentle note (but still draw them). OVERLAY_MAX / OVERLAY_COLORS are
// shared with the printed report (gmcShared) so screen and paper agree.
const OVERLAY_SOFT = 8;

// One day's figures, counted from countable readings (same rule as the
// single-day strip), reused by the overlay legend.
const figuresFor = (pts, t, val) => {
  const c = pts.filter((r) => r.countable);
  const mg = c.map((r) => r.mgdl);
  if (!mg.length) return { n: 0 };
  const mean = mg.reduce((a, b) => a + b, 0) / mg.length;
  const inR = mg.filter((x) => bandOf(x, t) === 'inRange').length;
  const lows = mg.filter((x) => x < t.tirLowMgdl).length;
  const highs = mg.filter((x) => x > t.tirHighMgdl).length;
  return { n: mg.length, mean: val(mean), inR: Math.round((100 * inR) / mg.length), lows, highs };
};

// Tooltip for an overlaid point: value, when (date + time), and the day's colour.
const OverlayTip = ({ active, payload, unitLabel }) => {
  const p = payload?.[0]?.payload;
  if (!active || !p || p.source === undefined) return null;
  return (
    <div className="bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 shadow">
      <div><strong>{p.y} {unitLabel}</strong> · {fmtWhen(p.at)}</div>
      <div className="flex items-center gap-1.5 text-gray-300">
        <i className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: p.dayColor }} /> {p.dayLabel}
      </div>
    </div>
  );
};

// A small filled dot coloured by its day, for the overlaid lines.
const OverlayDot = ({ cx, cy, fill }) => (cx === undefined || cy === undefined ? null
  : <circle cx={cx} cy={cy} r={3.2} fill={fill} stroke="#fff" strokeWidth={1} />);

const GlucoseDailyTab = ({ data, t, unit, val, unitLabel }) => {
  const from = data.window.from;
  const to = data.window.to;

  const [mode, setMode] = useState('single'); // 'single' | 'overlay'

  // Days that actually have a reading, newest first — default to the latest.
  const daysWithData = useMemo(() => {
    const set = new Set((data.readings || []).filter((r) => r.mgdl !== null).map((r) => r.at.slice(0, 10)));
    return [...set].sort().reverse();
  }, [data]);
  const daysAsc = useMemo(() => [...daysWithData].reverse(), [daysWithData]);

  // ---- single day ----
  const [day, setDay] = useState(daysWithData[0] || to);
  useEffect(() => { setDay(daysWithData[0] || to); /* reset when the window changes */ }, [from, to]); // eslint-disable-line react-hooks/exhaustive-deps
  const clampedDay = day < from ? from : day > to ? to : day;

  const dayReadings = useMemo(
    () => (data.readings || []).filter((r) => r.at.slice(0, 10) === clampedDay && r.mgdl !== null)
      .map((r) => ({ ...r, x: minutesOfDay(r.at), y: val(r.mgdl) }))
      .sort((a, b) => a.x - b.x),
    [data, clampedDay, val],
  );
  const dayDiary = useMemo(() => {
    const base = unit === 'mmol' ? 1.2 : 22;
    return (data.diary || []).filter((e) => e.at.slice(0, 10) === clampedDay)
      .map((e) => ({ x: minutesOfDay(e.at), y: base, diary: true, diaryType: e.eventType, label: e.label, at: e.at, detail: e.detail }));
  }, [data, clampedDay, unit]);

  const stat = useMemo(() => figuresFor(dayReadings, t, val), [dayReadings, t, val]);

  // ---- overlay ----
  const defaultRange = () => {
    if (!daysAsc.length) return { from, to };
    const last = daysAsc[daysAsc.length - 1];
    const start = daysAsc[Math.max(0, daysAsc.length - 7)];
    return { from: start, to: last };
  };
  const [range, setRange] = useState(defaultRange);
  const [hidden, setHidden] = useState(() => new Set());
  useEffect(() => { setRange(defaultRange()); setHidden(new Set()); /* reset when the window changes */ }, [from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  const overlay = useMemo(() => {
    let list = daysAsc.filter((d) => d >= range.from && d <= range.to);
    const capped = list.length > OVERLAY_MAX;
    if (capped) list = list.slice(-OVERLAY_MAX);
    const series = list.map((d, i) => {
      const color = OVERLAY_COLORS[i % OVERLAY_COLORS.length];
      const label = dayHeading(`${d} 00:00:00`);
      const pts = (data.readings || [])
        .filter((r) => r.at.slice(0, 10) === d && r.mgdl !== null && !r.excluded)
        .map((r) => ({ ...r, x: minutesOfDay(r.at), y: val(r.mgdl), dayColor: color, dayLabel: label }))
        .sort((a, b) => a.x - b.x);
      return { date: d, color, label, pts, fig: figuresFor(pts, t, val) };
    });
    return { series, capped };
  }, [daysAsc, range, data, t, val]);

  const setQuick = (n) => {
    if (!daysAsc.length) return;
    const last = daysAsc[daysAsc.length - 1];
    const start = daysAsc[Math.max(0, daysAsc.length - n)];
    setHidden(new Set());
    setRange({ from: start, to: last });
  };

  const visibleSeries = overlay.series.filter((s) => !hidden.has(s.date));
  const shownCount = visibleSeries.length;

  const yMax = unit === 'mmol' ? 22 : 400;
  const canPrev = clampedDay > from;
  const canNext = clampedDay < to;

  return (
    <div>
      {/* mode toggle — this tab only; the rest of the header lives in the container */}
      <div className="flex justify-end mb-3">
        <div className="inline-flex bg-indigo-50 border border-indigo-200 rounded-lg p-0.5">
          <button type="button" onClick={() => setMode('single')}
            className={`px-3 py-1 text-xs font-bold rounded-md ${mode === 'single' ? 'bg-indigo-600 text-white' : 'text-indigo-600'}`}>Single day</button>
          <button type="button" onClick={() => setMode('overlay')}
            className={`px-3 py-1 text-xs font-bold rounded-md ${mode === 'overlay' ? 'bg-indigo-600 text-white' : 'text-indigo-600'}`}>Overlay</button>
        </div>
      </div>

      {mode === 'single' ? (
        <>
          {/* date navigator */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <button type="button" disabled={!canPrev} onClick={() => setDay(addDays(clampedDay, -1))}
              className={`p-2 rounded-lg border ${canPrev ? 'border-gray-300 text-gray-700 hover:bg-gray-50' : 'border-gray-200 text-gray-300 cursor-not-allowed'}`} aria-label="Previous day"><ChevronLeft className="w-5 h-5" /></button>
            <div className="text-center min-w-[13rem]">
              <p className="font-bold text-gray-800">{dayHeading(`${clampedDay} 00:00:00`)}</p>
              <input type="date" value={clampedDay} min={from} max={to} onChange={(e) => e.target.value && setDay(e.target.value)}
                className="mt-1 text-xs px-2 py-1 border border-gray-300 rounded-lg" />
            </div>
            <button type="button" disabled={!canNext} onClick={() => setDay(addDays(clampedDay, 1))}
              className={`p-2 rounded-lg border ${canNext ? 'border-gray-300 text-gray-700 hover:bg-gray-50' : 'border-gray-200 text-gray-300 cursor-not-allowed'}`} aria-label="Next day"><ChevronRight className="w-5 h-5" /></button>
          </div>

          {/* per-day figures */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <DayStat label="Readings" value={stat.n} />
            <DayStat label="Mean" value={stat.n ? <>{stat.mean}<small className="text-xs font-normal text-gray-500 ml-1">{unitLabel}</small></> : '—'} />
            <DayStat label="In range" value={stat.n ? `${stat.inR} %` : '—'} tone={stat.n && stat.inR >= 70 ? 'good' : ''} />
            <DayStat label="Low / high" value={stat.n ? `${stat.lows} / ${stat.highs}` : '—'} tone={stat.n && stat.lows ? 'bad' : ''} />
          </div>

          <ChartCard title="One day" caption={`Time of day across the bottom · shaded band = target ${val(t.tirLowMgdl)}–${val(t.tirHighMgdl)} ${unitLabel} · triangles on the base line are diary events`}>
            {dayReadings.length === 0 && dayDiary.length === 0 ? <Empty text="Nothing recorded on this day." /> : (
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" dataKey="x" domain={[0, 1440]} ticks={HOUR_TICKS} tickFormatter={fmtHour} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis type="number" dataKey="y" domain={[0, yMax]} tick={{ fontSize: 11, fill: '#6b7280' }} width={34} />
                    <ZAxis range={[70, 70]} />
                    <ReferenceArea y1={val(t.tirLowMgdl)} y2={val(t.tirHighMgdl)} fill="#dbe8f7" fillOpacity={0.6} />
                    <ReferenceLine y={val(t.tbrLevel2Mgdl)} stroke={BAND.veryLow} strokeDasharray="4 4" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<PointTip unitLabel={unitLabel} />} />
                    {dayReadings.length > 1 && <Scatter data={dayReadings} line={{ stroke: SOURCE_META.meter.color, strokeWidth: 1.5, strokeOpacity: 0.35 }} shape={() => null} legendType="none" isAnimationActive={false} />}
                    {Object.entries(SOURCE_META).map(([k, meta]) => (
                      <Scatter key={k} name={meta.label} data={dayReadings.filter((p) => p.source === k)} fill={meta.color} shape={(props) => <PointShape {...props} lowMgdl={t.tirLowMgdl} />} isAnimationActive={false} />
                    ))}
                    {dayDiary.length > 0 && <Scatter name="Diary" data={dayDiary} shape={(props) => <DiaryShape {...props} />} legendType="none" isAnimationActive={false} />}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mt-2">
              {Object.entries(SOURCE_META).map(([k, meta]) => <span key={k} className="inline-flex items-center gap-1.5"><SourceSwatch source={k} /> {meta.label}</span>)}
              <span className="inline-flex items-center gap-1.5"><i className="inline-block w-3 h-3" style={{ background: '#dbe8f7' }} /> Target band</span>
              {dayDiary.length > 0 && Object.entries(DIARY_META).filter(([k]) => dayDiary.some((d) => d.diaryType === k)).map(([k, meta]) => (
                <span key={k} className="inline-flex items-center gap-1.5"><i className="inline-block w-0 h-0" style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: `7px solid ${meta.color}` }} /> {meta.label}</span>
              ))}
            </div>
          </ChartCard>
        </>
      ) : (
        <>
          {/* range picker */}
          <div className="flex flex-wrap items-end justify-center gap-x-5 gap-y-3 mb-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
            <label className="block">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">From</span>
              <input type="date" value={range.from} min={from} max={range.to}
                onChange={(e) => e.target.value && (setHidden(new Set()), setRange((r) => ({ ...r, from: e.target.value })))}
                className="text-xs px-2 py-1.5 border border-gray-300 rounded-lg" />
            </label>
            <label className="block">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">To</span>
              <input type="date" value={range.to} min={range.from} max={to}
                onChange={(e) => e.target.value && (setHidden(new Set()), setRange((r) => ({ ...r, to: e.target.value })))}
                className="text-xs px-2 py-1.5 border border-gray-300 rounded-lg" />
            </label>
            <div className="block">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Quick pick</span>
              <div className="inline-flex gap-1.5">
                {[3, 5, 7].map((n) => (
                  <button key={n} type="button" onClick={() => setQuick(n)}
                    className="text-[11px] font-semibold text-gray-600 bg-white border border-gray-300 rounded-full px-2.5 py-1 hover:bg-gray-50">Last {n}</button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-[11px] text-gray-500 mb-3">
            {shownCount} of {overlay.series.length} day{overlay.series.length === 1 ? '' : 's'} with readings shown
            {overlay.capped ? ` · range wider than ${OVERLAY_MAX} days, showing the ${OVERLAY_MAX} most recent` : ''}
            {shownCount > OVERLAY_SOFT ? ' · colours get harder to tell apart past 8 — hide a few via the list below' : ''}
          </p>

          <ChartCard title="Days overlaid" caption={`Every selected day on the same 24-hour clock · shaded band = target ${val(t.tirLowMgdl)}–${val(t.tirHighMgdl)} ${unitLabel} · colour = the day (see list)`}>
            {overlay.series.length === 0 ? <Empty text="No days with readings in this range." /> : (
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" dataKey="x" domain={[0, 1440]} ticks={HOUR_TICKS} tickFormatter={fmtHour} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis type="number" dataKey="y" domain={[0, yMax]} tick={{ fontSize: 11, fill: '#6b7280' }} width={34} />
                    <ZAxis range={[36, 36]} />
                    <ReferenceArea y1={val(t.tirLowMgdl)} y2={val(t.tirHighMgdl)} fill="#dbe8f7" fillOpacity={0.6} />
                    <ReferenceLine y={val(t.tbrLevel2Mgdl)} stroke={BAND.veryLow} strokeDasharray="4 4" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<OverlayTip unitLabel={unitLabel} />} />
                    {visibleSeries.map((s) => (
                      <Scatter key={s.date} name={s.label} data={s.pts} fill={s.color}
                        line={s.pts.length > 1 ? { stroke: s.color, strokeWidth: 2, strokeOpacity: 0.9 } : false}
                        shape={(props) => <OverlayDot {...props} />} legendType="none" isAnimationActive={false} />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* day list — click a row to hide / show that day */}
            {overlay.series.length > 0 && (
              <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500">
                      <th className="text-left font-semibold uppercase tracking-wide text-[10px] px-2.5 py-2">Day</th>
                      <th className="text-right font-semibold uppercase tracking-wide text-[10px] px-2.5 py-2">Readings</th>
                      <th className="text-right font-semibold uppercase tracking-wide text-[10px] px-2.5 py-2">Mean</th>
                      <th className="text-right font-semibold uppercase tracking-wide text-[10px] px-2.5 py-2">In range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overlay.series.map((s) => {
                      const off = hidden.has(s.date);
                      return (
                        <tr key={s.date} onClick={() => setHidden((h) => { const n = new Set(h); n.has(s.date) ? n.delete(s.date) : n.add(s.date); return n; })}
                          className={`border-t border-gray-200 cursor-pointer hover:bg-gray-50 ${off ? 'opacity-40' : ''}`}
                          title={off ? 'Hidden — click to show' : 'Click to hide'}>
                          <td className="px-2.5 py-2 text-gray-800"><span className="inline-block w-5 h-1 rounded-sm align-middle mr-2" style={{ background: s.color }} />{s.label}</td>
                          <td className="px-2.5 py-2 text-right text-gray-700">{s.fig.n}</td>
                          <td className="px-2.5 py-2 text-right text-gray-700">{s.fig.n ? s.fig.mean : '—'}</td>
                          <td className={`px-2.5 py-2 text-right ${s.fig.n && s.fig.inR >= 70 ? 'text-green-700 font-semibold' : 'text-gray-700'}`}>{s.fig.n ? `${s.fig.inR} %` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>
        </>
      )}
    </div>
  );
};

const DayStat = ({ label, value, tone }) => (
  <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-center">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
    <p className={`text-lg font-extrabold leading-tight ${tone === 'good' ? 'text-green-700' : tone === 'bad' ? 'text-red-700' : 'text-gray-800'}`}>{value}</p>
  </div>
);


export default GlucoseDailyTab;
