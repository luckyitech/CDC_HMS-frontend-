// Consultation calculator — published coefficients and point tables (11 Oct 2026).
//
// Every number here was taken from the primary paper or an official file and
// cross-checked against at least one independent implementation; the published
// worked examples are reproduced in tests/clinicalCalc.test.mjs. Change a value
// only at the yearly guideline check, and re-run the tests.
//
// Imports in the calculator modules carry the .js extension so the same files
// run under plain Node for the tests as well as under Vite.

// ---------------------------------------------------------------------------
// AHA PREVENT — base 10-year model (Khan SS et al. Circulation 2024;149:430–49).
// Logistic: risk = e^x / (1 + e^x). Terms in PREVENT_TERMS order; cholesterol
// in mmol/L. Verified against the preventr and PyPrevent packages (138 values).
// ---------------------------------------------------------------------------
export const PREVENT_TERMS = [
  'age', 'nonhdl', 'hdl', 'sbp_lt110', 'sbp_ge110', 'dm', 'smoking', 'bmi_lt30', 'bmi_ge30',
  'egfr_lt60', 'egfr_ge60', 'bptx', 'statin', 'bptx_x_sbp_ge110', 'statin_x_nonhdl',
  'age_x_nonhdl', 'age_x_hdl', 'age_x_sbp_ge110', 'age_x_dm', 'age_x_smoking', 'age_x_bmi_ge30',
  'age_x_egfr_lt60', 'constant',
];
export const PREVENT = {
  F_CVD:   [0.7939329, 0.0305239, -0.1606857, -0.2394003, 0.3600781, 0.8667604, 0.5360739, 0, 0, 0.6045917, 0.0433769, 0.3151672, -0.1477655, -0.0663612, 0.1197879, -0.0819715, 0.0306769, -0.0946348, -0.2705700, -0.0787150, 0, -0.1637806, -3.3077280],
  M_CVD:   [0.7688528, 0.0736174, -0.0954431, -0.4347345, 0.3362658, 0.7692857, 0.4386871, 0, 0, 0.5378979, 0.0164827, 0.2888790, -0.1337349, -0.0475924, 0.1502730, -0.0517874, 0.0191169, -0.1049477, -0.2251948, -0.0895067, 0, -0.1543702, -3.0311680],
  F_ASCVD: [0.7198830, 0.1176967, -0.1511850, -0.0835358, 0.3592852, 0.8348585, 0.4831078, 0, 0, 0.4864619, 0.0397779, 0.2265309, -0.0592374, -0.0395762, 0.0844423, -0.0567839, 0.0325692, -0.1035985, -0.2417542, -0.0791142, 0, -0.1671492, -3.8199750],
  M_ASCVD: [0.7099847, 0.1658663, -0.1144285, -0.2837212, 0.3239977, 0.7189597, 0.3956973, 0, 0, 0.3690075, 0.0203619, 0.2036522, -0.0865581, -0.0322916, 0.1145630, -0.0300005, 0.0232747, -0.0927024, -0.2018525, -0.0970527, 0, -0.1217081, -3.5006550],
  F_HF:    [0.8998235, 0, 0, -0.4559771, 0.3576505, 1.0383460, 0.5839160, -0.0072294, 0.2997706, 0.7451638, 0.0557087, 0.3534442, 0, -0.0981511, 0, 0, 0, -0.0946663, -0.3581041, -0.1159453, -0.0038780, -0.1884289, -4.3104090],
  M_HF:    [0.8972642, 0, 0, -0.6811466, 0.3634461, 0.9237760, 0.5023736, -0.0485841, 0.3726929, 0.6926917, 0.0251827, 0.2980922, 0, -0.0497731, 0, 0, 0, -0.1289201, -0.3040924, -0.1401688, 0.0068126, -0.1797778, -3.9463910],
};
// AHA input ranges — outside them the calculator shows no result (as the AHA tool does).
export const PREVENT_RANGES = { age: [30, 79], tcMmol: [3.36, 8.28], hdlMmol: [0.52, 2.59], sbp: [90, 200], bmi: [18.5, 39.9], egfr: [15, 140] };

