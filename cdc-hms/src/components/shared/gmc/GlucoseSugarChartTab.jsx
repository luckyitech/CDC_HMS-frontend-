import { useMemo } from 'react';
import { TIME_COLUMNS, BAND, BAND_BG, SOURCE_META, columnForReading, bandOf, fmtTime, Empty } from './gmcShared';

/**
 * Sugar chart — the classic SMBG logbook grid: one row per day, the seven
 * clinic meal slots as columns (Fasting · after breakfast · before / after
 * lunch · before / after dinner · bedtime). Every imported reading is dropped
 * into the slot its meal tag or clock time belongs to, and each cell is
 * coloured by band so a pattern (say, every post-dinner high) reads down or
 * across the grid at a glance. A footer row averages each slot over the window.
 *
 * Values shown in the display unit; the maths that classify them are the same
 * server-side targets every other tab uses.
 */
const weekday = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short' }); };
const dm = (iso) => { const [, m, d] = iso.split('-'); return `${Number(d)}/${Number(m)}`; };

const GlucoseSugarChartTab = ({ data, t, val, unitLabel }) => {
  const { rows, colMeans, total } = useMemo(() => {
    // day -> column -> [readings]
    const byDay = new Map();
    const colBuckets = Object.fromEntries(TIME_COLUMNS.map((c) => [c.key, []]));
    let total = 0;
    for (const r of (data.readings || [])) {
      if (r.mgdl === null || r.excluded) continue;
      total += 1;
      const day = r.at.slice(0, 10);
      const col = columnForReading(r);
      if (!byDay.has(day)) byDay.set(day, Object.fromEntries(TIME_COLUMNS.map((c) => [c.key, []])));
      byDay.get(day)[col].push(r);
      if (r.countable) colBuckets[col].push(r.mgdl);
    }
    const rows = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)); // newest first
    const colMeans = Object.fromEntries(TIME_COLUMNS.map((c) => {
      const xs = colBuckets[c.key];
      return [c.key, xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null];
    }));
    return { rows, colMeans, total };
  }, [data]);

  if (total === 0) return <Empty text="No readings in this window." />;

  return (
    <div>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="text-left px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 sticky left-0 bg-gray-50 z-10 border border-gray-300">Day</th>
              {TIME_COLUMNS.map((c) => (
                <th key={c.key} className="px-1 py-1.5 text-center text-[11px] font-semibold text-gray-600 min-w-[68px] border border-gray-300 bg-gray-50">
                  <div>{c.label}</div><div className="text-[9px] font-normal text-gray-400 uppercase tracking-wide">{c.sub}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([day, cols]) => (
              <tr key={day}>
                <th className="text-left px-2 py-1.5 whitespace-nowrap sticky left-0 bg-white z-10 border border-gray-300">
                  <div className="text-xs font-bold text-gray-700">{dm(day)}</div>
                  <div className="text-[10px] text-gray-400 uppercase">{weekday(day)}</div>
                </th>
                {TIME_COLUMNS.map((c) => <Cell key={c.key} readings={cols[c.key]} t={t} val={val} unitLabel={unitLabel} />)}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th className="text-left px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 sticky left-0 bg-gray-50 z-10 border border-gray-300">Avg</th>
              {TIME_COLUMNS.map((c) => {
                const mean = colMeans[c.key];
                const band = mean === null ? null : bandOf(mean, t);
                return (
                  <td key={c.key} className="px-1 py-1.5 text-center border border-gray-200">
                    {mean === null ? <span className="text-gray-300">—</span>
                      : <span className="inline-block px-2 py-1 rounded-md text-xs font-extrabold" style={{ background: BAND_BG[band], color: BAND[band] }}>{val(mean)}</span>}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mt-3">
        {[['veryLow', `< ${val(t.tbrLevel2Mgdl)} very low`], ['low', `${val(t.tbrLevel2Mgdl)}–${val(t.tirLowMgdl)} low`], ['inRange', `${val(t.tirLowMgdl)}–${val(t.tirHighMgdl)} in range`], ['high', `${val(t.tirHighMgdl)}–${val(t.tarLevel2Mgdl)} high`], ['veryHigh', `> ${val(t.tarLevel2Mgdl)} very high`]].map(([b, lbl]) => (
          <span key={b} className="inline-flex items-center gap-1.5"><i className="inline-block w-3 h-3 rounded" style={{ background: BAND_BG[b], border: `1px solid ${BAND[b]}` }} /> {lbl} {unitLabel}</span>
        ))}
        <span className="text-gray-400">A cell with more than one reading shows the average and a count; hover for each value.</span>
      </div>
    </div>
  );
};

const Cell = ({ readings, t, val, unitLabel }) => {
  if (!readings.length) return <td className="px-1 py-1.5 text-center border border-gray-200"><span className="text-gray-200">·</span></td>;
  const counted = readings.filter((r) => r.countable);
  const mgs = (counted.length ? counted : readings).map((r) => r.mgdl);
  const mean = mgs.reduce((a, b) => a + b, 0) / mgs.length;
  const band = bandOf(mean, t);
  const title = readings.map((r) => `${fmtTime(r.at)} · ${val(r.mgdl)} ${unitLabel} · ${SOURCE_META[r.source]?.label || r.source}${r.tagLabel ? ` · ${r.tagLabel}` : ''}`).join('\n');
  return (
    <td className="px-1 py-1.5 text-center border border-gray-200">
      <span title={title} className="inline-flex flex-col items-center px-2 py-1 rounded-md" style={{ background: BAND_BG[band] }}>
        <span className="text-sm font-extrabold leading-none" style={{ color: BAND[band] }}>{val(mean)}</span>
        {readings.length > 1 && <span className="text-[9px] font-semibold text-gray-500 mt-0.5">avg · {readings.length}</span>}
      </span>
    </td>
  );
};

export default GlucoseSugarChartTab;
