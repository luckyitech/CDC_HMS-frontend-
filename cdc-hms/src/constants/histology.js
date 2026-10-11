// Histology / cytology — the closed lists the request and result forms offer
// (mirror backend utils/histologyRules.js; tests compare the two).

export const KINDS = [
  { id: 'histology', label: 'Histology' },
  { id: 'cytology', label: 'Cytology' },
];

export const SITE_TYPES = [
  { id: 'skin', label: 'Skin finding' },
  { id: 'thyroid', label: 'Thyroid nodule' },
  { id: 'lymph_node', label: 'Lymph node' },
  { id: 'other', label: 'Other site' },
];

export const TISSUE_TYPES = [
  { id: 'punch', label: 'Punch' },
  { id: 'shave', label: 'Shave' },
  { id: 'incisional', label: 'Incisional' },
  { id: 'excision', label: 'Excision' },
  { id: 'core_needle', label: 'Core needle (CNB)' },
  { id: 'other', label: 'Other' },
];

export const CYTO_TYPES = [
  { id: 'fnac', label: 'FNAC' },
  { id: 'brushings', label: 'Brushings' },
  { id: 'fluid', label: 'Fluid' },
  { id: 'other', label: 'Other' },
];

export const SKIN_BIOPSY_TYPES = ['punch', 'shave', 'incisional', 'excision'];

export const FIXATIVES = [
  { id: 'formalin', label: 'Formalin' },
  { id: 'fresh', label: 'Fresh / saline' },
  { id: 'slides', label: 'Slides' },
  { id: 'cytolyt', label: 'Slides + CytoLyt' },
  { id: 'other', label: 'Other' },
];

export const LOBES = [
  { id: 'right', label: 'Right' },
  { id: 'left', label: 'Left' },
  { id: 'isthmus', label: 'Isthmus' },
];

export const TIRADS = ['TR1', 'TR2', 'TR3', 'TR4', 'TR5'];

export const MARGINS = [
  { id: 'clear', label: 'Clear' },
  { id: 'close', label: 'Close' },
  { id: 'involved', label: 'Involved' },
  { id: 'not_assessed', label: 'Not assessed' },
];

export const BETHESDA = [
  { id: 'I', label: 'I — Non-diagnostic' },
  { id: 'II', label: 'II — Benign' },
  { id: 'III', label: 'III — AUS' },
  { id: 'IV', label: 'IV — Follicular neoplasm' },
  { id: 'V', label: 'V — Suspicious for malignancy' },
  { id: 'VI', label: 'VI — Malignant' },
];

export const CYTO_CATEGORIES = [
  { id: 'non_diagnostic', label: 'Non-diagnostic' },
  { id: 'benign', label: 'Benign' },
  { id: 'atypical', label: 'Atypical' },
  { id: 'suspicious', label: 'Suspicious' },
  { id: 'malignant', label: 'Malignant' },
];

export const RESULT_FIELD_NAMES = {
  resultDiagnosis: 'Diagnosis', margins: 'Margins', marginMm: 'Closest margin (mm)', bethesda: 'Bethesda',
  cytologyCategory: 'Category', resultComment: 'Comment', reportDate: 'Report date', reportDocumentId: 'Report',
  status: 'Status',
};

export const labelOf = (list, id) => list.find((x) => x.id === id)?.label || id || '';
