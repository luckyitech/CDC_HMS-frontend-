// Put text into today's consultation note from another part of Today's
// Consultation (Dermatology Phase 4, 7 Oct 2026 — the generated skin note).
//
// A window event rather than a shared context: the note editor
// (ConsultationNotes) and the tools live in different modules,
// and this keeps either side free of the other. The text is APPENDED to the
// editor and not saved — the doctor reads it there and presses Save (the
// note's autosave draft protects it meanwhile).
//
// Returns true when an open note editor for this patient took the text.
export const CONSULTATION_NOTE_INSERT = 'consultation-note:insert';

export const insertIntoConsultationNote = (uhid, text) => {
  const detail = { uhid, text, handled: false };
  window.dispatchEvent(new CustomEvent(CONSULTATION_NOTE_INSERT, { detail }));
  return detail.handled;
};

/** The editor's side: append `text` after what is already written. */
export const appendNoteText = (current, text) => {
  const before = String(current || '').replace(/\s+$/, '');
  const add = String(text || '').trim();
  if (!add) return current || '';
  return before ? `${before}\n\n${add}` : add;
};
