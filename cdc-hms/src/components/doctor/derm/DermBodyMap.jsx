import { useState } from 'react';
import { DERM_REGIONS, regionCentre, REGION_BY_ID } from '../../../constants/dermRegions';
import { DERM_BODY_MAPS } from '../../../constants/dermBodyMaps';
import { STATUS_DOT } from './dermFormat';
import { FIGURE_IMAGE, useDermFigure } from './dermFigure';

/**
 * DermBodyMap — the front / back body map (an original in-house drawing; no
 * library). Laterality is the PATIENT'S side, and the map says so.
 *
 * Props:
 *   view          'front' | 'back'
 *   onViewChange  (view) => void
 *   findings      active findings to mark: [{ id, label, regions, currentStatus }]
 *   selected      region ids to highlight (the tapped region, or the regions
 *                 being picked for a new finding)
 *   onRegion      (regionId) => void — a region was tapped
 *   size          'md' (default) | 'sm' — sm for read-only use (Visit History)
 *   showOtherNote say how many findings sit on the other view (default true;
 *                 off when both views are drawn side by side)
 *   photoCounts   { regionId → n } — areas with photos get a small camera badge
 *   onRegionHover (regionId | null, DOMRect | null) — the pointer entered / left
 *                 an area (the skin record floats that area's photos beside it)
 *   figure        'female' | 'male' | 'child' — draw on that figure (8 Oct 2026);
 *                 default: the surrounding DermFigureContext (set automatically
 *                 from the patient's sex and age); none = the
 *                 original in-house drawing. Region ids are the same on all.
 */
