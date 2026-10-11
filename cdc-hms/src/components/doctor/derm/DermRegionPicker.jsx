import { useState } from 'react';
import { Camera, X } from 'lucide-react';
import DermBodyMap from './DermBodyMap';
import { REGION_BY_ID, regionLabel } from '../../../constants/dermRegions';

/**
 * DermRegionPicker — choose the body regions a finding covers: tap regions on
 * the map (front / back) to add or remove them; the chosen ones are listed as
 * removable chips. A rash may cover several regions.
 *
 * Props: value (region ids), onChange(ids), disabled,
 *        photoCounts ({ regionId → n }, shown on the chips),
 *        children (shown under the chips: the photo area, 8 Oct 2026)
 */
const DermRegionPicker = ({ value = [], onChange, disabled = false, photoCounts = {}, children = null }) => {
  const first = value[0] && REGION_BY_ID[value[0]];
  const [view, setView] = useState(first ? first.view : 'front');
  const toggle = (id) => {
    if (disabled) return;
    if (value.includes(id)) onChange(value.filter((r) => r !== id));
    else onChange([...value, id]);
  };
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
        <DermBodyMap view={view} onViewChange={setView} selected={value} onRegion={disabled ? undefined : toggle} size="sm" />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <span className="text-xs font-semibold text-gray-500">Where · tap every region it covers — switch Front / Back to add both sides</span>
        {value.length === 0 ? (
          <p className="text-sm text-gray-500">No region chosen yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {value.map((id) => (
              <span key={id} className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-primary">
                {regionLabel(id)}{photoCounts[id] ? <span className="inline-flex items-center gap-0.5 font-normal text-gray-500"> · {photoCounts[id]}<Camera className="h-3 w-3" /></span> : null}
                {!disabled && (
                  <button type="button" onClick={() => toggle(id)} aria-label={`Remove ${regionLabel(id)}`} className="rounded-full hover:bg-blue-100">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        <p className="text-[11px] text-gray-500">Left and right are the patient's. A dashed outline is a sensitive site.</p>
        {children && <div className="mt-1 border-t border-gray-100 pt-3">{children}</div>}
      </div>
    </div>
  );
};

export default DermRegionPicker;
