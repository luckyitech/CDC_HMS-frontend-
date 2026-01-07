// LabTestPrint.jsx - Print component for lab reports

const LabTestPrint = ({ test, onClose }) => {
  if (!test) return null;

  const formatTestResults = (results) => {
    return Object.entries(results).map(([key, value]) => ({
      parameter: key.replace(/([A-Z])/g, ' $1').trim(),
      value: value
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-content, #print-content * {
            visibility: visible;
          }
          #print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>

      {/* Action Buttons (No Print) */}
      <div className="no-print flex justify-between items-center p-4 bg-gray-100 border-b-2 border-gray-300">
        <h2 className="text-xl font-bold text-gray-800">Print Preview - Laboratory Report</h2>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            🖨️ Print
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-semibold"
          >
            Close
          </button>
        </div>
      </div>

      {/* Print Content */}
      <div id="print-content" className="max-w-4xl mx-auto p-8 bg-white">
        {/* Hospital Header */}
        <div className="border-b-4 border-primary pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-primary">CDC DIABETES CLINIC</h1>
              <p className="text-sm text-gray-600 mt-1">Comprehensive Diabetes Care</p>
              <p className="text-xs text-gray-500 mt-1">Nairobi, Kenya</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-800">Laboratory Report</p>
              <p className="text-xs text-gray-600">Report ID: LAB-{test.id}</p>
              <p className="text-xs text-gray-600">Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Patient Information */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3 border-b-2 border-gray-300 pb-2">
            PATIENT INFORMATION
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div>
              <span className="text-gray-600">Patient Name:</span>
              <span className="ml-2 font-semibold text-gray-800">{test.patientName}</span>
            </div>
            <div>
              <span className="text-gray-600">UHID:</span>
              <span className="ml-2 font-semibold text-gray-800">{test.uhid}</span>
            </div>
            <div>
              <span className="text-gray-600">Sample Type:</span>
              <span className="ml-2 font-semibold text-gray-800">{test.sampleType}</span>
            </div>
            <div>
              <span className="text-gray-600">Test Type:</span>
              <span className="ml-2 font-semibold text-gray-800">{test.testType}</span>
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3 border-b-2 border-gray-300 pb-2">
            LABORATORY RESULTS
          </h2>
          <table className="w-full border-collapse border-2 border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-bold text-gray-700">
                  Parameter
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-bold text-gray-700">
                  Result
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-bold text-gray-700">
                  Normal Range
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-bold text-gray-700">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {formatTestResults(test.results).map((item, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-800 capitalize">
                    {item.parameter}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm font-bold text-gray-900">
                    {item.value}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-xs text-gray-600">
                    {test.normalRange}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm">
                    <span className={`font-bold ${
                      test.interpretation === 'Normal' ? 'text-green-700' :
                      test.interpretation === 'Abnormal' ? 'text-yellow-700' :
                      'text-red-700'
                    }`}>
                      {test.interpretation}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Interpretation */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3 border-b-2 border-gray-300 pb-2">
            INTERPRETATION
          </h2>
          <div className="bg-gray-50 p-4 rounded border border-gray-300">
            <p className="text-sm text-gray-700">
              <strong>Result Status:</strong> {test.interpretation}
            </p>
            {test.isCritical && (
              <p className="text-sm text-red-700 font-bold mt-2">
                ⚠️ CRITICAL RESULT - Immediate physician attention required
              </p>
            )}
            {test.technicianNotes && (
              <p className="text-sm text-gray-700 mt-2">
                <strong>Technician Notes:</strong> {test.technicianNotes}
              </p>
            )}
          </div>
        </div>

        {/* Test Details */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3 border-b-2 border-gray-300 pb-2">
            TEST DETAILS
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div>
              <span className="text-gray-600">Ordered By:</span>
              <span className="ml-2 font-semibold text-gray-800">{test.orderedBy}</span>
            </div>
            <div>
              <span className="text-gray-600">Order Date:</span>
              <span className="ml-2 font-semibold text-gray-800">
                {new Date(test.orderedDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })} at {test.orderedTime}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Completed By:</span>
              <span className="ml-2 font-semibold text-gray-800">{test.completedBy}</span>
            </div>
            <div>
              <span className="text-gray-600">Completion Date:</span>
              <span className="ml-2 font-semibold text-gray-800">
                {new Date(test.completedDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })} at {test.completedTime}
              </span>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="mb-6 pt-6 border-t-2 border-gray-300">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-gray-600 mb-8">Laboratory Technician</p>
              <div className="border-t-2 border-gray-800 pt-1">
                <p className="text-sm font-semibold text-gray-800">{test.completedBy}</p>
                <p className="text-xs text-gray-600">Signature & Date</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-8">Reviewing Physician</p>
              <div className="border-t-2 border-gray-800 pt-1">
                <p className="text-sm font-semibold text-gray-800">{test.orderedBy}</p>
                <p className="text-xs text-gray-600">Signature & Date</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-300 pt-4">
          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Important Notice:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>This report is computer-generated and electronically verified</li>
              <li>Results should be interpreted in conjunction with clinical findings</li>
              <li>For any queries, please contact the laboratory at +254 700 000 000</li>
              <li>This report is confidential and for the use of the named patient only</li>
            </ul>
          </div>
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">
              CDC Diabetes Clinic Laboratory • Nairobi, Kenya • www.cdc-diabetes.co.ke
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Generated on {new Date().toLocaleString()} • Page 1 of 1
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabTestPrint;