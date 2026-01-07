import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import { useQueueContext } from '../../contexts/QueueContext';

const QueueManagement = () => {
  const { queue, callNextPatient, removeFromQueue, getQueueStats } = useQueueContext();
  
  const stats = getQueueStats();

  const getStatusColor = (status) => {
    switch (status) {
      case 'Waiting': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'In Triage': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'With Doctor': return 'bg-green-100 text-green-700 border-green-300';
      case 'Completed': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getPriorityColor = (priority) => {
    return priority === 'Urgent' 
      ? 'bg-red-100 text-red-700 border-red-300' 
      : 'bg-green-100 text-green-700 border-green-300';
  };

  const handleCallNext = () => {
    const result = callNextPatient();
    if (result.success) {
      alert(`${result.patient.name} called for triage`);
    } else {
      alert(result.message);
    }
  };

  const handleRemove = (uhid, name) => {
    if (window.confirm(`Remove ${name} from queue?`)) {
      removeFromQueue(uhid);
    }
  };

  return (
    <div>
      <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-6">Queue Management</h2>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 lg:gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Total in Queue</p>
          <p className="text-4xl font-bold mt-2">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Waiting</p>
          <p className="text-4xl font-bold mt-2">{stats.waiting}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">In Progress</p>
          <p className="text-4xl font-bold mt-2">{stats.inTriage + stats.withDoctor}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Urgent</p>
          <p className="text-4xl font-bold mt-2">{stats.urgent}</p>
        </div>
      </div>

      {/* Queue Table */}
      <Card title="Current Queue">
        {queue.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">UHID</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Patient Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Arrival Time</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {queue.map((patient, index) => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold text-gray-800">{index + 1}</td>
                    <td className="px-6 py-4 font-medium text-primary">{patient.uhid}</td>
                    <td className="px-6 py-4 font-semibold">{patient.name}</td>
                    <td className="px-6 py-4 text-sm">{patient.arrivalTime}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(patient.priority)}`}>
                        {patient.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(patient.status)}`}>
                        {patient.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{patient.reason}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {patient.status === 'Waiting' && index === 0 && (
                          <Button 
                            variant="primary" 
                            className="text-xs py-1 px-3"
                            onClick={handleCallNext}
                          >
                            Call Next
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          className="text-xs py-1 px-3"
                          onClick={() => handleRemove(patient.uhid, patient.name)}
                        >
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-6xl mb-4">📋</p>
            <p className="text-xl font-semibold text-gray-800 mb-2">No patients in queue</p>
            <p className="text-gray-600">Queue is empty. Patients will appear here once added.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default QueueManagement;