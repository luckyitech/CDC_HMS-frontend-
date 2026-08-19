import { Printer } from 'lucide-react';
import PrintLetterhead from '../../shared/PrintLetterhead';
import usePrint from '../../../hooks/usePrint';
import ThyroidReportBody from './ThyroidReportBody';

/**
 * Prints a signed thyroid ultrasound report on the CDC letterhead, from the
 * frozen snapshot. Same modal + usePrint idiom as PrescriptionPrint; the report
 * body is the shared tabulated ThyroidReportBody (matches the clinic template).
 */
export default function ThyroidUsReportPrint({ report, nodules = [], patient, onClose }) {
  const { printRef, handlePrint } = usePrint();
  if (!report) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="print:hidden sticky top-0 bg-white border-b-2 border-gray-200 p-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">Thyroid Ultrasound Report</h3>
          <div className="flex gap-3">
            <button onClick={handlePrint} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"><Printer className="w-4 h-4" /> Print</button>
            <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold">Close</button>
          </div>
        </div>

        <div ref={printRef} className="p-8">
          <PrintLetterhead show />
          <ThyroidReportBody report={report} nodules={nodules} patient={patient} />
        </div>
      </div>
    </div>
  );
}
