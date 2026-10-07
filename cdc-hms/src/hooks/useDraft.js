import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import draftService from '../services/draftService';
import { useDraftContext } from '../contexts/DraftContext';
import { draftKey, draftLabel } from '../constants/draftForms';
import { deviceLabel } from '../utils/draftDevice';

/**
 * useDraft — autosave for ONE form (6 Oct 2026). The single place drafts are
 * saved, restored and cleared; every form uses this hook, never its own copy.
 *
 *   const draft = useDraft({
 *     uhid, formKey: 'consultation-notes', contextKey: '',  // which draft
 *     value: { notes, plan },      // the form's state (anything JSON)
 *     baseline: { notes: saved },  // what is already in the record ('' when new)
 *     enabled: isEditable,         // false = do nothing (view mode, modal closed)
 *     onRestore: (p) => {...},     // put a found draft back into the form
 *     onDiscard: () => {...},      // reset the form when the doctor discards
 *     saveNow, open,               // optional: let the reminders Save / Open it
 *   });
 *   …after the REAL save succeeds:  draft.markSaved();
 *   render: <DraftStatus draft={draft} />  and  <DraftRestoreBanner draft={draft} />
 *
 * Behaviour:
 *   - On enable it loads my draft from the server (and any copy this device
 *     kept while offline — the newer wins) and hands it to onRestore. The
 *     banner then offers Keep / Discard.
 *   - While the doctor types it saves ~2 s after they pause (never more often
 *     than every 5 s). Matching the record again, or emptying the form,
 *     removes the draft.
 *   - Opening a draft does NOT re-save it, so looking at an old draft never
 *     resets its 14-day clock.
 *   - If the server can't be reached the draft is kept in this browser and sent
 *     when the connection returns. Leaving the page flushes a pending save.
 *
 * RULE for every form: pass `enabled` only once the form has finished loading
 * its own saved record. A form that loads AFTER the draft was restored would
 * overwrite it with the record — which looks like "back to the record" and
 * removes the draft.
 */

const DEBOUNCE_MS = 2000;
const MIN_GAP_MS = 5000;
const RETRY_MS = 30000;

const isBlank = (v) => {
  if (v == null || v === false) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (typeof v === 'number') return false;
  if (Array.isArray(v)) return v.every(isBlank);
  if (typeof v === 'object') return Object.values(v).every(isBlank);
  return false;
};

const ser = (v) => { try { return JSON.stringify(v ?? null); } catch { return 'null'; } };

const currentUserId = () => {
  try { return JSON.parse(sessionStorage.getItem('currentUser') || 'null')?.id || 'anon'; } catch { return 'anon'; }
};
const localKey = (uhid, formKey, contextKey) => `cdc-draft:${currentUserId()}:${draftKey(uhid, formKey, contextKey)}`;
const readLocal = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const writeLocal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const clearLocal = (k) => { try { localStorage.removeItem(k); } catch { /* noop */ } };

