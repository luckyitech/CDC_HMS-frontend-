import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { MODAL_Z } from '../../../constants/layers';

/**
 * DermOverlay — the large pop-up the Dermatology consultation records in
 * (9 Oct 2026, Emu): Specific site examination, General examination, History,
 * a finding's full record and the progression board. Portaled to <body> on
 * MODAL_Z like every dialog (constants/layers), so nothing clips it; a dialog
 * opened from inside it (a reason box) portals after it and sits on top.
 *
 * Props: title, subtitle (node), onClose, footer (node), width 'xl' | 'lg' | 'md',
 *        children. Escape and the backdrop close it.
 */
const WIDTH = { xl: 'max-w-[1240px]', lg: 'max-w-5xl', md: 'max-w-2xl' };

const DermOverlay = ({ title, subtitle, onClose, footer, width = 'xl', children, label }) => {
  const box = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || !box.current) return;
      // A dialog portaled after this one (a reason box, a photo viewer) is on
      // top: Escape belongs to it.
      let next = box.current.parentElement?.nextElementSibling;
      while (next) { if (next.classList?.contains('fixed')) return; next = next.nextElementSibling; }
      onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.activeElement;
    box.current?.focus();
    return () => { window.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); };
  }, [onClose]);

  return createPortal( // ui-allow: already portaled on MODAL_Z; closes on backdrop mousedown
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-3 sm:p-5" style={{ zIndex: MODAL_Z }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label || title} data-derm-overlay=""
        className={`flex max-h-[94vh] w-full ${WIDTH[width] || WIDTH.xl} flex-col overflow-hidden rounded-2xl bg-gray-50 shadow-2xl outline-none`}>
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-4 py-3">
          <h3 className="m-0 text-base font-semibold text-gray-800">{title}</h3>
          {subtitle}
          <button type="button" onClick={onClose} aria-label="Close" className="ml-auto rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 bg-white px-4 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};

export default DermOverlay;
