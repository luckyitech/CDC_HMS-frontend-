import { createContext, useContext, useState } from 'react';
import { Camera, ScanFace } from 'lucide-react';
import DermBodyMap from './DermBodyMap';
import DermPhoto from './DermPhoto';
import { STATUS_STYLE, statusLabel, label, fmtDay } from './dermFormat';
import { specOf, phrase } from './dermExam';

/**
 * The skin review of one visit day, in Visit History (Dermatology Phase 4,
 * 7 Oct 2026; decisions D13, V3–V5). Sits under the consultation note on the
 * Doctor's Notes tab, and prints with it (one document, one PDF).
 *
 * Read as it was recorded that day: the map that day (only the findings
 * examined, coloured by that day's status), each finding with that day's
 * status, size, the size before, description, diagnosis and plan; any later
 * corrections listed in amber underneath (before → after, who, why); the
 * findings not examined that day; procedures; photos.
 *
 * Photos (V4): doctors see "N photos" and press Show photos — nothing is
 * fetched (or logged) until then; a sensitive site still needs its own View.
 * The print copy carries only the photos opened on screen. Others (nurses,
 * clinical.view) read the review and see the count only.
 *
 * Shared state comes from <SkinHistoryProvider> (one per Visit History panel)
 * so the screen and the print copy agree on which photos have been opened.
 */
const SkinHistoryContext = createContext({ canViewPhotos: false, shown: new Set(), markShown: () => {} });

export const SkinHistoryProvider = ({ canViewPhotos, children }) => {
  const [shown, setShown] = useState(() => new Set());
  const markShown = (id) => setShown((s) => (s.has(id) ? s : new Set([...s, id])));
  return <SkinHistoryContext.Provider value={{ canViewPhotos, shown, markShown }}>{children}</SkinHistoryContext.Provider>;
};

