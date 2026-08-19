import { useState, useEffect, useCallback, useRef } from 'react';
import { ultrasoundService } from '../../../services/ultrasoundService';

/**
 * Final image selection for the report. When `pool` is given (the report's
 * seeded images from the imaging workspace) the picker is scoped to those — you
 * confirm/exclude which embed at the end of the report. With no pool it falls
 * back to the patient's whole image safe (manual reports). Blobs are fetched
 * authenticated. Selection persists via onSave (context.setImages).
 */
export default function ThyroidImagePicker({ patient, pool = null, selectedIds = [], onSave, disabled }) {
  const [images, setImages] = useState([]);
  const [urls, setUrls] = useState({});
  const [sel, setSel] = useState(new Set(selectedIds));
  const [loading, setLoading] = useState(false);
  const snapped = useRef(false);
  const blobRef = useRef({});

  useEffect(() => { setSel(new Set(selectedIds)); }, [selectedIds.join(',')]); // eslint-disable-line

  // Scoped mode: snapshot the pool once so unticking an image doesn't drop it
  // from the grid (you can re-tick it). Unscoped: load the whole safe.
  const loadAll = useCallback(async () => {
    if (!patient?.uhid) return;
    setLoading(true);
    try {
      const body = await ultrasoundService.getByPatient(patient.uhid);
      const list = Array.isArray(body?.data) ? body.data : (Array.isArray(body) ? body : []);
      setImages(list);
    } catch { setImages([]); } finally { setLoading(false); }
  }, [patient]);

  useEffect(() => {
    if (pool && pool.length) {
      if (!snapped.current) { snapped.current = true; setImages(pool); }
      return;
    }
    if (!pool) loadAll();
  }, [pool, loadAll]);

  // fetch blobs for whatever images are shown
  useEffect(() => {
    images.forEach(async (img) => {
      if (blobRef.current[img.id]) return;
      try {
        const filename = ultrasoundService.filenameFromUrl(img.fileUrl);
        const res = await ultrasoundService.getFile(filename);
        const url = URL.createObjectURL(res.data ?? res);
        blobRef.current[img.id] = url;
        setUrls((u) => ({ ...u, [img.id]: url }));
      } catch { /* image unavailable */ }
    });
  }, [images]);

  const toggle = (id) => {
    if (disabled) return;
    const next = new Set(sel); next.has(id) ? next.delete(id) : next.add(id);
    setSel(next);
    onSave([...next].map((UltrasoundImageId, i) => ({ UltrasoundImageId, orderIndex: i })));
  };

  if (!images.length) {
    return <div className="text-sm text-gray-400">{loading ? 'Loading images…' : 'No ultrasound images for this report yet.'}</div>;
  }

  return (
    <div>
      <div className="text-sm font-semibold text-gray-700 mb-2">Images in the report ({sel.size} selected)</div>
      <div className="grid grid-cols-4 gap-2">
        {images.map((img) => {
          const on = sel.has(img.id);
          return (
            <button key={img.id} type="button" onClick={() => toggle(img.id)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 ${on ? 'border-primary' : 'border-gray-200'}`}>
              {urls[img.id]
                ? <img src={urls[img.id]} alt={img.fileName} className="w-full h-full object-cover bg-black" />
                : <div className="w-full h-full grid place-items-center bg-gray-100 text-[10px] text-gray-400">image</div>}
              {on && <span className="absolute top-1 right-1 bg-blue-500 text-white text-[10px] w-4 h-4 grid place-items-center rounded-full">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
