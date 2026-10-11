import { useEffect, useState } from 'react';
import { Camera, X } from 'lucide-react';
import useDraft from '../../../hooks/useDraft';
import { DraftStatus, DraftRestoreBanner } from '../../shared/DraftStatus';
import { useDermContext } from '../../../contexts/DermContext';
import { regionLabel } from '../../../constants/dermRegions';
import DermLookForm from './DermLookForm';
import DermTypePicker from './DermTypePicker';
import { forgetDermVocabulary } from './useDermVocabulary';
import { STATUS_TODAY, blankLook, lookPayload, lookFromDraft } from './dermFormat';
import { hasValue } from './dermExam';
import { notify } from '../../../utils/notify';

/**
 * DermNewFinding — add a finding: what it is, where it is, and today's first
 * look at it. The number (#001…) is given by the server when it is saved.
 * Autosaves a draft like every typed clinical form (formKey 'derm-finding',
 * context 'new').
 *
 * Shown as a pop-up beside the skin record's body map (8 Oct 2026, Emu): the
 * map stays in view and is where the areas are chosen — tapping it while this
 * is open adds or removes areas here. Photos come last (9 Oct 2026): "Add
 * photos" saves the finding first, then the pop-up opens it with the camera,
 * upload and phone QR; photos of areas chosen before (linkPhotoIds) are
 * filed under the finding when it is saved.
 *
 * Props: regions + onRegionsChange (the map's selection, controlled),
 *        initialType, linkPhotoIds (area photos to file under it),
 *        onDone(findingId | null, { photos }) — photos: true when "Add photos" saved it
 */
const inputCls = 'rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';

const blank = (regions, type) => ({
  type: type || 'lesion', typeOther: '', title: '', regions: Array.isArray(regions) ? [...regions] : [], exactSite: '', firstNoticed: '', concern: '',
  look: { ...blankLook(), statusToday: 'new' },
});

// Anything typed or chosen in today's look besides its status / how-measured defaults.
const lookTyped = (l) => !!l && Object.entries(l).some(([k, v]) => !['statusToday', 'measuredBy'].includes(k) && hasValue(typeof v === 'string' ? v.trim() : v));

