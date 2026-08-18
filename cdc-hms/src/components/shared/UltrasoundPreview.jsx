import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Film, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * HMIS V4 — large ultrasound image preview (modal overlay).
 *
 * Portaled to document.body so the backdrop always covers the whole viewport
 * (it was previously clipped by the transformed floating sidebar). Navigate a
 * set of images with the on-screen arrows, the thumbnail strip, or ← / → keys —
 * no need to close and reopen.
 *
 * Props: images[] (the set), startIndex, blobUrls (id → object URL), onClose.
 */
const UltrasoundPreview = ({ images = [], startIndex = 0, blobUrls = {}, brightness = 1, onClose }) => {
  const [idx, setIdx] = useState(startIndex);
  const count = images.length;

  useEffect(() => { setIdx(startIndex); }, [startIndex]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') setIdx((i) => (count ? (i - 1 + count) % count : 0));
      else if (e.key === 'ArrowRight') setIdx((i) => (count ? (i + 1) % count : 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, count]);

  const image = images[idx];
  if (!image) return null;
  const src = blobUrls[image.id];
  const go = (delta) => setIdx((i) => (count ? (i + delta + count) % count : 0));

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-6"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white z-10"
        aria-label="Close preview"
      >
        <X className="w-8 h-8" />
      </button>

      <div className="relative flex items-center justify-center w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
        {count > 1 && (
          <button
            onClick={() => go(-1)}
            aria-label="Previous image"
            className="absolute left-1 md:-left-2 bg-white/10 hover:bg-white/25 text-white rounded-full p-2 transition-colors"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
        )}

        <div className="flex flex-col items-center px-10">
          {src ? (
            <img
              src={src}
              alt={image.fileName}
              className="max-h-[70vh] max-w-full object-contain rounded"
              style={{ filter: `brightness(${brightness})` }}
            />
          ) : (
            <p className="text-white/70 py-24">Image unavailable</p>
          )}
          <div className="mt-3 text-center text-white/90 text-sm">
            <span className="font-semibold">{image.studyDescription || image.fileName}</span>
            {' · '}
            {image.studyDate || (image.receivedAt ? new Date(image.receivedAt).toLocaleDateString() : '')}
            {count > 1 && <span className="text-white/50"> · {idx + 1} / {count}</span>}
            {image.isMultiframe && (
              <span className="ml-2 inline-flex items-center gap-1 bg-purple-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">
                <Film className="w-3 h-3" /> Middle frame of a cine clip
              </span>
            )}
          </div>
        </div>

        {count > 1 && (
          <button
            onClick={() => go(1)}
            aria-label="Next image"
            className="absolute right-1 md:-right-2 bg-white/10 hover:bg-white/25 text-white rounded-full p-2 transition-colors"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        )}
      </div>

      {count > 1 && (
        <div className="mt-4 w-full max-w-6xl overflow-x-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-2 justify-center min-w-min px-2 pb-1">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setIdx(i)}
                aria-label={`Show image ${i + 1}`}
                className={`flex-shrink-0 w-20 h-16 rounded overflow-hidden border-2 transition ${
                  i === idx ? 'border-blue-400' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                {blobUrls[img.id] ? (
                  <img src={blobUrls[img.id]} alt="" className="w-full h-full object-cover bg-black" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center bg-black text-white/40 text-[9px]">N/A</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
};

export default UltrasoundPreview;
