import { createContext, useContext, useState, useCallback, useRef } from 'react';
import hrService from '../services/hrService';

/**
 * HR Suite (B21) — thin, lazy state for the portal pages.
 *
 * Nothing loads on mount: the provider sits in the authenticated layout for
 * every portal, and most sessions never open the HR Suite. Pages call the
 * loaders they need; results are cached here so moving Dashboard → Register →
 * Dashboard does not refetch a month of stars. `invalidate()` clears the cache
 * after a write (amend, manual entry, settings save).
 */
const HrContext = createContext(null);

export const useHrContext = () => {
  const ctx = useContext(HrContext);
  if (!ctx) throw new Error('useHrContext must be used within an HrProvider');
  return ctx;
};

export const HrProvider = ({ children }) => {
  // month 'YYYY-MM' → the /attendance/me/summary payload
  const [summaries, setSummaries] = useState({});
  const [today, setToday] = useState(null);          // HR view: /attendance/today
  const [settings, setSettings] = useState(null);    // /hr/settings
  const inFlight = useRef(new Map());

  // One request per key at a time — the dashboard polls `today` every 60 s and
  // a slow network must not stack calls.
  const once = useCallback(async (key, fn) => {
    if (inFlight.current.has(key)) return inFlight.current.get(key);
    const p = fn().finally(() => inFlight.current.delete(key));
    inFlight.current.set(key, p);
    return p;
  }, []);

  const loadSummary = useCallback(async (month, { force = false } = {}) => {
    if (!force && summaries[month]) return summaries[month];
    const res = await once(`summary:${month}`, () => hrService.mySummary(month));
    const data = res?.data || null;
    if (data) setSummaries((prev) => ({ ...prev, [month]: data }));
    return data;
  }, [summaries, once]);

  const loadToday = useCallback(async () => {
    const res = await once('today', () => hrService.today());
    const data = res?.data || null;
    if (data) setToday(data);
    return data;
  }, [once]);

  const loadSettings = useCallback(async ({ force = false } = {}) => {
    if (!force && settings) return settings;
    const res = await once('settings', () => hrService.settings());
    const data = res?.data || null;
    if (data) setSettings(data);
    return data;
  }, [settings, once]);

  const invalidate = useCallback(() => {
    setSummaries({});
    setToday(null);
    setSettings(null);
  }, []);

  return (
    <HrContext.Provider value={{ summaries, today, settings, loadSummary, loadToday, loadSettings, setSettings, invalidate }}>
      {children}
    </HrContext.Provider>
  );
};

export default HrContext;
