import { useEffect, useState } from 'react';
import { Mail, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import Modal from './Modal';
import LabInboxPairForm from './LabInboxPairForm';
import labInboxService from '../../services/labInboxService';
import { formatDateTime } from '../../utils/dateUtils';

/**
 * LabInboxPreviewModal — the report PDF on the left, the pairing form on the
 * right. The PDF is fetched through the authenticated API as a blob (the
 * staged file is deliberately NOT on a public URL) and shown in an iframe.
 *
 * Props: isOpen, onClose, item, onPaired, onDiscarded, readOnly (view-only holder)
 */
const LabInboxPreviewModal = ({ isOpen, onClose, item, onPaired, onDiscarded, readOnly = false }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!isOpen || !item?.id) return undefined;
    let url = null;
    let cancelled = false;
    setPdfUrl(null);
    setLoadError(null);

    labInboxService.getFile(item.id)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob instanceof Blob ? blob : new Blob([blob], { type: 'application/pdf' }));
        setPdfUrl(url);
      })
      .catch((err) => { if (!cancelled) setLoadError(err?.message || 'Could not load the PDF.'); });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [isOpen, item?.id]);

  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item.fileName || 'Lab report'} size="2xl">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* PDF */}
        <div className="lg:col-span-3 h-[70vh] border rounded-lg overflow-hidden bg-gray-700 flex flex-col">
          {pdfUrl ? (
            <>
              <iframe title="Lab report preview" src={pdfUrl} className="w-full flex-1 bg-white" />
              {/* Some tablet/phone browsers download a PDF instead of showing it inline. */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 text-[11px] text-gray-300">
                <span className="truncate">{item.fileName}{item.fileSize ? ` · ${item.fileSize}` : ''}</span>
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-white hover:underline flex-shrink-0">
                  <ExternalLink className="w-3.5 h-3.5" /> Open in new tab
                </a>
              </div>
            </>
          ) : loadError ? (
            <div className="m-auto text-center text-sm text-red-200 px-6">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
              {loadError}
            </div>
          ) : (
            <div className="m-auto flex items-center gap-2 text-sm text-gray-200">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading PDF…
            </div>
          )}
        </div>

        {/* Pair panel */}
        <div className="lg:col-span-2 flex flex-col gap-4 lg:max-h-[70vh] lg:overflow-y-auto pr-1">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-700 space-y-1">
            <p className="flex items-center gap-1.5 font-semibold text-gray-800">
              <Mail className="w-3.5 h-3.5 text-gray-500" /> {item.senderName || item.senderEmail}
            </p>
            {item.senderName && item.senderEmail && <p className="text-gray-500 truncate">{item.senderEmail}</p>}
            {item.subject && <p className="truncate"><span className="text-gray-500">Subject:</span> {item.subject}</p>}
            {item.emailDate && <p className="text-gray-500">Received {formatDateTime(item.emailDate)}</p>}
          </div>

          {item.status === 'New' && readOnly ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
              Waiting to be paired. You can view this report but not pair or discard it — ask an administrator for the Lab Inbox write permission if you need to.
            </div>
          ) : item.status === 'New' ? (
            // key forces a fresh form per item — no state bleeding between reports
            <LabInboxPairForm key={item.id} item={item} onPaired={onPaired} onDiscarded={onDiscarded} />
          ) : item.status === 'Matched' ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-800">
              <p className="font-semibold">Paired to {item.matched?.patient ? `${item.matched.patient.firstName} ${item.matched.patient.lastName} (${item.matched.patient.uhid})` : 'a patient'}</p>
              <p className="text-xs mt-1 text-green-700">by {item.matched?.by || '—'} · {formatDateTime(item.matched?.at)}. The report is in the patient&apos;s Diagnostics.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
              <p className="font-semibold">Discarded{item.discarded?.reason ? ` — ${item.discarded.reason}` : ''}</p>
              <p className="text-xs mt-1 text-gray-500">by {item.discarded?.by || '—'} · {formatDateTime(item.discarded?.at)}. Kept on record, not deleted.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default LabInboxPreviewModal;
