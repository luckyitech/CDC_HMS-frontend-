import { useState, useEffect, useCallback } from 'react';
import { ultrasoundService } from '../../../services/ultrasoundService';

/**
 * Picks from this patient's machine-ingested ultrasound images (the HS70A DICOM
 * feed) for the combined radiology PDF. Report-level selection (v1). Selection
 * persists via onSave (context.setImages). Blobs are fetched authenticated.
 */
export default function ThyroidImagePicker({ patient, selectedIds = [], onSave, disabled }) {
  const [images, setImages] = useState([]);
  const [urls, setUrls] = useState({});
  const [sel, setSel] = useState(new Set(selectedIds));
  const [loading, setLoading] = useState(false);

  useEffect(() => { setSel(new Set(selectedIds)); }, [selectedIds.join(',')]); // eslint-disable-line

  const load = useCallback(async () => {
    if (!patient?.uhid) return;
    setLoading(true);
    try {
      const { data } = await ultrasoundService.getByPatient(patient.uhid);
      const list = data.data || data || [];
      setImages(list);
      // fetch blobs for preview
      list.forEach(async (img) => {
        try {
          const filename = ultrasoundService.filenameFromUrl(img.fileUrl);
          const res = await ultrasoundService.getFile(filename);
          setUrls((u) => ({ ...u, [img.id]: URL.createObjectURL(res.data) }));
        } catch { /* image unavailable */ }
      });
    } catch { setImages([]); } finally { setLoading(false); }
  }, [patient]);

  useEffect(() => { load(); }, [load]);

  const toggle = (id) => {
    if (disabled) return;
    const next = new Set(sel); next.has(id) ? next.delete(id) : next.add(id);
    setSel(next);
    onSave([...next].map((UltrasoundImageId, i) => ({ UltrasoundImageId, orderIndex: i })));
  };

  if (!images.length) {
    return <div className="text-sm text-slate-400">{loading ? 'Loading images…' : 'No machine-ingested ultrasound images for this patient yet.'}</div>;
  }

  return (
    <div>
      <div className="text-sm font-semibold text-slate-700 mb-2">Attach ultrasound images ({sel.size} selected)</div>
      <div className="grid grid-cols-4 gap-2">
        {images.map((img) => {
          const on = sel.has(img.id);
          return (
            <button key={img.id} type="button" onClick={() => toggle(img.id)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 ${on ? 'border-teal-500' : 'border-slate-200'}`}>
              {urls[img.id]
                ? <img src={urls[img.id]} alt={img.fileName} className="w-full h-full object-cover bg-black" />
                : <div className="w-full h-full grid place-items-center bg-slate-100 text-[10px] text-slate-400">image</div>}
              {on && <span className="absolute top-1 right-1 bg-teal-500 text-white text-[10px] w-4 h-4 grid place-items-center rounded-full">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
