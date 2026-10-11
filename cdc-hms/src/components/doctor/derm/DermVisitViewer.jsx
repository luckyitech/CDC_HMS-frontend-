import { useEffect, useMemo, useState } from 'react';
import { Images, ListChecks, Plus } from 'lucide-react';
import { regionLabel, REGION_BY_ID } from '../../../constants/dermRegions';
import DermBodyMap from './DermBodyMap';
import { DermAreaHover } from './DermAreaPhotos';
import DermVisitReview, { SkinHistoryProvider } from './DermVisitReview';
import { fmtDay } from './dermFormat';

/**
 * The Dermatology consultation's visit viewer (9 Oct 2026, Emu). Nothing is
 * typed here: the pop-ups record, the viewer reads.
 *
 *   left    every skin visit — Today at the top as soon as anything is saved —
 *           with the time, the doctor(s) and what was recorded
 *   middle  the body map of the chosen visit, its sites numbered
 *   right   that visit as recorded that day: general examination, then each
 *           finding (the same headings as the note), procedures, photography
 *
 * Clicking a site with findings offers "Findings at this consultation" (rings
 * them on the right) or "Progression of this site" (every image of that area,
 * all visits). Clicking a site with nothing recorded asks: a new finding here,
 * or add it to a finding already on record — the recording pop-up opens.
 * "Edit findings" on a finding opens the pop-up for that finding and day.
 *
 * Props: visits ({ days, today, canViewPhotos }), uhid, canWrite,
 *        areaPhotos ({ region → photos }), onOpenFinding(id, day), onProgress(region),
 *        findings (active findings on record), onRecord(start) — open the
 *        recording pop-up ({ kind: 'new', picked } | { kind: 'finding', id, addRegions }),
 *        followNewest — change it (a counter) to jump back to the newest visit,
 *        e.g. after a pop-up saved something today
 */
