import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { dermService } from '../services/dermService';
import { notify } from '../utils/notify';

/**
 * DermContext — one patient's skin record while the Dermatology tool is open
 * (7 Oct 2026). Scoped to the tool, not the whole app: mount
 * <DermProvider uhid=…> around the tool; it loads the case board once and
 * refreshes it after every write.
 *
 * Every write returns the finding's full detail (timeline + trail), which is
 * kept as `detail` so the open finding updates without another request.
 * Writes reject with the API error ({ message, status, data }) after showing
 * a toast, so a form can stay open with what was typed.
 */
const DermContext = createContext(null);

export const DermProvider = ({ uhid, children }) => {
  const [board, setBoard] = useState(null);       // { today, findings, lastReview, canWrite }
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [detail, setDetail] = useState(null);     // { finding, observations, edits, today, uhid }

  const refresh = useCallback(async () => {
    if (!uhid) return;
    try {
      const res = await dermService.getBoard(uhid);
      setBoard(res.data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err?.message || 'Could not load the skin record');
    } finally {
      setLoading(false);
    }
  }, [uhid]);

  useEffect(() => { setLoading(true); setDetail(null); refresh(); }, [refresh]);

  const openFinding = useCallback(async (id) => {
    try {
      const res = await dermService.getFinding(id);
      setDetail(res.data);
      return res.data;
    } catch (err) {
      notify('error', err?.message || 'Could not open the finding');
      return null;
    }
  }, []);

  const closeFinding = useCallback(() => setDetail(null), []);

  // One wrapper for every write: toast on failure, keep the detail, refresh the board.
  const write = useCallback(async (fn, okMessage) => {
    try {
      const res = await fn();
      setDetail(res.data);
      if (okMessage) notify('success', okMessage);
      refresh();
      return res.data;
    } catch (err) {
      if (!err?.isPermissionDenied) notify('error', err?.message || 'Could not save');
      throw err;
    }
  }, [refresh]);

  const value = useMemo(() => ({
    uhid, board, loading, loadError, detail, refresh, openFinding, closeFinding,
    createFinding: (payload) => write(() => dermService.createFinding(uhid, payload), 'Finding added'),
    updateFinding: (id, changes) => write(() => dermService.updateFinding(id, changes), 'Finding updated'),
    saveToday: (id, look) => write(() => dermService.saveToday(id, look), "Today's look saved"),
    amendObservation: (id, changes) => write(() => dermService.amendObservation(id, changes), 'Entry amended'),
    findingInError: (id, reason) => write(() => dermService.findingInError(id, reason), 'Marked entered in error'),
    observationInError: (id, reason) => write(() => dermService.observationInError(id, reason), 'Marked entered in error'),
  }), [uhid, board, loading, loadError, detail, refresh, openFinding, closeFinding, write]);

  return <DermContext.Provider value={value}>{children}</DermContext.Provider>;
};

export const useDermContext = () => {
  const ctx = useContext(DermContext);
  if (!ctx) throw new Error('useDermContext must be used inside <DermProvider>');
  return ctx;
};
