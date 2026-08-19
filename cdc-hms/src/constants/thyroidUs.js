/* Thyroid US — vocabularies, labels and chip colours in ONE place.
 * Values MUST match the backend enums (models + engine VOCAB). */

export const OPT = {
  studyType: [['full', 'Full thyroid'], ['focused', 'Focused']],
  glandSize: [['normal', 'Normal'], ['enlarged', 'Enlarged'], ['small', 'Small'], ['not_assessed', 'Not assessed']],
  echotexture: [['homogeneous', 'Homogeneous'], ['heterogeneous', 'Heterogeneous'], ['diffusely_hypoechoic', 'Diffusely hypoechoic'], ['other', 'Other']],
  echogenicity: [['isoechoic', 'Isoechoic'], ['hypoechoic', 'Hypoechoic'], ['hyperechoic', 'Hyperechoic'], ['other', 'Other']],
  vascularity: [['normal', 'Normal'], ['mildly_increased', 'Mildly ↑'], ['increased', 'Increased'], ['markedly_increased', 'Markedly ↑'], ['reduced', 'Reduced'], ['not_assessed', 'Not assessed']],
  doppler: [['normal', 'Normal'], ['peripheral', 'Peripheral'], ['internal', 'Internal'], ['diffuse_internal_and_peripheral', 'Diffuse (inferno)'], ['other', 'Other']],
  isthmusAppearance: [['normal', 'Normal'], ['thickened', 'Thickened'], ['atrophic', 'Atrophic'], ['not_assessable', 'Not assessable']],
  lymphNodeAssessment: [['normal', 'Normal / reactive'], ['suspicious', 'Suspicious'], ['not_assessed', 'Not assessed']],

  // nodule
  lobe: [['right', 'Right'], ['left', 'Left'], ['isthmus', 'Isthmus']],
  pole: [['upper', 'Upper'], ['mid', 'Mid'], ['lower', 'Lower']],
  composition: [['cystic', 'Cystic (0)'], ['spongiform', 'Spongiform (0)'], ['predominantly_cystic', 'Pred. cystic (1)'], ['mixed_cystic_solid', 'Mixed (1)'], ['predominantly_solid', 'Pred. solid (2)'], ['solid', 'Solid (2)']],
  nEchogenicity: [['anechoic', 'Anechoic (0)'], ['isoechoic', 'Iso (1)'], ['hyperechoic', 'Hyper (1)'], ['hypoechoic', 'Hypo (2)'], ['very_hypoechoic', 'Very hypo (3)'], ['heterogeneous', 'Heterogeneous']],
  shape: [['wider_than_tall', 'Wider-than-tall (0)'], ['taller_than_wide', 'Taller-than-wide (3)']],
  margins: [['smooth', 'Smooth (0)'], ['ill_defined', 'Ill-defined (0)'], ['lobulated', 'Lobulated (2)'], ['irregular', 'Irregular (2)'], ['extrathyroidal_extension', 'ETE (3)']],
  nVascularity: [['minimal', 'Minimal'], ['peripheral', 'Peripheral'], ['internal', 'Internal'], ['diffuse_internal_and_peripheral', 'Diffuse'], ['marked', 'Marked'], ['not_assessed', 'N/A']],
  bta: [['U1', 'U1'], ['U2', 'U2'], ['U3', 'U3'], ['U4', 'U4'], ['U5', 'U5']],
  previousCytology: [['none', 'None'], ['bethesda_1', 'Bethesda I'], ['bethesda_2', 'II'], ['bethesda_3', 'III'], ['bethesda_4', 'IV'], ['bethesda_5', 'V'], ['bethesda_6', 'VI'], ['unknown', 'Unknown']],
  viableSolidOnDoppler: [['yes', 'Yes'], ['no', 'No'], ['not_assessed', 'N/A']],

  // follicular
  follicularIndicated: [['not_indicated', 'Not indicated'], ['indicated', 'Indicated']],
  f_echotexture: [['homogeneous', 'Homogeneous'], ['mildly_heterogeneous', 'Mildly het.'], ['markedly_heterogeneous', 'Markedly het.'], ['nodule_in_nodule', 'Nodule-in-nodule'], ['other', 'Other']],
  f_halo: [['absent', 'Absent'], ['thin_complete', 'Thin complete'], ['thick_complete', 'Thick complete'], ['thick_irregular', 'Thick irregular'], ['interrupted', 'Interrupted'], ['nodular_irregular', 'Nodular irregular']],
  f_capsularInterface: [['smooth_intact', 'Smooth intact'], ['focally_irregular', 'Focally irregular'], ['focally_interrupted', 'Focally interrupted'], ['indeterminate', 'Indeterminate'], ['suspicious_extracapsular_extension', 'Suspicious ECE']],
  f_capsule: [['intact', 'Intact'], ['irregular', 'Irregular'], ['interrupted', 'Interrupted'], ['not_visualised', 'Not visualised']],
  f_satelliteNodule: [['absent', 'Absent'], ['present', 'Present']],
  f_tubercleInNodule: [['absent', 'Absent'], ['present', 'Present']],
  f_capsularVascularity: [['normal_circumferential', 'Normal'], ['focally_increased', 'Focally ↑'], ['abnormal_vessels_crossing_capsule', 'Vessels crossing capsule'], ['not_assessed', 'N/A']],
  f_vascularDistribution: [['predominantly_peripheral', 'Pred. peripheral'], ['predominantly_internal', 'Pred. internal'], ['mixed', 'Mixed'], ['diffuse', 'Diffuse']],
};

