import { useState } from 'react';
import { Activity, ListChecks, BarChart3 } from 'lucide-react';
import NeuropathyExam from './NeuropathyExam';
import NeuropathyStudyList from './NeuropathyStudyList';
import NeuropathyReport from './NeuropathyReport';
import NeuropathyAnalytics from './NeuropathyAnalytics';
import SwitcherTabs from './SwitcherTabs';
import { useUserContext } from '../../contexts/UserContext';
import { canAccessAdmin } from '../../utils/permissions';

// Neuropathy Studio — the Radiology-portal home for the Vibrotherm assessment:
// a New exam tab (capture), a Studies tab (recent worklist), and (doctors/admin
// only) an Analytics tab — the live prospective PNS cohort dashboard. Completing
// an exam opens its graded report and refreshes the list.

const NeuropathyStudio = () => {
  const { currentUser } = useUserContext();
  const showAnalytics = currentUser?.role === 'doctor' || canAccessAdmin(currentUser);

  const TABS = [
    { id: 'exam', label: 'New exam', Icon: Activity },
    { id: 'list', label: 'Studies', Icon: ListChecks },
    ...(showAnalytics ? [{ id: 'analytics', label: 'Analytics', Icon: BarChart3 }] : []),
  ];

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
      {tab === 'analytics' && showAnalytics && <NeuropathyAnalytics />}

      {report && <NeuropathyReport study={report} onClose={() => setReport(null)} />}
    </div>
  );
};

export default NeuropathyStudio;
