import { useState } from 'react';
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
      <div className="flex gap-1 mb-3" role="tablist">
        {[['attendance', 'Attendance'], ['work', 'My work']].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === id ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'attendance' ? <MyAttendance /> : (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-600">
          A view of your own clinical work — patients seen, notes written, results reviewed — is coming later.
        </div>
      )}
    </div>
  );
};

export default SelfActivity;
