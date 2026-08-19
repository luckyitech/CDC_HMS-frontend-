import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { thyroidUltrasoundService as svc } from '../services/thyroidUltrasoundService';

const ThyroidUltrasoundContext = createContext(null);
export const useThyroidUltrasound = () => {
  const ctx = useContext(ThyroidUltrasoundContext);
  if (!ctx) throw new Error('useThyroidUltrasound must be used within ThyroidUltrasoundProvider');
  return ctx;
};

export function ThyroidUltrasoundProvider({ children }) {
  const [active, setActive] = useState(null);   // { report, nodules, images, computed, permissions, versions }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);
  const pending = useRef({});

  // NOTE: services/api.js unwraps every response to `response.data` (the body),
  // so a resolved value is already `{ success, data }`. We read `.data` once.
  const refresh = useCallback(async (id) => {
    const body = await svc.getFull(id);
    setActive(body.data);
    return body.data;
  }, []);

  const openReport = useCallback(async (id) => {
    setLoading(true);
    try { return await refresh(id); }
    finally { setLoading(false); }
  }, [refresh]);

  const createReport = useCallback(async (uhid, opts = {}) => {
    const today = new Date().toISOString().slice(0, 10);   // autofill date of examination
    const body = await svc.create({ uhid, examDate: today, ...opts });
    return openReport(body.data.id);
  }, [openReport]);

  const listReports = useCallback((uhid) => svc.list(uhid).then((body) => (Array.isArray(body?.data) ? body.data : [])), []);

  // debounced report-level autosave, with an offline mirror
  const flush = useCallback(async () => {
    if (!active?.report) return;
    const id = active.report.id;
    const patch = pending.current; pending.current = {};
    if (!Object.keys(patch).length) return;
    setSaving(true);
    try {
      const body = await svc.patch(id, patch);
      setActive((s) => (s && s.report.id === id ? { ...s, report: { ...s.report, ...body.data } } : s));
    } catch (e) {
      try { localStorage.setItem(`thyroid_us_draft_${id}`, JSON.stringify({ ...(JSON.parse(localStorage.getItem(`thyroid_us_draft_${id}`) || '{}')), ...patch })); } catch { /* ignore */ }
    } finally { setSaving(false); }
  }, [active]);

  const updateReport = useCallback((patch) => {
    setActive((s) => (s ? { ...s, report: { ...s.report, ...patch } } : s));  // optimistic
    pending.current = { ...pending.current, ...patch };
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, 700);
  }, [flush]);

  // ----- nodules -----
  const addNodule = useCallback(async (nodule = {}) => {
    if (!active?.report) return;
    await svc.addNodule(active.report.id, nodule);
    return refresh(active.report.id);
  }, [active, refresh]);

  const updateNodule = useCallback(async (nid, patch) => {
    await svc.updateNodule(active.report.id, nid, patch);
    return refresh(active.report.id);
  }, [active, refresh]);

  const deleteNodule = useCallback(async (nid) => {
    await svc.deleteNodule(active.report.id, nid);
    return refresh(active.report.id);
  }, [active, refresh]);

  const saveFollicular = useCallback(async (nid, fa) => {
    await svc.upsertFollicular(active.report.id, nid, fa);
    return refresh(active.report.id);
  }, [active, refresh]);

  // ----- preview / sign / reopen -----
  const preview = useCallback(() => svc.preview(active.report.id).then((body) => body.data), [active]);
  const sign = useCallback(async (payload) => {
    const body = await svc.sign(active.report.id, payload);
    await refresh(active.report.id);
    return body;   // { success, data }
  }, [active, refresh]);
  const reopen = useCallback(async () => {
    await svc.reopen(active.report.id);
    return refresh(active.report.id);
  }, [active, refresh]);

  const setImages = useCallback(async (images) => {
    await svc.setImages(active.report.id, images);
    return refresh(active.report.id);
  }, [active, refresh]);

  const value = {
    active, loading, saving,
    openReport, createReport, listReports,
    updateReport, addNodule, updateNodule, deleteNodule, saveFollicular,
    preview, sign, reopen, setImages,
    getCatalog: (type) => svc.getCatalog(type).then((body) => (Array.isArray(body?.data) ? body.data : [])),
    addCatalog: (type, lbl) => svc.addCatalog(type, lbl).then((body) => body.data),
    close: () => setActive(null),
  };

  return <ThyroidUltrasoundContext.Provider value={value}>{children}</ThyroidUltrasoundContext.Provider>;
}

export default ThyroidUltrasoundProvider;
