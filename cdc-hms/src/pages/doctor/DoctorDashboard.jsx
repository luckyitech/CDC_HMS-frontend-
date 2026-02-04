import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import { useUserContext } from '../../contexts/UserContext';
import { useQueueContext } from '../../contexts/QueueContext';
import { usePatientContext } from '../../contexts/PatientContext';

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useUserContext();
  const { getQueueByStatus, startConsultation } = useQueueContext();
  const { getPatientByUHID } = usePatientContext();
  
  const isToday = (dateString) => {
    if (!dateString) return true;
    return new Date(dateString).toDateString() === new Date().toDateString();
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

  // Get today's patients only
  const withDoctorQueue = getQueueByStatus('With Doctor').filter(q => isToday(q.createdAt));
  const completedQueue = getQueueByStatus('Completed').filter(q => isToday(q.createdAt));
  const todayQueue = [...withDoctorQueue, ...completedQueue];

  // Calculate stats for current doctor
  const myWithDoctor = withDoctorQueue.filter(q => q.assignedDoctorId === currentUser?.id);
  const myCompleted = completedQueue.filter(q => q.assignedDoctorId === currentUser?.id);

  const stats = [
    { title: 'Today\'s Patients', value: (myWithDoctor.length + myCompleted.length).toString(), icon: '👥', gradient: 'from-blue-500 to-blue-600' },
    { title: 'Waiting', value: myWithDoctor.length.toString(), icon: '⏳', gradient: 'from-cyan-500 to-cyan-600' },
    { title: 'Completed', value: myCompleted.length.toString(), icon: '✅', gradient: 'from-green-500 to-green-600' },
    { title: 'Total Queue', value: todayQueue.length.toString(), icon: '📋', gradient: 'from-purple-500 to-purple-600' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'In Progress':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Waiting':
      case 'With Doctor':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const handleStartConsultation = (uhid) => {
    startConsultation(uhid);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
        {stats.map((stat) => (
          <div key={stat.title} className={`bg-gradient-to-br ${stat.gradient} rounded-xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300 hover:shadow-2xl`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base lg:text-lg font-semibold opacity-90">{stat.title}</h3>
              <span className="text-3xl lg:text-4xl">{stat.icon}</span>
            </div>
            <p className="text-4xl lg:text-5xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Today's Queue - All Patients */}
      <Card title="📋 Today's Queue">
        <div className="overflow-x-auto">
          {todayQueue.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Time</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">UHID</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Patient Name</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase hidden md:table-cell">Age</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Assigned To</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Duration</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {todayQueue.map((queueItem) => {
                  const patient = getPatientByUHID(queueItem.uhid);
                  const isMyPatient = queueItem.assignedDoctorId === currentUser?.id;
                  
                  return (
                    <tr key={queueItem.id} className={`hover:bg-gray-50 transition ${isMyPatient ? 'bg-blue-50' : ''}`}>
                      <td className="px-4 lg:px-6 py-4 text-sm font-semibold text-gray-700">{queueItem.arrivalTime}</td>
                      <td className="px-4 lg:px-6 py-4 font-medium text-primary text-sm">{queueItem.uhid}</td>
                      <td className="px-4 lg:px-6 py-4 text-sm font-medium">{queueItem.name}</td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-gray-600 hidden md:table-cell">{queueItem.age} yrs</td>
                      <td className="px-4 lg:px-6 py-4">
                        {isMyPatient ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-300">
                            You
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
                            {queueItem.assignedDoctorName || 'Unassigned'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(queueItem.status)}`}>
                          {queueItem.status}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm">
                        {queueItem.status === 'Completed'
                          ? <span className="text-green-600 font-semibold">{formatDuration(queueItem.consultationStartTime, queueItem.consultationEndTime)}</span>
                          : queueItem.consultationStartTime
                            ? <span className="text-blue-600 font-semibold">In Progress</span>
                            : <span className="text-gray-400">-</span>
                        }
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        {queueItem.status === 'Completed' ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-300">
                            Done
                          </span>
                        ) : isMyPatient ? (
                          <Button
                            variant="primary"
                            className="text-xs py-1 px-3"
                            onClick={() => handleStartConsultation(queueItem.uhid)}
                          >
                            {queueItem.consultationStartTime ? 'Continue' : 'Start Consultation'}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            className="text-xs py-1 px-3 opacity-50 cursor-not-allowed"
                            disabled
                          >
                            Assigned to {queueItem.assignedDoctorName?.split(' ')[1] || 'Other'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No patients in queue currently</p>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Card title="⚡ Quick Actions">
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/doctor/my-patients')}
              className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition border-l-4 border-blue-500"
            >
              <p className="font-semibold text-blue-700">👥 View All Patients</p>
            </button>
            <button 
              onClick={() => navigate('/doctor/prescriptions')}
              className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition border-l-4 border-green-500"
            >
              <p className="font-semibold text-green-700">💊 My Prescriptions</p>
            </button>
            <button 
              onClick={() => navigate('/doctor/reports')}
              className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition border-l-4 border-purple-500"
            >
              <p className="font-semibold text-purple-700">📊 Generate Reports</p>
            </button>
          </div>
        </Card>

        <Card title="🚨 Patients Alerts" className="md:col-span-2">
          {myWithDoctor.length > 0 ? (
            <div className="space-y-3">
              {myWithDoctor.slice(0, 3).map((queueItem) => {
                const patient = getPatientByUHID(queueItem.uhid);
                return (
                  <div key={queueItem.id} className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
                    <p className="font-semibold text-blue-700">Patient Waiting</p>
                    <p className="text-sm text-blue-600 mt-1">
                      {queueItem.name} ({queueItem.uhid}) - Arrived at {queueItem.arrivalTime}
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