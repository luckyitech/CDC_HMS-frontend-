import { Download, Printer, Save, Loader2 } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

/**
 * Preview the composed report PDF before exporting, so the clinician can confirm
 * the layout and per-image adjustments look right. Then Download, Print, or file
 * it into the attached patient's Medical Documents (their Diagnostics file).
 *
 * Save to Medical Documents is disabled until the report is attached to a
 * patient (Attach to patient, in the workspace).
 */
const PdfPreviewModal = ({
  isOpen,
  onClose,
  pdfUrl,
  patient = null,
  busy = null,
  onDownload,
  onPrint,
  onSaveToDocs,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Report preview" size="xl">
    <div className="h-[62vh] border rounded-lg overflow-hidden bg-gray-100 mb-4">
      {pdfUrl ? (
        <iframe title="Report preview" src={pdfUrl} className="w-full h-full" />
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          Building preview…
        </div>
      )}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-gray-500">
        {patient ? (
          <>
            Filing to{' '}
            <span className="font-semibold text-gray-700">{patient.name || patient.uhid}</span>
            &apos;s Medical Documents.
          </>
        ) : (
          'Save will ask which patient to file this report to (and save the images to their safe).'
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2.5">
        <Button variant="outline" onClick={onDownload} disabled={!!busy} className="!px-4 !py-2 text-sm">
          <Download className="w-4 h-4" /> Download PDF
        </Button>
        <Button variant="outline" onClick={onPrint} disabled={!!busy} className="!px-4 !py-2 text-sm">
          <Printer className="w-4 h-4" /> Print
        </Button>
        <Button onClick={onSaveToDocs} disabled={!!busy} className="!px-4 !py-2 text-sm">
          {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {' '}Save to Medical Documents
        </Button>
      </div>
    </div>
  </Modal>
);

export default PdfPreviewModal;
