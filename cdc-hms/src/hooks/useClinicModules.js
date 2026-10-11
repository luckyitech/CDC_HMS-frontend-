import { useEffect, useState } from 'react';
import { settingsService } from '../services/settingsService';

/**
 * Which specialist modules this clinic has switched on (7 Oct 2026).
 *
 *   const { modules, loaded } = useClinicModules();   // modules.dermatology → bool
 *
 * Fetched once per page load and shared by every caller (one request, not one
 * per component). Until it answers — or if it fails — every module reads OFF,
 * so a module never flashes on for a clinic that has not bought it.
 * System Settings calls refreshClinicModules() after a change.
 */
let cache = null;
let inflight = null;
const listeners = new Set();

const load = () => {
  if (!inflight) {
    inflight = settingsService.getModules()
      .then((res) => { cache = res?.data?.modules || {}; })
      .catch(() => { cache = cache || {}; })
      .finally(() => {
        inflight = null;
        listeners.forEach((fn) => fn(cache));
      });
  }
  return inflight;
};

export const refreshClinicModules = () => { cache = null; return load(); };

export default function useClinicModules() {
  const [modules, setModules] = useState(cache || {});
  const [loaded, setLoaded] = useState(cache !== null);
  useEffect(() => {
    const fn = (m) => { setModules(m || {}); setLoaded(true); };
    listeners.add(fn);
    if (cache === null) load();
    else fn(cache);
    return () => listeners.delete(fn);
  }, []);
  return { modules, loaded };
}
