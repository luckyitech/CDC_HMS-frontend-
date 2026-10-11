import { useEffect, useMemo, useState } from 'react';
import useDraft from '../../hooks/useDraft';
import useClinicModules from '../../hooks/useClinicModules';
import { DraftStatus, DraftRestoreBanner } from '../shared/DraftStatus';
import { useUserContext } from '../../contexts/UserContext';
import { canRecordDerm } from '../../utils/permissions';
import { dermService } from '../../services/dermService';
import { histologyService } from '../../services/histologyService';
import {
  KINDS, SITE_TYPES, TISSUE_TYPES, CYTO_TYPES, SKIN_BIOPSY_TYPES, FIXATIVES, LOBES, TIRADS,
} from '../../constants/histology';
import { notify } from '../../utils/notify';

/**
 * HistologyRequestForm — request a histology or cytology specimen (Orders
 * tab 3, and from a skin finding's "Biopsy & procedures" tab). One form for
 * every specialist (D11): a skin finding (only while Dermatology is on), a
 * thyroid nodule (lobe, nodule label, TI-RADS — CNB / FNAC), a lymph node or
 * any other site.
 *
 * Saving raises a Pending lab request ("Histopathology" / "Cytology") so the
 * lab and billing see it as usual, and gives the specimen its number. From a
 * skin finding with a punch / shave / incisional / excision specimen it can
 * also record the biopsy as a procedure on that finding (H9).
 *
 * Autosaved as a draft (formKey 'histology-request').
 *
 * Props: uhid, presetFindingId (locks the specimen to that finding),
 *        onCreated(request), compact (no outer card heading)
 */
const blank = (presetFindingId) => ({
  kind: 'histology',
  siteType: presetFindingId ? 'skin' : 'thyroid',
  findingId: presetFindingId ? String(presetFindingId) : '',
  thyroidLobe: '',
  noduleLabel: '',
  tirads: '',
  siteText: '',
  specimenType: presetFindingId ? 'punch' : '',
  pieces: '',
  fixative: 'formalin',
  clinicalDetails: '',
  sendTo: '',
  alsoRecordProcedure: true,
});

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

