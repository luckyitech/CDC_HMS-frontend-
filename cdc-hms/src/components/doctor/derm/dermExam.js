// Dermatology — the structured skin examination (9 Oct 2026, Emu).
// MIRRORS the backend's utils/dermExam.js (sections, fields, fixed words and
// labels) — change both together. The backend is the rule; this file only
// draws the form and reads values back.
//
// Every choice field also takes "Other…" — the doctor's own word, stored as
// typed and offered again next time (GET /api/derm/vocabulary → terms).

const o = (...pairs) => pairs;   // readability: [[token, label], …]

// kind: one | many (choices, Other allowed) · int · mm · pct · text · flag
export const LOOK_SECTIONS = [
  {
    id: 'primary', title: 'Primary lesion(s)', fields: [
      { key: 'distribution', label: 'Distribution', kind: 'one', options: o(['localized', 'Localized'], ['regional', 'Regional'], ['generalized', 'Generalized']) },
      { key: 'symmetry', label: 'Symmetry', kind: 'one', options: o(['symmetric', 'Symmetric'], ['asymmetric', 'Asymmetric']) },
      { key: 'pattern', label: 'Pattern', kind: 'many', options: o(['dermatomal', 'Dermatomal'], ['follicular', 'Follicular'], ['acral', 'Acral'],
        ['photo_exposed', 'Photo-exposed'], ['intertriginous', 'Intertriginous'], ['flexural', 'Flexural'], ['extensor', 'Extensor'],
        ['seborrhoeic', 'Seborrhoeic'], ['blaschkoid', 'Blaschkoid'], ['koebner', 'Koebner']) },
      { key: 'configuration', label: 'Configuration', kind: 'many', options: o(['discrete', 'Discrete'], ['grouped', 'Grouped'], ['linear', 'Linear'],
        ['annular', 'Annular'], ['arcuate', 'Arcuate'], ['reticular', 'Reticular'], ['targetoid', 'Targetoid'], ['serpiginous', 'Serpiginous']) },
    ],
  },
  {
    id: 'morphology', title: 'Morphology', fields: [
      { key: 'morphology', label: 'Type', kind: 'many', options: o(['macule', 'Macule'], ['patch', 'Patch'], ['papule', 'Papule'], ['plaque', 'Plaque'],
        ['nodule', 'Nodule'], ['tumour', 'Tumor'], ['vesicle', 'Vesicle'], ['bulla', 'Bulla'], ['pustule', 'Pustule'], ['cyst', 'Cyst'],
        ['wheal', 'Wheal'], ['comedone', 'Comedone']) },
      // Size (L × W × D, measured by, range) is handled by dermRules — listed here for the note only.
      { key: 'shape', label: 'Shape', kind: 'one', options: o(['round', 'Round'], ['oval', 'Oval'], ['irregular', 'Irregular'], ['polygonal', 'Polygonal']) },
      { key: 'border', label: 'Border', kind: 'many', options: o(['well_defined', 'Well-defined'], ['ill_defined', 'Ill-defined'], ['raised', 'Raised'], ['flat', 'Flat']) },
      { key: 'colours', label: 'Colour', kind: 'many', options: o(['erythematous', 'Erythematous'], ['hyperpigmented', 'Hyperpigmented'],
        ['hypopigmented', 'Hypopigmented'], ['violaceous', 'Violaceous'], ['brown', 'Brown'], ['black', 'Black'], ['blue_grey', 'Blue-grey'],
        ['skin_coloured', 'Flesh-coloured'], ['yellow', 'Yellow'], ['variegated', 'Variegated']) },
      { key: 'surface', label: 'Surface', kind: 'many', options: o(['smooth', 'Smooth'], ['rough', 'Rough'], ['verrucous', 'Verrucous'], ['scaly', 'Scaly'],
        ['crusted', 'Crusted'], ['ulcerated', 'Ulcerated'], ['excoriated', 'Excoriated']) },
      { key: 'texture', label: 'Texture', kind: 'one', options: o(['soft', 'Soft'], ['firm', 'Firm'], ['hard', 'Hard'], ['fluctuant', 'Fluctuant']) },
    ],
  },
  {
    id: 'secondary', title: 'Secondary changes', fields: [
      { key: 'scale', label: 'Scale', kind: 'one', options: o(['none', 'None'], ['fine', 'Fine'], ['thick', 'Thick'], ['silvery', 'Silvery'], ['greasy', 'Greasy'], ['adherent', 'Adherent']) },
      { key: 'crust', label: 'Crust', kind: 'one', options: o(['none', 'None'], ['serous', 'Serous'], ['haemorrhagic', 'Haemorrhagic'], ['honey', 'Honey-coloured']) },
      { key: 'erosion', label: 'Erosion', kind: 'one', options: o(['none', 'None'], ['present', 'Present']) },
      { key: 'ulceration', label: 'Ulceration', kind: 'one', options: o(['none', 'None'], ['present', 'Present']) },
      { key: 'ulcerBase', label: 'Ulcer base', kind: 'one', options: o(['clean', 'Clean'], ['necrotic', 'Necrotic'], ['granulating', 'Granulating'], ['sloughy', 'Sloughy']) },
      { key: 'excoriation', label: 'Excoriation', kind: 'one', options: o(['none', 'None'], ['present', 'Present']) },
      { key: 'lichenification', label: 'Lichenification', kind: 'one', options: o(['none', 'None'], ['present', 'Present']) },
      { key: 'atrophy', label: 'Atrophy', kind: 'one', options: o(['none', 'None'], ['epidermal', 'Epidermal'], ['dermal', 'Dermal']) },
      { key: 'scarring', label: 'Scarring', kind: 'one', options: o(['none', 'None'], ['atrophic', 'Atrophic'], ['hypertrophic', 'Hypertrophic'], ['keloid', 'Keloid'], ['cribriform', 'Cribriform']) },
    ],
  },
  {
    id: 'quantification', title: 'Quantification', fields: [
      { key: 'lesionCount', label: 'Number of lesions', kind: 'int', max: 9999 },
      { key: 'lesionCountKind', label: 'Number of lesions', kind: 'one', options: o(['innumerable', 'Innumerable'], ['confluent', 'Confluent']) },
      { key: 'bsaPercent', label: 'Percent BSA involved', kind: 'pct' },
    ],
  },
  {
    id: 'dermoscopy', title: 'Dermoscopy', switch: 'dermoscopy', fields: [
      { key: 'dsGlobal', label: 'Global pattern', kind: 'one', options: o(['reticular', 'Reticular'], ['globular', 'Globular'], ['homogeneous', 'Homogeneous'],
        ['starburst', 'Starburst'], ['multicomponent', 'Multicomponent'], ['nonspecific', 'Nonspecific']) },
      { key: 'dsNetwork', label: 'Pigment network', kind: 'one', options: o(['none', 'None'], ['regular', 'Regular'], ['irregular', 'Irregular'], ['atypical', 'Atypical']) },
      { key: 'dsDots', label: 'Dots / globules', kind: 'one', options: o(['none', 'None'], ['regular', 'Regular'], ['irregular', 'Irregular']) },
      { key: 'dsStreaks', label: 'Streaks', kind: 'one', options: o(['none', 'None'], ['regular', 'Regular'], ['irregular', 'Irregular'], ['pseudopods', 'Pseudopods']) },
      { key: 'dsBlueWhite', label: 'Blue-white structures', kind: 'one', options: o(['none', 'None'], ['present', 'Present']) },
      { key: 'dsVascular', label: 'Vascular pattern', kind: 'many', options: o(['comma', 'Comma vessels'], ['hairpin', 'Hairpin vessels'], ['dotted', 'Dotted vessels'],
        ['arborizing', 'Arborizing vessels'], ['glomerular', 'Glomerular vessels'], ['polymorphous', 'Polymorphous']) },
      { key: 'dsRegression', label: 'Regression structures', kind: 'one', options: o(['none', 'None'], ['peppering', 'Peppering'], ['scar_like', 'Scar-like']) },
      { key: 'dsOther', label: 'Other features', kind: 'many', options: o(['milia_like_cysts', 'Milia-like cysts'], ['comedo_like_openings', 'Comedo-like openings'],
        ['leaf_like', 'Leaf-like structures'], ['spoke_wheel', 'Spoke-wheel'], ['blue_grey_ovoid_nests', 'Blue-grey ovoid nests']) },
    ],
  },
  {
    id: 'plan', title: 'Symptoms & plan', fields: [
      { key: 'symptoms', label: 'Symptoms', kind: 'many', options: o(['itch', 'Itch'], ['pain', 'Pain'], ['bleeding', 'Bleeding'], ['none', 'None']) },
      { key: 'plan', label: 'Plan', kind: 'one', options: o(['monitor', 'Monitor'], ['treat', 'Treat'], ['biopsy', 'Biopsy'], ['excise', 'Excise'], ['refer', 'Refer'], ['discharge', 'Discharge']) },
    ],
  },
];

