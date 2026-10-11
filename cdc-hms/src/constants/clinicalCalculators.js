// Consultation calculator — the registry (11 Oct 2026).
//
// One source for everything the doctor reads: each calculator's description,
// its formula in words, and its facts — headings of points where the SHORT
// LINE is what the pop-up's Notes show and the DETAIL and REFERENCES appear
// only on the fact sheet (/doctor/calculator-facts). The maths lives in
// utils/clinicalCalc.js. Nothing here is edited in the app: it changes at the
// yearly guideline check, with the date below.
export const GUIDELINES_CHECKED = { on: '11 Oct 2026', next: 'October 2027' };

// The pop-up's tabs.
export const CALCULATOR_TABS = [
  { id: 'basic', label: 'Basic', description: 'Everyday arithmetic — doses, conversions and percentages.' },
  { id: 'kidney', label: 'Kidney', description: 'eGFR estimates kidney filtration from creatinine, age and sex — CKD-EPI 2021 is the recommended adult equation (MDRD shown for comparison) — with diabetes-medicine dosing at that eGFR.' },
  { id: 'insulin', label: 'Insulin', description: 'HOMA-IR estimates fasting insulin resistance, HOMA-B β-cell function and QUICKI insulin sensitivity — all from one fasting glucose and insulin.' },
  { id: 'liver', label: 'Liver', description: 'FIB-4 uses age, AST, ALT and platelets to rule out advanced liver fibrosis in MASLD and other chronic liver disease.' },
  { id: 'cv', label: 'CV risk', description: '10-year cardiovascular risk from one set of inputs. WHO is calibrated for Kenya; the others are for comparison. Each line says what it predicts.' },
  { id: 'af', label: 'AF', description: 'CHA₂DS₂-VASc / CHA₂DS₂-VA estimate stroke risk in atrial fibrillation to guide anticoagulation; HAS-BLED estimates bleeding risk and flags what can be corrected.' },
  { id: 'chest', label: 'Chest pain', description: 'HEART: 6-week risk of a major cardiac event in undifferentiated chest pain. GRACE: risk of death in hospital in confirmed acute coronary syndrome.' },
  { id: 'pregnancy', label: 'Pregnancy', description: "Expected date of delivery and today's gestational age from the last menstrual period (Naegele's rule), with the key antenatal dates — including the 24–28-week OGTT." },
];

const P = (summary, detail = '', refs = []) => ({ summary, detail, refs: refs.map(([citation, url]) => ({ citation, url: url || '' })) });

