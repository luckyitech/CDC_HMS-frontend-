import { useState } from 'react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import { usePatientContext } from '../../contexts/PatientContext';
import { useQueueContext } from '../../contexts/QueueContext';

const PatientSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [queuePriority, setQueuePriority] = useState('Normal');
  const [queueReason, setQueueReason] = useState('');
  
  const { searchPatients } = usePatientContext();
  const { addToQueue, isInQueue } = useQueueContext();

  const handleSearch = () => {
    if (searchTerm.trim()) {
      const results = searchPatients(searchTerm);
      setSearchResults(results);
      setHasSearched(true);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleAddToQueueClick = (patient) => {
    setSelectedPatient(patient);
    setQueuePriority('Normal');
    setQueueReason('');
    setShowQueueModal(true);
  };

  const handleConfirmAddToQueue = () => {
    if (selectedPatient) {
      const result = addToQueue(selectedPatient, queuePriority, queueReason);
      if (result.success) {
        alert(`${selectedPatient.name} added to queue successfully!`);
        setShowQueueModal(false);
        setSelectedPatient(null);
      } else {
        alert(result.message);
      }
    }
  };

  return (
    <div>
      <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-6">Patient Search</h2>

      {/* Search Card */}
      <Card title="Search Patient">
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter patient name, UHID, or phone number..."
            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary text-base"
          />
          <Button onClick={handleSearch} className="sm:w-auto">
            Search
          </Button>
        </div>
      </Card>

      {/* Search Results */}
      {hasSearched && (
        <Card title={`Search Results (${searchResults.length})`} className="mt-6">
          {searchResults.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">UHID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Age/Gender</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Diabetes Type</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {searchResults.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-primary">{patient.uhid}</td>
                      <td className="px-6 py-4 font-semibold">{patient.name}</td>
                      <td className="px-6 py-4 text-sm">{patient.age} yrs • {patient.gender}</td>
                      <td className="px-6 py-4 text-sm">{patient.phone}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                          {patient.diabetesType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          patient.status === 'Active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {patient.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            className="text-xs py-1 px-3"
                          >
                            View Details
                          </Button>
                          {isInQueue(patient.uhid) ? (
                            <Button 
                              variant="secondary" 
                              className="text-xs py-1 px-3"
                              disabled
                            >
                              In Queue
                            </Button>
                          ) : (
                            <Button 
                              variant="primary" 
                              className="text-xs py-1 px-3"
                              onClick={() => handleAddToQueueClick(patient)}
                            >
                              Add to Queue
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-6xl mb-4">🔍</p>
              <p className="text-xl font-semibold text-gray-800 mb-2">No patients found</p>
              <p className="text-gray-600">Try searching with a different term</p>
            </div>
          )}
        </Card>
      )}

      {!hasSearched && (
        <Card className="mt-6">
          <div className="text-center py-12">
            <p className="text-6xl mb-4">👆</p>
            <p className="text-xl font-semibold text-gray-800 mb-2">Search for a patient</p>
            <p className="text-gray-600">Enter name, UHID, or phone number to find patient records</p>
          </div>
        </Card>
      )}

      {/* Add to Queue Modal */}
      {showQueueModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Add Patient to Queue</h3>
            
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="font-semibold text-gray-800">{selectedPatient.name}</p>
              <p className="text-sm text-gray-600">UHID: {selectedPatient.uhid}</p>
              <p className="text-sm text-gray-600">{selectedPatient.age} yrs • {selectedPatient.gender}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Priority
              </label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="priority"
                    value="Normal"
                    checked={queuePriority === 'Normal'}
                    onChange={(e) => setQueuePriority(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm">Normal</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="priority"
                    value="Urgent"
                    checked={queuePriority === 'Urgent'}
                    onChange={(e) => setQueuePriority(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-red-600 font-semibold">Urgent</span>
                </label>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reason for Visit
              </label>
              <input
                type="text"
                value={queueReason}
                onChange={(e) => setQueueReason(e.target.value)}
                placeholder="e.g., Routine checkup, Follow-up, Emergency"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowQueueModal(false);
                  setSelectedPatient(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleConfirmAddToQueue}
              >
                Add to Queue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientSearch;