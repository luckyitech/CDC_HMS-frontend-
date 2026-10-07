// Autosave drafts — every form that keeps a draft, by its formKey (the server
// accepts any lower-case-and-dashes key; this list is what the reminders use).
//
//   label         what the reminders, the restore banner and My drafts call it
//   consultation  part of Today's Consultation → listed by the Complete-
//                 consultation checklist
//   quickSave     the checklist may offer "Save" straight from the list (only
//                 when the form is open and registered a save). Prescriptions
//                 and lab requests never: doses and tests are checked in the
//                 form, so the checklist offers "Open" only.
export const DRAFT_FORMS = {
  'consultation-notes':  { label: 'Consultation notes & plan', consultation: true,  quickSave: true },
  'initial-assessment':  { label: 'Initial assessment',        consultation: true,  quickSave: true },
  'physical-exam':       { label: 'Physical exam',             consultation: true,  quickSave: false },
  'prescription':        { label: 'Prescription',              consultation: true,  quickSave: false },
  'lab-request':         { label: 'Lab request',               consultation: true,  quickSave: false },
  'referral-letter':     { label: 'Referral letter',           consultation: true,  quickSave: false },
  'admission-note':      { label: 'Admission note',            consultation: true,  quickSave: false },
  'doctor-instructions': { label: "Doctor's instructions",     consultation: false, quickSave: false },
  'glp1-review':         { label: 'GLP-1 review',              consultation: true,  quickSave: false },
  'ward-round':          { label: 'Ward-round note',           consultation: false, quickSave: true },
  'discharge-summary':   { label: 'Discharge summary',         consultation: false, quickSave: true },
  'neuropathy-remarks':  { label: 'Neuropathy remarks',        consultation: false, quickSave: false },
  'glucose-target':      { label: 'Glucose target rationale',  consultation: false, quickSave: false },
  'recognition-note':    { label: 'Recognition note',          consultation: false, quickSave: true },
};

export const draftLabel = (formKey, fallback) => DRAFT_FORMS[formKey]?.label || fallback || 'Draft';

/** The registry key for one draft. */
export const draftKey = (uhid, formKey, contextKey = '') => `${uhid}|${formKey}|${contextKey || ''}`;
