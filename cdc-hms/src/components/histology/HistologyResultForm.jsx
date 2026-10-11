import { useEffect, useState } from 'react';
import { histologyService } from '../../services/histologyService';
import { MARGINS, BETHESDA, CYTO_CATEGORIES } from '../../constants/histology';
import { notify } from '../../utils/notify';

/**
 * HistologyResultForm — type the result when the report is back (H4).
 *   histology            → diagnosis (required), margins, closest margin
 *   thyroid cytology     → Bethesda I–VI (required)
 *   any other cytology   → category (required)
 * plus comment, report date and the report itself: upload the PDF (it becomes
 * an ordinary Medical Document of this patient) or pick one already on file
 * (e.g. one paired from the Lab Inbox).
 *
 * Correcting a saved result: the person who typed it may change it the same
 * day; anyone else, or later, gives a reason (asked by the parent via
 * onNeedReason) and the original stays in the trail (H5).
 *
 * Props: uhid, request, onSaved(request), onCancel(), onNeedReason(run)
 */
const inputCls = 'w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';
const labelCls = 'text-xs font-semibold text-gray-500';

const fromRequest = (r) => ({
  resultDiagnosis: r.resultDiagnosis || '',
  margins: r.margins || '',
  marginMm: r.marginMm ?? '',
  bethesda: r.bethesda || '',
  cytologyCategory: r.cytologyCategory || '',
  resultComment: r.resultComment || '',
  reportDate: r.reportDate || '',
  reportDocumentId: r.reportDocument?.id ? String(r.reportDocument.id) : '',
});

const HistologyResultForm = ({ uhid, request, onSaved, onCancel, onNeedReason }) => {
  const [form, setForm] = useState(() => fromRequest(request));
  const [docs, setDocs] = useState([]);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const shape = request.resultShape;
  const correcting = request.status === 'resulted';

  useEffect(() => {
    let alive = true;
    histologyService.reportCandidates(uhid)
      .then((res) => { if (alive) setDocs(res.data || []); })
      .catch(() => { if (alive) setDocs([]); });
    return () => { alive = false; };
  }, [uhid]);

  const payload = (documentId) => ({
    resultDiagnosis: form.resultDiagnosis || null,
    margins: shape === 'histology' ? (form.margins || null) : null,
    marginMm: shape === 'histology' && form.marginMm !== '' ? Number(form.marginMm) : null,
    bethesda: shape === 'bethesda' ? (form.bethesda || null) : null,
    cytologyCategory: shape === 'cytology' ? (form.cytologyCategory || null) : null,
    resultComment: form.resultComment || null,
    reportDate: form.reportDate || null,
    reportDocumentId: documentId ? Number(documentId) : null,
  });

  const save = async (reason = null) => {
    setSaving(true);
    try {
      let documentId = form.reportDocumentId;
      if (file) {
        documentId = await histologyService.uploadReport(uhid, file, { kind: request.kind, labName: request.sendTo, reportDate: form.reportDate });
        setFile(null);
        set({ reportDocumentId: String(documentId) });
      }
      const res = await histologyService.saveResult(request.id, { ...payload(documentId), ...(reason ? { reason } : {}) });
      notify('success', correcting ? 'Result corrected' : 'Result recorded');
      onSaved?.(res.data);
    } catch (err) {
      if (err?.data?.code === 'REASON_REQUIRED' && onNeedReason) {
        onNeedReason((r) => save(r));
      } else if (!err?.isPermissionDenied) {
        notify('error', err?.message || 'Could not save the result');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-blue-50/40 p-4">
      <p className="text-sm font-semibold text-gray-800">
        {correcting ? 'Correct the result' : 'Record the result'} · <span className="font-mono">{request.specimenNumber}</span>
      </p>

      {shape === 'bethesda' && (
        <div className="flex flex-col gap-1">
          <label htmlFor={`hr-beth-${request.id}`} className={labelCls}>Bethesda category</label>
          <select id={`hr-beth-${request.id}`} value={form.bethesda} onChange={(e) => set({ bethesda: e.target.value })} className={inputCls}>
            <option value="">Choose…</option>
            {BETHESDA.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
        </div>
      )}
      {shape === 'cytology' && (
        <div className="flex flex-col gap-1">
          <label htmlFor={`hr-cat-${request.id}`} className={labelCls}>Category</label>
          <select id={`hr-cat-${request.id}`} value={form.cytologyCategory} onChange={(e) => set({ cytologyCategory: e.target.value })} className={inputCls}>
            <option value="">Choose…</option>
            {CYTO_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor={`hr-dx-${request.id}`} className={labelCls}>
          {shape === 'histology' ? 'Histological diagnosis' : 'Cytological diagnosis (optional)'}
        </label>
        <textarea id={`hr-dx-${request.id}`} rows={2} value={form.resultDiagnosis} onChange={(e) => set({ resultDiagnosis: e.target.value })} className={inputCls} />
      </div>

      {shape === 'histology' && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[160px] flex-1 flex-col gap-1">
            <label htmlFor={`hr-marg-${request.id}`} className={labelCls}>Margins</label>
            <select id={`hr-marg-${request.id}`} value={form.margins} onChange={(e) => set({ margins: e.target.value })} className={inputCls}>
              <option value="">—</option>
              {MARGINS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`hr-mm-${request.id}`} className={labelCls}>Closest margin (mm)</label>
            <input id={`hr-mm-${request.id}`} type="number" min="0" step="0.1" inputMode="decimal" value={form.marginMm} onChange={(e) => set({ marginMm: e.target.value })} className={`${inputCls} w-28 text-right tabular-nums`} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor={`hr-com-${request.id}`} className={labelCls}>Comment</label>
        <textarea id={`hr-com-${request.id}`} rows={2} value={form.resultComment} onChange={(e) => set({ resultComment: e.target.value })} className={inputCls} />
      </div>

      <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
        <div className="flex flex-col gap-1">
          <label htmlFor={`hr-date-${request.id}`} className={labelCls}>Report date</label>
          <input id={`hr-date-${request.id}`} type="date" value={form.reportDate} onChange={(e) => set({ reportDate: e.target.value })} className={inputCls} />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`hr-doc-${request.id}`} className={labelCls}>Report</label>
          <select id={`hr-doc-${request.id}`} value={file ? '' : form.reportDocumentId} disabled={!!file} onChange={(e) => set({ reportDocumentId: e.target.value })} className={inputCls}>
            <option value="">{docs.length ? 'Choose one of this patient\'s documents…' : 'No documents on file'}</option>
            {docs.map((d) => (
              <option key={d.id} value={d.id}>{d.fileName}{d.testDate ? ` · ${d.testDate}` : ''}{d.category ? ` · ${d.category}` : ''}</option>
            ))}
          </select>
          <label className="mt-1 inline-flex cursor-pointer items-center gap-2 text-xs text-primary">
            <input type="file" accept="application/pdf,image/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <span className="underline">{file ? `Will upload ${file.name}` : 'or upload the report (PDF)'}</span>
          </label>
          {file && <button type="button" onClick={() => setFile(null)} className="self-start text-xs text-gray-500 underline">Don't upload</button>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => save()} disabled={saving} className="min-h-[40px] rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {saving ? 'Saving…' : correcting ? 'Save correction' : 'Save result'}
        </button>
        <button type="button" onClick={onCancel} className="min-h-[40px] rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm">Cancel</button>
      </div>
    </div>
  );
};

export default HistologyResultForm;
