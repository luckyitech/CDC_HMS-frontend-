import { useState, useMemo } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import GlucoseDiaryPanel from '../GlucoseDiaryPanel';
import SwitcherTabs from '../SwitcherTabs';
import { diaryService } from '../../../services/diaryService';
import toast from 'react-hot-toast';
import { SOURCE_META, BAND, DIARY_META, SourceSwatch, Chip, Empty, bandOf, fmtTime, dayHeading, diaryDetailBits } from './gmcShared';

/**
 * Logbook — the plain running record: every reading and every diary entry, in
 * time order, newest day first. Meals, activity, insulin, symptoms and notes
 * are added here (which is what tags nearby meter readings pre-/post-meal);
 * meter readings can be excluded from the metrics by a clinician (kept in the
 * record, struck through, with who and why). A filter narrows to just readings
 * or just diary. Nothing is ever deleted from a meter — exclude, don't erase.
 */
const FILTERS = [{ id: 'all', label: 'All' }, { id: 'readings', label: 'Readings' }, { id: 'diary', label: 'Diary' }];

const GlucoseLogbookTab = ({ data, t, val, unitLabel, uhid, isClinician, isPatient, load, onExcludeRow, onRestore }) => {
  const [filter, setFilter] = useState('all');

  const excludedCount = (data.readings || []).filter((r) => r.excluded).length;

  const days = useMemo(() => {
    const items = [];
    if (filter !== 'diary') for (const r of (data.readings || [])) items.push({ kind: 'reading', at: r.at, r });
    if (filter !== 'readings') for (const e of (data.diary || [])) items.push({ kind: 'diary', at: e.at, e });
    items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)); // newest first
    const map = new Map();
    const order = [];
    for (const it of items) { const d = it.at.slice(0, 10); if (!map.has(d)) { map.set(d, []); order.push(d); } map.get(d).push(it); }
    return order.map((d) => [d, map.get(d)]);
  }, [data, filter]);

  const removeDiary = async (ev) => {
    try { await diaryService.remove(uhid, ev.id); toast.success('Removed'); load(); }
    catch (e) { toast.error(e?.message || 'Could not remove'); }
  };

  return (
    <div className="space-y-3">
      <GlucoseDiaryPanel uhid={uhid} onChanged={load} canEdit isPatient={isPatient} addOnly />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-500">{(data.readings || []).length} readings · {(data.diary || []).length} diary entries{excludedCount ? ` · ${excludedCount} excluded` : ''} · last {data.window.days} days</p>
        <SwitcherTabs tabs={FILTERS} active={filter} onChange={setFilter} />
      </div>

      {days.length === 0 ? <Empty text="Nothing logged in this window." /> : (
        <div className="space-y-3">
          {days.map(([day, items]) => (
            <div key={day}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{dayHeading(`${day} 00:00:00`)}</p>
              <div className="space-y-1">
                {items.map((it, i) => it.kind === 'reading'
                  ? <ReadingRow key={`r-${it.r.id}-${i}`} r={it.r} t={t} val={val} unitLabel={unitLabel} isClinician={isClinician} onExcludeRow={onExcludeRow} onRestore={onRestore} />
                  : <DiaryRow key={`d-${it.e.id}-${i}`} e={it.e} canEdit onRemove={removeDiary} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ReadingRow = ({ r, t, val, unitLabel, isClinician, onExcludeRow, onRestore }) => {
  const isHiLo = r.flags?.includes('resultTooHighOrLow');
  const band = r.mgdl != null ? bandOf(r.mgdl, t) : null;
  return (
    <div className={`flex items-center gap-2.5 p-2 rounded-lg border bg-white ${r.excluded ? 'border-gray-100 opacity-70' : !r.plausible ? 'border-amber-200 bg-amber-50' : 'border-gray-100'}`}>
      <span className="text-xs text-gray-500 w-12 flex-shrink-0 tabular-nums">{fmtTime(r.at)}</span>
      <span className="inline-flex items-center gap-1.5 w-24 flex-shrink-0 text-xs text-gray-500"><SourceSwatch source={r.source} /> {SOURCE_META[r.source]?.label}</span>
      <span className={`text-sm font-bold w-24 flex-shrink-0 ${r.excluded ? 'line-through text-gray-400' : ''}`} style={!r.excluded && band ? { color: BAND[band] } : undefined}>
        {isHiLo ? 'HI / LO' : val(r.mgdl)}{!isHiLo && <span className="text-gray-400 font-normal text-xs ml-1">{unitLabel}</span>}
      </span>
      <span className="text-xs text-gray-500 flex-1 min-w-0 truncate">
        {r.tagLabel || r.tag || '—'}{r.tagSource === 'clock' && <span className="text-[10px] ml-1 text-gray-400">(by clock)</span>}
        {r.controlSolution && <Chip tone="neutral">control solution</Chip>}
        {r.flags?.length > 0 && !r.controlSolution && !isHiLo && <span className="ml-1"><Chip tone="neutral">meter: {r.flags.join(', ')}</Chip></span>}
        {!r.plausible && <Chip tone="warn">implausible</Chip>}
        {r.excluded && <span className="text-gray-400 ml-1">· excluded {r.excludedByName || ''}{r.excludeReason ? ` · ${r.excludeReason}` : ''}</span>}
      </span>
      {isClinician && r.source === 'meter' && (
        <span className="flex-shrink-0">
          {r.excluded
            ? <button type="button" className="text-xs text-primary font-semibold inline-flex items-center gap-1" onClick={() => onRestore(r)}><RotateCcw className="w-3 h-3" /> Restore</button>
            : <button type="button" className="text-xs text-gray-600 border border-gray-300 rounded px-2 py-0.5 hover:bg-gray-50" onClick={() => onExcludeRow(r)}>Exclude…</button>}
        </span>
      )}
    </div>
  );
};

const DiaryRow = ({ e, canEdit, onRemove }) => {
  const meta = DIARY_META[e.eventType] || DIARY_META.note;
  const bits = diaryDetailBits(e).join(' · ');
  return (
    <div className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-100 bg-white">
      <span className="text-xs text-gray-500 w-12 flex-shrink-0 tabular-nums">{fmtTime(e.at)}</span>
      <span className="inline-flex items-center gap-1.5 w-24 flex-shrink-0 text-xs font-semibold" style={{ color: meta.color }}><i className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: meta.color }} /> {meta.label}</span>
      <span className="text-sm text-gray-800 flex-1 min-w-0 truncate"><span className="font-semibold">{e.label || meta.label}</span>{bits && <span className="text-gray-500"> · {bits}</span>}</span>
      {canEdit && <button type="button" onClick={() => onRemove(e)} className="text-gray-300 hover:text-red-500 flex-shrink-0" title="Remove"><Trash2 className="w-4 h-4" /></button>}
    </div>
  );
};

export default GlucoseLogbookTab;
