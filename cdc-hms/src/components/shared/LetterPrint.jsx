// LetterPrint.jsx — the referral letter and the admission note, laid out and
// sent exactly like the prescription (Emu, 27 Sep evening): an on-screen
// preview on the clinic letterhead with Print · Email · Send via WhatsApp.
// Used by the consultation's Refer modal ("Save & preview") and by Visit
// History (Referral letters tab, day cards, Actions). Nothing is filed in
// Documents — the note itself lives on the visit and is rebuilt from there.
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import PrintLetterhead from "./PrintLetterhead";
import {
  PrintPreviewModal, PrintDocHeader, PrintPatientLine, PrintSection,
  PrintSignatures, PrintSignature,
} from "./PrintDocument";
import usePrint from "../../hooks/usePrint";
import usePdfFromPrint from "../../hooks/usePdfFromPrint";
import SendViaWhatsAppModal from "./SendViaWhatsAppModal";
import EmailReportButton from "./EmailReportButton";

const fmtDay = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

const KINDS = {
  referral: {
    title: "Referral Letter Preview", icon: "↗", label: "Referral letter", fileStem: "Referral-letter",
    // A referral is written for the receiving clinician: Email starts with an empty To line.
    addressPatient: false, waLabel: "referral letter",
  },
  admission: {
    title: "Admission Note Preview", icon: "⊕", label: "Admission note", fileStem: "Admission-note",
    addressPatient: false, waLabel: "admission note",
  },
};

/**
 * Props:
 *   kind     — "referral" | "admission"
 *   letter   — {
 *     note, date (ISO), doctorName,
 *     referral:  referralType ("Internal"|"External"), destination, reason
 *     admission: admissionType, status (e.g. "Sent for admission")
 *   }
 *   patient  — { name, uhid, phone, gender }
 *   onClose
 */
const LetterPrint = ({ kind = "referral", letter, patient, onClose }) => {
  const { printRef, handlePrint } = usePrint();
  const getPdf = usePdfFromPrint(printRef);
  const [waOpen, setWaOpen] = useState(false);
  const k = KINDS[kind] || KINDS.referral;
  if (!letter) return null;

  const isReferral = kind === "referral";
  const toLine = isReferral && letter.destination
    ? `${letter.destination}${letter.referralType ? ` (${letter.referralType})` : ""}`
    : null;

  return (
    <>
      <PrintPreviewModal
        title={k.title}
        onPrint={handlePrint}
        onClose={onClose}
        trailingActions={patient?.uhid && (
          <>
            <EmailReportButton printRef={printRef} uhid={patient.uhid} title={k.label} fileStem={k.fileStem} addressPatient={k.addressPatient} />
            <button
              onClick={() => setWaOpen(true)}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" /> Send via WhatsApp
            </button>
          </>
        )}
      >
        <div ref={printRef} className="p-6">
          <PrintLetterhead show />
          <PrintDocHeader icon={k.icon} label={k.label} number={isReferral ? (letter.referralType || "") : (letter.admissionType || "")} date={fmtDay(letter.date)} />
          <PrintPatientLine items={[
            { label: "Patient", value: patient?.name },
            { label: "UHID", value: patient?.uhid },
            { label: "Gender", value: patient?.gender },
          ]} />

          {toLine && (
            <PrintSection title="Referred to">
              <p className="text-sm text-gray-800">{toLine}</p>
            </PrintSection>
          )}
          {isReferral && letter.reason && (
            <PrintSection title="Reason for referral">
              <p className="text-sm text-gray-800">{letter.reason}</p>
            </PrintSection>
          )}
          {!isReferral && letter.status && (
            <PrintSection title="Status">
              <p className="text-sm text-gray-800">{letter.status}</p>
            </PrintSection>
          )}

          <PrintSection title={isReferral ? "Clinical summary" : "Admission note"}>
            <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{letter.note || "—"}</p>
          </PrintSection>

          <PrintSignatures>
            <PrintSignature label={isReferral ? "Referring doctor:" : "Doctor:"} name={letter.doctorName ? `Dr. ${String(letter.doctorName).replace(/^Dr\.?\s+/i, "")}` : ""} />
          </PrintSignatures>
        </div>
      </PrintPreviewModal>
      {waOpen && (
        <SendViaWhatsAppModal
          isOpen
          onClose={() => setWaOpen(false)}
          patient={patient}
          getPdf={getPdf}
          label={k.waLabel}
          defaultCaption={`Your ${k.waLabel} from the Comprehensive Diabetes Centre`}
        />
      )}
    </>
  );
};

export default LetterPrint;
