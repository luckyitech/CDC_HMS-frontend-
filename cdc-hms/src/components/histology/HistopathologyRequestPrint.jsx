// HistopathologyRequestPrint.jsx — the printable histopathology request (1 Nov
// 2026, Emu): one form for one request, its specimens (histology and/or
// cytology) in one table. Laid out like the lab request (shared PrintDocument
// parts, the clinic letterhead) with the same toolbar: Print · Email · Send
// via WhatsApp. A REQUEST, never a report: no results, and never prices.
import { useState } from 'react';
import { Microscope, MessageCircle } from 'lucide-react';
import EmailReportButton from '../shared/EmailReportButton';
import usePrint from '../../hooks/usePrint';
import usePdfFromPrint from '../../hooks/usePdfFromPrint';
import SendViaWhatsAppModal from '../shared/SendViaWhatsAppModal';
import PrintLetterhead from '../shared/PrintLetterhead';
import {
  PrintPreviewModal, PrintDocHeader, PrintPatientLine, PrintSection, PrintTable,
  PrintSignatures, PrintSignature, ageSex,
} from '../shared/PrintDocument';
import { piecesText, fixativeText } from '../../utils/histologyRequests';

const fmtDay = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' }) : '');

/**
 * Props:
 *   request — a group from utils/histologyRequests groupHistologyRequests:
 *             { requisitionNumber, visitDate, createdAt, priority, sendTo,
 *               clinicalDetails, relevantHistory, requestedByName, specimens }
 *   patient — { name, uhid, gender, age, phone }
 *   onClose
 */
const HistopathologyRequestPrint = ({ request, patient, onClose }) => {
  const { printRef, handlePrint } = usePrint();
  const getPdf = usePdfFromPrint(printRef);
  const [waOpen, setWaOpen] = useState(false);
  if (!request) return null;

  // A cancelled specimen is not asked of the lab: it is left off the form.
  const all = request.specimens || [];
  const specimens = all.filter((s) => s.status !== 'cancelled');
  const allCancelled = all.length > 0 && specimens.length === 0;
  const urgent = request.priority && request.priority !== 'Routine';
  const columns = [
    { header: 'No.', cell: (_, i) => i + 1, className: 'w-8' },
    { header: 'Specimen no.', cell: (s) => s.specimenNumber, className: 'font-semibold whitespace-nowrap' },
    { header: 'Kind', cell: (s) => (s.kind === 'cytology' ? 'Cytology' : 'Histology') },
    { header: 'Site', cell: (s) => s.site },
    { header: 'Specimen', cell: (s) => [s.specimenLabel, piecesText(s)].filter(Boolean).join(' · ') },
    { header: 'Sent in', cell: (s) => fixativeText(s) || '—', className: '!text-xs text-gray-600' },
  ];
  const title = `Histopathology request${request.requisitionNumber ? ` ${request.requisitionNumber}` : ''}`;

  return (
    <>
      <PrintPreviewModal
        title="Histopathology Request Preview"
        onPrint={handlePrint}
        onClose={onClose}
        closeLabel="Done"
        maxWidth="max-w-3xl"
        trailingActions={patient?.uhid && (
          <>
            <EmailReportButton printRef={printRef} uhid={patient.uhid} title={title} fileStem="Histopathology-request" />
            <button
              type="button"
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

          <PrintDocHeader
            icon={<Microscope className="w-7 h-7" />}
            label="Histopathology Request No."
            number={request.requisitionNumber}
            date={[fmtDay(request.visitDate), fmtTime(request.createdAt)].filter(Boolean).join(' · ')}
          />
          <PrintPatientLine items={[
            { label: 'Patient', value: patient?.name },
            { label: 'UHID', value: patient?.uhid },
            { label: 'Age/Sex', value: ageSex(patient?.age, patient?.gender) },
            { label: 'Priority', value: urgent ? request.priority.toUpperCase() : 'Routine' },
          ]} />
          {request.sendTo && (
            <p className="mb-3 text-sm text-gray-700"><b className="font-semibold">Send to:</b> {request.sendTo}</p>
          )}

          {allCancelled ? (
            <p className="my-4 rounded border-2 border-red-300 px-3 py-2 text-center text-base font-bold uppercase tracking-wide text-red-700">
              Cancelled — this request is not to be processed
            </p>
          ) : (
            <PrintSection title={specimens.length === 1 ? 'Specimen' : `Specimens (${specimens.length})`}>
              <PrintTable columns={columns} rows={specimens} />
              {specimens.length < all.length && (
                <p className="mt-1 text-xs text-gray-600">
                  {all.length - specimens.length} cancelled specimen{all.length - specimens.length === 1 ? '' : 's'} not shown ({all.filter((s) => s.status === 'cancelled').map((s) => s.specimenNumber).join(', ')}).
                </p>
              )}
            </PrintSection>
          )}

          <PrintSection title="Clinical Details & Question">
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{request.clinicalDetails}</p>
            {request.relevantHistory && (
              <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap"><b className="font-semibold">Relevant history:</b> {request.relevantHistory}</p>
            )}
          </PrintSection>

          <PrintSection title="For the Laboratory">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded border border-dashed border-gray-400 p-3 text-sm text-gray-700">
              <span>Received on: ____ / ____ / ______ at ____ : ____</span>
              <span>Received by: ______________________</span>
              <span>Lab reference no.: ____________________</span>
              <span>Specimens intact: Yes / No</span>
            </div>
          </PrintSection>

          <PrintSignatures aside={<>Specimens taken: ____ / ____ / ______ at ____ : ____</>}>
            <PrintSignature label="Requested by:" name={request.requestedByName} />
          </PrintSignatures>
        </div>
      </PrintPreviewModal>
      {waOpen && (
        <SendViaWhatsAppModal
          isOpen
          onClose={() => setWaOpen(false)}
          patient={patient}
          getPdf={getPdf}
          label="histopathology request"
          defaultCaption="Your histopathology request form from the Comprehensive Diabetes Centre"
        />
      )}
    </>
  );
};

export default HistopathologyRequestPrint;
