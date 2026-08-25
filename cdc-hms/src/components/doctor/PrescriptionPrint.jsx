import { Printer } from "lucide-react";
import PrintLetterhead from "../shared/PrintLetterhead";
import usePrint from "../../hooks/usePrint";

const PrescriptionPrint = ({ prescription, onClose }) => {
  const { printRef, handlePrint } = usePrint();

  if (!prescription) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Print Button Bar - Hidden when printing */}
        <div className="print:hidden sticky top-0 bg-white border-b-2 border-gray-200 p-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">Prescription Preview</h3>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 font-semibold transition flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print
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
        <div ref={printRef} className="print-prescription p-6">
          {/* Hospital letterhead — shared component (DRY §4e) */}
          <PrintLetterhead show />

          {/* Prescription Header — prescriber details deliberately live only in
              the signature block below, not here as well. */}
          <div className="mb-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-primary">℞</span>
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide">Prescription No.</p>
                <p className="text-lg font-bold text-gray-800">{prescription.prescriptionNumber}</p>
              </div>
            </div>
            {/* Date sits opposite the number rather than on its own line — it
                fills the space the prescriber block used to occupy. */}
            <div className="text-right">
              <p className="text-xs text-gray-600 uppercase tracking-wide">Date</p>
              <p className="text-lg font-bold text-gray-800">{prescription.date}</p>
            </div>
          </div>

          {/* Patient — one line, no section heading. */}
          <div className="mb-4 text-sm">
            <p>
              <span className="text-gray-600">Patient:</span>{" "}
              <span className="font-semibold text-gray-800">{prescription.patientName}</span>
            </p>
          </div>

          {/* Medications Table */}
          <div className="mb-4">
            <h3 className="font-bold text-gray-800 mb-2">Medications Prescribed</h3>
            <table className="w-full border-collapse border-2 border-gray-300">
              <thead>
                <tr>
                  <th className="border border-gray-300 px-3 py-1.5 text-left text-sm font-bold">No.</th>
                  <th className="border border-gray-300 px-3 py-1.5 text-left text-sm font-bold">Medication Name</th>
                  <th className="border border-gray-300 px-3 py-1.5 text-left text-sm font-bold">Dosage</th>
                  <th className="border border-gray-300 px-3 py-1.5 text-left text-sm font-bold">Frequency</th>
                  <th className="border border-gray-300 px-3 py-1.5 text-left text-sm font-bold">Duration</th>
                </tr>
              </thead>
              <tbody>
                {prescription.medications.map((med, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-3 py-1.5 text-sm">{index + 1}</td>
                    <td className="border border-gray-300 px-3 py-1.5 text-sm font-semibold">{med.name}</td>
                    <td className="border border-gray-300 px-3 py-1.5 text-sm">{med.dosage}</td>
                    <td className="border border-gray-300 px-3 py-1.5 text-sm">{med.frequency}</td>
                    <td className="border border-gray-300 px-3 py-1.5 text-sm">{med.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Special Instructions */}
          {prescription.medications.some(med => med.instructions) && (
            <div className="mb-4">
              <h3 className="font-bold text-gray-800 mb-1.5">Special Instructions</h3>
              <ul className="list-disc list-inside space-y-0.5 text-sm text-gray-700">
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
            <div className="mb-4">
              <h3 className="font-bold text-gray-800 mb-1.5">Additional Notes</h3>
              <p className="text-sm text-gray-700">{prescription.notes}</p>
            </div>
          )}

          {/* Important Notice */}
          <div className="mb-4">
            <p className="text-xs text-gray-700">
              This prescription is valid for 30 days from the date of issue. Do not share medications with others. Complete the full course as prescribed.
            </p>
          </div>

          {/* Doctor Signature */}
          {/* No "Printed on" timestamp: it changed on every reprint, so a
              re-printed copy appeared to carry a later date than the one it was
              issued on. The issue date is in the header and is the only date
              that means anything here. */}
          <div className="pt-4 border-t-2 border-gray-300 break-inside-avoid">
            <div>
              <p className="text-xs text-gray-600 mb-1">Prescribed by:</p>
              {/* Signature space — enough room to sign, without the empty half-page
                  the old h-16 left on a short prescription. */}
              <div className="border-b-2 border-gray-400 w-56 h-9 mb-1.5"></div>
              <p className="font-bold text-gray-800">{prescription.doctorName}</p>
              <p className="text-xs text-gray-600">{prescription.doctorSpecialty}</p>
              {prescription.doctorLicenseNumber && (
                <p className="text-xs text-gray-500 mt-1">Reg. No: {prescription.doctorLicenseNumber}</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PrescriptionPrint;