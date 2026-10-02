import { useEffect, useState } from 'react';
import staffService from '../../../services/staffService';
import hrSelfService from '../../../services/hrSelfService';
import { STAFF_PHOTO_CHANGED, photoKey } from './staffPhoto';

/**
 * A staff member's photo, or their initials (2 Oct 2026). The photo lives
 * behind a login, so an <img src> can't reach it — it is fetched as a blob
 * (with the session's token) and shown from an object URL. One fetch per
 * person per page load (cached below); a change anywhere re-fetches through
 * the STAFF_PHOTO_CHANGED event.
 *
 * props:
 *   self        the signed-in person (GET /api/hr/me/photo) — the sidebar
 *   employeeId  someone's staff file (GET /api/staff/:employeeId/photo)
 *   hasPhoto    from the staff record; false skips the fetch (unknown → try)
 *   name        for the initials and the alt text
 *   className   size + shape + fallback colours
 */
const cache = new Map();   // key → Promise<string|null>

const load = (key, self, employeeId) => {
  if (!cache.has(key)) {
    const req = self ? hrSelfService.photo() : staffService.getPhoto(employeeId);
    cache.set(key, req.then((blob) => (blob instanceof Blob && blob.size ? URL.createObjectURL(blob) : null)).catch(() => null));
  }
  return cache.get(key);
};

const initialsOf = (name) => (String(name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('') || '?').toUpperCase();

const StaffAvatar = ({ self = false, employeeId = null, hasPhoto, name, className = 'w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-white text-sm font-bold' }) => {
  const key = photoKey({ self, employeeId });
  const [url, setUrl] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onChange = (e) => {
      if (!e.detail || e.detail.key === key || e.detail.key === 'self' || key === 'self') {
        const old = cache.get(key);
        cache.delete(key);
        old?.then((u) => u && URL.revokeObjectURL(u));
        setTick((t) => t + 1);
      }
    };
    window.addEventListener(STAFF_PHOTO_CHANGED, onChange);
    return () => window.removeEventListener(STAFF_PHOTO_CHANGED, onChange);
  }, [key]);

  useEffect(() => {
    let live = true;
    if (hasPhoto === false || (!self && !employeeId)) { setUrl(null); return undefined; }
    load(key, self, employeeId).then((u) => { if (live) setUrl(u); });
    return () => { live = false; };
  }, [key, self, employeeId, hasPhoto, tick]);

  if (url) return <img src={url} alt={name || 'Photo'} className={`${className} object-cover flex-shrink-0`} />;
  return (
    <div className={`${className} flex items-center justify-center flex-shrink-0`} aria-hidden="true">
      {initialsOf(name)}
    </div>
  );
};

export default StaffAvatar;