export default function useDraft({
  uhid, formKey, contextKey = '', label, value, baseline, enabled = true,
  isEmpty = isBlank, onRestore, onDiscard, saveNow, open,
}) {
  const ctx = useDraftContext();
  const key = draftKey(uhid, formKey, contextKey);
  const lk = useMemo(() => localKey(uhid, formKey, contextKey), [uhid, formKey, contextKey]);
  const name = label || draftLabel(formKey);
  const active = !!(enabled && uhid && formKey);

  // status: idle | loading | clean | pending | saving | draft | offline | local | recorded
  const [status, setStatus] = useState('idle');
  const [savedAt, setSavedAt] = useState(null);       // last time the DRAFT was saved
  const [recordedAt, setRecordedAt] = useState(null); // last real save (markSaved)
  const [restored, setRestored] = useState(null);     // { updatedAt, device } while the banner shows
  const [hasDraft, setHasDraft] = useState(false);

  const valueSer = ser(value);
  const baselineSer = ser(baseline === undefined ? null : baseline);

  // Refs the timers read (always current).
  const r = useRef({});
  // Only while active: a form switching to another mode (editing an existing
  // record, a closed modal) must never have THAT state saved as this draft.
  if (active) {
    r.current.value = value;
    r.current.valueSer = valueSer;
  }
  r.current.baselineSer = baseline === undefined ? r.current.baselineSer : baselineSer;
  r.current.onRestore = onRestore;
  r.current.onDiscard = onDiscard;
  r.current.isEmpty = isEmpty;
  const loaded = useRef(false);
  const lastSent = useRef(null);     // serialized payload the server (or local copy) holds
  const lastSaveAt = useRef(0);
  const timer = useRef(null);
  const retry = useRef(null);
  const inFlight = useRef(null);

  const clearTimers = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (retry.current) { clearTimeout(retry.current); retry.current = null; }
  };

  // ── Save / remove ─────────────────────────────────────────────────────────
  const pushNow = useCallback(async () => {
    clearTimers();
    const snapshot = r.current.valueSer;
    const payload = r.current.value;
    if (snapshot === lastSent.current) return true;
    setStatus('saving');
    const now = new Date().toISOString();
    const job = draftService.save({ uhid, formKey, contextKey, label: name, device: deviceLabel(), payload })
      .then((res) => {
        lastSent.current = snapshot;
        lastSaveAt.current = Date.now();
        clearLocal(lk);
        setSavedAt(res?.data?.updatedAt || now);
        setHasDraft(true);
        // Typed more while saving? the change effect schedules the next save.
        setStatus(r.current.valueSer === snapshot ? 'draft' : 'pending');
        return true;
      })
      .catch((err) => {
        const tooLarge = err?.status === 413 || err?.data?.code === 'TOO_LARGE';
        writeLocal(lk, { payload, updatedAt: now, device: deviceLabel() });
        lastSent.current = snapshot;
        setSavedAt(now);
        setHasDraft(true);
        setStatus(tooLarge ? 'local' : 'offline');
        if (!tooLarge) {
          retry.current = setTimeout(() => { lastSent.current = null; pushNow(); }, RETRY_MS);
        }
        return false;
      })
      .finally(() => { if (inFlight.current === job) inFlight.current = null; });
    inFlight.current = job;
    return job;
  }, [uhid, formKey, contextKey, name, lk]);

  const removeNow = useCallback(async () => {
    clearTimers();
    clearLocal(lk);
    lastSent.current = r.current.baselineSer;
    setHasDraft(false);
    try { await draftService.remove(uhid, formKey, contextKey); } catch { /* the sweep tidies anything left */ }
  }, [uhid, formKey, contextKey, lk]);

  // ── Load (and restore) when enabled ────────────────────────────────────────
  useEffect(() => {
    if (!active) { loaded.current = false; setStatus('idle'); return undefined; }
    let live = true;
    loaded.current = false;
    setStatus('loading');
    setRestored(null);
    (async () => {
      let server = null;
      try {
        const res = await draftService.listForPatient(uhid, { formKey, contextKey });
        server = Array.isArray(res?.data) ? res.data[0] || null : null;
      } catch { /* offline — local copy only */ }
      if (!live) return;
      const local = readLocal(lk);
      const pick = local && (!server || new Date(local.updatedAt) > new Date(server.updatedAt)) ? { ...local, isLocal: true } : server;
      if (pick && !r.current.isEmpty(pick.payload) && ser(pick.payload) !== r.current.baselineSer) {
        lastSent.current = pick.isLocal ? null : ser(pick.payload); // a local-only copy still needs sending
        setHasDraft(true);
        setSavedAt(pick.updatedAt);
        setRestored({ updatedAt: pick.updatedAt, device: pick.device || null });
        if (ser(pick.payload) !== r.current.valueSer) r.current.onRestore?.(pick.payload);
        setStatus(pick.isLocal ? 'offline' : 'draft');
      } else {
        // Nothing worth restoring (or it equals the record) — tidy any leftover.
        if (server || local) { clearLocal(lk); draftService.remove(uhid, formKey, contextKey).catch(() => {}); }
        lastSent.current = r.current.valueSer;
        setHasDraft(false);
        setStatus('clean');
      }
      loaded.current = true;
      if (pick?.isLocal) pushNow();
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, uhid, formKey, contextKey]);

  // ── Autosave on change ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!active || !loaded.current) return;
    if (r.current.isEmpty(value) || valueSer === r.current.baselineSer) {
      // Back to the record (or emptied): nothing to keep.
      if (hasDraft) { removeNow(); setRestored(null); }
      lastSent.current = valueSer;
      setStatus((s) => (s === 'recorded' ? s : 'clean'));
      return;
    }
    if (valueSer === lastSent.current) return;
    setStatus((s) => (s === 'saving' ? s : 'pending'));
    setRestored(null); // typing on = keeping the restored draft
    if (timer.current) clearTimeout(timer.current);
    const gap = Math.max(DEBOUNCE_MS, MIN_GAP_MS - (Date.now() - lastSaveAt.current));
    timer.current = setTimeout(() => { timer.current = null; pushNow(); }, gap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueSer, baselineSer, active]);

  // ── Flush on leave ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return undefined;
    const keepLocal = () => {
      if (!loaded.current || !timer.current) return;
      // Synchronous safety copy; it is sent the next time this form opens.
      writeLocal(lk, { payload: r.current.value, updatedAt: new Date().toISOString(), device: deviceLabel() });
    };
    const onOnline = () => { if (retry.current) { clearTimeout(retry.current); retry.current = null; lastSent.current = null; pushNow(); } };
    window.addEventListener('pagehide', keepLocal);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('pagehide', keepLocal);
      window.removeEventListener('online', onOnline);
      // Unmounting (closing a modal, leaving the file) with a save pending: send it now.
      if (timer.current) { clearTimeout(timer.current); timer.current = null; keepLocal(); pushNow(); }
      if (retry.current) { clearTimeout(retry.current); retry.current = null; }
    };
  }, [active, lk, pushNow]);

  // ── Public actions ──────────────────────────────────────────────────────────
  /** Call after the REAL save succeeded: the draft is no longer needed. */
  const markSaved = useCallback(async () => {
    clearTimers();
    // Whatever is on screen now is what was saved.
    r.current.baselineSer = r.current.valueSer;
    lastSent.current = r.current.valueSer;
    setRestored(null);
    setRecordedAt(new Date().toISOString());
    setStatus('recorded');
    if (inFlight.current) { try { await inFlight.current; } catch { /* noop */ } }
    await removeNow();
    lastSent.current = r.current.valueSer;
  }, [removeNow]);

  /** Throw the draft away and reset the form (onDiscard). */
  const discard = useCallback(async () => {
    clearTimers();
    setRestored(null);
    if (inFlight.current) { try { await inFlight.current; } catch { /* noop */ } }
    await removeNow();
    r.current.onDiscard?.();
    setStatus('clean');
  }, [removeNow]);

  const keep = useCallback(() => setRestored(null), []);

  // ── Registry (reminders) ────────────────────────────────────────────────────
  const saveNowRef = useRef(saveNow);
  saveNowRef.current = saveNow;
  const openRef = useRef(open);
  openRef.current = open;
  // Only the registry's STABLE functions are used here — depending on the
  // context value itself would re-run these on every registry change (a loop).
  const regUpsert = ctx?.upsert;
  const regDrop = ctx?.drop;
  const regHandlers = ctx?.setHandlers;
  const hasSave = !!saveNow;
  const hasOpen = !!open;
  useEffect(() => {
    if (!regHandlers || !active) return undefined;
    regHandlers(key, {
      discard,
      saveNow: hasSave ? () => saveNowRef.current?.() : null,
      open: hasOpen ? () => openRef.current?.() : null,
    });
    return () => {
      regHandlers(key, null);
      // Closed form: the entry stays only while a draft is left behind.
      regUpsert(key, { mounted: false });
    };
  }, [regHandlers, regUpsert, key, active, discard, hasSave, hasOpen]);

  useEffect(() => {
    if (!regUpsert || !uhid) return;
    if (!active && !hasDraft) return;
    if (hasDraft) {
      regUpsert(key, {
        key, uhid, formKey, contextKey: contextKey || '', label: name, hasDraft: true,
        updatedAt: savedAt || new Date().toISOString(), mounted: active,
      });
    } else {
      regDrop(key);
    }
  }, [regUpsert, regDrop, key, uhid, formKey, contextKey, name, hasDraft, savedAt, active]);

  return {
    status, savedAt, recordedAt, restored, hasDraft, label: name,
    markSaved, discard, keep, flush: pushNow,
  };
}
