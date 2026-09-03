import { useState } from 'react';
import { Activity, ListChecks } from 'lucide-react';
import NeuropathyExam from './NeuropathyExam';
import NeuropathyStudyList from './NeuropathyStudyList';
import NeuropathyReport from './NeuropathyReport';
import SwitcherTabs from './SwitcherTabs';

// Neuropathy Studio — the Radiology-portal home for the Vibrotherm assessment:
// a New exam tab (capture) and a Studies tab (recent worklist). Completing an
// exam opens its graded report and refreshes the list.

const TABS = [
  { id: 'exam', label: 'New exam', Icon: Activity },
  { id: 'list', label: 'Studies', Icon: ListChecks },
];

const NeuropathyStudio = () => {
  const [tab, setTab] = useState('exam');
  const [report, setReport] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [examKey, setExamKey] = useState(0);   // remount the exam for the next patient

  const onCompleted = (study) => {
    setReport(study);
    setRefreshKey((k) => k + 1);
    setExamKey((k) => k + 1);
  };

  return (
    <div>
      <SwitcherTabs className="mb-4" tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'exam' && <NeuropathyExam key={examKey} onCompleted={onCompleted} />}
      {tab === 'list' && <NeuropathyStudyList refreshKey={refreshKey} />}

      {report && <NeuropathyReport study={report} onClose={() => setReport(null)} />}
    </div>
  );
};

export default NeuropathyStudio;
