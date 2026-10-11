import { regionLabel } from '../../../constants/dermRegions';
import DermOverlay from './DermOverlay';
import DermPhoto from './DermPhoto';
import { fmtDay } from './dermFormat';
import { shortArea, stamp } from './dermAreaPhotoUtils';

/**
 * Progression of a site (9 Oct 2026, Emu) — every image of one body area
 * across all visits, laid out as a picture board: grouped by visit day,
 * oldest first, each tagged with its finding, the areas it shows, clinical or
 * dermoscopic, when it was taken and by whom, and the size typed that day.
 * Photos not yet filed under a finding are included ("Not filed under a
 * finding"). Each picture is fetched behind login and logged as opened, as
 * everywhere else; sensitive sites still need their own View.
 *
 * Props: region, photos (that area's photos, from photosByArea), findingName(id), onClose
 */
const KIND = { close_up: 'Clinical close-up', overview: 'Clinical overview', dermoscopy: 'Dermoscopic image' };

const DermProgressionBoard = ({ region, photos = [], findingName = () => '', onClose }) => {
  const byDay = [];
  for (const p of photos) {
    const last = byDay[byDay.length - 1];
    if (last && last.date === p.visitDate) last.photos.push(p);
    else byDay.push({ date: p.visitDate, photos: [p] });
  }
  return (
    <DermOverlay
      title={`Progression · ${regionLabel(region)}`}
      subtitle={<span className="text-xs text-gray-500">{photos.length === 1 ? '1 image' : `${photos.length} images`} · oldest first</span>}
      onClose={onClose}
    >
      <div className="flex flex-col gap-5 p-4">
        {!photos.length && <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">No images of this area yet.</p>}
        {byDay.map((d) => (
          <section key={d.date} className="flex flex-col gap-2">
            <h4 className="m-0 text-sm font-semibold text-gray-800">{fmtDay(d.date)}</h4>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
              {d.photos.map((p) => (
                <figure key={p.id} className="m-0 flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <DermPhoto photo={p} aspect="1/1" className="!rounded-none" />
                  <figcaption className="flex flex-col gap-0.5 px-2.5 py-2 text-[11px] leading-snug text-gray-600">
                    <b className="text-gray-800">{p.findingId ? findingName(p.findingId) : 'Not filed under a finding'}</b>
                    <span>{(p.regionLabels && p.regionLabels.length ? p.regionLabels.map(shortArea).join(' · ') : 'Overview of the finding')}</span>
                    <span className={p.photoType === 'dermoscopy' ? 'font-semibold text-indigo-700' : ''}>{KIND[p.photoType] || p.photoType}</span>
                    <span>{stamp(p.createdAt)}{p.uploadedByName ? ` · ${p.uploadedByName}` : ''}</span>
                    {p.lookSize && p.lookSize.length > 0 && <span className="font-mono tabular-nums">{p.lookSize.join(' × ')} mm typed that day</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}
        <p className="m-0 text-[11px] text-gray-500">Sizes are the ones typed at the visit; nothing is measured from a photo. Each image opened is recorded.</p>
      </div>
    </DermOverlay>
  );
};

export default DermProgressionBoard;
