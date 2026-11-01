import { useEffect, useMemo, useState } from 'react';
import useDraft from '../../hooks/useDraft';
import useClinicModules from '../../hooks/useClinicModules';
import { DraftStatus, DraftRestoreBanner } from '../shared/DraftStatus';
import { useUserContext } from '../../contexts/UserContext';
import { canRecordDerm } from '../../utils/permissions';
import { dermService } from '../../services/dermService';
import { histologyService } from '../../services/histologyService';
import {
  KINDS, SITE_TYPES, TISSUE_TYPES, CYTO_TYPES, SKIN_BIOPSY_TYPES, FIXATIVES, LOBES, TIRADS, labelOf,
} from '../../constants/histology';
import { notify } from '../../utils/notify';
import { groupHistologyRequests } from '../../utils/histologyRequests';
import HistopathologyRequestPrint from './HistopathologyRequestPrint';

/**
 * HistologyRequestForm — the histopathology request (Orders → Histopathology;
 * 1 Nov 2026, Emu): ONE request with one or more specimens, each histology or
 * cytology — say a CNB of a thyroid nodule and an FNAC of a node. The request
 * fields (clinical details & question, laboratory, priority, relevant
 * history) are given once. Saving raises one requisition (each specimen
 * numbered, a Pending lab line each, unpriced — billing is done at Complete
 * consultation) and opens the printable form.
 *
 * From a skin finding's "Biopsy & procedures" tab (presetFindingId) it stays a
 * request of that one specimen, with "also record the biopsy as a procedure"
 * (H9). One form for every specialist (D11): a skin finding (only while
 * Dermatology is on), a thyroid nodule (lobe, nodule label, TI-RADS), a lymph
 * node or any other site.
 *
 * Autosaved as a draft (formKey 'histology-request'; an older one-specimen
 * draft is restored as a request of that specimen).
 *
 * Props: uhid, patient (for the printed form), presetFindingId (locks to that
 *        finding, one specimen), onCreated(request)
 */
const blankSpecimen = (presetFindingId, siteType = null) => ({
  kind: 'histology',
  siteType: presetFindingId ? 'skin' : (siteType || 'thyroid'),
  findingId: presetFindingId ? String(presetFindingId) : '',
  thyroidLobe: '',
  noduleLabel: '',
  tirads: '',
  siteText: '',
  specimenType: presetFindingId ? 'punch' : '',
  pieces: '',
  fixative: 'formalin',
  alsoRecordProcedure: true,
});

const blank = (presetFindingId) => ({
  specimens: [blankSpecimen(presetFindingId)],
  current: 0,
  clinicalDetails: '',
  sendTo: '',
  priority: 'Routine',
  relevantHistory: '',
});

/** A draft saved before 1 Nov 2026 held one specimen and its request fields flat. */
const fromDraft = (p, presetFindingId) => {
  if (!p) return blank(presetFindingId);
  if (Array.isArray(p.specimens) && p.specimens.length) {
    return { ...blank(presetFindingId), ...p, current: Math.min(Number(p.current) || 0, p.specimens.length - 1) };
  }
  const { clinicalDetails = '', sendTo = '', ...rest } = p;
  return { ...blank(presetFindingId), clinicalDetails, sendTo, specimens: [{ ...blankSpecimen(presetFindingId), ...rest }] };
};

/** The API shape of one specimen. */
const specimenPayload = (s, canRecordProcedure) => {
  const out = {
    kind: s.kind,
    siteType: s.siteType,
    specimenType: s.specimenType || undefined,
    pieces: s.pieces === '' ? null : Number(s.pieces),
    fixative: s.fixative || null,
    siteText: s.siteText || null,
  };
  if (s.siteType === 'skin') {
    out.findingId = Number(s.findingId) || undefined;
    out.alsoRecordProcedure = canRecordProcedure && !!s.alsoRecordProcedure;
  }
  if (s.siteType === 'thyroid') {
    out.thyroidLobe = s.thyroidLobe || undefined;
    out.noduleLabel = s.noduleLabel || null;
    out.tirads = s.tirads || null;
  }
  return out;
};