// ---------------------------------------------------------------------------
// ESC SCORE2 (Eur Heart J 2021;42:2439), SCORE2-OP (2021;42:2455) and
// SCORE2-Diabetes (2023;44:2544). Fine–Gray models; uncalibrated risk
// 1 − S0^exp(LP), then recalibrated to a risk region (SCORE2_REGIONS).
// ---------------------------------------------------------------------------
// SCORE2, age 40–69: cage=(age−60)/5, smoking, csbp=(SBP−120)/20, diabetes (=0),
// ctc=TC−6, chdl=(HDL−1.3)/0.5, then cage×smoking, cage×csbp, cage×ctc, cage×chdl, cage×diabetes
export const SCORE2 = {
  M: { c: [0.3742, 0.6012, 0.2777, 0.6457, 0.1458, -0.2698, -0.0755, -0.0255, -0.0281, 0.0426, -0.0983], s0: 0.9605 },
  F: { c: [0.4648, 0.7744, 0.3131, 0.8096, 0.1002, -0.2606, -0.1088, -0.0277, -0.0226, 0.0613, -0.1272], s0: 0.9776 },
};
// SCORE2-Diabetes: cage, smoking, csbp, diabetes(=1), ctc, chdl, cage×smoking, cage×csbp,
// cage×diabetes, cage×ctc, cage×chdl, cagediab=(age at dx−50)/5, ca1c=(HbA1c mmol/mol−31)/9.34,
// cegfr=(ln eGFR−4.5)/0.15, cegfr², ca1c×cage, cegfr×cage
export const SCORE2_DIABETES = {
  M: { c: [0.5368, 0.4774, 0.1322, 0.6457, 0.1102, -0.1087, -0.0672, -0.0268, -0.0983, -0.0181, 0.0095, -0.0998, 0.0955, -0.0591, 0.0058, -0.0134, 0.0115], s0: 0.9605 },
  F: { c: [0.6624, 0.6139, 0.1421, 0.8096, 0.1127, -0.1568, -0.1122, -0.0167, -0.1272, -0.0200, 0.0186, -0.1180, 0.1173, -0.0640, 0.0062, -0.0196, 0.0169], s0: 0.9776 },
};
// SCORE2-OP, age ≥70: cage=age−73, diabetes, smoking, csbp=SBP−150 (per mmHg), ctc=TC−6,
// chdl=HDL−1.4, then cage×diabetes, cage×smoking, cage×csbp, cage×ctc, cage×chdl.
// Uncalibrated risk uses exp(LP − meanLp).
export const SCORE2_OP = {
  M: { c: [0.0634, 0.4245, 0.3524, 0.0094, 0.0850, -0.3564, -0.0174, -0.0247, -0.0005, 0.0073, 0.0091], s0: 0.7576, meanLp: 0.0929 },
  F: { c: [0.0789, 0.6010, 0.4921, 0.0102, 0.0605, -0.3040, -0.0107, -0.0255, -0.0004, -0.0009, 0.0154], s0: 0.8082, meanLp: 0.2290 },
};
// Region scales [scale1, scale2]: sex for 40–69, sex + 'O' for ≥70.
// risk = 1 − exp(−exp(scale1 + scale2 · ln(−ln(1 − uncalibrated))))
export const SCORE2_REGIONS = {
  low:   { label: 'Low',       M: [-0.5699, 0.7476], F: [-0.7380, 0.7019], MO: [-0.34, 1.19], FO: [-0.52, 1.01] },
  mod:   { label: 'Moderate',  M: [-0.1565, 0.8009], F: [-0.3143, 0.7701], MO: [0.01, 1.25],  FO: [-0.10, 1.10] },
  high:  { label: 'High',      M: [0.3207, 0.9360],  F: [0.5710, 0.9369],  MO: [0.08, 1.15],  FO: [0.38, 1.09] },
  vhigh: { label: 'Very high', M: [0.5836, 0.8294],  F: [0.9412, 0.8329],  MO: [0.05, 0.70],  FO: [0.38, 0.69] },
};

// ---------------------------------------------------------------------------
// Framingham general CVD, lipid model (D'Agostino RB et al. Circulation
// 2008;117:743–53). risk = 1 − S0^exp(ΣβX − Σβ·mean); cholesterol in mg/dL.
// [ln age, ln TC, ln HDL, ln SBP untreated, ln SBP treated, smoker, diabetes, Σβ·mean, S0]
// ---------------------------------------------------------------------------
export const FRAMINGHAM_2008 = {
  M: [3.06117, 1.12370, -0.93263, 1.93303, 1.99881, 0.65451, 0.57367, 23.9802, 0.88936],
  F: [2.32888, 1.20904, -0.70833, 2.76157, 2.82263, 0.52873, 0.69154, 26.1931, 0.95012],
};

// ---------------------------------------------------------------------------
// GRACE 1.0 in-hospital death (Granger CB et al. Arch Intern Med 2003;163:2345).
// Each band is [upper bound (exclusive), points]; the last entry catches the rest.
// ---------------------------------------------------------------------------
export const GRACE_POINTS = {
  age:        [[30, 0], [40, 8], [50, 25], [60, 41], [70, 58], [80, 75], [90, 91], [Infinity, 100]],
  heartRate:  [[50, 0], [70, 3], [90, 9], [110, 15], [150, 24], [200, 38], [Infinity, 46]],
  sbp:        [[80, 58], [100, 53], [120, 43], [140, 34], [160, 24], [200, 10], [Infinity, 0]],
  creatinineMg: [[0.4, 1], [0.8, 4], [1.2, 7], [1.6, 10], [2.0, 13], [4.0, 21], [Infinity, 28]],
  killip:     [0, 20, 39, 59],
  cardiacArrest: 39,
  stDeviation: 28,
  raisedEnzymes: 14,
};
// Score → in-hospital mortality, from the published nomogram (score ≥ key).
export const GRACE_MORTALITY = [[0, '≤0.2%'], [70, '0.3%'], [80, '0.4%'], [90, '0.6%'], [100, '0.8%'], [110, '1.1%'], [120, '1.6%'], [130, '2.1%'], [140, '2.9%'], [150, '3.9%'], [160, '5.4%'], [170, '7.3%'], [180, '9.8%'], [190, '13%'], [200, '18%'], [210, '23%'], [220, '29%'], [230, '36%'], [240, '44%'], [250, '≥52%']];

// CHA₂DS₂-VASc annual stroke rate by score, Swedish AF cohort (Friberg L et al. Eur Heart J 2012).
export const FRIBERG_STROKE_RATE = [0.2, 0.6, 2.2, 3.2, 4.8, 7.2, 9.7, 11.2, 10.8, 12.2];

// HEART score six-week MACE by band (Backus BE et al. Int J Cardiol 2013).
export const HEART_MACE = { low: '1.7%', moderate: '16.6%', high: '50.1%' };
