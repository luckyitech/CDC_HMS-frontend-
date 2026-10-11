// Diabetes medicines by eGFR — product-label thresholds (11 Oct 2026).
// Shown on the calculator's Kidney tab against the CKD-EPI eGFR; never pasted
// into the clinical note. Sources: EU/UK SmPC, US label where stated, KDIGO
// 2022 for continuing SGLT2 inhibitors to dialysis. Reviewed at the yearly
// guideline check (GUIDELINES_CHECKED in clinicalCalculators.js).
//
// level: ok (green, no change) · mild / mod (amber, dose change or reduced
// effect) · high (red, don't start / stop / not recommended).

const CONTINUE = 'If already on, continue to dialysis (KDIGO 2022)';

const row = (name, cls, level, tag, text) => ({ name, cls, level, tag, text });

/** The nine rows for a given eGFR (mL/min/1.73 m²). */
export const renalDrugRows = (e) => [
  e >= 60 ? row('Metformin', '', 'ok', 'No change', 'Full dose, up to 3 g/day')
    : e >= 45 ? row('Metformin', '', 'mild', 'Max 2 g/day', 'Review lactic-acidosis risk factors')
      : e >= 30 ? row('Metformin', '', 'mod', 'Max 1 g/day', "Don't start in this range (US label)")
        : row('Metformin', '', 'high', 'Stop', 'Contraindicated below 30'),
  e >= 45 ? row('Dapagliflozin', 'SGLT2i', 'ok', 'No change', '10 mg (5–10 mg for glucose)')
    : e >= 25 ? row('Dapagliflozin', 'SGLT2i', 'mild', 'Organ benefit', '10 mg; little glucose lowering below 45')
      : row('Dapagliflozin', 'SGLT2i', 'high', "Don't start", CONTINUE),
  e >= 60 ? row('Empagliflozin', 'SGLT2i', 'ok', 'No change', '10–25 mg')
    : e >= 45 ? row('Empagliflozin', 'SGLT2i', 'mild', '10 mg', '10 mg once daily below 60 (EU)')
      : e >= 20 ? row('Empagliflozin', 'SGLT2i', 'mild', 'Organ benefit', '10 mg; glucose effect reduced, absent below 30')
        : row('Empagliflozin', 'SGLT2i', 'high', "Don't start", CONTINUE),
  e >= 60 ? row('Canagliflozin', 'SGLT2i', 'ok', 'No change', '100 mg, up to 300 mg')
    : e >= 30 ? row('Canagliflozin', 'SGLT2i', 'mild', '100 mg max', 'Add another agent if more glucose control is needed')
      : row('Canagliflozin', 'SGLT2i', 'high', "Don't start", 'Continue 100 mg if ACR >300 mg/g, to dialysis'),
  e >= 45 ? row('Sitagliptin', 'DPP-4i', 'ok', 'No change', '100 mg once daily')
    : e >= 30 ? row('Sitagliptin', 'DPP-4i', 'mild', '50 mg', 'Reduce to 50 mg once daily')
      : row('Sitagliptin', 'DPP-4i', 'mod', '25 mg', '25 mg once daily, including dialysis'),
  e >= 50 ? row('Vildagliptin', 'DPP-4i', 'ok', 'No change', '50 mg twice daily')
    : row('Vildagliptin', 'DPP-4i', 'mild', '50 mg od', '50 mg once daily · label uses CrCl <50, not eGFR'),
  row('Linagliptin', 'DPP-4i', 'ok', 'No change', '5 mg — no renal adjustment at any eGFR'),
  e >= 30 ? row('Semaglutide', 'GLP-1 RA', 'ok', 'No change', 'No renal adjustment')
    : e >= 15 ? row('Semaglutide', 'GLP-1 RA', 'mild', 'Caution', 'No adjustment; limited experience below 30')
      : row('Semaglutide', 'GLP-1 RA', 'high', 'Not advised', 'Not recommended in ESRD (EU/AU label)'),
  e >= 30 ? row('Tirzepatide', 'GIP/GLP-1 RA', 'ok', 'No change', 'No renal adjustment')
    : row('Tirzepatide', 'GIP/GLP-1 RA', 'mild', 'Caution', 'No adjustment; limited data — guard against dehydration'),
];
