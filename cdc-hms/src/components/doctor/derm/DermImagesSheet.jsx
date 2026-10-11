import { useState } from 'react';
import { X } from 'lucide-react';
import { regionLabel } from '../../../constants/dermRegions';
import DermRegionPhotos from './DermRegionPhotos';
import DermPhoneCapture from './DermPhoneCapture';

/**
 * DermImagesSheet — "+ Images" (8 Oct 2026, Emu): photos of the areas chosen
 * on the body map, with no finding yet. Each saves at once as an AREA photo;
 * it can be filed under a finding later, or a finding can be recorded with
 * them now. Photos can come from this computer or a phone (QR).
 *
 * Props: uhid, regions + onRegionsChange (the map's selection), onDone(),
 *        onRecordFinding(photoIds), onChanged() (refresh the board)
 */
const DermImagesSheet = ({ uhid, regions = [], onRegionsChange = () => {}, onDone = () => {}, onRecordFinding = () => {}, onChanged = () => {} }) => {
  const [mine, setMine] = useState([]);       // photos saved from this computer in this sheet
  const [phone, setPhone] = useState({});     // sessionId → photos
  const phonePhotos = Object.values(phone).flat();
  const ids = [...new Set([...mine.map((p) => p.id), ...phonePhotos.map((p) => p.id)])];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">Add images</h3>
        <button type="button" onClick={onDone} aria-label="Close" className="ml-auto rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap gap-1.5">
          {regions.map((r) => (
            <span key={r} className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-primary">
              {regionLabel(r)}
              <button type="button" onClick={() => onRegionsChange(regions.filter((x) => x !== r))} aria-label={`Remove ${regionLabel(r)}`} className="rounded-full hover:bg-blue-100"><X className="h-3 w-3" /></button>
            </span>
          ))}
          {!regions.length && <span className="text-sm text-amber-700">Tap the body map to choose the areas first.</span>}
        </div>
        <span className="text-[11px] text-gray-500">Kept as area photos until you file them under a finding. Tap the map to change the areas.</span>
      </div>

      <div className="ui-surface p-4">
        <DermRegionPhotos
          uhid={uhid}
          regions={regions}
          areaMode
          extraPhotos={phonePhotos}
          onSaved={(photo) => { if (photo) setMine((list) => [photo, ...list]); onChanged(); }}
          phoneSlot={(
            <DermPhoneCapture uhid={uhid} regions={regions} purpose="photos"
              onSession={(sess) => setPhone((m) => ({ ...m, [sess.id]: m[sess.id] || [] }))}
              onPhotos={(list, sid) => {
                // Refresh the skin record only when something new arrived (this is polled).
                if ((phone[sid] || []).length !== list.length) onChanged();
                setPhone((m) => ({ ...m, [sid]: list }));
              }} />
          )}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={!ids.length} onClick={() => onRecordFinding(ids)}
          className="rounded-lg border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary ui-hover disabled:opacity-50">
          Record a finding with these
        </button>
        <button type="button" onClick={onDone} className="ml-auto rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Done</button>
      </div>
    </div>
  );
};

export default DermImagesSheet;
