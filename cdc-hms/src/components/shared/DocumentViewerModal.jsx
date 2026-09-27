import { useState, useEffect } from 'react';
import { Loader2, Download } from 'lucide-react';
import Modal from './Modal';
import documentService from '../../services/documentService';

/**
 * View a document from the patient's Documents inside the HMS (PDF or image),
 * through the same authenticated route and access check as the Documents tab.
 * Nothing is kept once it closes. Used by the Communications tab (phase 5b):
 * its Attachments are view-only and always come from Documents.
 *
 * Props: doc ({ fileKey, fileName, testType?, date?, status? }) or null, onClose.
 */
const DocumentViewerModal = ({ doc, onClose }) => {
  const [state, setState] = useState({ url: null, type: null, loading: true, error: null });

  useEffect(() => {
    if (!doc) return undefined;
    let url = null;
    let live = true;
    setState({ url: null, type: null, loading: true, error: null });
    documentService.getFile(doc.fileKey)
      .then((blob) => {
        const typed = blob instanceof Blob ? blob : new Blob([blob]);
        url = URL.createObjectURL(typed);
        if (live) setState({ url, type: typed.type || (/\.pdf$/i.test(doc.fileName || '') ? 'application/pdf' : ''), loading: false, error: null });
      })
      .catch((err) => { if (live) setState({ url: null, type: null, loading: false, error: err?.message || 'Could not open this document.' }); });
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [doc]);

  if (!doc) return null;
  const title = [doc.testType || doc.fileName, doc.date].filter(Boolean).join(' · ');
  const isPdf = /pdf/i.test(state.type || '') || /\.pdf$/i.test(doc.fileName || '');
  const isImage = /^image\//i.test(state.type || '') || /\.(png|jpe?g|gif|webp)$/i.test(doc.fileName || '');

  return (
    <Modal isOpen onClose={onClose} title={title || 'Document'} size="xl">
      <div className="space-y-2" data-testid="document-viewer">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>From the patient’s Documents</span>
          {doc.status && <span className="rounded bg-gray-100 px-1.5 py-0.5">{doc.status}</span>}
          {state.url && (
            <a href={state.url} download={doc.fileName || 'document'} className="ml-auto inline-flex items-center gap-1 font-semibold text-primary hover:underline">
              <Download className="h-3.5 w-3.5" /> Download
            </a>
          )}
        </div>
        {state.loading && <p className="flex items-center gap-2 py-10 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Opening…</p>}
        {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{state.error}</p>}
        {state.url && isPdf && <iframe title={title || 'Document'} src={state.url} className="h-[70vh] w-full rounded border" />}
        {state.url && isImage && <img src={state.url} alt={title || 'Document'} className="mx-auto max-h-[70vh] rounded border object-contain" />}
        {state.url && !isPdf && !isImage && <p className="py-6 text-center text-sm text-gray-500">This file type can’t be shown here — use Download.</p>}
      </div>
    </Modal>
  );
};

export default DocumentViewerModal;
