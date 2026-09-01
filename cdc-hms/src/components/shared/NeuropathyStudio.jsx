import { useState } from 'react';
import { Activity, ListChecks } from 'lucide-react';
import NeuropathyExam from './NeuropathyExam';
import NeuropathyStudyList from './NeuropathyStudyList';
import NeuropathyReport from './NeuropathyReport';

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
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2 border-b-2 -mb-px transition ${tab === id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'exam' && <NeuropathyExam key={examKey} onCompleted={onCompleted} />}
      {tab === 'list' && <NeuropathyStudyList refreshKey={refreshKey} />}

      {report && <NeuropathyReport study={report} onClose={() => setReport(null)} />}
    </div>
  );
};

export default NeuropathyStudio;
