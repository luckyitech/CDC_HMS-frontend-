import { useState } from 'react';
import SwitcherTabs from '../../shared/SwitcherTabs';
import MyAttendance from '../MyAttendance';

/**
 * My profile — Activity (mockup 4): Attendance, the same cards as the HR
 * dashboard (MyAttendance), and "My work" — a self-audit of one's own clinical
 * work, which is later (spec §12).
 */
const SelfActivity = () => {
  const [tab, setTab] = useState('attendance');
  return (
    <div>
      <SwitcherTabs size="sm" className="mb-3" ariaLabel="My activity" tabs={[{ id: 'attendance', label: 'Attendance' }, { id: 'work', label: 'My work' }]} active={tab} onChange={setTab} />
      {tab === 'attendance' ? <MyAttendance /> : (
        <div className="ui-surface p-6 text-sm text-gray-600">
          A view of your own clinical work — patients seen, notes written, results reviewed — is coming later.
        </div>
      )}
    </div>
  );
};

export default SelfActivity;
