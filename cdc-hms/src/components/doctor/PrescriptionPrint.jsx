import { useState } from "react";
import { MessageCircle } from "lucide-react";
import PrintLetterhead from "../shared/PrintLetterhead";
import {
  PrintPreviewModal, PrintDocHeader, PrintPatientLine, PrintSection, PrintTable,
  PrintNotice, PrintSignatures, PrintSignature,
} from "../shared/PrintDocument";
import usePrint from "../../hooks/usePrint";
import usePdfFromPrint from "../../hooks/usePdfFromPrint";
import SendViaWhatsAppModal from "../shared/SendViaWhatsAppModal";

const PrescriptionPrint = ({ prescription, onClose }) => {
  const { printRef, handlePrint } = usePrint();
  const getPdf = usePdfFromPrint(printRef);
  const [waOpen, setWaOpen] = useState(false);

  if (!prescription) return null;

  const patient = {
    uhid: prescription.patientUhid || prescription.uhid,
    name: prescription.patientName,
    phone: prescription.patientPhone,
  };

  const columns = [
    { header: "No.", cell: (_, i) => i + 1 },
    { header: "Medication Name", cell: (m) => m.name, className: "font-semibold" },
    { header: "Dosage", cell: (m) => m.dosage },
    { header: "Frequency", cell: (m) => m.frequency },
    { header: "Duration", cell: (m) => m.duration },
  ];
  const withInstructions = prescription.medications.filter((med) => med.instructions);

  return (
    <>
      <PrintPreviewModal
        title="Prescription Preview"
        onPrint={handlePrint}
        onClose={onClose}
        trailingActions={patient.uhid && (
          <button
            onClick={() => setWaOpen(true)}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" /> Send via WhatsApp
          </button>
        )}
      >
        <div ref={printRef} className="print-prescription p-6">
          {/* Hospital letterhead — shared component (DRY §4e) */}
          <PrintLetterhead show />

          {/* Prescriber details deliberately live only in the signature block. */}
          <PrintDocHeader icon="℞" label="Prescription No." number={prescription.prescriptionNumber} date={prescription.date} />
          <PrintPatientLine items={[{ label: "Patient", value: prescription.patientName }]} />

          <PrintSection title="Medications Prescribed">
            <PrintTable columns={columns} rows={prescription.medications} />
          </PrintSection>

          {withInstructions.length > 0 && (
            <PrintSection title="Special Instructions">
              <ul className="list-disc list-inside space-y-0.5 text-sm text-gray-700">
                {withInstructions.map((med, index) => (
                  <li key={index}><strong>{med.name}:</strong> {med.instructions}</li>
                ))}
              </ul>
            </PrintSection>
          )}

          {prescription.notes && (
            <PrintSection title="Additional Notes">
              <p className="text-sm text-gray-700">{prescription.notes}</p>
            </PrintSection>
          )}

          <PrintNotice>
            This prescription is valid for 30 days from the date of issue. Do not share medications with others. Complete the full course as prescribed.
          </PrintNotice>

          {/* No "Printed on" timestamp: it changed on every reprint, so a
              re-printed copy appeared to carry a later date than the one it was
              issued on. The issue date is in the header. */}
          <PrintSignatures>
            <PrintSignature
              label="Prescribed by:"
              name={prescription.doctorName}
              subtitle={prescription.doctorSpecialty}
              regNo={prescription.doctorLicenseNumber}
            />
          </PrintSignatures>
        </div>
      </PrintPreviewModal>
      {waOpen && (
        <SendViaWhatsAppModal
          isOpen
          onClose={() => setWaOpen(false)}
          patient={patient}
          getPdf={getPdf}
          label="prescription"
          defaultCaption="Your prescription from the Comprehensive Diabetes Centre"
        />
      )}
    </>
  );
};

export default PrescriptionPrint;