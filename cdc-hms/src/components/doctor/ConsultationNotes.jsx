import { useState, useEffect, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import { Save, X, ChevronDown, Check, Plus } from "lucide-react";
import Button from "../shared/Button";
import RichTextField from "../shared/RichTextField";
import { useConsultationNotesContext } from "../../contexts/ConsultationNotesContext";
import consultationNotesService from "../../services/consultationNotesService";
import useClinicModules from "../../hooks/useClinicModules";
import { localToday, findThisVisitsRecord } from "../../utils/dateUtils";
import useDraft from "../../hooks/useDraft";
import { DraftStatus, DraftRestoreBanner } from "../shared/DraftStatus";
import { CONSULTATION_NOTE_INSERT } from "../../utils/consultationNoteInsert";
import { handOverLegacyPlan } from "../../utils/legacyNotesDraft";
import { renderNoteText, textToHtml, appendHtml, htmlToText, sanitizeNoteHtml } from "../../utils/noteHtml";
import {
  NOTE_SECTIONS, SECTION_GROUPS, sectionDef, sectionPosition, START_KEYS, FULL_HISTORY_KEYS, availableSections,
} from "../../constants/noteSections";

/**
 * ConsultationNotes — the "Consultation notes" module of Today's Consultation.
 *
 * 10 Oct 2026 (Emu): the Initial Assessment is gone. The note is made of
 * SECTIONS the doctor adds as they write — a fresh note opens with ONE box,
 * "Notes"; every history section is an option — Presenting complaint, History of
 * presenting illness, Past medical history, Drug history, Allergies, … (the
 * vocabulary: constants/noteSections). A "Next" row under the last section
 * offers the next ones in clinical order; "All sections" lists every one by
 * group; "+ Full history" adds the whole core set; typing "/" in any box
 * opens the same menu right there. A section always lands in its clinical
 * slot whatever order it was added in.
 *
 * Carry forward: every section except Presenting complaint, HPI and the
 * Impression opens pre-filled with the last saved copy — from the last note,
 * the patient file (allergies: anyone's entry, nurses included; comorbidities)
 * or the retired initial assessment — marked with where it came from and a
 * "Reviewed — no change" button. Drug history lists the prescriptions
 * (current / stopped); changes to those are made in Orders → Prescription.
 * Saving the Allergies section writes it back to the patient file.
 *
 * Formatting: bold / italic / underline / highlight / lists (RichTextField).
 *
 * One Save for the whole note; its own autosave draft
 * ('consultation-notes' = { sections }). An OLD draft ({ notes } or the
 * pre-10-Oct { notes, plan }) restores into the Impression section; its plan
 * text goes to the Treatment plan module (utils/legacyNotesDraft).
 *
 * Save creates or updates THIS VISIT's consultation note (this doctor, today,
 * at/after this queue row's check-in). The server keeps the plain-text
 * rendition in ConsultationNote.notes, so every older reader still works.
 *
 * Props: patient, currentUser, visitStartedAt,
 *        notesRef      — live plain text for the Admit / Refer note prefill
 *        onSavedChange(bool) — this visit has a saved note
 */

// ── section state helpers ────────────────────────────────────────────────────
// A section in state: { key, html, items: { [item]: value }, reviewed,
// carriedFromSectionId, source: { kind, label, date, by } | null }
const blank = (key) => ({ key, html: '', items: {}, reviewed: false, carriedFromSectionId: null, source: null });
const itemsToMap = (list) => Object.fromEntries((Array.isArray(list) ? list : []).filter((i) => i && i.item).map((i) => [i.item, i.value || 'yes']));
const itemsToList = (map) => Object.entries(map || {}).filter(([, v]) => v).map(([item, value]) => ({ item, value }));
const fromServer = (s) => ({ key: s.key, html: s.html || '', items: itemsToMap(s.items), reviewed: !!s.reviewed, carriedFromSectionId: s.carriedFromSectionId || null, source: s.source || null });
const byPosition = (a, b) => sectionPosition(a.key) - sectionPosition(b.key);
const hasContent = (s) => !!htmlToText(s.html) || itemsToList(s.items).length > 0;

/** The API shape (what Save sends and what the draft keeps). */
const toApi = (sections) => sections.map((s) => ({
  key: s.key, html: sanitizeNoteHtml(s.html), items: itemsToList(s.items), reviewed: !!s.reviewed, carriedFromSectionId: s.carriedFromSectionId || null, source: s.source || null,
}));
const fromDraft = (list) => (Array.isArray(list) ? list.map(fromServer).filter((s) => sectionDef(s.key)).sort(byPosition) : []);

/** A fresh section for `key`, pre-filled from the carry-forward data. */
const makeSection = (key, carry) => {
  const def = sectionDef(key);
  const s = blank(key);
  if (!def) return s;
  const c = def.carry && carry?.sections?.[key];
  if (c) {
    s.html = c.html || '';
    s.items = itemsToMap(c.items);
    s.carriedFromSectionId = c.source?.sectionId || null;
    s.source = c.source || null;
  }
  if (def.kind === 'meds' && carry?.prescriptions) {
    // the prescription list is a snapshot in the record; the free text carries
    carry.prescriptions.current.forEach((m) => { s.items[m.name] = 'current'; });
    carry.prescriptions.stopped.forEach((m) => { if (!s.items[m.name]) s.items[m.name] = 'stopped'; });
    if (!s.source && (carry.prescriptions.current.length || carry.prescriptions.stopped.length)) s.source = { kind: 'prescriptions', label: 'From prescriptions', date: carry.prescriptions.current[0]?.date || null, by: carry.prescriptions.current[0]?.by || null };
  }
  return s;
};

const fmtDate = (d) => {
  if (!d) return '';
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? String(d) : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const GROUP_TAG = {
  visit: ['This visit', 'bg-blue-50 text-blue-800'],
  bg: ['Carries forward', 'bg-amber-50 text-amber-800'],
  dm: ['Diabetes', 'bg-green-50 text-green-800'],
  derm: ['Dermatology', 'bg-purple-50 text-purple-800'],
};

const pill = (on) => `h-8 rounded-full border px-3 text-[13px] ${on ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-primary hover:text-primary'}`;

// ── the add-a-section menu (the "/" menu and "All sections") ────────────────
const SectionMenu = ({ missing, onAdd, onClose, title = 'Add a section' }) => (
  <div className="flex flex-col gap-2 rounded-lg border border-primary bg-white p-3 shadow-lg">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-primary">{title}</span>
      {onClose && <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50">Close</button>}
    </div>
    {SECTION_GROUPS.map((g) => {
      const list = missing.filter((d) => d.group === g.key);
      if (!list.length) return null;
      return (
        <div key={g.key} className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-xs text-gray-500">{g.title}</span>
          {list.map((d) => (
            <button key={d.key} type="button" onClick={() => onAdd(d.key)} className="h-8 rounded-full border border-blue-300 bg-white px-3 text-[13px] text-primary ui-hover">+ {d.label}</button>
          ))}
        </div>
      );
    })}
    {!missing.length && <p className="text-xs text-gray-500">Every section is in the note.</p>}
  </div>
);

// ── one section ──────────────────────────────────────────────────────────────
const NoteSection = ({ section, def, carry, fresh, slashOpen, missing, onChange, onRemove, onReviewed, onSlash, onCloseSlash, onAdd, fieldRef, containerRef }) => {
  const [tagLabel, tagClass] = GROUP_TAG[def.group] || GROUP_TAG.visit;
  // carried from somewhere (the source is known while the note is being
  // written; a saved note reopened later keeps only the fact)
  const carried = !!section.source || !!section.carriedFromSectionId || !!section.reviewed;
  const items = section.items || {};
  const setItems = (next) => onChange({ ...section, items: next, reviewed: false });
  const sourceLine = section.source
    ? [section.source.label, section.source.date && fmtDate(section.source.date), section.source.by].filter(Boolean).join(' · ')
    : 'Carried forward from an earlier visit';
  const meds = def.kind === 'meds' ? itemsToList(items) : [];
  const current = meds.filter((m) => m.value === 'current');
  const stopped = meds.filter((m) => m.value === 'stopped');

  return (
    <section ref={containerRef} className={`ui-surface flex flex-col gap-2.5 p-4 ${fresh ? 'border-primary' : 'border-gray-200'}`} style={{ scrollMarginTop: 96 }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h3 className="m-0 text-[15px] font-bold text-gray-900">{def.label}</h3>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tagClass}`}>{tagLabel}</span>
        </div>
        <button type="button" onClick={onRemove} aria-label={`Remove ${def.label}`} title="Remove this section from the note" className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      {carried && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <span className="text-xs text-amber-900">{sourceLine}{def.key === 'al' ? ' — saving here updates the file' : ''}</span>
          {section.reviewed
            ? <span className="flex items-center gap-1 text-xs font-semibold text-green-700"><Check className="h-3.5 w-3.5" /> Reviewed today — no change</span>
            : <button type="button" onClick={onReviewed} className="h-7 rounded-md border border-amber-500 bg-white px-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-100">Reviewed — no change</button>}
        </div>
      )}
      {!carried && def.carry && !hasContent(section) && (
        <p className="text-xs text-gray-500">Nothing recorded before. What you write here carries forward to the next visit.</p>
      )}
      {!carried && def.key === 'al' && <p className="text-xs text-gray-500">Same list as the patient file — saving here updates it.</p>}

      {def.kind === 'meds' && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-gray-700">Current — from prescriptions</p>
          {current.length
            ? current.map((m) => <div key={m.item} className="rounded-md bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900">{m.item}</div>)
            : <p className="text-xs text-gray-500">No active prescription on file.</p>}
          {stopped.length > 0 && (
            <>
              <p className="mt-1 text-xs font-semibold text-gray-700">Stopped</p>
              {stopped.map((m) => <div key={m.item} className="px-2.5 py-1 text-sm text-gray-500 line-through">{m.item}</div>)}
            </>
          )}
          <p className="text-xs text-gray-500">Change medicines in Orders → Prescription. Below: medicines from elsewhere.</p>
        </div>
      )}

      {def.kind === 'chips' && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">{def.chipsTitle}</span>
          {def.chips.map((c) => (
            <button key={c} type="button" onClick={() => setItems({ ...items, [c]: items[c] ? '' : 'yes' })} aria-pressed={!!items[c]} className={pill(!!items[c])}>{c}</button>
          ))}
        </div>
      )}

      {def.kind === 'rows' && (
        <div className="flex flex-col gap-2">
          {def.rows.map(([label, opts]) => (
            <div key={label} className="flex flex-wrap items-center gap-2">
              <span className="w-52 text-[13px] text-gray-700">{label}</span>
              {opts.map((o) => (
                <button key={o} type="button" onClick={() => setItems({ ...items, [label]: items[label] === o ? '' : o })} aria-pressed={items[label] === o} className={pill(items[label] === o)}>{o}</button>
              ))}
            </div>
          ))}
        </div>
      )}

      <RichTextField
        ref={fieldRef}
        value={section.html}
        onChange={(html) => onChange({ ...section, html, reviewed: false })}
        placeholder={`${def.placeholder || 'Write here…'}  (type / to add a section)`}
        ariaLabel={def.label}
        onSlash={onSlash}
        minHeight={def.kind === 'text' ? 84 : 56}
      />
      {slashOpen && <SectionMenu missing={missing} onAdd={onAdd} onClose={onCloseSlash} title="Add a section below" />}
      {def.key === 'dh' && carry?.file?.medications?.length > 0 && !current.length && (
        <p className="text-xs text-gray-500">Registration listed: {carry.file.medications.join('; ')}</p>
      )}
    </section>
  );
};

// ── the module ───────────────────────────────────────────────────────────────
const ConsultationNotes = ({ patient, currentUser, visitStartedAt = null, notesRef = null, onSavedChange = () => {} }) => {
  const { getNotesByPatient, addNote, updateNote } = useConsultationNotesContext();
  const { modules } = useClinicModules();

  const [sections, setSections] = useState([]);
  const [todayNote, setTodayNote] = useState(null);
  const [carry, setCarry] = useState(null);
  const [saving, setSaving] = useState(false);
  const [recordLoaded, setRecordLoaded] = useState(false);
  const [initial, setInitial] = useState([]);        // what the note opened with (the draft baseline)
  const [allOpen, setAllOpen] = useState(false);
  const [slashFor, setSlashFor] = useState(null);
  const [fresh, setFresh] = useState(null);           // the section just added (outlined, focused)
  const rootRef = useRef(null);
  const fieldRefs = useRef({});
  const boxRefs = useRef({});
  const liveSections = useRef([]);
  useEffect(() => { liveSections.current = sections; }, [sections]);

  // The Admit / Refer prefill reads the live plain text.
  useEffect(() => { if (notesRef) notesRef.current = renderNoteText(toApi(sections)); }, [sections, notesRef]);
  useEffect(() => { onSavedChange(!!todayNote); }, [todayNote, onSavedChange]);

  const available = useMemo(() => availableSections(modules), [modules]);
  const addedKeys = useMemo(() => new Set(sections.map((s) => s.key)), [sections]);
  const missing = useMemo(() => available.filter((d) => !addedKeys.has(d.key)), [available, addedKeys]);
  const next = missing.slice(0, 3);

  // ── load this visit's note + the carry-forward data ────────────────────────
  const today = localToday();
  useEffect(() => {
    if (!patient?.uhid) return undefined;
    let live = true;
    setRecordLoaded(false);
    setSections([]); setTodayNote(null); setCarry(null); setFresh(null); setSlashFor(null);
    (async () => {
      let note = null;
      let cf = null;
      try {
        const { notes } = await getNotesByPatient(patient.uhid);
        note = findThisVisitsRecord(notes, { today, doctorId: currentUser?.id, visitStartedAt });
      } catch { /* empty editor */ }
      try {
        const res = await consultationNotesService.carryForward(patient.uhid);
        cf = res?.success ? res.data : null;
      } catch { /* no pre-fill */ }
      if (!live) return;
      let start;
      if (note && Array.isArray(note.sections) && note.sections.length) {
        start = note.sections.map(fromServer).sort(byPosition);
      } else if (note) {
        start = [{ ...blank('imp'), html: textToHtml(note.notes) }];   // a note written before sections
      } else {
        start = START_KEYS.filter((k) => available.some((d) => d.key === k)).map((k) => makeSection(k, cf)).sort(byPosition);
      }
      setTodayNote(note);
      setCarry(cf);
      setSections(start);
      setInitial(toApi(start));
      setRecordLoaded(true);
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.uhid, visitStartedAt]);

  // ── autosave draft ─────────────────────────────────────────────────────────
  const draft = useDraft({
    uhid: patient?.uhid,
    formKey: "consultation-notes",
    value: { sections: toApi(sections) },
    baseline: { sections: initial },
    enabled: recordLoaded,
    onRestore: (p) => {
      if (Array.isArray(p?.sections)) { setSections(fromDraft(p.sections)); return; }
      // an old draft: { notes } or the pre-10-Oct { notes, plan } → the Notes box
      if (typeof p?.notes === 'string' && p.notes.trim()) {
        setSections((cur) => {
          const rest = cur.filter((s) => s.key !== 'imp');
          return [...rest, { ...blank('imp'), html: textToHtml(p.notes) }].sort(byPosition);
        });
      }
      handOverLegacyPlan(patient?.uhid, p?.plan);
    },
    onDiscard: () => setSections(fromDraft(initial)),
    saveNow: () => handleSave(),
    open: () => rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
  });

  // Text sent from a tool (the generated skin note) lands in Notes —
  // added after what is already there, never saved by itself.
  useEffect(() => {
    if (!recordLoaded || !patient?.uhid) return undefined;
    const onInsert = (e) => {
      if (e.detail?.uhid !== patient.uhid || !e.detail?.text) return;
      e.detail.handled = true;
      setSections((cur) => {
        const imp = cur.find((s) => s.key === 'imp') || blank('imp');
        const rest = cur.filter((s) => s.key !== 'imp');
        return [...rest, { ...imp, html: appendHtml(imp.html, e.detail.text) }].sort(byPosition);
      });
      toast.success("Added to the consultation note — read it, then Save.", { duration: 3000, position: "top-right" });
      setTimeout(() => boxRefs.current.imp?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    };
    window.addEventListener(CONSULTATION_NOTE_INSERT, onInsert);
    return () => window.removeEventListener(CONSULTATION_NOTE_INSERT, onInsert);
  }, [recordLoaded, patient?.uhid]);

  // ── sections ───────────────────────────────────────────────────────────────
  const focusSection = (key) => {
    setFresh(key);
    requestAnimationFrame(() => {
      boxRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => fieldRefs.current[key]?.focus(), 350);
    });
  };
  const addSection = (key) => {
    setSlashFor(null); setAllOpen(false);
    if (!addedKeys.has(key)) setSections((cur) => [...cur, makeSection(key, carry)].sort(byPosition));
    focusSection(key);
  };
  const addFullHistory = () => {
    setSlashFor(null); setAllOpen(false);
    const add = FULL_HISTORY_KEYS.filter((k) => !addedKeys.has(k) && available.some((d) => d.key === k));
    if (!add.length) { toast('Every history section is already in the note.', { position: 'top-right' }); return; }
    setSections((cur) => [...cur, ...add.map((k) => makeSection(k, carry))].sort(byPosition));
    focusSection(add[0]);
  };
  const changeSection = (key, nextValue) => setSections((cur) => cur.map((s) => (s.key === key ? nextValue : s)));
  const removeSection = (key) => {
    setSections((cur) => cur.filter((s) => s.key !== key));
    if (slashFor === key) setSlashFor(null);
    if (fresh === key) setFresh(null);
  };
  const markReviewed = (key) => setSections((cur) => cur.map((s) => (s.key === key ? { ...s, reviewed: true } : s)));

  // ── save ───────────────────────────────────────────────────────────────────
  // Returns true when what is typed is now in the record (the drafts
  // checklist's "Save" uses this).
  const handleSave = async () => {
    const current = liveSections.current.filter(hasContent);
    const payload = toApi(current);
    const text = renderNoteText(payload);
    if (!text.trim()) {
      toast.error("Nothing to save yet — write the consultation note first.", { duration: 3000, position: "top-right" });
      return false;
    }
    setSaving(true);
    try {
      const body = { notes: text, sections: payload.map(({ source, ...rest }) => rest) };
      let saved = null;
      if (todayNote) {
        const result = await updateNote(todayNote.id, body);
        if (!result?.success) throw new Error(result?.message || "Failed to update the consultation note.");
        saved = result.consultationNote;
      } else {
        saved = await addNote({ uhid: patient.uhid, ...body });
        if (!saved) throw new Error("Failed to save the consultation note.");
      }
      // keep where each section came from (the server does not store sources)
      const sources = Object.fromEntries(current.map((s) => [s.key, s.source]));
      const back = (saved.sections || []).map(fromServer).map((s) => ({ ...s, source: sources[s.key] || null })).sort(byPosition);
      setTodayNote(saved);
      if (back.length) { setSections(back); setInitial(toApi(back)); }
      toast.success("✅ Notes saved", { duration: 2000, position: "top-right" });
      draft.markSaved();
      return true;
    } catch (e) {
      toast.error(e.message || "Save failed. Please try again.", { duration: 3000, position: "top-right" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (!recordLoaded) {
    return <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">Loading the note…</p>;
  }

  return (
    <div className="space-y-3.5" ref={rootRef}>
      <DraftRestoreBanner draft={draft} />

      {sections.length === 0 && (
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">Add a section to start the note.</p>
      )}

      {sections.map((s) => {
        const def = sectionDef(s.key);
        if (!def) return null;
        return (
          <NoteSection
            key={s.key}
            section={s}
            def={def}
            carry={carry}
            fresh={fresh === s.key}
            slashOpen={slashFor === s.key}
            missing={missing}
            onChange={(v) => changeSection(s.key, v)}
            onRemove={() => removeSection(s.key)}
            onReviewed={() => markReviewed(s.key)}
            onSlash={() => { setAllOpen(false); setSlashFor(s.key); }}
            onCloseSlash={() => setSlashFor(null)}
            onAdd={addSection}
            fieldRef={(el) => { fieldRefs.current[s.key] = el; }}
            containerRef={(el) => { boxRefs.current[s.key] = el; }}
          />
        );
      })}

      {/* Option B (Emu, 10 Oct): the add row follows the last section */}
      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50/40 px-3.5 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-gray-700">Next</span>
          {next.map((d) => (
            <button key={d.key} type="button" onClick={() => addSection(d.key)} className="h-9 rounded-full border border-blue-300 bg-white px-3 text-[13px] font-medium text-primary ui-hover">+ {d.label}</button>
          ))}
          {!next.length && <span className="text-xs text-gray-500">Every section is in the note.</span>}
          <button type="button" onClick={() => { setSlashFor(null); setAllOpen((o) => !o); }} aria-expanded={allOpen} className="inline-flex h-9 items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 text-[13px] text-gray-700 hover:bg-gray-50">
            All sections <ChevronDown className={`h-3.5 w-3.5 transition-transform ${allOpen ? 'rotate-180' : ''}`} />
          </button>
          <button type="button" onClick={addFullHistory} className="inline-flex h-9 items-center gap-1 rounded-lg border border-primary bg-primary px-3 text-[13px] font-semibold text-white hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> Full history
          </button>
          <span className="ml-auto text-xs text-gray-500">Tip: type / in any box</span>
        </div>
        {allOpen && <SectionMenu missing={missing} onAdd={addSection} onClose={() => setAllOpen(false)} />}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <DraftStatus draft={draft} />
          <p className="text-xs text-gray-400">{todayNote ? 'Note saved this visit — saving again updates it.' : 'One Save covers every section.'}</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          <Save size={16} />
          {saving ? "Saving…" : "Save notes"}
        </Button>
      </div>
    </div>
  );
};

export default ConsultationNotes;

// Every section the note knows, for the Customise screen's description.
export const NOTE_SECTION_COUNT = NOTE_SECTIONS.length;
