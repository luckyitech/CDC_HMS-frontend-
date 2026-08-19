import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import UltrasoundTab from '../shared/UltrasoundTab';
import RadiologyThyroidEntry from '../doctor/thyroid/RadiologyThyroidEntry';

/**
 * Radiology imaging board — the machine worklist/workspace with the thyroid
 * reporting tool launched from it. Shared by the Radiology Suite (source
 * 'inbox') and the Unassigned queue (source 'unassigned') so both get the same
 * flow: move images to the workspace, edit, attach, then open the thyroid tool.
 * Reporting lives entirely in the workspace — there is no separate reports tab.
 */
export default function ImagingThyroidBoard({ source = 'inbox' }) {
  const [mode, setMode] = useState('images');   // 'images' | 'thyroid'
  const [seed, setSeed] = useState(null);       // { patient, imageIds, layoutId }

  const openThyroid = (s) => { setSeed(s); setMode('thyroid'); };
  const backToImages = () => { setMode('images'); setSeed(null); };

  if (mode === 'thyroid') {
    return (
      <div>
        <button onClick={backToImages} className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-md px-3 py-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to images
        </button>
        <RadiologyThyroidEntry seed={seed} onSeedConsumed={() => setSeed(null)} />
      </div>
    );
  }
  return <UltrasoundTab source={source} onOpenThyroid={openThyroid} />;
}
