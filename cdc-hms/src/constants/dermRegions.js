// Dermatology body map — the regions a skin finding can sit on (7 Oct 2026).
//
// The ids MUST match the backend's utils/dermRegions.js exactly (the backend
// test dermatology.test.js compares the two lists). An id is stored on the
// record, so it is never renamed once shipped.
//
// Laterality is the PATIENT'S side. On the FRONT view the patient's right is
// on the viewer's left; on the BACK view the patient's left is on the
// viewer's left. Shapes are drawn on a 200 × 380 canvas: `r` = [x, y, w, h]
// rounded rect, `e` = [cx, cy, rx, ry] ellipse. `sensitive` sites blur their
// photos by default (Phase 2).
export const DERM_REGIONS = [
  // Front
  { id: 'f-forehead',  view: 'front', label: 'Forehead',          e: [100, 21, 16, 8] },
  { id: 'f-cheek-r',   view: 'front', label: 'Right cheek',       e: [88, 40, 8, 10] },
  { id: 'f-cheek-l',   view: 'front', label: 'Left cheek',        e: [112, 40, 8, 10] },
  { id: 'f-midface',   view: 'front', label: 'Nose, lips & chin', e: [100, 46, 5, 13] },
  { id: 'f-neck',      view: 'front', label: 'Neck (front)',      r: [90, 63, 20, 14] },
  { id: 'f-chest-r',   view: 'front', label: 'Right chest',       r: [69, 78, 31, 44] },
  { id: 'f-chest-l',   view: 'front', label: 'Left chest',        r: [100, 78, 31, 44] },
  { id: 'f-abdo',      view: 'front', label: 'Abdomen',           r: [72, 122, 56, 44] },
  { id: 'f-groin',     view: 'front', label: 'Groin & genitalia', r: [82, 166, 36, 22], sensitive: true },
  { id: 'f-uarm-r',    view: 'front', label: 'Right upper arm',   r: [47, 80, 20, 56] },
  { id: 'f-forearm-r', view: 'front', label: 'Right forearm',     r: [41, 138, 18, 52] },
  { id: 'f-hand-r',    view: 'front', label: 'Right palm',        e: [49, 203, 9, 13] },
  { id: 'f-uarm-l',    view: 'front', label: 'Left upper arm',    r: [133, 80, 20, 56] },
  { id: 'f-forearm-l', view: 'front', label: 'Left forearm',      r: [141, 138, 18, 52] },
  { id: 'f-hand-l',    view: 'front', label: 'Left palm',         e: [151, 203, 9, 13] },
  { id: 'f-thigh-r',   view: 'front', label: 'Right thigh',       r: [72, 190, 27, 70] },
  { id: 'f-thigh-l',   view: 'front', label: 'Left thigh',        r: [101, 190, 27, 70] },
  { id: 'f-knee-r',    view: 'front', label: 'Right knee',        e: [85, 268, 13, 9] },
  { id: 'f-knee-l',    view: 'front', label: 'Left knee',         e: [115, 268, 13, 9] },
  { id: 'f-leg-r',     view: 'front', label: 'Right shin',        r: [74, 278, 22, 70] },
  { id: 'f-leg-l',     view: 'front', label: 'Left shin',         r: [104, 278, 22, 70] },
  { id: 'f-foot-r',    view: 'front', label: 'Right foot (top)',  e: [85, 361, 13, 8] },
  { id: 'f-foot-l',    view: 'front', label: 'Left foot (top)',   e: [115, 361, 13, 8] },
  // Back
  { id: 'b-scalp',     view: 'back', label: 'Scalp',                 e: [100, 36, 21, 26] },
  { id: 'b-neck',      view: 'back', label: 'Neck (back)',           r: [90, 63, 20, 14] },
  { id: 'b-uback-l',   view: 'back', label: 'Left upper back',       r: [69, 78, 31, 44] },
  { id: 'b-uback-r',   view: 'back', label: 'Right upper back',      r: [100, 78, 31, 44] },
  { id: 'b-lback',     view: 'back', label: 'Lower back',            r: [72, 122, 56, 40] },
  { id: 'b-butt-l',    view: 'back', label: 'Left buttock',          r: [72, 162, 28, 30], sensitive: true },
  { id: 'b-butt-r',    view: 'back', label: 'Right buttock',         r: [100, 162, 28, 30], sensitive: true },
  { id: 'b-uarm-l',    view: 'back', label: 'Left upper arm (back)', r: [47, 80, 20, 48] },
  { id: 'b-elbow-l',   view: 'back', label: 'Left elbow',            e: [56, 134, 10, 8] },
  { id: 'b-farm-l',    view: 'back', label: 'Left forearm (back)',   r: [41, 142, 18, 48] },
  { id: 'b-hand-l',    view: 'back', label: 'Left hand (back)',      e: [49, 203, 9, 13] },
  { id: 'b-uarm-r',    view: 'back', label: 'Right upper arm (back)', r: [133, 80, 20, 48] },
  { id: 'b-elbow-r',   view: 'back', label: 'Right elbow',           e: [144, 134, 10, 8] },
  { id: 'b-farm-r',    view: 'back', label: 'Right forearm (back)',  r: [141, 142, 18, 48] },
  { id: 'b-hand-r',    view: 'back', label: 'Right hand (back)',     e: [151, 203, 9, 13] },
  { id: 'b-thigh-l',   view: 'back', label: 'Left back of thigh',    r: [72, 194, 27, 66] },
  { id: 'b-thigh-r',   view: 'back', label: 'Right back of thigh',   r: [101, 194, 27, 66] },
  { id: 'b-calf-l',    view: 'back', label: 'Left calf',             r: [74, 270, 22, 78] },
  { id: 'b-calf-r',    view: 'back', label: 'Right calf',            r: [104, 270, 22, 78] },
  { id: 'b-sole-l',    view: 'back', label: 'Left sole',             e: [85, 361, 13, 9] },
  { id: 'b-sole-r',    view: 'back', label: 'Right sole',            e: [115, 361, 13, 9] },
];

export const REGION_BY_ID = Object.fromEntries(DERM_REGIONS.map((r) => [r.id, r]));
export const regionLabel = (id) => REGION_BY_ID[id]?.label || id;

/** The centre of a region's shape, for placing a finding's number marker. */
export const regionCentre = (id) => {
  const r = REGION_BY_ID[id];
  if (!r) return null;
  return r.e ? [r.e[0], r.e[1]] : [r.r[0] + r.r[2] / 2, r.r[1] + r.r[3] / 2];
};