const DermBodyMap = ({ view, onViewChange, findings = [], selected = [], onRegion, size = 'md', showOtherNote = true, photoCounts = {}, onRegionHover, figure: figureProp }) => {
  const regions = DERM_REGIONS.filter((r) => r.view === view);
  const interactive = !!onRegion;
  const ctx = useDermFigure();
  const figure = figureProp || ctx.figure || null;
  const map = figure ? DERM_BODY_MAPS[figure]?.[view] : null;
  const [hoverId, setHoverId] = useState(null);
  // Geometry: on a figure, each region is a traced outline with its own centre;
  // otherwise the original rect / ellipse drawing on a 200 × 380 canvas.
  const centreOf = (id) => (map ? map.regions[id]?.c || null : regionCentre(id));
  const [bx, by, bw, bh] = map ? map.box : [0, 0, 200, 380];
  const k = bw / 200;          // marker / text scale relative to the original canvas
  const maxH = size === 'sm' ? 340 : 520;

  // One marker per region — the first finding there, with a count if more.
  const markers = [];
  for (const r of regions) {
    const here = findings.filter((f) => (f.regions || []).includes(r.id));
    if (!here.length) continue;
    const c = centreOf(r.id);
    if (!c) continue;
    const [x, y] = c;
    markers.push({ key: r.id, x, y, f: here[0], more: here.length - 1 });
  }
  // Regions on the other view that carry findings — so nothing is invisible.
  const otherCount = findings.filter((f) => (f.regions || []).some((id) => REGION_BY_ID[id] && REGION_BY_ID[id].view !== view)).length;
  // Chosen regions on the other view — a selection can span front and back.
  const otherSelected = selected.filter((id) => REGION_BY_ID[id] && REGION_BY_ID[id].view !== view).length;

  // A read-only map (Visit History, 9 Oct 2026): areas don't highlight, show a
  // label or take the pointer — only the numbered findings are drawn.
  const readOnly = !interactive && !onRegionHover;
  const regionProps = (r) => {
    const isSel = selected.includes(r.id);
    return {
      className: `${interactive ? 'cursor-pointer' : ''} transition-colors`,
      ...(readOnly ? { pointerEvents: 'none' } : {}),
      ...(map ? {
        // Over the picture: clear until hovered or chosen; a sensitive site keeps a faint dashed edge.
        fill: isSel ? '#2563eb' : (hoverId === r.id ? '#2563eb' : 'transparent'),
        fillOpacity: isSel ? 0.38 : (hoverId === r.id ? 0.18 : 1),
        stroke: isSel ? '#1d4ed8' : (hoverId === r.id ? '#2563eb' : (r.sensitive ? '#a8a29e' : 'transparent')),
        strokeWidth: isSel ? 1.6 : 1.1,
        strokeDasharray: r.sensitive && !isSel ? '4 3' : undefined,
      } : {
        fill: isSel ? '#dbeafe' : '#e8dccd',
        stroke: isSel ? '#0066CC' : '#c9b9a6',
        strokeWidth: isSel ? 1.6 : 1,
        strokeDasharray: r.sensitive ? '3 2' : undefined,
      }),
      ...(interactive ? {
        role: 'button',
        tabIndex: 0,
        'aria-label': `${r.label}${r.sensitive ? ' (sensitive site)' : ''}`,
        'aria-pressed': isSel,
        onClick: () => onRegion(r.id),
        onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRegion(r.id); } },
      } : {}),
      onMouseEnter: (e) => { setHoverId(r.id); if (onRegionHover) onRegionHover(r.id, e.currentTarget.getBoundingClientRect()); },
      onMouseLeave: () => { setHoverId(null); if (onRegionHover) onRegionHover(null, null); },
      ...(onRegionHover ? {
        onFocus: (e) => onRegionHover(r.id, e.currentTarget.getBoundingClientRect()),
        onBlur: () => onRegionHover(null, null),
      } : {}),
    };
  };

  return (
    <div className="flex flex-col gap-2">
      {onViewChange && (
        <div className="flex gap-1" role="group" aria-label="Body map view">
          {['front', 'back'].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onViewChange(v)}
              aria-pressed={view === v}
              className={`flex-1 rounded-md border px-2 py-1 text-xs font-medium ${view === v ? 'border-primary bg-blue-50 text-primary' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {v === 'front' ? 'Front' : 'Back'}
            </button>
          ))}
        </div>
      )}
      <svg
        viewBox={`${bx} ${by} ${bw} ${bh}`}
        className={`mx-auto block h-auto w-full ${map ? '' : (size === 'sm' ? 'max-w-[170px]' : 'max-w-[240px]')}`}
        style={map ? { maxWidth: Math.round(maxH * bw / bh) } : undefined}
        role="group"
        aria-label={`${view === 'front' ? 'Front' : 'Back'} body map`}
      >
        {map && <image href={FIGURE_IMAGE[figure]} x="0" y="0" width="810" height="810" preserveAspectRatio="none" />}
        <text x={bx + 14 * k} y={by + 14 * k} fontSize={8 * k} fill="#6b7280" fontFamily="ui-monospace, monospace">
          {view === 'front' ? 'PT RIGHT' : 'PT LEFT'}
        </text>
        <text x={bx + bw - 14 * k} y={by + 14 * k} fontSize={8 * k} fill="#6b7280" textAnchor="end" fontFamily="ui-monospace, monospace">
          {view === 'front' ? 'PT LEFT' : 'PT RIGHT'}
        </text>
        {!map && view === 'front' && <ellipse cx="100" cy="37" rx="22" ry="27" fill="#efe6da" stroke="#c9b9a6" />}
        {map && regions.filter((r) => map.regions[r.id]).map((r) => (
          <path key={r.id} {...regionProps(r)} d={map.regions[r.id].d}>{!readOnly && <title>{r.label}</title>}</path>
        ))}
        {!map && regions.map((r) => (r.e
          ? <ellipse key={r.id} {...regionProps(r)} cx={r.e[0]} cy={r.e[1]} rx={r.e[2]} ry={r.e[3]}>{!readOnly && <title>{r.label}</title>}</ellipse>
          : <rect key={r.id} {...regionProps(r)} x={r.r[0]} y={r.r[1]} width={r.r[2]} height={r.r[3]} rx="7">{!readOnly && <title>{r.label}</title>}</rect>))}
        {regions.filter((r) => photoCounts[r.id] > 0).map((r) => {
          // Camera badge, top-right of the area (pointer passes through to the area).
          const c = map ? map.regions[r.id]?.c : null;
          if (map && !c) return null;
          const [cx, cy] = map ? [c[0] + 11 * k, c[1] - 11 * k] : (r.e ? [r.e[0] + r.e[2] * 0.7, r.e[1] - r.e[3] * 0.7] : [r.r[0] + r.r[2] - 4, r.r[1] + 4]);
          return (
            <g key={`cam-${r.id}`} pointerEvents="none" aria-hidden="true" transform={map ? `translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})` : undefined}>
              <circle cx={cx} cy={cy} r="5" fill="#ffffff" stroke="#0066CC" strokeWidth="1" />
              <rect x={cx - 2.6} y={cy - 1.6} width="5.2" height="3.6" rx="0.8" fill="#0066CC" />
              <circle cx={cx} cy={cy + 0.2} r="1" fill="#ffffff" />
            </g>
          );
        })}
        {markers.map((m) => (
          <g key={m.key} pointerEvents="none" transform={map ? `translate(${m.x} ${m.y}) scale(${k}) translate(${-m.x} ${-m.y})` : undefined}>
            <circle cx={m.x} cy={m.y} r="7.5" fill={STATUS_DOT[m.f.currentStatus] || '#9ca3af'} stroke="#fff" strokeWidth="2" />
            <text x={m.x} y={m.y + 3} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#fff" fontFamily="ui-monospace, monospace">
              {String(m.f.label || '').replace(/^#0*/, '')}
            </text>
            {m.more > 0 && (
              <text x={m.x + 9} y={m.y - 5} fontSize="7" fontWeight="700" fill="#374151">+{m.more}</text>
            )}
          </g>
        ))}
      </svg>
      {interactive && otherSelected > 0 && (
        <p className="text-center text-[11px] font-medium text-primary">
          + {otherSelected} chosen on the {view === 'front' ? 'back' : 'front'}
        </p>
      )}
      {showOtherNote && otherCount > 0 && (
        <p className="text-center text-[11px] text-gray-500">
          {otherCount === 1 ? '1 finding is' : `${otherCount} findings are`} on the {view === 'front' ? 'back' : 'front'} view
        </p>
      )}
    </div>
  );
};

export default DermBodyMap;
