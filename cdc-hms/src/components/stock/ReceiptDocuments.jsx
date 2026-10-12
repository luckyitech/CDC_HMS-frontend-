import { useEffect, useRef, useState } from "react";
import { Camera, FileText, Trash2, Loader2, ExternalLink } from "lucide-react";
import { notify } from "../../utils/notify";
import stockService from "../../services/stockService";

// The scanned pages of one supplier invoice / receipt (12 Oct 2026). Shared by
// Receive (scan while receiving) and Movements → Deliveries (scan later, audit).
//
// "Scan / add page" opens the camera on a phone or tablet (capture), or the
// file picker on a computer (photo or PDF). Each file is one page. Pages open
// through the authenticated API — never a public link.
//
// Props: receiptId (null until the number exists — then onNeedReceipt() must
//   create it and return the id), documents, onChange(documents), canEdit,
//   preview (show the pages inline, for the audit view).

export const openReceiptDocument = async (receiptId, doc) => {
  try {
    const blob = await stockService.receiptDocumentFile(receiptId, doc.id);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    notify("error", err?.message || "Could not open the document");
  }
};

const PagePreview = ({ receiptId, doc }) => {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let live = true; let made = null;
    stockService.receiptDocumentFile(receiptId, doc.id)
      .then((blob) => { if (!live) return; made = URL.createObjectURL(blob); setUrl(made); })
      .catch(() => {});
    return () => { live = false; if (made) URL.revokeObjectURL(made); };
  }, [receiptId, doc.id]);
  if (!url) return <div className="h-64 grid place-items-center text-xs text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /></div>;
  return doc.mimeType === "application/pdf"
    ? <iframe title={doc.fileName} src={url} className="w-full h-[32rem] rounded-lg border border-gray-200" />
    : <img src={url} alt={doc.fileName} className="w-full rounded-lg border border-gray-200" />;
};

const ReceiptDocuments = ({ receiptId, documents = [], onChange, onNeedReceipt, canEdit = true, preview = false }) => {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);

  const upload = async (files) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const id = receiptId || await onNeedReceipt?.();
      if (!id) return;
      const added = [];
      for (const f of files) {
        const res = await stockService.addReceiptDocument(id, f);
        if (res.success) added.push(res.data);
      }
      onChange?.([...documents, ...added], id);
      notify("success", added.length === 1 ? "Page attached" : `${added.length} pages attached`);
    } catch (err) {
      notify("error", err?.message || "Could not attach the document");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const remove = async (doc) => {
    if (!window.confirm(`Remove “${doc.fileName}”? It stays in the audit trail.`)) return;
    try {
      await stockService.removeReceiptDocument(receiptId, doc.id);
      onChange?.(documents.filter((d) => d.id !== doc.id), receiptId);
    } catch (err) { notify("error", err?.message || "Could not remove it"); }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {documents.length === 0 ? (
          <span className="text-xs font-semibold text-amber-700 bg-amber-50 rounded-full px-2.5 py-1">No scan yet</span>
        ) : (
          documents.map((d, i) => (
            <span key={d.id} className="inline-flex items-center gap-1.5 text-xs bg-green-50 text-green-800 rounded-full pl-2.5 pr-1.5 py-1">
              <FileText className="w-3.5 h-3.5" />
              <button type="button" className="font-semibold hover:underline" onClick={() => openReceiptDocument(receiptId, d)} title={d.fileName}>
                Page {i + 1}
              </button>
              <ExternalLink className="w-3 h-3 opacity-60" />
              {canEdit && (
                <button type="button" aria-label={`Remove page ${i + 1}`} onClick={() => remove(d)} className="text-green-700 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </span>
          ))
        )}
        {canEdit && (
          <>
            <input ref={input} type="file" accept="image/*,application/pdf" capture="environment" multiple className="hidden"
              onChange={(e) => upload([...e.target.files])} />
            <button type="button" disabled={busy} onClick={() => input.current?.click()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-full px-3 py-1 ui-hover disabled:opacity-50">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              {documents.length ? "Add page" : "Scan document"}
            </button>
          </>
        )}
      </div>
      {preview && documents.map((d) => <PagePreview key={d.id} receiptId={receiptId} doc={d} />)}
    </div>
  );
};

export default ReceiptDocuments;