export const NAILS = ['all'];
for (const side of ['l', 'r']) for (const limb of ['f', 't']) for (let n = 1; n <= 5; n += 1) NAILS.push(`${side}${limb}${n}`);
export const nailLabel = (t) => {
  if (t === 'all') return 'All nails';
  const m = /^([lr])([ft])([1-5])$/.exec(t);
  if (!m) return t;
  const digit = m[2] === 'f' ? ['thumb', 'index', 'middle', 'ring', 'little'][Number(m[3]) - 1] : ['great toe', '2nd toe', '3rd toe', '4th toe', '5th toe'][Number(m[3]) - 1];
  return `${m[1] === 'l' ? 'left' : 'right'} ${digit}`;
};

export const EXAM_SECTIONS = [
  {
    id: 'hair', title: 'Hair', switch: 'hairExamined', fields: [
      { key: 'scalp', label: 'Scalp', kind: 'text', max: 500 },
      { key: 'hairDensity', label: 'Hair density', kind: 'one', options: o(['normal', 'Normal'], ['decreased', 'Decreased']) },
      { key: 'hairDensityPattern', label: 'Pattern', kind: 'many', options: o(['diffuse', 'Diffuse'], ['patchy', 'Patchy'], ['androgenetic', 'Androgenetic'], ['frontotemporal', 'Frontal / temporal']) },
      { key: 'hairCalibre', label: 'Hair calibre', kind: 'one', options: o(['normal', 'Normal'], ['fine', 'Fine'], ['varied', 'Varied']) },
      { key: 'pullTest', label: 'Pull test', kind: 'one', options: o(['negative', 'Negative'], ['positive', 'Positive']) },
      { key: 'pullTestSite', label: 'Pull test location', kind: 'text', max: 100 },
      { key: 'pullTestCount', label: 'Hairs pulled', kind: 'int', max: 999 },
      { key: 'exclamationHairs', label: 'Exclamation-point hairs', kind: 'one', options: o(['absent', 'Absent'], ['present', 'Present']) },
      { key: 'brokenHairs', label: 'Broken hairs', kind: 'one', options: o(['absent', 'Absent'], ['present', 'Present']) },
    ],
  },
  {
    id: 'nails', title: 'Nails', switch: 'nailsExamined', fields: [
      { key: 'nailsAffected', label: 'Nails affected', kind: 'many', options: NAILS.map((t) => [t, nailLabel(t)]) },
      { key: 'nailPlate', label: 'Nail plate', kind: 'many', options: o(['normal', 'Normal'], ['pitting', 'Pitting'], ['ridging', 'Ridging'], ['dystrophy', 'Dystrophy'],
        ['discolouration', 'Discolouration'], ['thickening', 'Thickening']) },
      { key: 'nailBed', label: 'Nail bed', kind: 'many', options: o(['normal', 'Normal'], ['onycholysis', 'Onycholysis'], ['oil_spots', 'Oil spots'],
        ['subungual_debris', 'Subungual debris'], ['splinter_haemorrhages', 'Splinter haemorrhages']) },
      { key: 'periungual', label: 'Periungual', kind: 'many', options: o(['normal', 'Normal'], ['paronychia', 'Paronychia'], ['pterygium', 'Pterygium']) },
    ],
  },
  {
    id: 'nodes', title: 'Lymph nodes', switch: 'nodesExamined', fields: [
      { key: 'lymphadenopathy', label: 'Regional lymphadenopathy', kind: 'one', options: o(['absent', 'Absent'], ['present', 'Present']) },
      { key: 'nodesNote', label: 'Location and characteristics', kind: 'text', max: 500 },
    ],
  },
  {
    id: 'mucosa', title: 'Mucosa', switch: 'mucosaExamined', fields: [
      { key: 'oral', label: 'Oral', kind: 'one', options: o(['normal', 'Normal'], ['findings', 'Findings']) },
      { key: 'oralNote', label: 'Oral findings', kind: 'text', max: 500 },
      { key: 'genital', label: 'Genital', kind: 'one', options: o(['normal', 'Normal'], ['findings', 'Findings'], ['declined', 'Declined']) },
      { key: 'genitalNote', label: 'Genital findings', kind: 'text', max: 500 },
    ],
  },
];

const fieldsOf = (sections) => sections.flatMap((s) => s.fields);
export const LOOK_FIELDS = fieldsOf(LOOK_SECTIONS);
export const EXAM_FIELDS = fieldsOf(EXAM_SECTIONS);
export const EXAM_SWITCHES = EXAM_SECTIONS.map((s) => s.switch);
export const LOOK_EXAM_KEYS = ['dermoscopy', ...LOOK_FIELDS.map((f) => f.key).filter((k) => !['symptoms', 'plan', 'morphology', 'colours'].includes(k))];
export const SKIN_EXAM_KEYS = [...EXAM_SWITCHES, ...EXAM_FIELDS.map((f) => f.key), 'notes'];
export const MAX_TERM = 40;

const LEGACY_LABELS = { regular: 'Regular', irregular: 'Irregular', bleeding: 'Bleeding', erosion: 'Erosion', ulcer: 'Ulcer', other: 'Other' };
const SPEC = Object.fromEntries([...LOOK_FIELDS, ...EXAM_FIELDS].map((f) => [f.key, f]));
export const specOf = (key) => SPEC[key];
export const asList = (v) => (Array.isArray(v) ? v : (v ? String(v).split(',').filter(Boolean) : []));
export const isFixed = (key, value) => !!(SPEC[key]?.options || []).some(([t]) => t === value) || !!LEGACY_LABELS[value];
/** The label a doctor reads: the fixed word's label, or their own typed word as typed. */
export const labelOf = (key, value) => {
  const hit = (SPEC[key]?.options || []).find(([t]) => t === value);
  return hit ? hit[1] : (LEGACY_LABELS[value] || value);
};
const lower = (s) => (s && !/^[A-Z]{2,}/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
export const phrase = (key, v) => asList(v).map((x) => (isFixed(key, x) ? lower(labelOf(key, x)) : x)).join(', ');
export const hasValue = (v) => (Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && v !== '' && v !== false);

/** One line summing up what is recorded in a section (shown while it is folded). */
const NAMED = new Set(['secondary', 'dermoscopy', 'hair', 'nails', 'nodes', 'mucosa']);
export const sectionSummary = (section, value) => {
  if (section.switch && !value[section.switch]) return section.id === 'dermoscopy' ? 'Not performed' : 'Not examined';
  const bits = section.fields.filter((f) => hasValue(value[f.key]) && f.kind !== 'text').map((f) => {
    if (f.key === 'lesionCount') return `${value[f.key]} lesions`;
    if (f.key === 'bsaPercent') return `${value[f.key]} % BSA`;
    if (f.kind === 'int') return `${f.label.toLowerCase()} ${value[f.key]}`;
    const v = phrase(f.key, value[f.key]);
    // "fine · present" says nothing folded up: name the field where the answer is generic.
    return NAMED.has(section.id) ? `${f.label.toLowerCase()} ${v}` : v;
  });
  return bits.join(' · ') || (section.switch ? 'Examined' : 'Nothing recorded');
};