const timeOf = (day) => {
  const stamps = [
    ...day.entries.map((e) => e.look?.createdAt),
    day.skinExam?.updatedAt,
  ].filter(Boolean).map((t) => new Date(t)).filter((d) => !Number.isNaN(d.getTime()));
  if (!stamps.length) return '';
  const first = new Date(Math.min(...stamps.map((d) => d.getTime())));
  return first.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const summary = (day) => {
  const bits = [];
  if (day.entries.length) bits.push(`${day.entries.length} finding${day.entries.length === 1 ? '' : 's'}`);
  if (day.skinExam) bits.push('general exam');
  if (day.procedures.length) bits.push(`${day.procedures.length} procedure${day.procedures.length === 1 ? '' : 's'}`);
  if (!bits.length && day.photoCount) bits.push(`${day.photoCount} photo${day.photoCount === 1 ? '' : 's'}`);
  return bits.join(' · ');
};

const DermVisitViewer = ({ visits, canWrite, areaPhotos = {}, onOpenFinding, onProgress, onRecord, findings = [], followNewest = 0 }) => {
  const days = useMemo(() => visits?.days || [], [visits]);
  const today = visits?.today;
  const [date, setDate] = useState(null);
  const [site, setSite] = useState(null);
  const [view, setView] = useState('front');
  const [hover, setHover] = useState({ region: null, rect: null });   // hover a site: glance at its latest photos (8 Oct)

  // Follow the newest visit (Today once something is saved) unless the doctor picked one that still exists.
  useEffect(() => { setDate(null); }, [followNewest]);
  const day = days.find((d) => d.date === date) || days[0] || null;
  useEffect(() => { setSite(null); }, [day?.date]);

  const mapFindings = useMemo(() => (day ? day.entries.map((e) => ({
    id: e.finding.id, label: e.finding.label, regions: e.finding.regions || [], currentStatus: e.look.statusToday,
  })) : []), [day]);
  // Open on the side that has this visit's sites.
  useEffect(() => {
    const sides = new Set(mapFindings.flatMap((f) => f.regions.map((r) => REGION_BY_ID[r]?.view)));
    if (sides.size && !sides.has(view)) setView([...sides][0]);
  }, [mapFindings]); // eslint-disable-line react-hooks/exhaustive-deps
  const photoCounts = useMemo(() => Object.fromEntries(Object.entries(areaPhotos).map(([k, v]) => [k, v.length])), [areaPhotos]);

  if (!days.length) {
    return (
      <p className="m-0 rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
        No skin visits recorded yet. Use <b>Specific site examination</b> or <b>General examination</b> above — what you save appears here.
      </p>
    );
  }

  const siteHasFindings = site ? mapFindings.some((f) => f.regions.includes(site)) : false;
  const sitePhotos = site ? (areaPhotos[site] || []) : [];
  const isToday = day.date === today;

  return (
    <SkinHistoryProvider canViewPhotos={!!visits.canViewPhotos}>
      <div className="ui-surface grid overflow-hidden lg:grid-cols-[180px_minmax(0,280px)_minmax(0,1fr)]">
        <nav aria-label="Skin visits" className="flex max-h-[640px] flex-col overflow-y-auto border-b border-gray-200 bg-gray-50 lg:border-b-0 lg:border-r">
          <h4 className="m-0 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Skin visits · {days.length}</h4>
          {days.map((d) => {
            const on = d.date === day.date;
            return (
              <button key={d.date} type="button" onClick={() => setDate(d.date)} aria-current={on ? 'true' : undefined}
                className={`flex flex-col gap-0.5 border-t border-gray-200 px-3 py-2.5 text-left ${on ? 'bg-blue-50 shadow-[inset_3px_0_0_#2563eb]' : 'hover:bg-white'}`}>
                <b className="text-sm text-gray-800">{d.date === today ? 'Today' : fmtDay(d.date)}</b>
                <span className="text-[11px] text-gray-500">{[d.date === today ? fmtDay(d.date) : null, timeOf(d)].filter(Boolean).join(' · ')}</span>
                {d.doctors.length > 0 && <span className="truncate text-[11px] text-gray-500">{d.doctors.join(', ')}</span>}
                <span className="text-[11px] text-gray-600">{summary(d)}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex flex-col gap-2 border-b border-gray-200 p-3 lg:border-b-0 lg:border-r">
          <h4 className="m-0 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Sites · {isToday ? 'today' : fmtDay(day.date)}</h4>
          <DermBodyMap view={view} onViewChange={setView} findings={mapFindings} selected={site ? [site] : []}
            onRegion={(id) => { setHover({ region: null, rect: null }); setSite((s) => (s === id ? null : id)); }}
            photoCounts={visits.canViewPhotos ? photoCounts : {}} size="sm"
            onRegionHover={visits.canViewPhotos ? (region, rect) => setHover({ region, rect }) : undefined} />
          <DermAreaHover region={hover.region} rect={hover.rect} photos={hover.region ? (areaPhotos[hover.region] || []) : []} />
          <p className="m-0 text-center text-[11px] text-gray-500">Numbers = findings recorded that visit. Click a site.</p>
        </div>

        <div className="flex min-w-0 flex-col gap-3 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-sm text-gray-800">{isToday ? 'Today' : fmtDay(day.date)}{timeOf(day) ? ` · ${timeOf(day)}` : ''}</b>
            {day.doctors.length > 0 && <span className="text-xs text-gray-500">{day.doctors.join(', ')}</span>}
            {!isToday && <span className="text-xs text-gray-500">· as recorded that day</span>}
          </div>

          {site && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
              <b className="text-gray-800">{regionLabel(site)}</b>
              {!siteHasFindings && !canWrite && !sitePhotos.length && <span className="text-xs text-gray-600">Nothing recorded at this site.</span>}
              {!siteHasFindings && canWrite && (
                <span className="flex w-full flex-col gap-1.5">
                  <span className="text-xs text-gray-600">Nothing recorded here{isToday ? ' today' : ' at this visit'}. Record it today as:</span>
                  <span className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => onRecord({ kind: 'new', picked: [site] })}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700">
                      <Plus className="h-3.5 w-3.5" /> A new finding
                    </button>
                    {findings.map((f) => (
                      <button key={f.id} type="button" onClick={() => onRecord({ kind: 'finding', id: f.id, addRegions: [site] })}
                        className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        Add to {f.label} {f.title}
                      </button>
                    ))}
                  </span>
                </span>
              )}
              {siteHasFindings && (
                <button type="button" onClick={() => document.getElementById(`derm-entry-${mapFindings.find((f) => f.regions.includes(site)).id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                  <ListChecks className="h-3.5 w-3.5" /> Findings at this consultation
                </button>
              )}
              {visits.canViewPhotos && sitePhotos.length > 0 && (
                <button type="button" onClick={() => onProgress(site)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700">
                  <Images className="h-3.5 w-3.5" /> Progression of this site · {sitePhotos.length}
                </button>
              )}
              <button type="button" onClick={() => setSite(null)} className="ml-auto text-xs font-semibold text-primary hover:underline">Clear</button>
            </div>
          )}

          <DermVisitReview day={day} showHeader={false} showMap={false} highlightRegion={site}
            onOpenFinding={canWrite ? (id) => onOpenFinding(id, isToday ? null : day.date) : undefined} />
          {!day.entries.length && !day.skinExam && !day.procedures.length && (
            <p className="m-0 text-sm text-gray-500">Only photos were taken at this visit.</p>
          )}
        </div>
      </div>
    </SkinHistoryProvider>
  );
};

export default DermVisitViewer;
