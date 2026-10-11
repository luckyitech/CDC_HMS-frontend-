import { useCallback, useEffect, useState } from 'react';
import { preferenceService } from '../services/preferenceService';
import { EMPTY_TOOL_PREFS, TOOL_PREFS_KEY } from '../constants/consultationTools';
import { notify } from '../utils/notify';

/**
 * This doctor's choice of Today's Consultation tools (7 Oct 2026, D16):
 * order, hidden, and which open by themselves. Saved on the server, so it
 * follows them to any device.
 *
 *   const { prefs, loaded, save } = useToolPrefs();
 *   save({ ...prefs, open: [...prefs.open, 'dermatology'] });
 *
 * `save` updates the screen at once and puts it back if the server refuses.
 * Cached per signed-in user for the page's life (one request, not one per
 * patient opened), so a second person signing in on the same tab never sees
 * the first person's layout.
 */
const cache = new Map();   // userId → prefs

const currentUserId = () => {
  try { return JSON.parse(sessionStorage.getItem('currentUser') || 'null')?.id ?? 'anon'; } catch { return 'anon'; }
};

export default function useToolPrefs() {
  const userId = currentUserId();
  const [prefs, setPrefs] = useState(() => cache.get(userId) || EMPTY_TOOL_PREFS);
  const [loaded, setLoaded] = useState(() => cache.has(userId));

  useEffect(() => {
    if (cache.has(userId)) { setPrefs(cache.get(userId)); setLoaded(true); return undefined; }
    let alive = true;
    preferenceService.getAll()
      .then((res) => { cache.set(userId, res?.data?.[TOOL_PREFS_KEY] || EMPTY_TOOL_PREFS); })
      .catch(() => { cache.set(userId, EMPTY_TOOL_PREFS); })
      .finally(() => { if (alive) { setPrefs(cache.get(userId)); setLoaded(true); } });
    return () => { alive = false; };
  }, [userId]);

  const save = useCallback(async (next) => {
    const before = cache.get(userId) || EMPTY_TOOL_PREFS;
    cache.set(userId, next);
    setPrefs(next);
    try {
      const res = await preferenceService.save(TOOL_PREFS_KEY, next);
      const stored = res?.data?.value || next;
      cache.set(userId, stored);
      setPrefs(stored);
    } catch (err) {
      cache.set(userId, before);
      setPrefs(before);
      if (!err?.isPermissionDenied) notify('error', err?.message || 'Could not save your tool choice');
    }
  }, [userId]);

  return { prefs, loaded, save };
}
