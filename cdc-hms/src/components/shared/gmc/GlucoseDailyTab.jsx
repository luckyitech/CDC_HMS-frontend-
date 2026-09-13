import { useState, useMemo, useEffect } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip,
  ReferenceArea, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  SOURCE_META, BAND, DIARY_META, SourceSwatch, ChartCard, Empty, PointShape, DiaryShape, PointTip, bandOf, dayHeading,
} from './gmcShared';

/**
 * Daily graph — one day at a time, the way a CGM report shows a single day:
 * time of day across the bottom (00:00 · 06:00 · 12:00 · 18:00 · 00:00), glucose
 * up the side on a fixed clinical scale, the target band shaded, and the
 * patient's diary (meals, activity, insulin, symptoms) overlaid along the base
 * so a spike can be read against what was eaten or done. A date picker with
 * previous / next steps through the days in the current window.
 *
 * Per-day figures (n, mean, in-range, lows) are counted here from that day's
 * readings — a convenience summary of one day, distinct from the server's
 * window-wide consensus metrics on the Indices tab.
 */
const minutesOfDay = (at) => { const h = Number(at.slice(11, 13)); const m = Number(at.slice(14, 16)); return h * 60 + m; };
const addDays = (iso, n) => { const [y, mo, d] = iso.split('-').map(Number); const dt = new Date(y, mo - 1, d + n); const p = (x) => String(x).padStart(2, '0'); return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`; };
const HOUR_TICKS = [0, 360, 720, 1080, 1440];
const fmtHour = (v) => (v >= 1440 ? '00:00' : `${String(Math.floor(v / 60)).padStart(2, '0')}:00`);

const GlucoseDailyTab = ({ data, t, unit, val, unitLabel }) => {
  const from = data.window.from;
  const to = data.window.to;

  // Days that actually have a reading, newest first — default to the latest.
  const daysWithData = useMemo(() => {
    const set = new Set((data.readings || []).filter((r) => r.mgdl !== null).map((r) => r.at.slice(0, 10)));
    return [...set].sort().reverse();
  }, [data]);
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

  // Per-day summary (this one day only), counted from countable readings.
  const stat = useMemo(() => {
    const c = dayReadings.filter((r) => r.countable);
    const mg = c.map((r) => r.mgdl);
    if (!mg.length) return { n: 0 };
    const mean = mg.reduce((a, b) => a + b, 0) / mg.length;
    const inR = mg.filter((x) => bandOf(x, t) === 'inRange').length;
    const lows = mg.filter((x) => x < t.tirLowMgdl).length;
    const highs = mg.filter((x) => x > t.tirHighMgdl).length;
    return { n: mg.length, mean: val(mean), inR: Math.round((100 * inR) / mg.length), lows, highs };
  }, [dayReadings, t, val]);

  const yMax = unit === 'mmol' ? 22 : 400;
  const canPrev = clampedDay > from;
  const canNext = clampedDay < to;

  return (
    <div>
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
