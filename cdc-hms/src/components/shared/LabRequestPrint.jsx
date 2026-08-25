// LabRequestPrint.jsx — the printable laboratory requisition (the preview that
// opens on Save & print). Reuses the shared clinic letterhead (PrintLetterhead,
// DRY). This is a REQUEST, not a report: no results column, and no prices ever.
import usePrint from "../../hooks/usePrint";
import PrintLetterhead from "./PrintLetterhead";

const fmtDay = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

/**
 * Props:
 *   request: {
 *     requisitionNumber, orderedDate, orderedTime, priority, notes,
 *     requestedBy,        // display name of the author (role-aware)
 *     onBehalfOfDoctor,   // "Dr. …" when a nurse raised it (else null)
 *     tests: [{ testType, sampleType }]
 *   }
 *   patient  — { name, uhid, age, gender }
 *   onClose
 *   onBackToEdit  (optional) — reopen the request in the form for editing
 */
const LabRequestPrint = ({ request, patient, onClose, onBackToEdit }) => {
  const { printRef, handlePrint } = usePrint();
  if (!request) return null;

  const tests = request.tests || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Toolbar — hidden when printing (DRY: same pattern as PrescriptionPrint) */}
        <div className="print:hidden sticky top-0 bg-white border-b-2 border-gray-200 p-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">Laboratory Request Preview</h3>
          <div className="flex gap-3">
            {onBackToEdit && (
              <button
                onClick={onBackToEdit}
                className="px-5 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-blue-50 font-semibold text-sm"
              >
                ‹ Back to edit
              </button>
            )}
            <button
              onClick={handlePrint}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 font-semibold transition flex items-center gap-2"
            >
              🖨️ Print
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition"
            >
              Done
            </button>
          </div>
        </div>

        {/* Printed content */}
        <div ref={printRef} className="print-target p-8 bg-white">
          <PrintLetterhead show />

        <div className="flex justify-between items-baseline -mt-2 mb-5">
          <p className="text-sm font-bold text-gray-800">Laboratory Request</p>
          <p className="text-xs text-gray-600">
            {request.requisitionNumber}
            {request.orderedDate ? ` · ${fmtDay(request.orderedDate)}` : ""}
            {request.orderedTime ? ` · ${request.orderedTime}` : ""}
          </p>
        </div>

        {/* Patient + attribution */}
        <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm mb-4">
          <div><span className="text-gray-500">Patient:</span> <b>{patient?.name}</b></div>
          <div><span className="text-gray-500">UHID:</span> <b>{patient?.uhid}</b></div>
          <div>
            <span className="text-gray-500">Age / Sex:</span>{" "}
            <b>{[patient?.age, patient?.gender].filter((v) => v != null && v !== "").join(" / ") || "—"}</b>
          </div>
          <div><span className="text-gray-500">Requested by:</span> <b>{request.requestedBy || "—"}</b></div>
          {request.onBehalfOfDoctor && (
            <div><span className="text-gray-500">On behalf of:</span> <b>{request.onBehalfOfDoctor}</b></div>
          )}
          <div><span className="text-gray-500">Priority:</span> <b>{request.priority || "Routine"}</b></div>
        </div>

        {/* Tests — two columns so long requests stay on as few pages as possible.
            No result column, no prices — this is a request. */}
        <div className="border-t-2 border-gray-800 pt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Tests requested</p>
          <ol className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm list-none">
            {tests.map((t, i) => (
              <li key={i} className="flex items-baseline gap-2 border-b border-gray-100 pb-1">
                <span className="text-gray-400 w-5 flex-shrink-0">{i + 1}.</span>
                <span className="font-medium text-gray-800 flex-1">{t.testType}</span>
                {t.sampleType && <span className="text-xs text-gray-500">{t.sampleType}</span>}
              </li>
            ))}
          </ol>
        </div>

        {/* Special instructions */}
        {request.notes && (
          <div className="mt-5 pt-3 border-t border-gray-300 text-sm">
            <b className="text-gray-700">Special instructions:</b> <span className="text-gray-700 whitespace-pre-wrap">{request.notes}</span>
          </div>
        )}

        {/* Signature line */}
        <div className="mt-10 flex justify-between text-xs text-gray-600">
          <div>Requesting clinician: <span className="inline-block w-48 border-b border-gray-400" /></div>
          <div>Sample collected: ____ / ____ / ______</div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default LabRequestPrint;