// Facts, grouped for the fact sheet; `tab` ties each entry to its pop-up tab.
export const CALCULATOR_FACTS = [
  { id: 'ckdepi', tab: 'kidney', group: 'Kidney', name: 'eGFR — CKD-EPI 2021',
    description: 'Estimates kidney filtration from creatinine, age and sex — the recommended adult equation for CKD staging and drug dosing.',
    formula: 'eGFR = 142 × min(Scr/κ,1)^α × max(Scr/κ,1)^−1.200 × 0.9938^age × 1.012 [female]\nκ 0.7 F / 0.9 M · α −0.241 F / −0.302 M · Scr mg/dL (µmol/L ÷ 88.4)',
    headings: [
      { title: 'Using it', points: [
        P('The current recommended adult equation (KDIGO 2024, NKF-ASN 2021). More accurate than MDRD, especially above 60.', '', [['Inker LA et al. New creatinine- and cystatin C–based equations to estimate GFR without race. N Engl J Med 2021;385:1737–49.']]),
        P('Assumes a steady creatinine — not valid in AKI, when creatinine is still moving.'),
        P('Indexed to 1.73 m²; for drug dosing at extremes of body size, or where a label specifies creatinine clearance, use the label\'s method.'),
        P('Muscle mass and diet move creatinine; trimethoprim, cimetidine and dolutegravir raise it without changing GFR — cystatin C is the next test.'),
      ] },
      { title: 'Staging', points: [
        P('A G stage is not a CKD diagnosis on its own: CKD needs abnormality for more than 3 months, and full staging pairs G with albuminuria (ACR A1–A3).', '', [['KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease.']]),
        P('No race coefficient is applied; the old factors came from African-American cohorts and overestimate measured GFR in sub-Saharan African populations.'),
      ] },
    ] },
  { id: 'mdrd', tab: 'kidney', group: 'Kidney', name: 'eGFR — MDRD',
    description: 'Older creatinine equation, kept for comparison with past reports; it underestimates GFR above 60.',
    formula: 'eGFR = 175 × Scr^−1.154 × age^−0.203 × 0.742 [female]\nIDMS-traceable creatinine, mg/dL · no race factor',
    headings: [
      { title: 'Using it', points: [
        P('Derived in people with CKD — imprecise above 60, which is why many labs report ">60".', '', [['Levey AS et al. Using standardized serum creatinine values in the MDRD study equation. Ann Intern Med 2006;145:247–54.']]),
        P('The same patient can fall in a different G stage than by CKD-EPI; stage by CKD-EPI.'),
      ] },
    ] },
  { id: 'meds', tab: 'kidney', group: 'Kidney', name: 'Diabetes medicines by eGFR',
    description: 'Label thresholds for metformin, SGLT2 inhibitors, DPP-4 inhibitors, GLP-1 and GIP/GLP-1 receptor agonists at a given eGFR.',
    formula: "The CKD-EPI eGFR looked up against each product label's renal bands (EU/UK SmPC; US label where stated).",
    headings: [
      { title: 'Using it', points: [
        P('Green: no change · amber: dose change or reduced glucose effect · red: do not start, stop, or not recommended.'),
        P('SGLT2 inhibitors keep their kidney and heart benefit below 45 as glucose lowering fades; continue them to dialysis.', '', [['KDIGO 2022 Clinical Practice Guideline for Diabetes Management in Chronic Kidney Disease.']]),
      ] },
      { title: 'Pitfalls', points: [
        P("Vildagliptin's label uses Cockcroft–Gault creatinine clearance, not eGFR."),
        P('Labels change — the table is re-checked at the yearly guideline review.'),
      ] },
    ] },
  { id: 'homair', tab: 'insulin', group: 'Insulin', name: 'HOMA-IR',
    description: 'Estimates fasting (mainly hepatic) insulin resistance from one fasting glucose and insulin.',
    formula: 'HOMA-IR = fasting glucose (mmol/L) × fasting insulin (µIU/mL) ÷ 22.5\ninsulin pmol/L ÷ 6.0 = µIU/mL',
    headings: [
      { title: 'What it measures', points: [
        P('Basal, mainly hepatic, insulin resistance — not the whole-body picture a clamp gives.', '', [['Matthews DR et al. Homeostasis model assessment. Diabetologia 1985;28:412–19.']]),
        P('About 1.0 in healthy adults; cut-offs depend on the population and the insulin assay — the clinic bands are a local choice.', '', [['Wallace TM, Levy JC, Matthews DR. Use and abuse of HOMA modeling. Diabetes Care 2004;27:1487–95.']]),
      ] },
      { title: 'When not to trust it', points: [
        P('Invalid on insulin therapy — the assay measures injected insulin too.'),
        P('Insulin is secreted in pulses and single fasting samples vary; average two or three for precision.'),
        P('These are the HOMA1 equations; with marked hyperglycaemia the Oxford HOMA2 model is more accurate.'),
      ] },
    ] },
  { id: 'homab', tab: 'insulin', group: 'Insulin', name: 'HOMA-B',
    description: 'Estimates β-cell function as a percentage of a healthy reference, from the same fasting sample.',
    formula: 'HOMA-B = 20 × fasting insulin (µIU/mL) ÷ (fasting glucose mmol/L − 3.5)  [%]\nnot calculable when glucose ≤ 3.5',
    headings: [
      { title: 'Reading it', points: [
        P('Always read against HOMA-IR: 100% in a resistant patient is inadequate compensation.'),
        P('Very low HOMA-B with hyperglycaemia points to β-cell failure; C-peptide is the more robust test of insulin reserve.'),
        P('Sulphonylureas and meglitinides raise insulin secretion and inflate it.'),
      ] },
    ] },
  { id: 'quicki', tab: 'insulin', group: 'Insulin', name: 'QUICKI',
    description: 'Insulin-sensitivity index on a log scale — the same information as HOMA-IR; lower means more resistant.',
    formula: 'QUICKI = 1 ÷ [log₁₀(insulin µIU/mL) + log₁₀(glucose mg/dL)]',
    headings: [
      { title: 'Reading it', points: [
        P('Katz 2000 means: non-obese 0.366 · obese 0.331 · type 2 diabetes 0.304.', '', [['Katz A et al. Quantitative insulin sensitivity check index. J Clin Endocrinol Metab 2000;85:2402–10.']]),
        P('Adds no information beyond HOMA-IR; used mainly in research because it is better distributed.'),
      ] },
    ] },
  { id: 'fib4', tab: 'liver', group: 'Liver', name: 'FIB-4',
    description: 'Uses age, AST, ALT and platelets to rule out advanced liver fibrosis in MASLD and other chronic liver disease.',
    formula: 'FIB-4 = (age × AST) ÷ (platelets ×10⁹/L × √ALT)',
    headings: [
      { title: 'What it is for', points: [
        P('A rule-out test for advanced fibrosis (F3–F4) from routine bloods. A low score reliably excludes it; a high score is less specific.',
          'FIB-4 was derived in people with HIV/hepatitis C co-infection and later validated in fatty liver disease. In that setting a score below 1.30 rules out advanced fibrosis with a negative predictive value of about 90%, so most low-scoring patients need no further liver test. A score above 2.67 has a positive predictive value of about 80% — high enough to act on, but a second-line test still confirms it.',
          [['Sterling RK et al. Development of a simple noninvasive index to predict significant fibrosis. Hepatology 2006;43:1317–25.'], ['Shah AG et al. Comparison of noninvasive markers of fibrosis in NAFLD. Clin Gastroenterol Hepatol 2009;7:1104–12.']]),
        P('ADA Standards of Care recommend FIB-4 to screen adults with type 2 diabetes or prediabetes for MASLD-related fibrosis.',
          'People with type 2 diabetes carry the highest risk of fibrosis progressing silently, often with normal liver enzymes. The ADA therefore recommends checking FIB-4 even when ALT is normal, particularly with obesity or other cardiometabolic risk factors, and repeating it periodically.',
          [['American Diabetes Association. Standards of Care in Diabetes, section 4: Comprehensive medical evaluation and assessment of comorbidities.']]),
        P('Indeterminate or high scores go to a second-line test — elastography (FibroScan) or ELF.',
          'Vibration-controlled transient elastography measures liver stiffness; below about 8 kPa advanced fibrosis is unlikely. Where elastography is not available, the blood-based ELF test is the alternative. High-risk results warrant hepatology referral.',
          [['Rinella ME et al. AASLD Practice Guidance on the clinical assessment and management of NAFLD. Hepatology 2023.']]),
      ] },
      { title: 'When it misleads', points: [
        P('Age drives the score up: hence the lower 2.0 cut-off from 65. Under 35 it is not validated.',
          'Because age is in the numerator, specificity falls sharply in older patients — many over 65 score above 1.30 without significant fibrosis. Using 2.0 as the lower cut-off from 65 restores specificity. Below 35 the test performs poorly and is not recommended.',
          [['McPherson S et al. Age as a confounding factor for the accurate non-invasive diagnosis of advanced NAFLD fibrosis. Am J Gastroenterol 2017;112:740–51.']]),
        P('Low platelets from another cause, and AST from muscle or haemolysis, raise it.',
          'Thrombocytopenia from ITP, marrow disease or non-hepatic hypersplenism, and AST released by muscle injury, strenuous exercise or haemolysis, all push the score up without any liver fibrosis.'),
        P('Not for acute hepatitis or an ALT flare — it is built for chronic, stable disease.'),
      ] },
    ] },
  { id: 'who', tab: 'cv', group: 'Cardiovascular risk', name: 'WHO CVD risk (2019)',
    description: 'WHO 2019 chart: 10-year risk of fatal or non-fatal heart attack or stroke, calibrated for Eastern Sub-Saharan Africa, including Kenya.',
    formula: 'Lookup in the official Eastern Sub-Saharan Africa laboratory chart:\nsex × diabetes × smoking × age band × SBP band × total-cholesterol band',
    headings: [
      { title: 'Which one to trust', points: [
        P('WHO 2019 is the only score here calibrated for Eastern Sub-Saharan Africa, which includes Kenya. Use it as the headline.', '', [['WHO CVD Risk Chart Working Group. World Health Organization cardiovascular disease risk charts. Lancet Glob Health 2019;7:e1332–45.']]),
        P('PREVENT, SCORE2 and Framingham were built in the US and Europe; the same patient can differ several-fold between them — they are for comparison and for guidelines that name them.'),
        P('They predict different things: WHO and SCORE2 count heart attack and stroke; PREVENT-CVD and Framingham add heart failure.'),
        P('None of them applies after a cardiovascular event — those patients are already high risk.'),
      ] },
      { title: 'Inputs', points: [
        P("SBP and BMI come from today's triage and eGFR from the Kidney tab; lipids are typed from the latest result."),
        P('Ages 40–74 only; no HDL, kidney function or treatment terms. If an input is outside a model\'s range, that model shows no result rather than a misleading one.'),
      ] },
    ] },
  { id: 'prevent', tab: 'cv', group: 'Cardiovascular risk', name: 'PREVENT — CVD · ASCVD · HF',
    description: 'AHA 2023: 10-year risk of total CVD, atherosclerotic CVD and heart failure in adults 30–79 without CVD; includes kidney function.',
    formula: 'risk = eˣ ÷ (1 + eˣ), x = constant + Σβ·term\nage, non-HDL, HDL, SBP (piecewise), diabetes, smoking, BMI (HF), eGFR (piecewise), BP treatment, statin, interactions',
    headings: [
      { title: 'Reading it', points: [
        P('Built in US cohorts — not calibrated for Kenya; shown for comparison.', '', [["Khan SS et al. Development and validation of the American Heart Association's PREVENT equations. Circulation 2024;149:430–49."]]),
        P('Predicts lower risk than the older Pooled Cohort Equations; the bands shown are provisional.'),
        P('The deprivation add-on uses US ZIP codes and cannot be used here.'),
      ] },
    ] },
  { id: 'score2', tab: 'cv', group: 'Cardiovascular risk', name: 'SCORE2 · SCORE2-OP · SCORE2-Diabetes',
    description: 'ESC: 10-year risk of fatal and non-fatal CVD — SCORE2 (40–69), SCORE2-OP (70+), SCORE2-Diabetes (type 2 diabetes, 40–69).',
    formula: 'uncalibrated risk = 1 − S0^exp(LP), then recalibrated to a European risk region\n1 − exp(−exp(s1 + s2·ln(−ln(1 − risk))))',
    headings: [
      { title: 'Reading it', points: [
        P('The calculator picks the right model: SCORE2-Diabetes for type 2 diabetes aged 40–69, SCORE2-OP from 70, otherwise SCORE2.', '', [['SCORE2 working group and ESC Cardiovascular risk collaboration. Eur Heart J 2021;42:2439–54.'], ['SCORE2-Diabetes working group. Eur Heart J 2023;44:2544–56.']]),
        P('Kenya has no ESC risk region; the chosen region changes the result several-fold.'),
      ] },
    ] },
  { id: 'fram', tab: 'cv', group: 'Cardiovascular risk', name: 'Framingham 2008',
    description: 'Framingham general CVD profile: 10-year risk of coronary, cerebrovascular and peripheral arterial disease and heart failure.',
    formula: 'risk = 1 − S0^exp(ΣβX − Σβ·mean)\nln age, ln TC, ln HDL, ln SBP (treated or untreated), smoking, diabetes',
    headings: [
      { title: 'Reading it', points: [
        P('A historical reference from a mainly white US cohort; it often overestimates risk elsewhere.', '', [["D'Agostino RB et al. General cardiovascular risk profile for use in primary care. Circulation 2008;117:743–53."]]),
      ] },
    ] },
  { id: 'chads', tab: 'af', group: 'Atrial fibrillation', name: 'CHA₂DS₂-VASc / CHA₂DS₂-VA',
    description: 'Stroke risk in atrial fibrillation, used to decide on anticoagulation.',
    formula: 'CHF 1 · Hypertension 1 · Age ≥75 2 · Diabetes 1 · Stroke/TIA/TE 2 · Vascular disease 1 · Age 65–74 1 · [Female 1 — VASc only]',
    headings: [
      { title: 'Stroke risk', points: [
        P('ESC 2024 uses CHA₂DS₂-VA (sex removed): anticoagulation recommended at ≥2, considered at 1.', '', [['2024 ESC Guidelines for the management of atrial fibrillation. Eur Heart J 2024;45:3314–414.']]),
        P('ACC/AHA 2023 keeps CHA₂DS₂-VASc: recommended at ≥2 in men and ≥3 in women; reasonable at 1 in men and 2 in women.', '', [['2023 ACC/AHA/ACCP/HRS Guideline for the diagnosis and management of atrial fibrillation. Circulation 2024;149:e1–156.']]),
        P('Annual stroke rates shown come from the Swedish AF cohort.', '', [['Friberg L et al. Evaluation of risk stratification schemes for ischaemic stroke and bleeding in 182 678 patients with atrial fibrillation. Eur Heart J 2012;33:1500–10.']]),
        P('Not for valvular AF — a mechanical valve or moderate-to-severe mitral stenosis.'),
      ] },
    ] },
  { id: 'hasbled', tab: 'af', group: 'Atrial fibrillation', name: 'HAS-BLED',
    description: 'Bleeding risk on anticoagulation in AF — highlights modifiable risk factors; not on its own a reason to withhold anticoagulation.',
    formula: 'Uncontrolled hypertension · abnormal renal · abnormal liver · stroke · bleeding · labile INR · elderly >65 · drugs · alcohol — 1 point each',
    headings: [
      { title: 'Bleeding risk', points: [
        P('≥3 means high bleeding risk: review more often and correct what can be corrected — blood pressure, labile INR, antiplatelets or NSAIDs, alcohol.', '', [['Pisters R et al. A novel user-friendly score (HAS-BLED). Chest 2010;138:1093–1100.']]),
        P('A high score is not on its own a reason to withhold anticoagulation (ESC 2024, ACC/AHA 2023).'),
        P('Labile INR scores 0 if the patient is not on warfarin.'),
      ] },
    ] },
  { id: 'heart', tab: 'chest', group: 'Chest pain and ACS', name: 'HEART score',
    description: '6-week risk of a major cardiac event in undifferentiated chest pain — supports early discharge or admission.',
    formula: 'History 0–2 · ECG 0–2 · Age 0–2 · Risk factors 0–2 · Troponin 0–2',
    headings: [
      { title: 'HEART', points: [
        P('For undifferentiated chest pain, using the first conventional troponin.'),
        P('0–3: 1.7% six-week MACE — candidates for early discharge · 4–6: 16.6% · 7–10: 50.1%.', '', [['Backus BE et al. A prospective validation of the HEART score for chest pain patients at the emergency department. Int J Cardiol 2013;168:2153–8.']]),
        P('Not for an obvious STEMI or a clear non-cardiac cause.'),
      ] },
    ] },
  { id: 'grace', tab: 'chest', group: 'Chest pain and ACS', name: 'GRACE',
    description: 'Death risk in acute coronary syndrome, in hospital and at 6 months — guides the urgency of an invasive strategy.',
    formula: 'GRACE 1.0 points: age · heart rate · SBP · creatinine · Killip class · cardiac arrest · ST deviation · raised enzymes',
    headings: [
      { title: 'GRACE', points: [
        P('For confirmed ACS; this is GRACE 1.0 (the 2003 nomogram) — GRACE 2.0 uses spline coefficients that are not openly published.', '', [['Granger CB et al. Predictors of hospital mortality in the Global Registry of Acute Coronary Events. Arch Intern Med 2003;163:2345–53.']]),
        P('NSTE-ACS with GRACE >140 is high risk — early invasive angiography within 24 hours.', '', [['2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720–826.']]),
        P('Creatinine is entered in µmol/L and converted (÷ 88.4).'),
      ] },
    ] },
  { id: 'edd', tab: 'pregnancy', group: 'Pregnancy', name: 'Expected date of delivery',
    description: "EDD and gestational age from the last menstrual period (Naegele's rule), with the key antenatal dates.",
    formula: 'adjusted LMP = LMP + (cycle length − 28) days\nEDD = adjusted LMP + 280 days · GA = today − adjusted LMP',
    headings: [
      { title: 'How it is worked out', points: [
        P("Naegele's rule: EDD = first day of the LMP + 280 days, adjusted for cycle length; gestational age uses the same adjustment, so 40⁺⁰ weeks lands on the EDD."),
        P('Only about 4–5% of babies arrive on the EDD; most between 37 and 42 weeks.'),
        P('The key dates (scans, aspirin start, OGTT, planned birth in diabetes) are counted from the same adjusted LMP.', '', [['NICE NG3 Diabetes in pregnancy: management from preconception to the postnatal period.'], ['NICE NG133 Hypertension in pregnancy: diagnosis and management.']]),
      ] },
      { title: 'When not to rely on it', points: [
        P('A first-trimester scan replaces LMP dating if they differ by more than 5 days before 9 weeks, or more than 7 days at 9⁺⁰–13⁺⁶ weeks.', '', [['ACOG Committee Opinion No. 700: Methods for estimating the due date. Obstet Gynecol 2017;129:e150–4.']]),
        P('Once a pregnancy is dated by scan, that EDD should not be changed by later scans.'),
        P('Irregular cycles, recent hormonal contraception, breastfeeding or IVF: date by scan or transfer date.'),
      ] },
    ] },
];

export const factsForTab = (tabId) => CALCULATOR_FACTS.filter((f) => f.tab === tabId);
export const factById = (id) => CALCULATOR_FACTS.find((f) => f.id === id);
/** Fact-sheet navigation: the groups in order, each with its entries. */
export const factGroups = () => CALCULATOR_FACTS.reduce((groups, f) => {
  const g = groups.find((x) => x.title === f.group);
  if (g) g.items.push(f); else groups.push({ title: f.group, items: [f] });
  return groups;
}, []);
