import { useState } from 'react';
import { Scan, Waves } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import SwitcherTabs from '../../components/shared/SwitcherTabs';
import UltrasoundTab from '../../components/shared/UltrasoundTab';

/**
 * Ultrasound Suite — the machine worklist and image workspace. ONE page for
 * both the full study inbox and the unassigned queue (studies whose machine
 * patient ID matched no UHID), switched with the shared SwitcherTabs below.
 * DRY: a single UltrasoundTab, keyed by source so it refetches when the view
 * flips. The parent portal stays "Radiology" so CT / X-ray can join it later.
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
      <SwitcherTabs
        className="mb-4"
        tabs={VIEWS.map(({ id, label, Icon }) => ({ id, label, Icon }))}
        active={view}
        onChange={setView}
      />
      <UltrasoundTab key={view} source={view} />
    </div>
  );
};

export default RadiologySuite;
