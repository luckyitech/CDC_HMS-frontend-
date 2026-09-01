import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import PageHeader from '../../components/shared/PageHeader';
import StatusBadge from '../../components/shared/StatusBadge';
import SwitcherTabs from '../../components/shared/SwitcherTabs';
import { QUEUE_STATUS_TONES } from '../../utils/statusStyles';
import { SERVICE_META } from '../../constants/queueDestinations';
import { useUserContext } from '../../contexts/UserContext';
import { useQueueContext } from '../../contexts/QueueContext';

const PER_PAGE = 15;

/**
 * Radiology Dashboard — the radiology-portal home. Same shape as the outpatient
 * Doctor Dashboard (DRY: shared Card / SwitcherTabs / StatusBadge / queue table),
 * scoped to destination === 'Radiology'. A doctor picks their patient from the
 * line-up and starts the matching screen (Neuropathy Studio or Radiology Suite).
 */
const RadiologyDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useUserContext();
  const { queue, startConsultation } = useQueueContext();
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'mine'
  const [page, setPage] = useState(1);

  const switchTab = (tab) => { setActiveTab(tab); setPage(1); };

  const isToday = (d) => d && new Date(d).toDateString() === new Date().toDateString();
  const formatArrival = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const myId = Number(currentUser?.id);
  const isRadiology = (q) => q.destination === 'Radiology';

  const active    = queue.filter(q => isRadiology(q) && q.status !== 'Completed' && q.status !== 'Removed');
  const completed = queue.filter(q => isRadiology(q) && q.status === 'Completed' && isToday(q.createdAt));
  const todayList = [...active, ...completed].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  const mineList  = todayList.filter(q => Number(q.assignedDoctorId) === myId);

  const displayList = activeTab === 'mine' ? mineList : todayList;
  const totalPages  = Math.ceil(displayList.length / PER_PAGE);
  const paginated   = displayList.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const serviceBadge = (svc) => {
    const meta = SERVICE_META[svc];
    if (!meta) return <span className="text-gray-400 text-sm">—</span>;
    return <StatusBadge size="xs" tone={meta.tone}>{meta.label}</StatusBadge>;
  };

  const startScreen = (item, alreadyWithDoctor) => {
    if (!alreadyWithDoctor) startConsultation(item.id);
    // Neuropathy opens the patient file's PNS Studio tab; ultrasound opens the Suite.
    if (item.service === 'Neuropathy') {
      navigate(`/radiology/patient-profile/${item.uhid}`, { state: { activeTab: 'pns' } });
    } else {
      navigate('/radiology/suite', { state: { uhid: item.uhid } });
    }
  };

  const actionCell = (item, full) => {
    const isMine = Number(item.assignedDoctorId) === myId;
    if (item.status === 'Completed')
      return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-300">Done</span>;
    if (item.status === 'Pending Billing')
      return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-300">Awaiting Billing</span>;
    if (isMine && (item.status === 'Awaiting Doctor' || item.status === 'With Doctor')) {
      const label = item.status === 'With Doctor'
        ? 'Continue'
        : item.service === 'Ultrasound' ? 'Open in Suite' : 'Start Neuropathy Screen';
      return (
        <Button variant="primary" className={full ? 'w-full text-xs py-1.5' : 'text-xs py-1 px-3'}
          onClick={() => startScreen(item, item.status === 'With Doctor')}>
          {label}
        </Button>
      );
    }
    if (item.assignedDoctorId)
      return <span className="text-xs text-gray-500">Assigned to <span className="font-semibold text-gray-700">{item.assignedDoctorName || 'Other Doctor'}</span></span>;
    return <span className="text-gray-400">—</span>;
  };

  return (
    <div>
      <PageHeader title="Radiology Dashboard" subtitle={`Welcome back, ${currentUser?.name || 'Doctor'}`} />

      <Card title={<span className="flex items-center gap-2"><Activity className="w-5 h-5" />Today's Radiology Line-up</span>}>
        <SwitcherTabs
          className="mb-4"
          active={activeTab}
          onChange={switchTab}
          tabs={[
            { id: 'all',  label: 'All Patients',      count: todayList.length },
            { id: 'mine', label: 'My Patients Today', count: mineList.length },
          ]}
        />

        {displayList.length > 0 ? (
          <>
            {/* Card list — mobile & tablet (< xl) */}
            <div className="xl:hidden space-y-3">
              {paginated.map((item) => {
                const isMine = Number(item.assignedDoctorId) === myId;
                return (
                  <div key={item.id} className={`border rounded-xl overflow-hidden ${isMine ? 'border-blue-300' : 'border-gray-200'}`}>
                    <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 ${isMine ? 'bg-blue-50' : 'bg-gray-50'}`}>
                      <p className="font-bold text-gray-800 text-sm leading-tight truncate flex-1">
                        {item.name}{item.age && <span className="text-xs text-gray-500 font-normal ml-1">({item.age}y)</span>}
                      </p>
                      {isMine && <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-300 uppercase tracking-wide">Your Patient</span>}
                    </div>
                    <div className="bg-white px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                      <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">UHID</p><p className="text-sm font-semibold text-primary">{item.uhid}</p></div>
                      <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Service</p>{serviceBadge(item.service)}</div>
                      <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Status</p><StatusBadge size="xs" tone={QUEUE_STATUS_TONES[item.status]}>{item.status}</StatusBadge></div>
                      <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Assigned To</p>{isMine ? <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-300">You</span> : <p className="text-sm text-gray-600 truncate">{item.assignedDoctorName || 'Unassigned'}</p>}</div>
                    </div>
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">{actionCell(item, true)}</div>
                  </div>
                );
              })}
            </div>

            {/* Table — desktop (xl+) */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">UHID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Patient Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Age</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Assigned To</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginated.map((item) => {
                    const isMine = Number(item.assignedDoctorId) === myId;
                    return (
                      <tr key={item.id} className={`hover:bg-blue-50 transition ${isMine && item.status === 'Awaiting Doctor' ? 'bg-purple-50' : isMine ? 'bg-blue-50' : ''}`}>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-700">{formatArrival(item.createdAt)}</td>
                        <td className="px-6 py-4 font-medium text-primary text-sm">{item.uhid}</td>
                        <td className="px-6 py-4 text-sm font-medium">{item.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.age} yrs</td>
                        <td className="px-6 py-4">{serviceBadge(item.service)}</td>
                        <td className="px-6 py-4">
                          {isMine
                            ? <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-300">You</span>
                            : <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">{item.assignedDoctorName || 'Unassigned'}</span>}
                        </td>
                        <td className="px-6 py-4"><StatusBadge tone={QUEUE_STATUS_TONES[item.status]}>{item.status}</StatusBadge></td>
                        <td className="px-6 py-4">{actionCell(item, false)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, displayList.length)} of {displayList.length} patients</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed">Prev</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => setPage(p)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${p === page ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-700 hover:bg-blue-50'}`}>{p}</button>
                  ))}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">{activeTab === 'mine' ? 'No radiology patients assigned to you today' : 'No radiology patients in the line-up'}</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default RadiologyDashboard;
