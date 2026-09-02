import { FEET, FOOT_LABELS, PROTOCOL_SITES, SITE_LABELS, SITE_SHORT, gradeValue, GRADE_SPOT } from '../../constants/neuropathy';
import rightFoot from '../../assets/rightFoot.png';
import leftFoot from '../../assets/leftFoot.png';
import footIllusRight from '../../assets/footIllusRight.png';
import footIllusLeft from '../../assets/footIllusLeft.png';

// Neuropathy Studio — the two plantar foot diagrams. The six protocol sites are
// overlaid on the artwork's printed circles (positions detected per artwork) and
// each measured point is tinted by the band of its OWN reading:
// green Normal · amber Mild · orange Moderate · red Severe.
//
// Two artworks: `template` — the original Vibrotherm line drawing, kept for the
// PDF report; `illustration` — the friendlier colour feet on the capture screen
// (the default). Each has its own right-foot circle centres (% of image); the
// left foot mirrors x.
const TEMPLATE_POS = {
  greatToe: { x: 66.4, y: 9.9,  d: 21 },
  mth1:     { x: 74.1, y: 27.5, d: 16 },
  mth3:     { x: 46.3, y: 30.5, d: 14 },
  mth5:     { x: 23.9, y: 40.7, d: 14 },
  midfoot:  { x: 61.0, y: 58.4, d: 18 },
  heel:     { x: 57.1, y: 87.7, d: 17 },
};
const ILLUS_POS = {
  greatToe: { x: 64.6, y: 7.3,  d: 13 },
  mth1:     { x: 64.5, y: 29.5, d: 13 },
  mth3:     { x: 50.0, y: 26.9, d: 13 },
  mth5:     { x: 35.2, y: 37.3, d: 13 },
  midfoot:  { x: 41.0, y: 58.5, d: 13 },
  heel:     { x: 51.1, y: 89.9, d: 13 },
};
const ART = {
  template:     { img: { R: rightFoot, L: leftFoot },           pos: TEMPLATE_POS },
  illustration: { img: { R: footIllusRight, L: footIllusLeft }, pos: ILLUS_POS },
};

// Display sizes. `large` is the capture screen (big enough to tap comfortably);
// the PDF report uses `compact`.
const SIZES = {
  compact: { grid: 'grid grid-cols-2 gap-3 max-w-[380px]',             foot: 'max-w-[187px]' },
  default: { grid: 'grid grid-cols-2 gap-4 sm:gap-8 max-w-lg mx-auto',  foot: 'max-w-[220px]' },
  large:   { grid: 'grid grid-cols-2 gap-5 max-w-[620px] mx-auto',      foot: 'max-w-[300px]' },
};

const spotGrade = (modality, value) => {
  if (value === null || value === undefined || value === '') return 'none';
  if (modality === 'MONO') return value ? 'Normal' : 'Severe';
  return gradeValue(modality, value) || 'none';
};

const displayValue = (modality, value) => {
  if (value === null || value === undefined || value === '') return '';
  if (modality === 'MONO') return value ? '✓' : '✗';
  return `${value}`;
};

/**
 * Props:
 *   readings  — { R: { site: value }, L: { site: value } } for the CURRENT modality
 *   modality  — 'VPT' | 'HOT' | 'COLD' | 'MONO'
 *   active    — { foot, site } | null
 *   onSelect  — (foot, site) => void
 *   readOnly  — disables selection
 *   art       — 'illustration' (default, capture screen) | 'template' (PDF report)
 */
const NeuropathyFootMap = ({ readings, modality, active, onSelect, readOnly = false, size = 'default', art = 'illustration' }) => {
  const set = ART[art] || ART.illustration;
  const sz = SIZES[size] || SIZES.default;
  const posFor = (foot, site) => {
    const p = set.pos[site];
    return foot === 'L' ? { ...p, x: 100 - p.x } : p;
  };
  return (
    <div className={sz.grid}>
      {FEET.map((foot) => (
        <div key={foot} className="text-center">
          <div className={`relative w-full mx-auto select-none ${sz.foot}`}>
            <img src={set.img[foot]} alt={`${FOOT_LABELS[foot]} foot test sites`} className="w-full block pointer-events-none" draggable="false" />
            {PROTOCOL_SITES.map((site) => {
              const p = posFor(foot, site);
              const value = readings?.[foot]?.[site];
              const grade = spotGrade(modality, value);
              const c = GRADE_SPOT[grade] || GRADE_SPOT.none;
              const isActive = active?.foot === foot && active?.site === site;
              const txt = displayValue(modality, value);
              const has = value !== null && value !== undefined && value !== '';
              return (
                <button
                  key={site}
                  type="button"
                  disabled={readOnly}
                  onClick={readOnly ? undefined : () => onSelect?.(foot, site)}
                  title={`${FOOT_LABELS[foot]} · ${SITE_LABELS[site]}${has ? ` — ${txt}` : ''}`}
                  className="absolute rounded-full flex items-center justify-center font-bold leading-none transition-all"
                  style={{
                    left: `${p.x}%`, top: `${p.y}%`, width: `${p.d}%`, aspectRatio: '1',
                    transform: 'translate(-50%,-50%)',
                    background: c.fill,
                    color: c.text,
                    border: `2px solid ${isActive ? '#0066CC' : c.ring}`,
                    boxShadow: isActive ? '0 0 0 3px rgba(0,102,204,0.30)' : 'none',
                    fontSize: (has && txt.length >= 4) ? '13px' : '16px',
                    cursor: readOnly ? 'default' : 'pointer',
                  }}
                >
                  {has ? txt : <span className="text-[9px] font-semibold opacity-60">{SITE_SHORT[site]}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default NeuropathyFootMap;
