// LabTestDetailsModal.jsx - Reusable modal component for viewing test details

import Button from "../shared/Button";

const LabTestDetailsModal = ({ test, onClose }) => {
  if (!test) return null;

  const getInterpretationColor = (interpretation) => {
    switch (interpretation) {
      case 'Normal': return 'bg-green-100 text-green-700 border-green-300';
      case 'Abnormal': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'Critical': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const formatTestResults = (results) => {
    return Object.entries(results).map(([key, value]) => ({
      parameter: key,
      value: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b-2 border-gray-200 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Laboratory Test Details</h2>
              <p className="text-sm text-gray-600 mt-1">Complete test information and results</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex flex-wrap items-center gap-3">
            <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${getInterpretationColor(test.interpretation)}`}>
              {test.interpretation}
            </span>
            {test.isCritical && (
              <span className="px-4 py-2 bg-red-500 text-white rounded-full text-sm font-bold animate-pulse">
                🚨 CRITICAL RESULT
              </span>
            )}
            {test.status === 'Completed' && (
              <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-bold border-2 border-green-300">
                ✓ Completed
              </span>
            )}
          </div>

          {/* Patient Information */}
          <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
            <h3 className="font-bold text-gray-800 mb-3">👤 Patient Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Patient Name</p>
                <p className="font-bold text-gray-800">{test.patientName}</p>
              </div>
              <div>
                <p className="text-gray-600">UHID</p>
                <p className="font-bold text-primary">{test.uhid}</p>
              </div>
              <div>
                <p className="text-gray-600">Test Type</p>
                <p className="font-bold text-gray-800">{test.testType}</p>
              </div>
              <div>
                <p className="text-gray-600">Sample Type</p>
                <p className="font-bold text-gray-800">{test.sampleType}</p>
              </div>
            </div>
          </div>

          {/* Test Results */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-bold text-gray-800 mb-3">🔬 Test Results</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-bold text-gray-700">Parameter</th>
                    <th className="px-4 py-2 text-left text-sm font-bold text-gray-700">Result</th>
                    <th className="px-4 py-2 text-left text-sm font-bold text-gray-700">Normal Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {formatTestResults(test.results).map((item, index) => (
                    <tr key={index} className="hover:bg-gray-100">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800 capitalize">
                        {item.parameter.replace(/([A-Z])/g, ' $1').trim()}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">{item.value}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{test.normalRange}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Order Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
              <h3 className="font-bold text-gray-800 mb-2">📋 Order Details</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-gray-600">Ordered By</p>
                  <p className="font-semibold text-gray-800">{test.orderedBy}</p>
                </div>
                <div>
                  <p className="text-gray-600">Order Date & Time</p>
                  <p className="font-semibold text-gray-800">
                    {new Date(test.orderedDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })} at {test.orderedTime}
                  </p>
                </div>
                {test.priority && (
                  <div>
                    <p className="text-gray-600">Priority</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      test.priority === 'Urgent' 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {test.priority}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
              <h3 className="font-bold text-gray-800 mb-2">✅ Completion Details</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-gray-600">Completed By</p>
                  <p className="font-semibold text-gray-800">{test.completedBy}</p>
                </div>
                <div>
                  <p className="text-gray-600">Completion Date & Time</p>
                  <p className="font-semibold text-gray-800">
                    {new Date(test.completedDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })} at {test.completedTime}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Report Status</p>
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                    {test.reportGenerated ? 'Report Generated' : 'Pending Report'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Technician Notes */}
          {test.technicianNotes && (
            <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
              <h3 className="font-bold text-gray-800 mb-2">📝 Technician Notes</h3>
              <p className="text-sm text-gray-700">{test.technicianNotes}</p>
            </div>
          )}

          {/* Critical Alert */}
          {test.isCritical && (
            <div className="bg-red-50 rounded-lg p-4 border-2 border-red-500">
              <div className="flex items-start gap-3">
                <span className="text-3xl">⚠️</span>
                <div>
                  <h3 className="font-bold text-red-800 mb-1">Critical Result Protocol</h3>
                  <p className="text-sm text-red-700">
                    This result has been flagged as critical and requires immediate physician notification.
                    Doctor should be contacted within 15 minutes of result verification.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button variant="outline">
              🖨️ Print Report
            </Button>
            <Button variant="outline">
              📧 Email Results
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabTestDetailsModal;