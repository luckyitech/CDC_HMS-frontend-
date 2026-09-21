// LabRequestPrint.jsx — the printable laboratory requisition (the preview that
// opens on Save & print). Reuses the shared clinic letterhead (PrintLetterhead,
// DRY). This is a REQUEST, not a report: no results column, and no prices ever.
import { FlaskConical } from "lucide-react";
import usePrint from "../../hooks/usePrint";
import PrintLetterhead from "./PrintLetterhead";
import {
  PrintPreviewModal, PrintDocHeader, PrintPatientLine, PrintSection, PrintTable,
  PrintSignatures, PrintSignature,
} from "./PrintDocument";

const fmtDay = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

/**
 * Laid out like the prescription (shared PrintDocument parts). Age is left
 * off on purpose — it cost a line and the lab does not need it.
 *
 * Props:
 *   request: {
 *     requisitionNumber, orderedDate, orderedTime, priority, notes,
 *     requestedBy,        // display name of the author (role-aware)
 *     onBehalfOfDoctor,   // "Dr. …" when a nurse raised it (else null)
 *     tests: [{ testType, sampleType }]
 *   }
 *   patient  — { name, uhid, gender }
 *   onClose
 *   onBackToEdit  (optional) — reopen the request in the form for editing
 */
const LabRequestPrint = ({ request, patient, onClose, onBackToEdit }) => {
  const { printRef, handlePrint } = usePrint();
  if (!request) return null;

  const tests = request.tests || [];
  const urgent = request.priority && request.priority !== "Routine";
  const columns = [
    { header: "No.", cell: (_, i) => i + 1, className: "w-8" },
    { header: "Test", cell: (t) => t.testType, className: "font-semibold" },
    { header: "Sample", cell: (t) => t.sampleType || "—", className: "!text-xs text-gray-600" },
  ];

  return (
    <PrintPreviewModal
      title="Laboratory Request Preview"
      onPrint={handlePrint}
      onClose={onClose}
      closeLabel="Done"
      maxWidth="max-w-3xl"
      leadingActions={onBackToEdit && (
        <button
          onClick={onBackToEdit}
          className="px-5 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-blue-50 font-semibold text-sm"
        >
          ‹ Back to edit
        </button>
      )}
    >
      <div ref={printRef} className="p-6">
        <PrintLetterhead show />

        <PrintDocHeader
          icon={<FlaskConical className="w-7 h-7" />}
          label="Lab Request No."
          number={request.requisitionNumber}
          date={[fmtDay(request.orderedDate), request.orderedTime].filter(Boolean).join(" · ")}
        />
        <PrintPatientLine items={[
          { label: "Patient", value: patient?.name },
          { label: "UHID", value: patient?.uhid },
          { label: "Sex", value: patient?.gender },
          { label: "Priority", value: urgent ? request.priority.toUpperCase() : "Routine" },
        ]} />

        {/* A request, not a report: no result column, and never prices. Two
            tests per row so a long request stays compact. */}
        <PrintSection title="Tests Requested">
          <PrintTable columns={columns} rows={tests} perRow={tests.length > 1 ? 2 : 1} />
        </PrintSection>

        {request.notes && (
          <PrintSection title="Special Instructions">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.notes}</p>
          </PrintSection>
        )}

        <PrintSignatures aside={<>Sample collected: ____ / ____ / ______</>}>
          <PrintSignature
            label="Requested by:"
            name={request.requestedBy}
            subtitle={request.onBehalfOfDoctor ? `On behalf of ${request.onBehalfOfDoctor}` : null}
          />
        </PrintSignatures>
      </div>
    </PrintPreviewModal>
  );
};

export default LabRequestPrint;
