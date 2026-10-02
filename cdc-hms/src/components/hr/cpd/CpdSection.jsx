import { useState, useEffect, useCallback } from 'react';
import { Plus, Paperclip, Pencil, Trash2, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import hrSelfService from '../../../services/hrSelfService';
import staffService from '../../../services/staffService';
import Modal from '../../shared/Modal';
import ConfirmActionModal from '../../shared/ConfirmActionModal';
import Spinner from '../../shared/Spinner';
import { notify } from '../../../utils/notify';
import { Pill, todayIso } from '../hrFormat';
import { inputCls, buttonCls, primaryButtonCls } from '../hrUi';

/**
 * CpdSection — My profile → Credentials tab (B27 phase 5, mockup 5A).
 *
 * A person's own continuing professional development for a calendar year: a
 * progress bar that fills with HR-VERIFIED points only (pending shown as a
 * lighter segment), the list of entries, and a form to log one. An entry can be
 * edited or deleted only while it is still pending HR's check. The certificate
 * is optional and is saved to the person's Documents as a Training Certificate.
 *
 * Props: employeeId — the person's own employee id, for uploading a certificate
 * to their own staff file (self is allowed on that route).
 *        readOnly — the HR staff file's Credentials tab (2 Oct 2026): the same
 *                   card for someone else, loaded from GET /api/staff/:employeeId/cpd;
 *                   no logging, editing or deleting. Verifying stays on
 *                   Profile requests → CPD to verify.
 */
const CATEGORIES = [
  ['conference', 'Conference'], ['course', 'Course'], ['webinar', 'Webinar'],
  ['workshop', 'Workshop'], ['self-study', 'Self-study'], ['other', 'Other'],
];
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES);
const STATUS = {
  verified: { tone: 'ok', label: 'verified' },
  pending:  { tone: 'warn', label: 'pending HR check' },
  rejected: { tone: 'bad', label: 'rejected' },
};
const fmtDate = (iso) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '');
const pts = (n) => `${Number(n)} pt${Number(n) === 1 ? '' : 's'}`;

const emptyForm = () => ({ date: todayIso(), title: '', provider: '', category: 'conference', points: '', file: null, documentId: null, documentName: null });