const HistologyRequestForm = ({ uhid, presetFindingId = null, onCreated }) => {
  const { currentUser } = useUserContext();
  const { modules } = useClinicModules();
  const dermOn = !!modules.dermatology;
  const [form, setForm] = useState(() => blank(presetFindingId));
  const [findings, setFindings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState(null);
  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setFieldError(null); };

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
  const types = form.kind === 'cytology' ? CYTO_TYPES : TISSUE_TYPES;
  const preset = presetFindingId ? findings.find((f) => f.id === Number(presetFindingId)) : null;
  const canRecordProcedure = form.siteType === 'skin' && SKIN_BIOPSY_TYPES.includes(form.specimenType) && canRecordDerm(currentUser);

  const draft = useDraft({
    uhid,
    formKey: 'histology-request',
    contextKey: presetFindingId ? `finding-${presetFindingId}` : '',
    label: 'Histology / cytology request',
    value: form,
    baseline: blank(presetFindingId),
    enabled: !!uhid,
    onRestore: (p) => setForm({ ...blank(presetFindingId), ...(p || {}), ...(presetFindingId ? { siteType: 'skin', findingId: String(presetFindingId) } : {}) }),
    onDiscard: () => setForm(blank(presetFindingId)),
  });

  const changeKind = (kind) => {
    const list = kind === 'cytology' ? CYTO_TYPES : TISSUE_TYPES;
    set({
      kind,
      specimenType: list.some((t) => t.id === form.specimenType) ? form.specimenType : '',
      fixative: kind === 'cytology' ? 'slides' : 'formalin',
    });
  };

  const submit = async () => {
    const payload = {
      kind: form.kind,
      siteType: form.siteType,
      specimenType: form.specimenType || undefined,
      clinicalDetails: form.clinicalDetails,
      sendTo: form.sendTo || null,
      pieces: form.pieces === '' ? null : Number(form.pieces),
      fixative: form.fixative || null,
      siteText: form.siteText || null,
    };
    if (form.siteType === 'skin') {
      payload.findingId = Number(form.findingId) || undefined;
      payload.alsoRecordProcedure = canRecordProcedure && !!form.alsoRecordProcedure;
    }
    if (form.siteType === 'thyroid') {
      payload.thyroidLobe = form.thyroidLobe || undefined;
      payload.noduleLabel = form.noduleLabel || null;
      payload.tirads = form.tirads || null;
    }
    setSaving(true);
    try {
      const res = await histologyService.create(uhid, payload);
      draft.markSaved();
      setForm(blank(presetFindingId));
      notify('success', `${form.kind === 'cytology' ? 'Cytology' : 'Histology'} requested — specimen ${res.data.specimenNumber}`);
      onCreated?.(res.data);
    } catch (err) {
      setFieldError(err?.data?.field || null);
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
          {preset ? `Request from ${preset.label} · ${preset.title}` : 'New histology / cytology request'}
        </span>
        <DraftStatus draft={draft} className="ml-auto" />
      </div>
      <DraftRestoreBanner draft={draft} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="ui-surface flex min-w-0 flex-col gap-3 p-4">
          <div className={`flex flex-col gap-1.5 ${errCls('kind')}`}>
            <span className={labelCls}>Request</span>
            <Seg name="Request" options={KINDS} value={form.kind} onChange={changeKind} />
          </div>

          {!presetFindingId && (
            <div className={`flex flex-col gap-1.5 ${errCls('siteType')}`}>
              <span className={labelCls}>Specimen from</span>
              <Seg name="Specimen from" options={sites} value={form.siteType} onChange={(siteType) => set({ siteType })} />
            </div>
          )}

          {form.siteType === 'skin' && !presetFindingId && (
            <div className={`flex flex-col gap-1 ${errCls('findingId')}`}>
              <label htmlFor="histo-finding" className={labelCls}>Skin finding</label>
              <select id="histo-finding" value={form.findingId} onChange={(e) => set({ findingId: e.target.value })} className={inputCls}>
                <option value="">Choose a finding…</option>
                {findings.map((f) => (
                  <option key={f.id} value={f.id}>{f.label} · {f.title} · {f.regionLabels.join(', ')}</option>
                ))}
              </select>
              {findings.length === 0 && <span className="text-xs text-gray-500">No skin findings yet — add one in the Dermatology tool first.</span>}
            </div>
          )}

          {form.siteType === 'thyroid' && (
            <div className="flex flex-col gap-3">
              <div className={`flex flex-col gap-1.5 ${errCls('thyroidLobe')}`}>
                <span className={labelCls}>Lobe</span>
                <Seg name="Lobe" options={LOBES} value={form.thyroidLobe} onChange={(thyroidLobe) => set({ thyroidLobe })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                <div className="flex flex-col gap-1">
                  <label htmlFor="histo-nodule" className={labelCls}>Nodule</label>
                  <input id="histo-nodule" value={form.noduleLabel} maxLength={80} onChange={(e) => set({ noduleLabel: e.target.value })} placeholder="e.g. R2 · lower pole · 24 mm" className={inputCls} />
                </div>
                <div className={`flex flex-col gap-1 ${errCls('tirads')}`}>
                  <label htmlFor="histo-tirads" className={labelCls}>TI-RADS</label>
                  <select id="histo-tirads" value={form.tirads} onChange={(e) => set({ tirads: e.target.value })} className={inputCls}>
                    <option value="">—</option>
                    {TIRADS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <span className="text-xs text-gray-500">Typed by hand for now — picking the nodule from the ultrasound report can come later.</span>
            </div>
          )}

          <div className={`flex flex-col gap-1 ${errCls('siteText')}`}>
            <label htmlFor="histo-site" className={labelCls}>
              {form.siteType === 'lymph_node' || form.siteType === 'other' ? 'Site' : 'Exact site (optional)'}
            </label>
            <input
              id="histo-site" value={form.siteText} maxLength={200} onChange={(e) => set({ siteText: e.target.value })}
              placeholder={form.siteType === 'lymph_node' ? 'e.g. Right level III cervical node' : form.siteType === 'other' ? 'Describe the site' : ''}
              className={inputCls}
            />
          </div>

          <div className={`flex flex-col gap-1.5 ${errCls('specimenType')}`}>
            <span className={labelCls}>Specimen type</span>
            <Seg name="Specimen type" options={types} value={form.specimenType} onChange={(specimenType) => set({ specimenType })} />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className={`flex flex-col gap-1 ${errCls('pieces')}`}>
              <label htmlFor="histo-pieces" className={labelCls}>{form.kind === 'cytology' ? 'Passes' : 'Pieces'}</label>
              <input id="histo-pieces" type="number" min="1" max="50" inputMode="numeric" value={form.pieces} onChange={(e) => set({ pieces: e.target.value })} className={`${inputCls} w-24 text-right tabular-nums`} />
            </div>
            <div className="flex min-w-[160px] flex-1 flex-col gap-1">
              <label htmlFor="histo-fixative" className={labelCls}>Sent in</label>
              <select id="histo-fixative" value={form.fixative} onChange={(e) => set({ fixative: e.target.value })} className={inputCls}>
                <option value="">—</option>
                {FIXATIVES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="ui-surface flex min-w-0 flex-col gap-3 p-4">
          <div className={`flex flex-col gap-1 ${errCls('clinicalDetails')}`}>
            <label htmlFor="histo-details" className={labelCls}>Clinical details &amp; question</label>
            <textarea id="histo-details" rows={5} value={form.clinicalDetails} onChange={(e) => set({ clinicalDetails: e.target.value })}
              placeholder={form.siteType === 'thyroid' ? 'e.g. TR5 nodule, 24 mm, taller-than-wide. Bethesda category please.' : 'e.g. Enlarging pigmented papule. Exclude melanoma.'}
              className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="histo-lab" className={labelCls}>Send to (laboratory)</label>
            <input id="histo-lab" value={form.sendTo} maxLength={150} onChange={(e) => set({ sendTo: e.target.value })} placeholder="e.g. Lancet Kenya — Histopathology" className={inputCls} />
          </div>
          {canRecordProcedure && (
            <label className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-gray-700">
              <input type="checkbox" className="mt-0.5 h-4 w-4" checked={!!form.alsoRecordProcedure} onChange={(e) => set({ alsoRecordProcedure: e.target.checked })} />
              <span>Also record the biopsy as a procedure on this finding today</span>
            </label>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-3">
            <button type="button" onClick={submit} disabled={saving}
              className="min-h-[44px] rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving…' : `Request ${form.kind === 'cytology' ? 'cytology' : 'histology'}`}
            </button>
            <span className="text-xs text-gray-500">
              Raises a Pending lab request (“{form.kind === 'cytology' ? 'Cytology' : 'Histopathology'}”) for the lab and billing, and numbers the specimen.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistologyRequestForm;
