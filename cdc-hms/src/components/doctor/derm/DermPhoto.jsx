import { useEffect, useState } from 'react';
import { EyeOff, ImageOff } from 'lucide-react';
import { dermService } from '../../../services/dermService';

/**
 * DermPhoto — one skin photo, fetched behind login only when it is shown.
 *
 * A photo of a sensitive site is NOT fetched until the doctor presses View:
 * until then it is a plain blurred placeholder, so nothing of it reaches the
 * screen by accident. Every fetch is logged on the server (who, when).
 * The marker (the doctor's ellipse) is drawn over the picture — it shows
 * which mark is the finding; it is not a measurement.
 *
 * Props: photo, caption (node), alt (text), aspect ('4/3' default, '1/1' for compare), className,
 *        startRevealed (Visit History's print copy: a photo already opened on
 *        screen), onShown(id) (told once the picture is on screen)
 *
 * One fetch per photo per page: the same picture in Compare and in the
 * gallery is fetched (and logged) once, then reused from memory.
 */
// Keyed by the signed-in user too, so a second person on the same tab fetches
// (and is logged) for themselves.
const fetched = new Map();   // `${userId}:${photoId}` → Promise<object URL>
const viewerId = () => {
  try { return JSON.parse(sessionStorage.getItem('currentUser') || 'null')?.id ?? 'anon'; } catch { return 'anon'; }
};
const fetchPhoto = (id) => {
  const key = `${viewerId()}:${id}`;
  if (!fetched.has(key)) {
    const p = dermService.photoFile(id).then((blob) => URL.createObjectURL(blob?.data ?? blob));
    p.catch(() => fetched.delete(key));
    fetched.set(key, p);
  }
  return fetched.get(key);
};
const MarkerOverlay = ({ marker }) => (marker ? (
  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
    <ellipse cx={marker.cx * 100} cy={marker.cy * 100} rx={marker.rx * 100} ry={marker.ry * 100}
      fill="none" stroke="#facc15" strokeWidth="0.8" strokeDasharray="2.5 1.8" vectorEffect="non-scaling-stroke" />
  </svg>
) : null);

const DermPhoto = ({ photo, caption, alt = 'Skin photo', aspect = '4/3', className = '', startRevealed = false, onShown }) => {
  const [revealed, setRevealed] = useState(startRevealed || !photo.sensitive);
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!revealed) return undefined;
    let alive = true;
    fetchPhoto(photo.id)
      .then((u) => { if (alive) { setUrl(u); if (onShown) onShown(photo.id); } })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
    // onShown is a notification only; a new function identity must not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo.id, revealed]);

  return (
    <figure className={`m-0 overflow-hidden rounded-lg border border-gray-200 bg-white ${className}`}>
      <div className="relative w-full max-w-full bg-gray-100" style={{ aspectRatio: aspect }}>
        {!revealed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-stone-300 to-stone-400 p-2 text-center">
            <EyeOff className="h-5 w-5 text-stone-700" />
            <span className="text-xs font-semibold text-stone-800">Sensitive site</span>
            <button type="button" onClick={() => setRevealed(true)} className="rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-800 shadow-sm hover:bg-gray-50">
              View photo
            </button>
            <span className="text-[10px] text-stone-700">Opening it is recorded</span>
          </div>
        ) : failed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs text-gray-500">
            <ImageOff className="h-5 w-5" /> Photo unavailable
          </div>
        ) : url ? (
          <>
            <img src={url} alt={alt} className="absolute inset-0 h-full w-full object-contain" />
            <MarkerOverlay marker={photo.marker} />
          </>
        ) : (
          <div className="absolute inset-0 animate-pulse bg-gray-200" />
        )}
      </div>
      {caption && <figcaption className="flex flex-wrap justify-between gap-1 px-2 py-1 text-[11px] text-gray-600">{caption}</figcaption>}
    </figure>
  );
};

export default DermPhoto;
