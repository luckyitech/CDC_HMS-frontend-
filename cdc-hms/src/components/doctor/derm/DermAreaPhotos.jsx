import { useEffect } from 'react';
import { ModalOverlay } from '../../shared/Modal';
import { EyeOff, X } from 'lucide-react';
import { regionLabel } from '../../../constants/dermRegions';
import DermPhoto from './DermPhoto';
import { shortArea, stamp } from './dermAreaPhotoUtils';

/**
 * Photos of one body area on the skin record (8 Oct 2026, Emu):
 *
 *   DermAreaHover    — floats beside the area while the pointer is on it: its
 *                      latest thumbnails. Sensitive-site photos stay a grey
 *                      tile (never fetched on hover).
 *   DermAreaTimeline — opens on click: every photo of the area in one line,
 *                      oldest → newest, each stamped with date and time, the
 *                      finding and the size typed that day — the progression
 *                      at a glance. Sensitive sites still need their own View.
 *
 * Each picture shown is fetched behind login and logged once per page
 * ("Who opened"), like everywhere else.
 */
const Thumb = ({ photo }) => (photo.sensitive ? (
  <div className="flex h-16 w-16 flex-col items-center justify-center rounded-md bg-stone-300 text-[9px] font-semibold text-stone-700">
    <EyeOff className="h-4 w-4" />Sensitive
  </div>
) : (
  <div className="h-16 w-16"><DermPhoto photo={photo} aspect="1/1" className="!rounded-md" /></div>
));

export const DermAreaHover = ({ region, rect, photos = [] }) => {
  if (!region || !rect || !photos.length) return null;
  const latest = photos.slice(-6);
  const left = Math.min(rect.right + 10, window.innerWidth - 300);
  const top = Math.max(8, Math.min(rect.top - 8, window.innerHeight - 140));
  return (
    <div role="tooltip" className="pointer-events-none fixed z-50 w-[290px] rounded-xl border border-gray-200 bg-white p-2 shadow-lg" style={{ left, top }}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
        <b className="text-gray-800">{regionLabel(region)}</b>
        <span className="text-gray-500">{photos.length === 1 ? '1 photo' : `${photos.length} photos`} · click for all</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {latest.map((p) => <Thumb key={p.id} photo={p} />)}
      </div>
    </div>
  );
};

const sizeOf = (p) => (p.lookSize && p.lookSize.length ? `${p.lookSize.join(' × ')} mm typed` : 'no size typed');

export const DermAreaTimeline = ({ region, photos = [], findingLabel = () => '', selected = false, onToggleSelect, onClose }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!region) return null;
  return (
    <ModalOverlay onClose={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Photos of ${regionLabel(region)}`}
        className="flex max-h-[90vh] w-full max-w-6xl flex-col gap-3 rounded-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-gray-800">{regionLabel(region)}</h3>
          <span className="text-sm text-gray-500">{photos.length === 1 ? '1 photo' : `${photos.length} photos`} · oldest → newest</span>
          <span className="ml-auto flex gap-2">
            {onToggleSelect && (
              <button type="button" onClick={onToggleSelect} className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary ui-hover">
                {selected ? 'Remove from selection' : 'Select this area'}
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
          </span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {photos.map((p, i) => (
            <div key={p.id} className="flex w-56 shrink-0 flex-col gap-1">
              <div className="relative">
                <DermPhoto photo={p} aspect="1/1" />
                <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">{i + 1}</span>
              </div>
              <div className="flex flex-col text-[11px] leading-tight text-gray-600">
                <b className="text-gray-800">{stamp(p.createdAt)}</b>
                <span>{findingLabel(p.findingId)} · {sizeOf(p)}</span>
                <span className="text-gray-500">
                  {(p.regionLabels && p.regionLabels.length ? p.regionLabels.map(shortArea).join(' · ') : 'Overview')} · {p.uploadedByName || ''}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-500">The ring marks the finding. Sizes are the ones typed that day; nothing is measured from a photo. Each photo opened is recorded.</p>
      </div>
    </ModalOverlay>
  );
};