// additive / multi-select sets
export const FOCI = [
  ['fociMacrocalcification', 'Macrocalc (+1)'],
  ['fociRim', 'Rim (+2)'],
  ['fociInterruptedRim', 'Interrupted rim (+2)'],
  ['fociPunctate', 'Punctate (+3)'],
  ['fociCometTail', 'Comet-tail (0)'],
];
export const INVASIVE = [
  ['none_identified', 'None identified'],
  ['indeterminate', 'Indeterminate'],
  ['focal_capsular_disruption', 'Focal capsular disruption'],
  ['suspected_extrathyroidal_extension', '?Extrathyroidal extension'],
  ['strap_muscle_involvement', 'Strap muscle'],
  ['tracheal_interface_abnormal', 'Tracheal interface'],
  ['oesophageal_interface_abnormal', 'Oesophageal interface'],
];

export const TR_COLOR = {
  TR1: 'bg-emerald-500 text-white', TR2: 'bg-lime-500 text-slate-900',
  TR3: 'bg-amber-400 text-slate-900', TR4: 'bg-orange-500 text-white', TR5: 'bg-red-600 text-white',
};
export const TR_LABEL = { TR1: 'Benign', TR2: 'Not suspicious', TR3: 'Mildly suspicious', TR4: 'Moderately suspicious', TR5: 'Highly suspicious' };

// BTA U severity colours (U1 benign → U5 malignant), mirroring the TR scale.
export const BTA_COLOR = {
  U1: 'bg-emerald-500 text-white', U2: 'bg-lime-500 text-slate-900',
  U3: 'bg-amber-400 text-slate-900', U4: 'bg-orange-500 text-white', U5: 'bg-red-600 text-white',
};

// ACR TI-RADS levels — computed from the additive points; shown as selectable
// cards so the reporter confirms or overrides the final category.
export const TR_TABLE = [
  { code: 'TR1', label: 'Benign', points: '0 points', desc: 'Purely cystic or spongiform; no suspicious features.' },
  { code: 'TR2', label: 'Not suspicious', points: '2 points', desc: 'Benign-appearing; minimal points.' },
  { code: 'TR3', label: 'Mildly suspicious', points: '3 points', desc: 'Low-level suspicion.' },
  { code: 'TR4', label: 'Moderately suspicious', points: '4–6 points', desc: 'Intermediate suspicion.' },
  { code: 'TR5', label: 'Highly suspicious', points: '≥ 7 points', desc: 'Solid, hypoechoic, irregular/lobulated margins, punctate foci and/or taller-than-wide.' },
];

