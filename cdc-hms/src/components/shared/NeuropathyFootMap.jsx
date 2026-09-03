import { Fragment } from 'react';
import { FEET, FOOT_LABELS, PROTOCOL_SITES, SITE_LABELS, SITE_SHORT, gradeValue, GRADE_SPOT } from '../../constants/neuropathy';
import rightFootV2 from '../../assets/rightFootV2.png';
import leftFootV2 from '../../assets/leftFootV2.png';
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
// left foot has its own detected centres (illustration) or mirrors x (template).
// Site centres for the report's clean feet (rightFootV2 / leftFootV2 — Emu's own
// artwork, no printed circles). Right foot = big toe top-right; left = its own
// detected map (the drawings are near-mirrors, tuned per foot). Uniform marker
// size, since there is no printed circle to match.
const TEMPLATE_POS_R = {
  greatToe: { x: 70.6, y: 8.2,  d: 16 },
  mth1:     { x: 79.0, y: 27.3, d: 16 },
  mth3:     { x: 47.6, y: 26.5, d: 16 },
  mth5:     { x: 18.8, y: 39.6, d: 16 },
  midfoot:  { x: 42.9, y: 59.7, d: 16 },
  heel:     { x: 52.6, y: 88.8, d: 16 },
};
const TEMPLATE_POS_L = {
  greatToe: { x: 29.4, y: 8.2,  d: 16 },
  mth1:     { x: 21.0, y: 27.3, d: 16 },
  mth3:     { x: 52.4, y: 26.5, d: 16 },
  mth5:     { x: 81.2, y: 39.6, d: 16 },
  midfoot:  { x: 57.1, y: 59.7, d: 16 },
  heel:     { x: 47.4, y: 88.8, d: 16 },
};
// Illustration circle centres are detected PER FOOT — the two colour images are
// hand-drawn and are NOT exact vertical mirrors of each other, so the left foot
// carries its own map rather than mirroring the right (markers must sit snug in
// the printed white discs).
const ILLUS_POS_R = {
  greatToe: { x: 81.6, y: 7.2,  d: 17 },
  mth1:     { x: 81.4, y: 29.5, d: 17 },
  mth3:     { x: 49.8, y: 26.8, d: 17 },
  mth5:     { x: 17.9, y: 37.2, d: 17 },
  midfoot:  { x: 30.4, y: 58.5, d: 17 },
  heel:     { x: 52.4, y: 89.9, d: 17 },
};
const ILLUS_POS_L = {
  greatToe: { x: 16.9, y: 7.6,  d: 17 },
  mth1:     { x: 18.3, y: 29.4, d: 17 },
  mth3:     { x: 50.0, y: 26.8, d: 17 },
  mth5:     { x: 80.9, y: 34.7, d: 17 },
  midfoot:  { x: 69.2, y: 58.7, d: 17 },
  heel:     { x: 46.7, y: 88.4, d: 17 },
};
const ART = {
  // pos = right-foot centres. posL, when present, gives the left foot its own
  // detected centres; without it the left foot mirrors x (template line art is a
  // true mirror, so it needs no posL).
  template:     { img: { R: rightFootV2, L: leftFootV2 },       pos: TEMPLATE_POS_R, posL: TEMPLATE_POS_L },
  illustration: { img: { R: footIllusRight, L: footIllusLeft }, pos: ILLUS_POS_R, posL: ILLUS_POS_L },
};

// Display sizes. `large` is the capture screen (big enough to tap comfortably);
// the PDF report uses `compact`.
const SIZES = {
  compact: { grid: 'grid grid-cols-2 gap-2 max-w-[320px]',             foot: 'max-w-[122px]' },
  default: { grid: 'grid grid-cols-2 gap-4 sm:gap-8 max-w-lg mx-auto',  foot: 'max-w-[220px]' },
  large:   { grid: 'grid grid-cols-2 gap-3 max-w-[470px] mx-auto',      foot: 'max-w-[220px]' },
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
 *   variant   — 'disc' (default, interactive capture) | 'bullet' (report: dot + value below)
 */
const NeuropathyFootMap = ({ readings, modality, active, onSelect, readOnly = false, size = 'default', art = 'illustration', showLabels = false, variant = 'disc' }) => {
  const set = ART[art] || ART.illustration;
  const sz = SIZES[size] || SIZES.default;
  const posFor = (foot, site) => {
    if (foot === 'L') {
      if (set.posL) return set.posL[site];      // per-foot detected centres
      const p = set.pos[site];
      return { ...p, x: 100 - p.x };             // mirror (template line art)
    }
    return set.pos[site];
  };
  return (
    <div className={sz.grid}>
      {FEET.map((foot) => (
        <div key={foot} className="text-center">
          {showLabels && (
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', color: '#6a7891', textTransform: 'uppercase', lineHeight: 1, marginBottom: 3 }}>
              {FOOT_LABELS[foot]}
            </div>
          )}
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

              // Report variant: a small grade-coloured bullet AT the point with the
              // reading printed just below it (no disc, so decimals never crowd the
              // marker). A not-assessed site shows a grey bullet and no value.
              if (variant === 'bullet') {
                return (
                  <Fragment key={site}>
                    <span
                      title={`${FOOT_LABELS[foot]} · ${SITE_LABELS[site]}${has ? ` — ${txt}` : ' — not assessed'}`}
                      className="absolute rounded-full"
                      style={{
                        left: `${p.x}%`, top: `${p.y}%`, width: '5.6%', aspectRatio: '1',
                        transform: 'translate(-50%,-50%)',
                        background: c.ring,
                        boxShadow: '0 0 0 1.5px #fff',
                      }}
                    />
                    {has && (
                      <span
                        className="absolute font-bold leading-none"
                        style={{
                          left: `${p.x}%`, top: `${p.y}%`,
                          transform: 'translate(-50%,8px)',
                          fontSize: '10px',
                          color: c.text,
                          whiteSpace: 'nowrap',
                          textShadow: '0 0 2px #fff, 0 0 2px #fff',
                        }}
                      >
                        {txt}
                      </span>
                    )}
                  </Fragment>
                );
              }

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
                    fontSize: (has && txt.length >= 4) ? '13.5px' : '15px',
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
