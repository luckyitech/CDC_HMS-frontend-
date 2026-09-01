import { FEET, FOOT_LABELS, PROTOCOL_SITES, SITE_LABELS, SITE_SHORT, gradeValue, GRADE_SPOT } from '../../constants/neuropathy';
import rightFoot from '../../assets/rightFoot.png';
import leftFoot from '../../assets/leftFoot.png';

// Neuropathy Studio — the two plantar foot diagrams, drawn on the vendor
// Vibrotherm template (Right_Foot / Left_Foot). The six protocol sites are
// overlaid on the printed circles (positions detected from the template) and
// each measured point is tinted by the band of its OWN reading:
// green Normal · amber Mild · orange Moderate · red Severe.

const FOOT_IMG = { R: rightFoot, L: leftFoot };

// Right-foot circle centres + diameter as % of the image (detected from the
// template). The left foot mirrors x.
const SITE_POS_R = {
  greatToe: { x: 66.4, y: 9.9,  d: 21 },
  mth1:     { x: 74.1, y: 27.5, d: 16 },
  mth3:     { x: 46.3, y: 30.5, d: 14 },
  mth5:     { x: 23.9, y: 40.7, d: 14 },
  midfoot:  { x: 61.0, y: 58.4, d: 18 },
  heel:     { x: 57.1, y: 87.7, d: 17 },
};
const posFor = (foot, site) => {
  const p = SITE_POS_R[site];
  return foot === 'L' ? { ...p, x: 100 - p.x } : p;
};

// The grade that tints a spot. MONO isn't a numeric band: felt (1) reads as
// Normal, not felt (0) as Severe — the clinically meaningful colours.
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
 */
const NeuropathyFootMap = ({ readings, modality, active, onSelect, readOnly = false, size = 'default' }) => (
  <div className={size === 'compact' ? 'grid grid-cols-2 gap-3 max-w-[380px]' : 'grid grid-cols-2 gap-4 sm:gap-8 max-w-lg mx-auto'}>
    {FEET.map((foot) => (
      <div key={foot} className="text-center">
        <div className={`relative w-full mx-auto select-none ${size === 'compact' ? 'max-w-[187px]' : 'max-w-[220px]'}`}>
          <img src={FOOT_IMG[foot]} alt={`${FOOT_LABELS[foot]} foot test sites`} className="w-full block pointer-events-none" draggable="false" />
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

export default NeuropathyFootMap;
