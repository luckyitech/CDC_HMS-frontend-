import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, CheckCircle, ClipboardList, Zap, AlertTriangle } from 'lucide-react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import { useUserContext } from '../../contexts/UserContext';
import { useQueueContext } from '../../contexts/QueueContext';
import useNotificationSound from '../../hooks/useNotificationSound';

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

  // Active patients from ANY day — excludes Completed and Removed
  const activePatients = queue.filter(q => q.status !== 'Completed' && q.status !== 'Removed');

  // Completed (discharged) patients from TODAY only — for day-of reference
  const todayCompleted = queue.filter(q => q.status === 'Completed' && isToday(q.createdAt));

  // Combined today's queue, sorted by arrival time
  const todayQueue = [...activePatients, ...todayCompleted]
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

  // Patients assigned specifically to this doctor today
  const myTodayQueue = todayQueue.filter(q => q.assignedDoctorId === currentUser?.id);

  // Which list is active depends on the selected tab
  const displayQueue = activeTab === 'mine' ? myTodayQueue : todayQueue;

  const queueTotalPages = Math.ceil(displayQueue.length / QUEUE_PER_PAGE);
  const paginatedQueue = displayQueue.slice(
    (queuePage - 1) * QUEUE_PER_PAGE,
    queuePage * QUEUE_PER_PAGE
  );

  // Stats scoped to this doctor only
  const myWithDoctor     = activePatients.filter(q => q.status === 'With Doctor'     && q.assignedDoctorId === currentUser?.id);
  const myPendingBilling = activePatients.filter(q => q.status === 'Pending Billing' && q.assignedDoctorId === currentUser?.id);
  const myCompleted      = todayCompleted.filter(q => q.assignedDoctorId === currentUser?.id);

  const stats = [
    { title: 'Today\'s Patients', value: (myWithDoctor.length + myPendingBilling.length + myCompleted.length).toString(), Icon: Users,         gradient: 'from-blue-500 to-blue-600' },
    { title: 'With Doctor',       value: myWithDoctor.length.toString(),                                                  Icon: Clock,         gradient: 'from-cyan-500 to-cyan-600' },
    { title: 'Completed',         value: (myPendingBilling.length + myCompleted.length).toString(),                       Icon: CheckCircle,   gradient: 'from-green-500 to-green-600' },
    { title: 'Total Queue',       value: todayQueue.length.toString(),                                                    Icon: ClipboardList, gradient: 'from-purple-500 to-purple-600' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Awaiting Triage':  return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'In Triage':        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Awaiting Doctor':  return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'With Doctor':      return 'bg-green-100 text-green-700 border-green-300';
      case 'Pending Billing':  return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'Completed':        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:                 return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Doctor Dashboard</h2>
          <p className="text-gray-600 mt-1">Welcome back, {currentUser?.name || 'Doctor'}</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate('/doctor/patients')}>
            View Patients
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6">
        {stats.map((stat) => (
          <div key={stat.title} className={`bg-gradient-to-br ${stat.gradient} rounded-xl shadow-xl p-4 lg:p-6 text-white transform hover:scale-105 transition-all duration-300 hover:shadow-2xl`}>
            <div className="flex items-center justify-between mb-2 lg:mb-4">
              <h3 className="text-xs sm:text-sm lg:text-lg font-semibold opacity-90 leading-tight">{stat.title}</h3>
              <stat.Icon className="w-6 h-6 lg:w-10 lg:h-10 flex-shrink-0 ml-1" />
            </div>
            <p className="text-3xl lg:text-5xl font-bold">{stat.value}</p>
          </div>
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
                const consultationDone = queueItem.status === 'Completed' || queueItem.status === 'Pending Billing';

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
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${getStatusColor(queueItem.status)}`}>
                            {queueItem.status}
                          </span>
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
                    const consultationDone = queueItem.status === 'Completed' || queueItem.status === 'Pending Billing';

                    return (
                      <tr key={queueItem.id} className={`hover:bg-gray-50 transition ${isMyPatient && queueItem.status === 'Awaiting Doctor' ? 'bg-purple-50' : isMyPatient ? 'bg-blue-50' : ''}`}>
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
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${getStatusColor(queueItem.status)}`}>
                              {queueItem.status}
                            </span>
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
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setQueuePage((p) => Math.min(queueTotalPages, p + 1))}
                    disabled={queuePage === queueTotalPages}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Card title={<span className="flex items-center gap-2"><Zap className="w-5 h-5" />Quick Actions</span>}>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/doctor/patients')}
              className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition border-l-4 border-blue-500"
            >
              <p className="font-semibold text-blue-700 flex items-center gap-2"><Users className="w-4 h-4" />View All Patients</p>
            </button>
            {/* <button 
              onClick={() => navigate('/doctor/prescriptions')}
              className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition border-l-4 border-green-500"
            >
              <p className="font-semibold text-green-700">💊 My Prescriptions</p>
            </button> */}
            {/* <button 
              onClick={() => navigate('/doctor/reports')}
              className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition border-l-4 border-purple-500"
            >
              <p className="font-semibold text-purple-700">📊 Generate Reports</p>
            </button> */}
          </div>
        </Card>

        <Card title={<span className="flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Patients Alerts</span>} className="md:col-span-2">
          {myWithDoctor.length > 0 ? (
            <div className="space-y-3">
              {myWithDoctor.slice(0, 3).map((queueItem) => {
                return (
                  <div key={queueItem.id} className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
                    <p className="font-semibold text-blue-700">Patient Waiting</p>
                    <p className="text-sm text-blue-600 mt-1">
                      {queueItem.name} ({queueItem.uhid}) - Arrived at {formatArrival(queueItem.createdAt)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No patients assigned to you currently</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DoctorDashboard;