// Today's Consultation — every module the screen knows (7 Oct 2026, D16;
// every section a module since 10 Oct 2026, plan M1–M9).
//
// 10 Oct 2026 (later): 'assessment' (Initial assessment) is RETIRED — its
// content became history sections inside Consultation notes
// (constants/noteSections.js). A saved layout that names it is simply ignored.
//
// The ids MUST match the backend's utils/consultationTools.js, in the same
// order (a backend test compares them). The list order is the clinic default
// (M7). Each doctor's choice — order, hidden, opens expanded — is saved on the
// server (UserPreferences 'consultation.tools') and follows them to any
// device; hooks/useToolPrefs reads and writes it.
//
//   module       shown only while the clinic has that module switched on
//   neverHidden  may be moved but never hidden (Orders: prescriptions, labs,
//                billing — M3)
//   defaultOpen  opens expanded for a doctor who has not chosen otherwise
//   drafts       autosave formKeys that belong to the module: an unsaved
//                draft shows a hidden module for this visit (M6) and opens it
//                from the drafts checklist
export const CONSULTATION_TOOLS = [
  { id: 'notes',       label: 'Consultation notes',             note: 'History sections (complaint, HPI, past medical, drugs, allergies…), formatting, voice; the generated skin note lands here', defaultOpen: true, drafts: ['consultation-notes'] },
  { id: 'exam',        label: 'Physical examination',           note: 'Structured examination, its own save', drafts: ['physical-exam'] },
  { id: 'plan',        label: 'Treatment plan',                 note: 'Attaches to the active diagnoses', drafts: ['treatment-plan'] },
  { id: 'glp1',        label: 'GLP-1 / GIP agonist monitoring', note: 'Dose schedule, reviews, side effects', drafts: ['glp1-review'] },
  { id: 'dermatology', label: 'Dermatology · skin record',      note: 'Body map, findings, photos, skin visits', module: 'dermatology', drafts: ['derm-finding', 'derm-skin-exam'] },
  { id: 'orders',      label: 'Orders',                         note: 'Prescriptions · Laboratory · Histology — can move, cannot hide', neverHidden: true, drafts: ['prescription', 'lab-request', 'histology-request'] },
];

export const TOOL_IDS = CONSULTATION_TOOLS.map((t) => t.id);
export const TOOL_PREFS_KEY = 'consultation.tools';
export const EMPTY_TOOL_PREFS = { order: [], hidden: [], open: [] };

/** The module a draft's formKey belongs to (null when none). */
export const toolForDraft = (formKey) => CONSULTATION_TOOLS.find((t) => (t.drafts || []).includes(formKey))?.id || null;

/**
 * Every module available to this doctor, in their order, hidden ones included.
 *
 * A module the doctor never placed (new to them — e.g. Notes for a doctor who
 * had only ordered GLP-1 and Dermatology before 10 Oct) keeps its default
 * slot; the modules they did place fill the remaining slots in their own
 * order. So adding a module to the clinic never shuffles anyone's layout.
 *
 * `alwaysOpen`: in the doctor's `open` list — or, for a module they never
 * placed, its `defaultOpen`.
 */
export const arrangeTools = (prefs, modules = {}) => {
  const p = prefs || EMPTY_TOOL_PREFS;
  const order = p.order || [];
  const available = CONSULTATION_TOOLS.filter((t) => !t.module || modules[t.module]);
  const placed = order.map((id) => available.find((t) => t.id === id)).filter(Boolean);
  const placedIds = new Set(placed.map((t) => t.id));
  const queue = [...placed];
  const ordered = available.map((t) => (placedIds.has(t.id) ? queue.shift() : t));
  return ordered.map((t) => ({
    ...t,
    hidden: !t.neverHidden && (p.hidden || []).includes(t.id),
    alwaysOpen: placedIds.has(t.id) || (p.open || []).includes(t.id)
      ? (p.open || []).includes(t.id)
      : !!t.defaultOpen,
  }));
};

/**
 * The prefs that say "exactly this layout" (what Customise saves). Choices
 * about a module the clinic has switched off are carried over from `prev`
 * unchanged, so switching it back on restores them.
 */
export const prefsFromTools = (tools, prev = EMPTY_TOOL_PREFS) => {
  const shownIds = new Set(tools.map((t) => t.id));
  const keep = (list) => (list || []).filter((id) => !shownIds.has(id) && TOOL_IDS.includes(id));
  return {
    order: [...tools.map((t) => t.id), ...keep(prev.order)],
    hidden: [...tools.filter((t) => t.hidden && !t.neverHidden).map((t) => t.id), ...keep(prev.hidden)],
    open: [...tools.filter((t) => t.alwaysOpen && !t.hidden).map((t) => t.id), ...keep(prev.open)],
  };
};