const CpdSection = ({ employeeId, readOnly = false }) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [modal, setModal] = useState(null);   // { editing, form }
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setData(null);
    try {
      const res = readOnly ? await staffService.getCpd(employeeId, year) : await hrSelfService.cpd(year);
      setData(res.data);
    } catch (e) {
      notify('error', e?.message || (readOnly ? 'Could not load CPD' : 'Could not load your CPD'));
      setData({ activities: [], summary: { verified: 0, pending: 0, target: 0, toTarget: 0 } });
    }
  }, [year, readOnly, employeeId]);
  useEffect(() => { load(); }, [load]);

  const openNew = () => setModal({ editing: null, form: emptyForm() });
  const openEdit = (a) => setModal({
    editing: a.id,
    form: { date: a.date, title: a.title, provider: a.provider || '', category: a.category, points: String(a.points), file: null, documentId: a.document?.id || null, documentName: a.document?.fileName || null },
  });
  const setField = (k, v) => setModal((m) => ({ ...m, form: { ...m.form, [k]: v } }));

  const save = async () => {
    const f = modal.form;
    if (!f.title.trim()) { notify('error', 'Give the activity a title'); return; }
    if (f.points === '' || Number.isNaN(Number(f.points)) || Number(f.points) < 0) { notify('error', 'Give the points as a number'); return; }
    setSaving(true);
    try {
      let documentId = f.documentId;
      // A newly chosen certificate is uploaded to the person's own Documents
      // (Training Certificate, Staff-visible) and then linked to the entry.
      if (f.file && employeeId) {
        const up = await staffService.uploadDocument(employeeId, f.file, { category: 'Training Certificate', visibility: 'Staff' });
        documentId = up?.data?.id || null;
      }
      const body = { date: f.date, title: f.title.trim(), provider: f.provider.trim() || null, category: f.category, points: Number(f.points), documentId };
      if (modal.editing) await hrSelfService.editCpd(modal.editing, body);
      else await hrSelfService.logCpd(body);
      notify('success', modal.editing ? 'Activity updated' : 'Logged — sent to HR to verify');
      setModal(null);
      load();
    } catch (e) {
      notify('error', e?.message || 'Could not save the activity');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    const a = deleting; setDeleting(null);
    try {
      await hrSelfService.deleteCpd(a.id);
      notify('success', 'Activity removed');
      load();
    } catch (e) { notify('error', e?.message || 'Could not remove it'); }
  };

  const s = data?.summary || { verified: 0, pending: 0, target: 0, toTarget: 0 };
  const denom = Math.max(s.target, s.verified + s.pending, 1);
  const vPct = Math.min(100, (s.verified / denom) * 100);
  const pPct = Math.min(100 - vPct, (s.pending / denom) * 100);

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:col-span-2">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">CPD {year}</h3>
          <div className="inline-flex items-center">
            <button type="button" aria-label="Previous year" className="p-1 text-gray-400 hover:text-gray-700" onClick={() => setYear((y) => y - 1)}><ChevronLeft className="w-4 h-4" /></button>
            <button type="button" aria-label="Next year" className="p-1 text-gray-400 hover:text-gray-700" onClick={() => setYear((y) => y + 1)}><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
        {!readOnly && <button type="button" className={`${primaryButtonCls} inline-flex items-center gap-1`} onClick={openNew}><Plus className="w-4 h-4" /> Log CPD</button>}
      </div>

      {data === null ? <Spinner /> : (
        <>
          {/* Progress: verified (solid) + pending (striped), against the cadre target. */}
          <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden flex mb-2" role="img"
            aria-label={`${s.verified} verified, ${s.pending} pending${s.target ? `, target ${s.target}` : ''}`}>
            <div className="h-full bg-primary" style={{ width: `${vPct}%` }} />
            <div className="h-full" style={{ width: `${pPct}%`, background: 'repeating-linear-gradient(45deg,#dbeafe,#dbeafe 4px,#bfdbfe 4px,#bfdbfe 8px)' }} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-3">
            <span className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-primary" /> {s.verified} verified</span>
            {s.pending > 0 && <span className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#bfdbfe' }} /> {s.pending} pending HR check</span>}
            {s.target > 0 && <span className="text-gray-500">{s.toTarget > 0 ? `${s.toTarget} to target (${s.target})` : `target ${s.target} met`}</span>}
            {s.target === 0 && <span className="text-gray-400">No target set for {readOnly ? 'this' : 'your'} cadre</span>}
          </div>

          {data.activities.length === 0 ? (
            <p className="text-sm text-gray-500">{readOnly
              ? `Nothing logged for ${year}.`
              : `Nothing logged for ${year} yet. Log a course, conference or workshop and it counts once HR verifies it.`}</p>
          ) : (
            <ul className="divide-y divide-gray-100" data-testid="cpd-list">
              {data.activities.map((a) => {
                const st = STATUS[a.status] || STATUS.pending;
                return (
                  <li key={a.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                    <div className="flex-1 min-w-[12rem]">
                      <span className="text-gray-900">{a.title}</span>
                      <span className="text-gray-400 text-xs"> · {CATEGORY_LABEL[a.category] || a.category}{a.provider ? ` · ${a.provider}` : ''} · {fmtDate(a.date)}</span>
                      {a.status === 'rejected' && a.note && <div className="text-[11px] text-red-700 mt-0.5">HR: {a.note}</div>}
                    </div>
                    <span className="tabular-nums text-gray-700">{pts(a.points)}</span>
                    {a.document && <Paperclip className="w-3.5 h-3.5 text-gray-400" aria-label="Certificate attached" />}
                    <Pill tone={st.tone}>{st.label}</Pill>
                    {!readOnly && a.status === 'pending' && (
                      <span className="inline-flex gap-1">
                        <button type="button" className="p-1 text-gray-400 hover:text-gray-700" aria-label="Edit" onClick={() => openEdit(a)}><Pencil className="w-3.5 h-3.5" /></button>
                        <button type="button" className="p-1 text-gray-400 hover:text-red-700" aria-label="Delete" onClick={() => setDeleting(a)}><Trash2 className="w-3.5 h-3.5" /></button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-[11px] text-gray-400 mt-2">{readOnly
            ? 'The bar counts HR-verified points only. Pending entries are verified on Profile requests → CPD to verify; certificates are on the Documents tab.'
            : 'The bar counts HR-verified points only. You can edit or delete an activity while it is pending; once verified it is locked.'}</p>
        </>
      )}

      <Modal isOpen={!!modal} onClose={() => (saving ? null : setModal(null))} title={modal?.editing ? 'Edit CPD activity' : 'Log a CPD activity'}>
        {modal && (
          <div className="space-y-3">
            <label className="block">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Date</span>
              <input type="date" className={inputCls} value={modal.form.date} onChange={(e) => setField('date', e.target.value)} />
            </label>
            <label className="block">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Title</span>
              <input className={inputCls} placeholder="e.g. Diabetic retinopathy screening course" value={modal.form.title} onChange={(e) => setField('title', e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Provider</span>
                <input className={inputCls} placeholder="KMA, ESE…" value={modal.form.provider} onChange={(e) => setField('provider', e.target.value)} />
              </label>
              <label className="block">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Category</span>
                <select className={inputCls} value={modal.form.category} onChange={(e) => setField('category', e.target.value)}>
                  {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Points</span>
                <input type="number" min="0" step="0.5" className={inputCls} value={modal.form.points} onChange={(e) => setField('points', e.target.value)} />
              </label>
              <div className="block">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Certificate (optional)</span>
                <label className={`${buttonCls} inline-flex items-center gap-1 cursor-pointer`}>
                  <Paperclip className="w-3.5 h-3.5" /> {modal.form.file ? 'Change file' : modal.form.documentName ? 'Replace' : 'Attach'}
                  <input type="file" className="hidden" onChange={(e) => setField('file', e.target.files?.[0] || null)} />
                </label>
                <div className="text-[11px] text-gray-400 mt-1 truncate">{modal.form.file?.name || modal.form.documentName || 'Saved to your Documents (Training Certificate).'}</div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className={buttonCls} disabled={saving} onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className={`${primaryButtonCls} inline-flex items-center gap-1`} disabled={saving} onClick={save}>
                {saving && <Loader className="w-4 h-4 animate-spin" />} {modal.editing ? 'Save' : 'Save — sends to HR'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmActionModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={doDelete}
        title="Remove this CPD activity?"
        message={deleting ? `"${deleting.title}" will be removed. You can log it again later.` : ''}
        confirmLabel="Remove"
        confirmVariant="danger"
      />
    </section>
  );
};

export default CpdSection;
