// Consultation notes — the history sections a note is made of (10 Oct 2026,
// Emu: the Initial Assessment is gone; "+ section" buttons inside the note
// add Presenting complaint, Past medical history, … instead).
//
// The keys MUST match the backend's utils/noteSections.js, in the same
// clinical order (a backend test compares them). Everything else here is
// how a section looks on screen:
//
//   group     visit  this visit only — never carried forward
//             bg     background — pre-filled from the last time it was
//                    written, or from the patient file
//             dm     diabetes add-on
//             derm   dermatology add-on (shown while that module is on)
//   kind      text | chips | rows | meds
//   chips     quick-pick ticks (any number)      → items { item, value:'yes' }
//   rows      one pick per line                  → items { item, value }
//   meds      the prescription list (read-only here; changes are made in
//             Orders → Prescription) + free text for medicines from elsewhere
//   carry     pre-fills the next note
//   start     in a fresh note from the first click — ONLY Notes (Emu, 10 Oct:
//             every history section is an option, added when wanted)
export const YN = ['Yes', 'No', 'Not known'];

export const NOTE_SECTIONS = [
  { key: 'pc',   label: 'Presenting complaint',          short: 'Complaint',   group: 'visit', kind: 'chips', carry: false,
    chipsTitle: 'Quick picks',
    chips: ['Polyuria', 'Polydipsia', 'Weight loss', 'Fatigue', 'Blurred vision', 'Numbness / tingling', 'Foot ulcer', 'Hypos', 'Dizziness', 'Leg cramps'],
    placeholder: 'What brought the patient in today, in their words…' },
  { key: 'hpi',  label: 'History of presenting illness', short: 'HPI',         group: 'visit', kind: 'text',  carry: false,
    placeholder: 'Onset, duration, course, what has been tried…' },
  { key: 'ros',  label: 'Review of systems',             short: 'ROS',         group: 'visit', kind: 'chips', carry: true,
    chipsTitle: 'Positives',
    chips: ['Chest pain', 'Breathlessness', 'Palpitations', 'Abdominal pain', 'Bowel change', 'Dysuria', 'Headache', 'Joint pain', 'Low mood', 'Weight change'],
    placeholder: 'Pertinent positives and negatives…' },
  { key: 'pmh',  label: 'Past medical history',          short: 'PMH',         group: 'bg',    kind: 'text',  carry: true,
    placeholder: 'Conditions and when they were diagnosed…' },
  { key: 'psh',  label: 'Past surgical history',         short: 'PSH',         group: 'bg',    kind: 'text',  carry: true,
    placeholder: 'Operations and when…' },
  { key: 'dh',   label: 'Drug history',                  short: 'Drugs',       group: 'bg',    kind: 'meds',  carry: true,
    placeholder: 'Medicines from elsewhere — other doctors, over the counter, herbal…' },
  { key: 'al',   label: 'Allergies',                     short: 'Allergies',   group: 'bg',    kind: 'text',  carry: true,
    placeholder: 'Drug and other allergies, and the reaction…' },
  { key: 'fh',   label: 'Family history',                short: 'Family',      group: 'bg',    kind: 'chips', carry: true,
    chipsTitle: 'Quick picks',
    chips: ['Diabetes', 'Hypertension', 'Thyroid disease', 'Heart disease', 'Stroke', 'Kidney disease', 'Cancer'],
    placeholder: 'Who, and what…' },
  { key: 'sh',   label: 'Social history',                short: 'Social',      group: 'bg',    kind: 'rows',  carry: true,
    rows: [['Smoking', ['Never', 'Former', 'Current']], ['Alcohol', ['None', 'Occasional', 'Regular']], ['Diet', ['Liberal', 'Controlled', 'Diabetic', 'Low carb']], ['Exercise', ['None', 'Under 150 min/wk', '150+ min/wk']]],
    placeholder: 'Occupation, home, support at home…' },
  { key: 'gyn',  label: 'Obstetric & gynae history',     short: 'Obs & gynae', group: 'bg',    kind: 'text',  carry: true,
    placeholder: 'LMP, parity, contraception, gestational diabetes…' },
  { key: 'dm_comp', label: 'Diabetes complications screen', short: 'Complications', group: 'dm', kind: 'rows', carry: true,
    rows: [['Retinopathy', YN], ['Cerebrovascular disease', YN], ['Cardiovascular disease', YN], ['Nephropathy', YN], ['Neuropathy — peripheral', YN], ['Neuropathy — autonomic', YN]],
    placeholder: 'Details — dates, last eye check, last ACR…' },
  { key: 'derm_skin', label: 'Skin history',              short: 'Skin',        group: 'derm',  kind: 'text',  carry: true, module: 'dermatology',
    placeholder: 'First noticed, the patient’s concern, itch / pain, triggers, treatments tried…' },
  { key: 'imp',  label: 'Notes',                         short: 'Notes',       group: 'visit', kind: 'text',  carry: false, start: true,
    placeholder: 'Clinical impression, reasoning, concerns about compliance, any other observations…  (add history sections below, or type /)' },
];

export const SECTION_GROUPS = [
  { key: 'visit', title: 'This visit' },
  { key: 'bg',    title: 'Background' },
  { key: 'dm',    title: 'Diabetes' },
  { key: 'derm',  title: 'Dermatology' },
];

export const SECTION_KEYS = NOTE_SECTIONS.map((s) => s.key);
export const sectionDef = (key) => NOTE_SECTIONS.find((s) => s.key === key) || null;
export const sectionPosition = (key) => SECTION_KEYS.indexOf(key);
/** The sections a fresh note starts with. */
export const START_KEYS = NOTE_SECTIONS.filter((s) => s.start).map((s) => s.key);
/** "+ Full history": every core section (this visit + background). */
export const FULL_HISTORY_KEYS = NOTE_SECTIONS.filter((s) => s.group === 'visit' || s.group === 'bg').map((s) => s.key);

/** The sections this clinic offers (module add-ons only while the module is on). */
export const availableSections = (modules = {}) => NOTE_SECTIONS.filter((s) => !s.module || modules[s.module]);
