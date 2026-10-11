import { useRef, useState } from 'react';

/**
 * DermMarkerEditor — drag across the photo to ring the finding (an ellipse).
 * The ring only shows WHICH mark is the finding; the size is the one typed in
 * today's look, never read from the picture.
 *
 * Props: src (object URL of the prepared photo), value (marker | null), onChange(marker | null)
 */
const clamp = (v) => Math.max(0, Math.min(1, v));

const DermMarkerEditor = ({ src, value, onChange }) => {
  const box = useRef(null);
  const start = useRef(null);
  const [draft, setDraft] = useState(null);

  const point = (e) => {
    const r = box.current.getBoundingClientRect();
    return { x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height) };
  };
  const toMarker = (a, b) => ({ cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, rx: Math.abs(b.x - a.x) / 2, ry: Math.abs(b.y - a.y) / 2 });

  const down = (e) => { e.preventDefault(); box.current.setPointerCapture?.(e.pointerId); start.current = point(e); setDraft(null); };
  const move = (e) => { if (start.current) setDraft(toMarker(start.current, point(e))); };
  const up = (e) => {
    if (!start.current) return;
    const m = toMarker(start.current, point(e));
    start.current = null;
    setDraft(null);
    if (m.rx >= 0.01 && m.ry >= 0.01) onChange(m);
  };

  const shown = draft || value;
  return (
    <div className="flex flex-col gap-1.5">
      <div
        ref={box}
        className="relative w-full max-w-md cursor-crosshair touch-none select-none overflow-hidden rounded-lg border border-gray-300 bg-gray-100"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => { start.current = null; setDraft(null); }}
        role="application"
        aria-label="Drag across the photo to ring the finding"
      >
        <img src={src} alt="Photo to mark" className="block h-auto w-full" draggable={false} />
        {shown && (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            <ellipse cx={shown.cx * 100} cy={shown.cy * 100} rx={shown.rx * 100} ry={shown.ry * 100}
              fill="none" stroke="#facc15" strokeWidth="1" strokeDasharray="2.5 1.8" vectorEffect="non-scaling-stroke" />
          </svg>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span>{value ? 'Finding ringed. Drag again to redo.' : 'Drag across the photo to ring the finding (optional).'}</span>
        {value && <button type="button" onClick={() => onChange(null)} className="font-medium text-primary hover:underline">Clear ring</button>}
      </div>
    </div>
  );
};

export default DermMarkerEditor;
