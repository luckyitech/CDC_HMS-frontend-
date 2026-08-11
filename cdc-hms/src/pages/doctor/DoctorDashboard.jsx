import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, CheckCircle, ClipboardList } from 'lucide-react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import StatusBadge from '../../components/shared/StatusBadge';
import { QUEUE_STATUS_TONES } from '../../utils/statusStyles';
import { useUserContext } from '../../contexts/UserContext';
import { useQueueContext } from '../../contexts/QueueContext';
import useNotificationSound from '../../hooks/useNotificationSound';
import { isConsultationDone, isPendingInjection } from '../../utils/queueStatus';

const QUEUE_PER_PAGE = 15;

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useUserContext();
  const { queue, startConsultation } = useQueueContext();
  const [queuePage, setQueuePage] = useState(1);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'mine'
  const { play } = useNotificationSound();

  const switchTab = (tab) => {
    setActiveTab(tab);
    setQueuePage(1); // reset pagination when switching tabs
  };

  // ── Notification sound — play when a new patient is assigned to this doctor ──
  // Track the set of queue IDs assigned to this doctor; play a chime whenever
  // the set grows (new assignment or internal referral received).
  const prevMyQueueIds = useRef(null);

  useEffect(() => {
    if (!currentUser?.id) return;

    const myIds = new Set(
      queue
        .filter(q =>
          q.assignedDoctorId === currentUser.id &&
          q.status !== 'Completed' &&
          q.status !== 'Removed'
        )
        .map(q => q.id)
    );

    // Skip the very first render — we don't want a sound on page load
    if (prevMyQueueIds.current === null) {
      prevMyQueueIds.current = myIds;
      return;
    }

    const hasNewPatient = [...myIds].some(id => !prevMyQueueIds.current.has(id));
    if (hasNewPatient) play('new');

    prevMyQueueIds.current = myIds;
  }, [queue, currentUser?.id, play]);;
  
  // Returns false when date is missing (prevents old records leaking through)
  const isToday = (dateString) => {
    if (!dateString) return false;
    return new Date(dateString).toDateString() === new Date().toDateString();
  };

  const formatArrival = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return '-';
    const diffMins = Math.round((new Date(endTime) - new Date(startTime)) / 60000);
    if (diffMins >= 60) {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${diffMins}m`;
  };

  const myId = Number(currentUser?.id);

  // ── Today's queue ────────────────────────────────────────────────────────
  // Active patients: show regardless of date — a patient added yesterday who was
  // never discharged must still appear today until their consultation is completed.
  // Completed: only show today's so old discharged records don't clutter the view.
  const todayActive    = queue.filter(q => q.status !== 'Completed' && q.status !== 'Removed');
  const todayCompleted = queue.filter(q => q.status === 'Completed'  && isToday(q.createdAt));
  const todayQueue     = [...todayActive, ...todayCompleted]
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

  // Patients assigned specifically to this doctor today (drives "My Patients" tab)
  const myTodayQueue = todayQueue.filter(q => Number(q.assignedDoctorId) === myId);

  // Which list is active depends on the selected tab
  const displayQueue     = activeTab === 'mine' ? myTodayQueue : todayQueue;
  const queueTotalPages  = Math.ceil(displayQueue.length / QUEUE_PER_PAGE);
  const paginatedQueue   = displayQueue.slice(
    (queuePage - 1) * QUEUE_PER_PAGE,
    queuePage * QUEUE_PER_PAGE
  );

  // ── Clinic-wide stats (all doctors) ─────────────────────────────────────
  // These give the doctor a full picture of how the clinic is running today.
  // Personal view is already available via the "My Patients Today" queue tab.
  const clinicWithDoctor      = todayActive.filter(q => q.status === 'With Doctor');
  // Consultation done = the doctor has finished, whether the patient is waiting
  // on the cashier, the nurse's injection, or already discharged
  const clinicConsultDone     = todayActive.filter(isConsultationDone);
  const clinicCompleted       = todayCompleted.length + clinicConsultDone.length;
  const clinicActiveTotal     = todayActive.length;

  const stats = [
    { title: 'Today\'s Patients', value: todayQueue.length,    Icon: Users,         gradient: 'from-blue-500 to-blue-600'   },
    { title: 'With Doctor',       value: clinicWithDoctor.length, Icon: Clock,       gradient: 'from-cyan-500 to-cyan-600'   },
    { title: 'Completed',         value: clinicCompleted,       Icon: CheckCircle,   gradient: 'from-green-500 to-green-600' },
    { title: 'Active Queue',      value: clinicActiveTotal,     Icon: ClipboardList, gradient: 'from-purple-500 to-purple-600'},
  ].map(s => ({ ...s, value: s.value.toString() }));

  // Status colours and labels live in utils/queueStatus so the doctor's queue,
  // the badges and the action column all agree on what a status means.

  const handleStartConsultation = (queueId, uhid, alreadyWithDoctor) => {
    // Only transition to "With Doctor" on the first click.
    // If status is already "With Doctor" the doctor is continuing — no state change needed.
    // If status is "Awaiting Doctor" (e.g. after a referral) we must call startConsultation
    // so the status transitions correctly, even if consultationStartTime was previously set
    // by the referring doctor.
    if (!alreadyWithDoctor) startConsultation(queueId);
    navigate(`/doctor/consultation/${uhid}`);
  };

  return (
    <div>
      <PageHeader
        title="Doctor Dashboard"
        subtitle={`Welcome back, ${currentUser?.name || 'Doctor'}`}
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.Icon}
            gradient={stat.gradient}
          />
        ))}
      </div>

      {/* Today's Queue - All Patients */}
      <Card title={<span className="flex items-center gap-2"><ClipboardList className="w-5 h-5" />Today's Queue</span>}>
        {/* Tab bar */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-4 w-fit">
          <button
            onClick={() => switchTab('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All Patients
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'all' ? 'bg-primary text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              {todayQueue.length}
            </span>
          </button>
          <button
            onClick={() => switchTab('mine')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              activeTab === 'mine'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            My Patients Today
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'mine' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              {myTodayQueue.length}
            </span>
          </button>
        </div>

        {displayQueue.length > 0 ? (
          <>
            {/* Card list — mobile & tablet (< xl) */}
            <div className="xl:hidden space-y-3">
              {paginatedQueue.map((queueItem) => {
                const isMyPatient = queueItem.assignedDoctorId === currentUser?.id;
                const consultationDone = isConsultationDone(queueItem);

                return (
                  <div
                    key={queueItem.id}
                    className={`border rounded-xl overflow-hidden ${isMyPatient ? 'border-blue-300' : 'border-gray-200'}`}
                  >
                    {/* Card header */}
                    <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 ${isMyPatient ? 'bg-blue-50' : 'bg-gray-50'}`}>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-800 text-sm leading-tight truncate">
                          {queueItem.name}
                          {queueItem.age && <span className="text-xs text-gray-500 font-normal ml-1">({queueItem.age}y)</span>}
                        </p>
                      </div>
                      {isMyPatient && (
                        <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-300 uppercase tracking-wide">
                          Your Patient
                        </span>
                      )}
                    </div>

                    {/* Card body — labelled fields */}
                    <div className="bg-white px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">UHID</p>
                        <p className="text-sm font-semibold text-primary">{queueItem.uhid}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Status</p>
                        <div className="flex flex-col gap-1">
                          <StatusBadge size="xs" tone={QUEUE_STATUS_TONES[queueItem.status]}>
                            {queueItem.status}
                          </StatusBadge>
                          {queueItem.referralType && (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border w-fit ${
                              queueItem.referralType === 'Internal'
                                ? 'bg-purple-50 text-purple-700 border-purple-300'
                                : 'bg-orange-50 text-orange-700 border-orange-300'
                            }`}>
                              {queueItem.referralType === 'Internal' ? 'Internal Referral' : 'External Referral'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Assigned To</p>
                        {isMyPatient ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-300">You</span>
                        ) : (
                          <p className="text-sm text-gray-600 truncate">{queueItem.assignedDoctorName || 'Unassigned'}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Duration</p>
                        <p className="text-sm font-semibold">
                          {consultationDone
                            ? <span className="text-green-600">{formatDuration(queueItem.consultationStartTime, queueItem.consultationEndTime)}</span>
                            : queueItem.consultationStartTime
                              ? <span className="text-blue-600">In Progress</span>
                              : <span className="text-gray-400">—</span>
                          }
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Arrival Time</p>
                        <p className="text-sm text-gray-600">{formatArrival(queueItem.createdAt)}</p>
                      </div>
                    </div>

                    {/* Card footer — action */}
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                      {queueItem.status === 'Completed' ? (
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-300">Done</span>
                      ) : queueItem.status === 'Pending Billing' ? (
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-300">Awaiting Billing</span>
                      ) : isPendingInjection(queueItem) ? (
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 border border-teal-300">With Nurse</span>
                      ) : isMyPatient ? (
                        <Button
                          variant="primary"
                          className="w-full text-xs py-1.5"
                          onClick={() => handleStartConsultation(queueItem.id, queueItem.uhid, queueItem.status === 'With Doctor')}
                        >
                          {queueItem.status === 'With Doctor' ? 'Continue Consultation' : 'Start Consultation'}
                        </Button>
                      ) : queueItem.assignedDoctorId ? (
                        <span className="text-xs text-gray-500">Assigned to <span className="font-semibold text-gray-700">{queueItem.assignedDoctorName || 'Other Doctor'}</span></span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Table — desktop only (xl+) */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">UHID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Patient Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Age</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Assigned To</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedQueue.map((queueItem) => {
                    const isMyPatient = queueItem.assignedDoctorId === currentUser?.id;
                    const consultationDone = isConsultationDone(queueItem);

                    return (
                      <tr key={queueItem.id} className={`hover:bg-blue-50 transition ${isMyPatient && queueItem.status === 'Awaiting Doctor' ? 'bg-purple-50' : isMyPatient ? 'bg-blue-50' : ''}`}>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-700">{formatArrival(queueItem.createdAt)}</td>
                        <td className="px-6 py-4 font-medium text-primary text-sm">{queueItem.uhid}</td>
                        <td className="px-6 py-4 text-sm font-medium">{queueItem.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{queueItem.age} yrs</td>
                        <td className="px-6 py-4">
                          {isMyPatient ? (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-300">You</span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
                              {queueItem.assignedDoctorName || 'Unassigned'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <StatusBadge tone={QUEUE_STATUS_TONES[queueItem.status]}>
                              {queueItem.status}
                            </StatusBadge>
                            {/* Referral badge — shown when this patient arrived via referral */}
                            {queueItem.referralType && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border w-fit ${
                                queueItem.referralType === 'Internal'
                                  ? 'bg-purple-50 text-purple-700 border-purple-300'
                                  : 'bg-orange-50 text-orange-700 border-orange-300'
                              }`}>
                                {queueItem.referralType === 'Internal' ? 'Internal Referral' : 'External Referral'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {consultationDone
                            ? <span className="text-green-600 font-semibold">{formatDuration(queueItem.consultationStartTime, queueItem.consultationEndTime)}</span>
                            : queueItem.consultationStartTime
                              ? <span className="text-blue-600 font-semibold">In Progress</span>
                              : <span className="text-gray-400">-</span>
                          }
                        </td>
                        <td className="px-6 py-4">
                          {queueItem.status === 'Completed' ? (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-300">Done</span>
                          ) : queueItem.status === 'Pending Billing' ? (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-300">Awaiting Billing</span>
                          ) : isPendingInjection(queueItem) ? (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 border border-teal-300">With Nurse</span>
                          ) : isMyPatient ? (
                            <Button
                              variant="primary"
                              className="text-xs py-1 px-3"
                              onClick={() => handleStartConsultation(queueItem.id, queueItem.uhid, queueItem.status === 'With Doctor')}
                            >
                              {queueItem.status === 'With Doctor' ? 'Continue' : 'Start Consultation'}
                            </Button>
                          ) : queueItem.assignedDoctorId ? (
                            <Button variant="outline" className="text-xs py-1 px-3 opacity-50 cursor-not-allowed" disabled>
                              Assigned to {queueItem.assignedDoctorName?.split(' ')[0] || 'Other'}
                            </Button>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {queueTotalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Showing {(queuePage - 1) * QUEUE_PER_PAGE + 1}–{Math.min(queuePage * QUEUE_PER_PAGE, displayQueue.length)} of {displayQueue.length} patients
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setQueuePage((p) => Math.max(1, p - 1))}
                    disabled={queuePage === 1}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>
                  {Array.from({ length: queueTotalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setQueuePage(page)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${
                        page === queuePage
                          ? "bg-primary text-white border-primary"
                          : "border-gray-300 text-gray-700 hover:bg-blue-50"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setQueuePage((p) => Math.min(queueTotalPages, p + 1))}
                    disabled={queuePage === queueTotalPages}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {activeTab === 'mine'
                ? 'No patients assigned to you today'
                : 'No patients in queue currently'}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default DoctorDashboard;