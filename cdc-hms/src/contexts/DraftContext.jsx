import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import draftService from '../services/draftService';
import { DRAFT_FORMS, draftKey, draftLabel } from '../constants/draftForms';

/**
 * Autosave drafts — what the reminders read.
 *
 * One registry of "drafts I have", keyed uhid|formKey|contextKey:
 *   - every open form's useDraft hook keeps its entry current (hasDraft,
 *     updatedAt, and its own save/discard/open handlers);
 *   - the patient file seeds it from the server (loadPatient) so drafts of
 *     forms that are NOT open are known too.
 * The Complete-consultation checklist, the leave-the-file guard and the
 * patient-file chip all read draftsFor(uhid). Nothing here is shared with
 * anyone else: the server only ever returns the signed-in person's drafts.
 */
const DraftContext = createContext(null);

export const useDraftContext = () => useContext(DraftContext);

export const DraftProvider = ({ children }) => {
  const [entries, setEntries] = useState({});
  // Live handlers of mounted forms — kept out of state (functions change often).
  const handlers = useRef({});

  const upsert = useCallback((key, patch) => {
    setEntries((prev) => {
      const next = { ...(prev[key] || {}), ...patch };
      const before = prev[key];
      if (before && Object.keys(next).every((k) => next[k] === before[k])) return prev;
      return { ...prev, [key]: next };
    });
  }, []);

  const drop = useCallback((key) => {
    setEntries((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const setHandlers = useCallback((key, h) => {
    if (h) handlers.current[key] = h; else delete handlers.current[key];
  }, []);

  /** Seed the registry with this patient's server drafts (forms not open). */
  const loadPatient = useCallback(async (uhid) => {
    if (!uhid) return;
    let rows = [];
    try {
      const res = await draftService.listForPatient(uhid);
      rows = Array.isArray(res?.data) ? res.data : [];
    } catch { return; }
    setEntries((prev) => {
      const next = { ...prev };
      const seen = new Set();
      rows.forEach((d) => {
        const key = draftKey(uhid, d.formKey, d.contextKey);
        seen.add(key);
        const mine = next[key];
        // A mounted form knows better than the server snapshot.
        if (mine?.mounted) return;
        next[key] = {
          ...(mine || {}), key, uhid, formKey: d.formKey, contextKey: d.contextKey || '',
          label: d.label || draftLabel(d.formKey), hasDraft: true, updatedAt: d.updatedAt, mounted: false,
        };
      });
      Object.keys(next).forEach((key) => {
        const e = next[key];
        if (e.uhid === uhid && !e.mounted && !seen.has(key)) delete next[key];
      });
      return next;
    });
  }, []);

  /** This patient's drafts (open forms and server ones), newest first. */
  const draftsFor = useCallback((uhid, { consultationOnly = false, since = null } = {}) =>
    Object.values(entries)
      .filter((e) => e.uhid === uhid && e.hasDraft)
      .filter((e) => !consultationOnly || DRAFT_FORMS[e.formKey]?.consultation)
      .filter((e) => !since || (e.updatedAt && new Date(e.updatedAt) >= since))
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)),
  [entries]);

  /** Discard a draft whether or not its form is open. */
  const discard = useCallback(async (entry) => {
    const h = handlers.current[entry.key];
    if (h?.discard) { await h.discard(); return; }
    try { await draftService.remove(entry.uhid, entry.formKey, entry.contextKey); } catch { /* best effort */ }
    drop(entry.key);
  }, [drop]);

  /** Save to the record straight from a list — only when the open form offers it. */
  const canQuickSave = useCallback((entry) =>
    !!(DRAFT_FORMS[entry.formKey]?.quickSave && handlers.current[entry.key]?.saveNow), []);
  const quickSave = useCallback(async (entry) => {
    const h = handlers.current[entry.key];
    if (h?.saveNow) return h.saveNow();
    return false;
  }, []);
  /** Bring the form into view (its own handler), if open. */
  const open = useCallback((entry) => {
    const h = handlers.current[entry.key];
    if (h?.open) { h.open(); return true; }
    return false;
  }, []);

  const value = useMemo(() => ({
    entries, upsert, drop, setHandlers, loadPatient, draftsFor, discard, canQuickSave, quickSave, open,
  }), [entries, upsert, drop, setHandlers, loadPatient, draftsFor, discard, canQuickSave, quickSave, open]);

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
};
