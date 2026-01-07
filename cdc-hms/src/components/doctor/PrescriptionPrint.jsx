const PrescriptionPrint = ({ prescription, onClose }) => {
  if (!prescription) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Print Button Bar - Hidden when printing */}
        <div className="print:hidden sticky top-0 bg-white border-b-2 border-gray-200 p-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">Prescription Preview</h3>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 font-semibold transition"
            >
              🖨️ Print
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>

        {/* Printable Prescription Content */}
        <div className="print-prescription p-8">
          {/* Hospital Header */}
          <div className="text-center border-b-4 border-primary pb-6 mb-6">
            <h1 className="text-3xl font-bold text-primary mb-2">CDC DIABETES CARE CENTER</h1>
            <p className="text-gray-600">Center for Diabetes Care & Management</p>
            <p className="text-sm text-gray-600 mt-1">
              📍 123 Medical Plaza, Healthcare District | 📞 +1-234-567-8900 | 📧 info@cdcdiabetes.com
            </p>
          </div>

          {/* Prescription Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-4xl font-bold text-primary">℞</span>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Prescription No.</p>
                  <p className="text-lg font-bold text-gray-800">{prescription.prescriptionNumber}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                <strong>Date:</strong> {prescription.date}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-800">{prescription.doctorName}</p>
              <p className="text-sm text-gray-600">{prescription.doctorSpecialty}</p>
              <p className="text-xs text-gray-500 mt-1">Reg. No: MED-12345</p>
            </div>
          </div>

          {/* Patient Information */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6 border-l-4 border-primary">
            <h3 className="font-bold text-gray-800 mb-2">Patient Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Name:</p>
                <p className="font-semibold text-gray-800">{prescription.patientName}</p>
              </div>
              <div>
                <p className="text-gray-600">Patient ID:</p>
                <p className="font-semibold text-gray-800">{prescription.uhid}</p>
              </div>
            </div>
          </div>

          {/* Diagnosis */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <span className="text-red-600">🩺</span> Diagnosis
            </h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded">{prescription.diagnosis}</p>
          </div>

          {/* Medications Table */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-green-600">💊</span> Medications Prescribed
            </h3>
            <table className="w-full border-collapse border-2 border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-bold">No.</th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-bold">Medication Name</th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-bold">Dosage</th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-bold">Frequency</th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-bold">Duration</th>
                </tr>
              </thead>
              <tbody>
                {prescription.medications.map((med, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-3 text-sm">{index + 1}</td>
                    <td className="border border-gray-300 px-4 py-3 text-sm font-semibold">{med.name}</td>
                    <td className="border border-gray-300 px-4 py-3 text-sm">{med.dosage}</td>
                    <td className="border border-gray-300 px-4 py-3 text-sm">{med.frequency}</td>
                    <td className="border border-gray-300 px-4 py-3 text-sm">{med.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Special Instructions */}
          {prescription.medications.some(med => med.instructions) && (
            <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
              <h3 className="font-bold text-gray-800 mb-2">⚠️ Special Instructions</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                {prescription.medications.filter(med => med.instructions).map((med, index) => (
                  <li key={index}>
                    <strong>{med.name}:</strong> {med.instructions}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Additional Notes */}
          {prescription.notes && (
            <div className="mb-6">
              <h3 className="font-bold text-gray-800 mb-2">📝 Additional Notes</h3>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{prescription.notes}</p>
            </div>
          )}

          {/* Important Notice */}
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6">
            <p className="text-xs text-red-800 font-semibold">
              ⚠️ This prescription is valid for 30 days from the date of issue. 
              Do not share medications with others. Complete the full course as prescribed.
            </p>
          </div>

          {/* Doctor Signature */}
          <div className="flex justify-between items-end pt-8 border-t-2 border-gray-300">
            <div>
              <p className="text-xs text-gray-600 mb-1">Prescribed by:</p>
              <div className="border-b-2 border-gray-400 w-64 h-16 mb-2"></div>
              <p className="font-bold text-gray-800">{prescription.doctorName}</p>
              <p className="text-xs text-gray-600">{prescription.doctorSpecialty}</p>
              <p className="text-xs text-gray-500 mt-1">Reg. No: MED-12345</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">This is a computer-generated prescription</p>
              <p className="text-xs text-gray-500">Printed on: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Print Styles */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-prescription, .print-prescription * {
              visibility: visible;
            }
            .print-prescription {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 20px;
            }
            .print\\:hidden {
              display: none !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default PrescriptionPrint;