// BTA U (2014) classification — the defining sonographic features per category,
// so the reporter selects the category from its features (as they do for ACR).
export const BTA_U_TABLE = [
  { code: 'U1', label: 'Normal', features: ['Normal thyroid gland', 'No focal abnormality'] },
  { code: 'U2', label: 'Benign', features: [
    'Halo, iso-echoic / mildly hyperechoic',
    'Cystic change ± ring-down artefact (colloid)',
    'Microcystic / spongiform',
    'Peripheral eggshell calcification',
    'Peripheral vascularity',
  ] },
  { code: 'U3', label: 'Indeterminate / equivocal', features: [
    'Homogeneous, markedly hyperechoic (? follicular)',
    'Hypoechoic, equivocal echogenic foci, cystic change',
    'Mixed / central vascularity',
  ] },
  { code: 'U4', label: 'Suspicious', features: [
    'Solid, hypoechoic (cf. thyroid tissue)',
    'Hypoechoic with echogenic foci',
    'Disrupted peripheral (eggshell) calcification',
    'Lobulated outline',
  ] },
  { code: 'U5', label: 'Malignant', features: [
    'Solid, hypoechoic, lobulated/irregular outline, microcalcification (? papillary)',
    'Solid, hypoechoic, lobulated/irregular outline, globular calcification (? medullary)',
    'Intranodular vascularity',
    'Taller-than-wide (AP > transverse)',
    'Characteristic associated lymphadenopathy',
  ] },
];

// Cervical node levels (thyroid-relevant compartments) and the suspicious
// sonographic features of metastatic nodes. Both drive the structured
// lymph-node builder and appear in the report.
export const LN_LEVELS = [
  ['I', 'Submental / submandibular'],
  ['II', 'Upper jugular'],
  ['III', 'Mid jugular'],
  ['IV', 'Lower jugular'],
  ['V', 'Posterior triangle'],
  ['VI', 'Central (pre-/para-tracheal)'],
  ['VII', 'Superior mediastinal'],
];
export const LN_FEATURES = [
  ['loss_of_hilum', 'Loss of fatty hilum'],
  ['rounded', 'Rounded (S/L ≥ 0.5)'],
  ['microcalcification', 'Microcalcification'],
  ['cystic_necrosis', 'Cystic / necrotic change'],
  ['hyperechoic', 'Hyperechoic (cf. muscle)'],
  ['peripheral_vascularity', 'Peripheral / chaotic vascularity'],
  ['increased_short_axis', 'Increased short-axis'],
  ['matted', 'Matted / conglomerate'],
];

export const FOLL_COLOR = {
  low: { box: 'bg-emerald-50 border-emerald-200', txt: 'text-emerald-700', tag: 'bg-emerald-100 text-emerald-700' },
  intermediate: { box: 'bg-amber-50 border-amber-200', txt: 'text-amber-700', tag: 'bg-amber-100 text-amber-700' },
  high: { box: 'bg-red-50 border-red-200', txt: 'text-red-700', tag: 'bg-red-100 text-red-700' },
  incomplete: { box: 'bg-slate-50 border-slate-200', txt: 'text-slate-600', tag: 'bg-slate-200 text-slate-600' },
};

export const STEPS = [
  { id: 'appearance', label: 'Appearance', sub: 'Echotexture · vascularity' },
  { id: 'measurements', label: 'Dimensions', sub: 'Right · left · isthmus' },
  { id: 'nodules', label: 'Nodules', sub: 'TI-RADS · BTA U' },
  { id: 'nodes', label: 'Lymph nodes', sub: 'Cervical' },
  { id: 'conclusion', label: 'Conclusion', sub: '& recommendation' },
  { id: 'sign', label: 'Preview & sign', sub: '' },
];

export const label = (group, value) => {
  const set = OPT[group] || [];
  const hit = set.find(([v]) => v === value);
  return hit ? hit[1] : (value || '');
};
