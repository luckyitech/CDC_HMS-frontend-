import { FEET, FOOT_LABELS, PROTOCOL_SITES, SITE_SHORT, SITE_LABELS, gradeValue } from '../../constants/neuropathy';

// Neuropathy Studio — the two plantar foot diagrams with the four protocol
// sites (Great toe, MTH 1, MTH 5, Heel). Tap a site to make it the capture
// target; each site is tinted by the band of its OWN reading for the current
// modality (monofilament: green felt / red not felt).

const FOOT_PATH = 'M32 6c11 0 18 9 18 22 0 10-3 16-3 27 0 9 4 14 4 24 0 12-8 19-19 19S13 91 13 79c0-10 4-15 4-24 0-11-3-17-3-27C14 15 21 6 32 6Z';
// Right-foot coordinates; the left foot is mirrored.
const SITE_POS = { greatToe: { x: 32, y: 20 }, mth1: { x: 22, y: 40 }, mth5: { x: 44, y: 40 }, heel: { x: 32, y: 92 } };

const TINT = {
  Normal:   { fill: '#e4f5ec', stroke: '#1f9d6b' },
  Mild:     { fill: '#fbf1d9', stroke: '#c68a12' },
  Moderate: { fill: '#fcecdc', stroke: '#d9741d' },
  Severe:   { fill: '#fbe4e4', stroke: '#d33f3f' },
  none:     { fill: '#f6f8fb', stroke: '#8a97ac' },
  active:   { fill: '#1f6feb', stroke: '#1f6feb' },
};

const bandFor = (modality, value) => {
  if (value === null || value === undefined) return 'none';
  if (modality === 'MONO') return Number(value) === 1 ? 'Normal' : 'Severe';
  return gradeValue(modality, value) || 'none';
};

/**
 * Props:
 *   readings  — { R: { site: value }, L: { site: value } } for the CURRENT modality
 *   modality  — 'VPT' | 'HOT' | 'COLD' | 'MONO'
 *   active    — { foot, site } | null
 *   onSelect  — (foot, site) => void
 *   readOnly  — no pointer affordance
 */
const NeuropathyFootMap = ({ readings, modality, active, onSelect, readOnly = false }) => (
  <div className="grid grid-cols-2 gap-2">
    {FEET.map((foot) => (
      <div key={foot} className="text-center">
        <h4 className="text-xs font-semibold text-gray-500 tracking-wide mb-1">{FOOT_LABELS[foot]}</h4>
        <svg
          viewBox="0 0 64 118"
          className="mx-auto w-28 h-48"
          style={{ transform: foot === 'L' ? 'scaleX(-1)' : 'none' }}
          role="img"
          aria-label={`${FOOT_LABELS[foot]} foot test sites`}
        >
          <path d={FOOT_PATH} fill="#f6f8fb" stroke="#dde3ec" strokeWidth="1.5" />
          {PROTOCOL_SITES.map((site) => {
            const p = SITE_POS[site];
            const value = readings?.[foot]?.[site];
            const isActive = active?.foot === foot && active?.site === site;
            const tint = isActive ? TINT.active : TINT[bandFor(modality, value)];
            return (
              <g
                key={site}
                onClick={readOnly ? undefined : () => onSelect?.(foot, site)}
                style={{ cursor: readOnly ? 'default' : 'pointer' }}
              >
                <title>{`${FOOT_LABELS[foot]} · ${SITE_LABELS[site]}${value != null ? ` — ${value}` : ''}`}</title>
                <circle cx={p.x} cy={p.y} r="9" fill={tint.fill} stroke={tint.stroke} strokeWidth={value != null || isActive ? 2.5 : 2} />
                {/* un-mirror the label on the left foot so text reads normally */}
                <text
                  x={p.x} y={p.y + 3} textAnchor="middle" fontSize="8" fontFamily="ui-monospace, monospace"
                  fill={isActive ? '#fff' : '#51607a'}
                  style={{ transform: foot === 'L' ? 'scaleX(-1)' : 'none', transformOrigin: `${p.x}px ${p.y}px` }}
                >
                  {SITE_SHORT[site]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    ))}
  </div>
);

export default NeuropathyFootMap;