/** One line for a specimen still being written (no server summary yet). */
const draftLine = (s, findings) => {
  let site;
  if (s.siteType === 'thyroid') {
    site = ['Thyroid', labelOf(LOBES, s.thyroidLobe) && `${labelOf(LOBES, s.thyroidLobe).toLowerCase()} lobe`, s.noduleLabel, s.tirads].filter(Boolean).join(' · ');
  } else if (s.siteType === 'skin') {
    const f = findings.find((x) => String(x.id) === String(s.findingId));
    site = f ? `Skin — ${f.label} ${f.title}` : 'Skin finding';
  } else {
    site = `${s.siteType === 'lymph_node' ? 'Lymph node' : 'Site'}${s.siteText ? ` — ${s.siteText}` : ''}`;
  }
  const types = s.kind === 'cytology' ? CYTO_TYPES : TISSUE_TYPES;
  return [site, labelOf(types, s.specimenType), s.pieces ? `${s.pieces} ${s.kind === 'cytology' ? 'passes' : 'pieces'}` : '', s.fixative ? labelOf(FIXATIVES, s.fixative) : '']
    .filter(Boolean).join(' · ');
};

const inputCls = 'w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';
const labelCls = 'text-xs font-semibold text-gray-500';

const Seg = ({ options, value, onChange, name }) => (
  <div className="flex flex-wrap gap-1.5" role="group" aria-label={name}>
    {options.map((o) => (
      <button
        key={o.id}
        type="button"
        aria-pressed={value === o.id}
        onClick={() => onChange(o.id)}
        className={`min-h-[36px] rounded-full border px-3 py-1 text-sm ${value === o.id ? 'border-primary bg-primary font-semibold text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const PRIORITIES = ['Routine', 'Urgent', 'STAT'];

const HistologyRequestForm = ({ uhid, patient = null, presetFindingId = null, onCreated }) => {
  const { currentUser } = useUserContext();
  const { modules } = useClinicModules();
  const dermOn = !!modules.dermatology;
  const [form, setForm] = useState(() => blank(presetFindingId));
  const [findings, setFindings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState(null);
  const [printed, setPrinted] = useState(null);     // the request just made, for its printed form
  const setTop = (patch) => { setForm((f) => ({ ...f, ...patch })); setFieldError(null); };
  const spec = form.specimens[form.current] || form.specimens[0];
  const set = (patch) => {
    setForm((f) => ({ ...f, specimens: f.specimens.map((s, i) => (i === f.current ? { ...s, ...patch } : s)) }));
    setFieldError(null);
  };

  // Skin findings to choose from (only while Dermatology is on).
  useEffect(() => {
    if (!dermOn || !uhid) { setFindings([]); return undefined; }
    let alive = true;
    dermService.getBoard(uhid)
      .then((res) => { if (alive) setFindings((res.data?.findings || []).filter((f) => f.status !== 'entered_in_error')); })
      .catch(() => { if (alive) setFindings([]); });
    return () => { alive = false; };
  }, [dermOn, uhid]);

  const sites = useMemo(() => SITE_TYPES.filter((s) => s.id !== 'skin' || dermOn), [dermOn]);
  const types = spec.kind === 'cytology' ? CYTO_TYPES : TISSUE_TYPES;
  const preset = presetFindingId ? findings.find((f) => f.id === Number(presetFindingId)) : null;
  const canRecordFor = (s) => s.siteType === 'skin' && SKIN_BIOPSY_TYPES.includes(s.specimenType) && canRecordDerm(currentUser);
  const canRecordProcedure = canRecordFor(spec);
  const many = form.specimens.length > 1;

  const draft = useDraft({
    uhid,
    formKey: 'histology-request',
    contextKey: presetFindingId ? `finding-${presetFindingId}` : '',
    label: 'Histopathology request',
    value: form,
    baseline: blank(presetFindingId),
    enabled: !!uhid,
    onRestore: (p) => {
      const f = fromDraft(p, presetFindingId);
      if (presetFindingId) f.specimens = [{ ...f.specimens[0], siteType: 'skin', findingId: String(presetFindingId) }];
      setForm(f);
    },
    onDiscard: () => setForm(blank(presetFindingId)),
  });

  const changeKind = (kind) => {
    const list = kind === 'cytology' ? CYTO_TYPES : TISSUE_TYPES;
    set({
      kind,
      specimenType: list.some((t) => t.id === spec.specimenType) ? spec.specimenType : '',
      fixative: kind === 'cytology' ? 'slides' : 'formalin',
    });
  };

  // Another specimen from the same site by default (a CNB and an FNAC of one nodule).
  const addSpecimen = () => setForm((f) => ({
    ...f,
    specimens: [...f.specimens, blankSpecimen(null, f.specimens[f.current]?.siteType)],
    current: f.specimens.length,
  }));
  const removeSpecimen = (i) => setForm((f) => {
    const specimens = f.specimens.filter((_, j) => j !== i);
    return { ...f, specimens, current: Math.min(f.current > i ? f.current - 1 : f.current, specimens.length - 1) };
  });

  const submit = async () => {
    const header = {
      clinicalDetails: form.clinicalDetails,
      sendTo: form.sendTo || null,
      priority: form.priority || 'Routine',
      relevantHistory: form.relevantHistory || null,
    };
    setSaving(true);
    try {
      let rows;
      if (presetFindingId) {
        const res = await histologyService.create(uhid, { ...specimenPayload(form.specimens[0], canRecordFor(form.specimens[0])), ...header });
        rows = [res.data];
      } else {
        const res = await histologyService.createRequest(uhid, { ...header, specimens: form.specimens.map((s) => specimenPayload(s, canRecordFor(s))) });
        rows = res.data.specimens;
      }
      draft.markSaved();
      setForm(blank(presetFindingId));
      notify('success', `Histopathology requested — ${rows.map((r) => r.specimenNumber).join(', ')}`);
      if (patient?.uhid) setPrinted(groupHistologyRequests(rows)[0]);
      onCreated?.(rows[0], rows);
    } catch (err) {
      const field = err?.data?.field || null;
      const m = field && /^specimens\.(\d+)\.(.+)$/.exec(field);
      if (m) { setForm((f) => ({ ...f, current: Number(m[1]) })); setFieldError(m[2]); } else setFieldError(field);
      if (!err?.isPermissionDenied) notify('error', err?.message || 'Could not save the request');
    } finally {
      setSaving(false);
    }
  };

  const errCls = (f) => (fieldError === f ? 'ring-2 ring-red-300 rounded-lg' : '');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-gray-700">
          {preset ? `Request from ${preset.label} · ${preset.title}` : 'New histopathology request'}
        </span>
        <DraftStatus draft={draft} className="ml-auto" />
      </div>
      <DraftRestoreBanner draft={draft} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          {!presetFindingId && (
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Specimens on this request ({form.specimens.length})
            </span>
          )}

          {form.specimens.map((s, i) => (i === form.current ? null : (
            <div key={i} className="ui-surface flex flex-wrap items-center gap-2 px-4 py-3">
              <span className="text-sm font-bold text-gray-800">Specimen {i + 1}</span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-primary">{s.kind === 'cytology' ? 'Cytology' : 'Histology'}</span>
              <span className="min-w-0 flex-1 text-sm text-gray-600">{draftLine(s, findings)}</span>
              <button type="button" onClick={() => setTop({ current: i })} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm ui-hover">Edit</button>
              <button type="button" onClick={() => removeSpecimen(i)} aria-label={`Remove specimen ${i + 1}`} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-red-600 ui-hover">Remove</button>
            </div>
          )))}

          <div className={`ui-surface flex min-w-0 flex-col gap-3 p-4 ${many ? 'ring-2 ring-primary' : ''}`}>
            {many && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-800">Specimen {form.current + 1}</span>
                <span className="text-xs text-gray-500">editing</span>
                <button type="button" onClick={() => removeSpecimen(form.current)} className="ml-auto text-xs font-medium text-red-600 hover:underline">Remove this specimen</button>
              </div>
            )}
            <div className={`flex flex-col gap-1.5 ${errCls('kind')}`}>
              <span className={labelCls}>Kind</span>
              <Seg name="Kind" options={KINDS} value={spec.kind} onChange={changeKind} />
            </div>

            {!presetFindingId && (
              <div className={`flex flex-col gap-1.5 ${errCls('siteType')}`}>
                <span className={labelCls}>Specimen from</span>
                <Seg name="Specimen from" options={sites} value={spec.siteType} onChange={(siteType) => set({ siteType })} />
              </div>
            )}

            {spec.siteType === 'skin' && !presetFindingId && (
              <div className={`flex flex-col gap-1 ${errCls('findingId')}`}>
                <label htmlFor="histo-finding" className={labelCls}>Skin finding</label>
                <select id="histo-finding" value={spec.findingId} onChange={(e) => set({ findingId: e.target.value })} className={inputCls}>
                  <option value="">Choose a finding…</option>
                  {findings.map((f) => (
                    <option key={f.id} value={f.id}>{f.label} · {f.title} · {f.regionLabels.join(', ')}</option>
                  ))}
                </select>
                {findings.length === 0 && <span className="text-xs text-gray-500">No skin findings yet — add one in the Dermatology tool first.</span>}
              </div>
            )}

            {spec.siteType === 'thyroid' && (
              <div className="flex flex-col gap-3">
                <div className={`flex flex-col gap-1.5 ${errCls('thyroidLobe')}`}>
                  <span className={labelCls}>Lobe</span>
                  <Seg name="Lobe" options={LOBES} value={spec.thyroidLobe} onChange={(thyroidLobe) => set({ thyroidLobe })} />
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="histo-nodule" className={labelCls}>Nodule</label>
                    <input id="histo-nodule" value={spec.noduleLabel} maxLength={80} onChange={(e) => set({ noduleLabel: e.target.value })} placeholder="e.g. R2 · lower pole · 24 mm" className={inputCls} />
                  </div>
                  <div className={`flex flex-col gap-1 ${errCls('tirads')}`}>
                    <label htmlFor="histo-tirads" className={labelCls}>TI-RADS</label>
                    <select id="histo-tirads" value={spec.tirads} onChange={(e) => set({ tirads: e.target.value })} className={inputCls}>
                      <option value="">—</option>
                      {TIRADS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className={`flex flex-col gap-1 ${errCls('siteText')}`}>
              <label htmlFor="histo-site" className={labelCls}>
                {spec.siteType === 'lymph_node' || spec.siteType === 'other' ? 'Site' : 'Exact site (optional)'}
              </label>
              <input
                id="histo-site" value={spec.siteText} maxLength={200} onChange={(e) => set({ siteText: e.target.value })}
                placeholder={spec.siteType === 'lymph_node' ? 'e.g. Right level III cervical node' : spec.siteType === 'other' ? 'Describe the site' : ''}
                className={inputCls}
              />
            </div>

            <div className={`flex flex-col gap-1.5 ${errCls('specimenType')}`}>
              <span className={labelCls}>Specimen type</span>
              <Seg name="Specimen type" options={types} value={spec.specimenType} onChange={(specimenType) => set({ specimenType })} />
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className={`flex flex-col gap-1 ${errCls('pieces')}`}>
                <label htmlFor="histo-pieces" className={labelCls}>{spec.kind === 'cytology' ? 'Passes' : 'Pieces'}</label>
                <input id="histo-pieces" type="number" min="1" max="50" inputMode="numeric" value={spec.pieces} onChange={(e) => set({ pieces: e.target.value })} className={`${inputCls} w-24 text-right tabular-nums`} />
              </div>
              <div className="flex min-w-[160px] flex-1 flex-col gap-1">
                <label htmlFor="histo-fixative" className={labelCls}>Sent in</label>
                <select id="histo-fixative" value={spec.fixative} onChange={(e) => set({ fixative: e.target.value })} className={inputCls}>
                  <option value="">—</option>
                  {FIXATIVES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>
            </div>
            {canRecordProcedure && (
              <label className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-gray-700">
                <input type="checkbox" className="mt-0.5 h-4 w-4" checked={!!spec.alsoRecordProcedure} onChange={(e) => set({ alsoRecordProcedure: e.target.checked })} />
                <span>Also record the biopsy as a procedure on this finding today</span>
              </label>
            )}
          </div>

          {!presetFindingId && (
            <button type="button" onClick={addSpecimen} disabled={form.specimens.length >= 10}
              className="min-h-[44px] rounded-xl border border-dashed border-gray-400 bg-white px-4 py-2 text-sm font-semibold text-primary ui-hover disabled:opacity-50">
              + Add another specimen
            </button>
          )}
        </div>

        <div className="ui-surface flex min-w-0 flex-col gap-3 p-4">
          <div className={`flex flex-col gap-1 ${errCls('clinicalDetails')}`}>
            <label htmlFor="histo-details" className={labelCls}>Clinical details &amp; question{many ? ' (for the whole request)' : ''}</label>
            <textarea id="histo-details" rows={5} value={form.clinicalDetails} onChange={(e) => setTop({ clinicalDetails: e.target.value })}
              placeholder={spec.siteType === 'thyroid' ? 'e.g. TR5 nodule, 24 mm, taller-than-wide. Bethesda category please.' : 'e.g. Enlarging pigmented papule. Exclude melanoma.'}
              className={inputCls} />
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
            <div className="flex flex-col gap-1">
              <label htmlFor="histo-lab" className={labelCls}>Send to (laboratory)</label>
              <input id="histo-lab" value={form.sendTo} maxLength={150} onChange={(e) => setTop({ sendTo: e.target.value })} placeholder="e.g. Lancet Kenya — Histopathology" className={inputCls} />
            </div>
            <div className={`flex flex-col gap-1 ${errCls('priority')}`}>
              <label htmlFor="histo-priority" className={labelCls}>Priority</label>
              <select id="histo-priority" value={form.priority} onChange={(e) => setTop({ priority: e.target.value })} className={inputCls}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className={`flex flex-col gap-1 ${errCls('relevantHistory')}`}>
            <label htmlFor="histo-history" className={labelCls}>Relevant history (optional)</label>
            <input id="histo-history" value={form.relevantHistory} maxLength={1000} onChange={(e) => setTop({ relevantHistory: e.target.value })} placeholder="e.g. No previous thyroid surgery. Not on anticoagulants." className={inputCls} />
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-3">
            <button type="button" onClick={submit} disabled={saving}
              className="min-h-[44px] rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving…' : patient?.uhid ? 'Request histopathology & print' : 'Request histopathology'}
            </button>
            <span className="text-xs text-gray-500">
              One request{many ? ` · ${form.specimens.length} specimens` : ''}. Each specimen is numbered and goes to the lab as a Pending line; nothing is billed here — bill at Complete consultation.
            </span>
          </div>
        </div>
      </div>

      {printed && <HistopathologyRequestPrint request={printed} patient={patient} onClose={() => setPrinted(null)} />}
    </div>
  );
};

export default HistologyRequestForm;
