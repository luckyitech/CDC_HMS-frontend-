import { useState } from 'react';
import { Scan, Waves } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import UltrasoundTab from '../../components/shared/UltrasoundTab';

/**
 * Ultrasound Suite — the machine worklist and image workspace. ONE page for
 * both the full study inbox and the unassigned queue (studies whose machine
 * patient ID matched no UHID), switched with the toggle below. DRY: a single
 * UltrasoundTab, keyed by source so it refetches when the view flips.
 * The parent portal stays "Radiology" so CT / X-ray can join it later.
 */
const VIEWS = [
  { id: 'inbox',      label: 'All studies', Icon: Scan,  subtitle: "Machine studies — build and save to a patient's record" },
  { id: 'unassigned', label: 'Unassigned',  Icon: Waves, subtitle: "Images whose machine patient ID matched no UHID — attach each to the correct patient" },
];

const RadiologySuite = () => {
  const [view, setView] = useState('inbox');
  const current = VIEWS.find((v) => v.id === view);
  return (
    <div>
      <PageHeader title="Ultrasound Suite" subtitle={current.subtitle} />
      <div className="flex gap-1.5 mb-4">
        {VIEWS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`px-4 py-2 rounded-lg border text-sm font-semibold inline-flex items-center gap-2 transition ${view === id ? 'bg-primary border-primary text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-primary'}`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>
      <UltrasoundTab key={view} source={view} />
    </div>
  );
};

export default RadiologySuite;
