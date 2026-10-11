import { useState, useRef, useCallback, useEffect } from 'react';
import ultrasoundService from '../services/ultrasoundService';

/**
 * useUltrasoundBlobs — THE loader for ultrasound image files (they need the
 * auth header, so an <img src> can't fetch them directly). Used by the patient
 * Radiology tab, the Ultrasound Studio and the Unassigned queue.
 *
 * blobUrls: id → object URL once loaded, id → null once it has FAILED (a
 *   missing file is asked for once per screen, not on every refresh or live
 *   update), absent while not yet asked for. Render with `blobUrls[id]`
 *   (falsy = placeholder), or let <UltrasoundThumb> load it when it scrolls
 *   into view.
 * loadBlobs(images): fetches the ones not already loaded, loading or failed.
 *   Safe to call concurrently. Object URLs are revoked on unmount.
 */
const useUltrasoundBlobs = () => {
  const [blobUrls, setBlobUrls] = useState({});
  const urlsRef = useRef({});
  const pendingRef = useRef(new Set());

  const loadBlobs = useCallback(async (images) => {
    const todo = (images || []).filter((img) => img && !(img.id in urlsRef.current) && !pendingRef.current.has(img.id));
    if (!todo.length) return;
    todo.forEach((img) => pendingRef.current.add(img.id));
    const fresh = {};
    await Promise.all(
      todo.map(async (img) => {
        try {
          const res = await ultrasoundService.getFile(ultrasoundService.filenameFromUrl(img.fileUrl));
          fresh[img.id] = URL.createObjectURL(res.data ?? res);
        } catch {
          fresh[img.id] = null; // remembered: placeholder shown, not retried
        }
      }),
    );
    todo.forEach((img) => pendingRef.current.delete(img.id));
    // Merge at write time: concurrent callers must not clobber each other.
    urlsRef.current = { ...urlsRef.current, ...fresh };
    setBlobUrls(urlsRef.current);
  }, []);

  useEffect(() => () => {
    Object.values(urlsRef.current).forEach((u) => u && URL.revokeObjectURL(u));
    urlsRef.current = {};
  }, []);

  return { blobUrls, loadBlobs };
};

export default useUltrasoundBlobs;