const Pill = ({ status }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[status] || 'border-gray-200 bg-gray-100 text-gray-600'}`}>
    {statusLabel(status)}
  </span>
);

const fmtWhen = (iso) => (iso
  ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  : '');
const showValue = (field, v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (v === true || v === false) return v ? 'yes' : 'no';
  // Examination fields (9 Oct 2026): fixed words by their label, typed words as typed.
  if (specOf(field)) return phrase(field, v) || '—';
  if (Array.isArray(v)) return v.join(', ') || '—';
  if (field === 'statusToday') return statusLabel(v);
  if (field === 'border') return label('border', v);
  if (field === 'plan') return label('plan', v);
  if (field === 'measuredBy') return label('measuredBy', v);
  if (field === 'colours') return String(v).split(',').map((c) => label('colour', c)).join(', ');
  return String(v);
};

const PhotoStrip = ({ entry, print }) => {
  const { canViewPhotos, shown, markShown } = useContext(SkinHistoryContext);
  const [open, setOpen] = useState(false);
  if (!entry.photoCount) return null;
  const count = (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
      <Camera className="h-3.5 w-3.5" aria-hidden="true" />{entry.photoCount} photo{entry.photoCount === 1 ? '' : 's'} that day
    </span>
  );
  if (!canViewPhotos || !entry.photos?.length) return <div>{count}</div>;
  if (print) {
    const opened = entry.photos.filter((p) => shown.has(p.id));
    if (!opened.length) return <div>{count}</div>;
    return (
      <div className="flex flex-wrap items-end gap-2">
        {opened.map((p) => <DermPhoto key={p.id} photo={p} startRevealed aspect="1/1" className="w-28" alt={`${entry.finding.label} photo`} />)}
        {count}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-end gap-2">
      {open
        ? entry.photos.map((p) => (
          <DermPhoto key={p.id} photo={p} aspect="1/1" className="w-28" alt={`${entry.finding.label} photo`} onShown={markShown} />
        ))
        : (
          <button type="button" onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
            <Camera className="h-3.5 w-3.5" /> Show photos
          </button>
        )}
      {count}
    </div>
  );
};

const Entry = ({ e, print, highlight = false, onOpenFinding }) => {
  const o = e.look;
  return (
    <div id={`derm-entry-${e.finding.id}`} className={`ui-surface p-3 text-sm text-gray-700 ${highlight ? 'border-primary ring-2 ring-blue-100' : 'border-gray-200'}`} style={{ breakInside: 'avoid' }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-gray-500">{e.finding.label}</span>
        <b className="text-gray-800">{e.finding.title}</b>
        {e.finding.where && <span className="text-gray-500">{e.finding.where}</span>}
        <span className="ml-auto"><Pill status={o.statusToday} /></span>
      </div>
      {!e.sections?.length && (e.size || e.previous) && (
        <p className="mt-1 font-mono text-xs tabular-nums text-gray-700">
          {e.size || 'No size typed'}
          {e.previous && <span className="text-gray-500"> · was {e.previous.size} ({fmtDay(e.previous.visitDate)})</span>}
          {e.size && o.measuredBy && <span className="text-gray-500"> · {label('measuredBy', o.measuredBy).toLowerCase()}</span>}
        </p>
      )}
      {e.concern && <p className="mt-1"><span className="text-gray-500">Concern:</span> {e.concern}</p>}
      {e.sections?.length > 0 ? (
        // Emu's headings (9 Oct 2026) — the same lines as the generated note.
        <dl className="mt-1 flex flex-col gap-0.5">
          {e.sections.map((x) => (
            <div key={x.heading}><dt className="inline font-semibold text-gray-800">{x.heading}: </dt><dd className="inline">{x.text}</dd></div>
          ))}
        </dl>
      ) : e.exam && <p className="mt-1">{e.exam}</p>}
      {o.description && <p className="mt-1 whitespace-pre-wrap"><span className="text-gray-500">Notes:</span> {o.description}</p>}
      {(o.symptoms || []).length > 0 && <p className="mt-1"><b className="font-semibold">Symptoms</b> {phrase('symptoms', o.symptoms)}</p>}
      {(o.diagnosis || o.differential || o.plan || o.planNote || o.reviewIn) && (
        <p className="mt-1">
          {o.diagnosis && <><b className="font-semibold">Dx</b> {o.diagnosis}</>}
          {o.differential && <span className="text-gray-600">{o.diagnosis ? ' · ' : ''}<b className="font-semibold">Ddx</b> {o.differential}</span>}
          {(o.plan || o.planNote) && <>{(o.diagnosis || o.differential) ? ' · ' : ''}<b className="font-semibold">Plan</b> {[o.plan ? (specOf('plan').options.some(([t]) => t === o.plan) ? label('plan', o.plan) : o.plan) : null, o.planNote].filter(Boolean).join(' — ')}</>}
          {o.reviewIn && <span className="text-gray-600"> · review {o.reviewIn.charAt(0).toLowerCase() + o.reviewIn.slice(1)}</span>}
        </p>
      )}
      {(e.histology || []).map((h) => (
        <p key={h.id} className="mt-1 text-xs text-amber-800">
          {h.kind === 'cytology' ? 'Cytology' : 'Histology'} requested · {h.specimenNumber}{h.specimenLabel ? ` · ${h.specimenLabel}` : ''}
        </p>
      ))}
      {e.amendments.length > 0 && (
        <div className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
          {e.amendments.map((a, i) => (
            <p key={i}>
              Corrected {fmtWhen(a.when)}{a.by ? ` by ${a.by}` : ''}:{' '}
              {a.changes.map((c) => `${c.label} ${showValue(c.field, c.before)} → ${showValue(c.field, c.after)}`).join('; ')}
              {a.reason ? ` — ${a.reason}` : ''}
            </p>
          ))}
        </div>
      )}
      <div className="mt-2"><PhotoStrip entry={e} print={print} /></div>
      {onOpenFinding && !print && (
        <button type="button" onClick={() => onOpenFinding(e.finding.id)} className="mt-2 rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50">
          Edit findings
        </button>
      )}
    </div>
  );
};

/**
 * One visit day's skin review. Props: day (from GET /derm/patients/:uhid/visits), print,
 * and for the consultation's visit viewer (9 Oct 2026): showHeader / showMap (default true),
 * highlightRegion (ring the findings on that body area), onOpenFinding(id).
 */
const DermVisitReview = ({ day, print = false, showHeader = true, showMap = true, highlightRegion = null, onOpenFinding }) => {
  const examined = day.entries.map((e) => ({
    id: e.finding.id, label: e.finding.label, regions: e.finding.regions || [], currentStatus: e.look.statusToday,
  }));
  // General examination (the whole-skin exam, renamed 9 Oct 2026) — first in the
  // consultation's viewer, after the findings in Visit History.
  const generalExam = day.skinExam?.sections?.length > 0 ? (
        <div className="ui-surface p-3 text-sm text-gray-700" style={{ breakInside: 'avoid' }}>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">General examination{day.skinExam.doctorName ? ` · ${day.skinExam.doctorName}` : ''}</p>
          <dl className="m-0 flex flex-col gap-0.5">
            {day.skinExam.sections.map((x) => (
              <div key={x.heading}><dt className="inline font-semibold text-gray-800">{x.heading}: </dt><dd className="inline">{x.text}</dd></div>
            ))}
          </dl>
        </div>
      ) : null;
  const onFront = examined.some((f) => f.regions.some((r) => r.startsWith('f-')));
  const onBack = examined.some((f) => f.regions.some((r) => r.startsWith('b-')));
  return (
    <div className="space-y-3" style={print ? { breakInside: 'avoid-page' } : undefined}>
      {showHeader && <div className="flex flex-wrap items-center gap-2 border-t-2 border-gray-200 pt-3">
        <ScanFace className="h-4 w-4 text-primary" aria-hidden="true" />
        <b className="text-sm text-gray-800">Skin review · {fmtDay(day.date)}{day.doctors.length ? ` · ${day.doctors.join(', ')}` : ''}</b>
        <span className="text-xs text-gray-500">As recorded that day</span>
      </div>}

      {!showMap && generalExam}
      {day.entries.length > 0 && !showMap && (
        <div className="flex flex-col gap-2">
          {day.entries.map((e) => (
            <Entry key={e.finding.id} e={e} print={print} onOpenFinding={onOpenFinding}
              highlight={!!highlightRegion && (e.finding.regions || []).includes(highlightRegion)} />
          ))}
        </div>
      )}
      {day.entries.length > 0 && showMap && (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Map that day</p>
            <div className={onFront && onBack ? 'grid grid-cols-2 gap-1' : ''}>
              {(onFront || !onBack) && <DermBodyMap view="front" findings={examined} size="sm" showOtherNote={false} />}
              {onBack && <DermBodyMap view="back" findings={examined} size="sm" showOtherNote={false} />}
            </div>
            <p className="mt-1 text-[10px] text-gray-500">{onFront && onBack ? 'Front · back. ' : ''}Numbers = findings examined that day</p>
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            {day.entries.map((e) => <Entry key={e.finding.id} e={e} print={print} onOpenFinding={onOpenFinding} />)}
          </div>
        </div>
      )}

      {showMap && generalExam}

      {day.notExamined.length > 0 && (
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600">
          <b className="font-semibold text-gray-700">Not examined that day:</b>{' '}
          {day.notExamined.map((f) => `${f.label} ${f.title}${f.where ? ` (${f.where})` : ''}`).join(', ')}
        </p>
      )}

      {day.procedures.length > 0 && (
        <div className="text-sm text-gray-700">
          <b className="font-semibold">Procedures:</b>{' '}
          {day.procedures.map((p) => `${p.name}${(p.findings || []).length ? ` (${p.findings.map((f) => f.label).join(', ')})` : ''}${p.details ? ` — ${p.details}` : ''}${p.performedByName ? ` · ${p.performedByName}` : ''}`).join('; ')}
        </div>
      )}

      {day.photography && (
        <p className="text-sm text-gray-700"><b className="font-semibold">Photography:</b> {day.photography}</p>
      )}
      {day.entries.length === 0 && day.photoCount > 0 && (
        <p className="text-sm text-gray-600">{day.photoCount} photo{day.photoCount === 1 ? '' : 's'} taken; no finding was examined that day.</p>
      )}
    </div>
  );
};

export default DermVisitReview;
