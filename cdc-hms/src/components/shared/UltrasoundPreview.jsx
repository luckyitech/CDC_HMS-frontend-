import { useEffect } from 'react';
import { X, Film } from 'lucide-react';

/**
 * HMIS V4 — large ultrasound image preview (modal overlay).
 * Brightness is applied live via CSS filter — the PDF export bakes it in
 * separately via canvas (see utils/ultrasoundPdf.js).
 */
const UltrasoundPreview = ({ image, src, brightness = 1, onClose }) => {
  // Close on Escape
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white"
        aria-label="Close preview"
      >
        <X className="w-8 h-8" />
      </button>

      <div className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center">
          {src ? (
            <img
              src={src}
              alt={image.fileName}
              className="max-h-[80vh] max-w-full object-contain rounded"
              style={{ filter: `brightness(${brightness})` }}
            />
          ) : (
            <p className="text-white/70">Image unavailable</p>
          )}
        </div>
        <div className="mt-3 text-center text-white/90 text-sm">
          <span className="font-semibold">{image.studyDescription || image.fileName}</span>
          {' · '}
          {image.studyDate || new Date(image.receivedAt).toLocaleDateString()}
          {image.isMultiframe && (
            <span className="ml-2 inline-flex items-center gap-1 bg-purple-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">
              <Film className="w-3 h-3" /> Middle frame of a cine clip
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default UltrasoundPreview;