const DermNewFinding = ({ regions: mapRegions = [], onRegionsChange = () => {}, alreadyIn = {}, initialType, linkPhotoIds = [], onDone }) => {
  const { uhid, createFinding } = useDermContext();
  const [form, setForm] = useState(() => blank(mapRegions, initialType));
  // The map is the one place areas are chosen: follow it.
  const mapKey = mapRegions.join(',');
  useEffect(() => { setForm((f) => (f.regions.join(',') === mapKey ? f : { ...f, regions: [...mapRegions] })); }, [mapKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const [saving, setSaving] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const draft = useDraft({
    uhid,
    formKey: 'derm-finding',
    contextKey: 'new',
    value: form,
    baseline: null,
    // Defaults (type, the tapped regions, status 'new', ruler) are not typing —
    // a draft starts only once something has actually been written.
    isEmpty: (v) => !v || (![v.title, v.typeOther, v.exactSite, v.firstNoticed, v.concern].some((x) => (x || '').trim())
      && !lookTyped(v.look)),
    enabled: !!uhid,
    onRestore: (p) => { if (Array.isArray(p?.regions) && p.regions.length) onRegionsChange(p.regions); setForm({ ...blank(), ...p, look: { ...lookFromDraft(p?.look), statusToday: p?.look?.statusToday || 'new' } }); },
    onDiscard: () => setForm(blank(mapRegions, initialType)),
  });

  // Save the finding. `thenPhotos`: "Add photos" saves first so nothing typed is
  // lost, then the pop-up opens this finding with the camera / phone (9 Oct 2026).
  const save = async (thenPhotos = false) => {
    if (form.type === 'other' && !form.typeOther.trim()) { notify('error', 'Name the type of finding (you chose Other)'); return; }
    if (!form.title.trim()) { notify('error', 'Give the finding a short name'); return; }
    if (!form.regions.length) { notify('error', 'Tap at least one body region on the map'); return; }
    if (!form.look.statusToday) { notify('error', 'Choose the status today'); return; }
    setSaving(true);
    try {
      const data = await createFinding({
        type: form.type, typeOther: form.type === 'other' ? form.typeOther.trim() : null, title: form.title, regions: form.regions,
        exactSite: form.exactSite || null,
        // First noticed / concern now belong to the History section (to be built) — still sent if a draft holds them.
        firstNoticed: form.firstNoticed || null, concern: form.concern || null,
        observation: lookPayload(form.look),
        linkPhotoIds,
      });
      draft.markSaved();
      forgetDermVocabulary();   // a new "Other" name or typed word is offered from now on
      onDone(data?.finding?.id || data?.id || null, { photos: thenPhotos });
    } catch {
      // toast already shown; keep what was typed
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800">Record finding</h3>
        <DraftStatus draft={draft} className="ml-auto" />
        <button type="button" onClick={() => onDone(null)} aria-label="Close" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
      </div>
      <DraftRestoreBanner draft={draft} />

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap gap-1.5">
          {form.regions.map((r) => (
            <span key={r} title={alreadyIn[r] ? `Already recorded in ${alreadyIn[r]}` : undefined}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${alreadyIn[r] ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-blue-200 bg-blue-50 text-primary'}`}>
              {regionLabel(r)}{alreadyIn[r] ? ` · in ${alreadyIn[r]}` : ''}
              <button type="button" onClick={() => onRegionsChange(form.regions.filter((x) => x !== r))} aria-label={`Remove ${regionLabel(r)}`} className="rounded-full hover:bg-blue-100"><X className="h-3 w-3" /></button>
            </span>
          ))}
          {!form.regions.length && <span className="text-sm text-amber-700">No area chosen yet.</span>}
        </div>
        {form.regions.some((r) => alreadyIn[r]) && (
          <span className="text-xs text-amber-800">Amber areas are already part of a recorded finding. If it is the same lesion, use "Add to" beside the map instead.</span>
        )}
        <span className="text-[11px] text-gray-500">Tap the body map to add or remove areas — front and back. Left and right are the patient's.</span>
      </div>

      <div className="ui-surface flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-500">Type of finding</span>
          <DermTypePicker idPrefix="derm-new-type" type={form.type} typeOther={form.typeOther} onChange={(t) => set(t)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-500">Short name</span>
            <input id="derm-new-title" value={form.title} onChange={(e) => set({ title: e.target.value })} maxLength={120} className={inputCls} placeholder="e.g. Pigmented papule" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-500">Exact site (optional)</span>
            <input id="derm-new-site" value={form.exactSite} onChange={(e) => set({ exactSite: e.target.value })} maxLength={200} className={inputCls} placeholder="e.g. 2 cm below the lateral canthus" />
          </label>
        </div>
      </div>

      <div className="ui-surface p-4">
        <h4 className="mb-3 text-sm font-semibold text-gray-700">Today's look</h4>
        <DermLookForm idPrefix="derm-new" value={form.look} onChange={(look) => set({ look })} statuses={STATUS_TODAY}
          location={form.regions.map(regionLabel)} />
      </div>

      <div className="ui-surface flex flex-wrap items-center gap-2 p-4">
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold text-gray-700">Photos</span>
          <span className="text-xs text-gray-500">Add photos saves this finding first, so nothing is lost, then opens the camera, upload and the phone QR.</span>
          {linkPhotoIds.length > 0 && (
            <span className="mt-1 text-xs text-gray-600">{linkPhotoIds.length === 1 ? '1 photo' : `${linkPhotoIds.length} photos`} taken earlier will be filed under this finding.</span>
          )}
        </div>
        <button type="button" onClick={() => save(true)} disabled={saving}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-primary bg-white px-3 py-1.5 text-sm font-semibold text-primary ui-hover disabled:opacity-60">
          <Camera className="h-4 w-4" /> Add photos
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => save(false)} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {saving ? 'Saving…' : 'Save finding'}
        </button>
        <button type="button" onClick={() => onDone(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  );
};

export default DermNewFinding;
