import { useState, useEffect, useRef } from 'react';
import * as engine from '../../../utils/thyroidUsEngine';
import { OPT, FOCI, INVASIVE, TR_COLOR, TR_LABEL, FOLL_COLOR } from '../../../constants/thyroidUs';
import { Chip, ChipRow, MultiRow, Field, Num, DimTriplet, SectionTitle } from './ui';

const FNA = { TR3: 'FNA if ≥ 2.5 cm', TR4: 'FNA if ≥ 1.5 cm', TR5: 'FNA if ≥ 1.0 cm' };

export default function NoduleCard({ nodule, open, onToggle, onSave, onSaveFollicular, onDelete, disabled }) {
  const [n, setN] = useState(() => ({ ...nodule }));
  const [f, setF] = useState(() => ({ ...(nodule.ThyroidNoduleFollicularAssessment || {}) }));
  const saveT = useRef(null);
  const follT = useRef(null);

  useEffect(() => { setN({ ...nodule }); setF({ ...(nodule.ThyroidNoduleFollicularAssessment || {}) }); }, [nodule.id]); // eslint-disable-line

  const pushSave = (next) => {
    if (disabled) return;
    clearTimeout(saveT.current);
    saveT.current = setTimeout(() => onSave(nodule.id, next), 500);
  };
  const set = (patch) => { const next = { ...n, ...patch }; setN(next); pushSave(patch); };
  const toggleFoci = (k) => set({ [k]: !n[k], fociStatus: 'present' });

  const pushFoll = (next) => { clearTimeout(follT.current); follT.current = setTimeout(() => onSaveFollicular(nodule.id, next), 500); };
  const setF2 = (patch) => { const next = { ...f, ...patch }; setF(next); if (!disabled) pushFoll(next); };
  const toggleInv = (v) => {
    const arr = Array.isArray(f.invasiveFeatures) ? [...f.invasiveFeatures] : [];
    const i = arr.indexOf(v); i >= 0 ? arr.splice(i, 1) : arr.push(v);
    setF2({ invasiveFeatures: arr });
  };

  // live compute (mirrored engine)
  const t = engine.computeTirads(n);
  const trCat = t.insufficient ? 'TR—' : t.category;
  const trCol = t.insufficient ? 'bg-slate-400 text-white' : TR_COLOR[t.category];
  const sug = engine.suggestBtaU(n);
  const vol = engine.volume(n.length, n.height, n.width);
  const follIndicated = n.follicularIndicated === 'indicated';
  const concern = follIndicated ? engine.follicularConcern(f, n) : null;
  const abl = (n.ablationPlanning || ['mixed_cystic_solid', 'predominantly_cystic', 'predominantly_solid'].includes(n.composition))
    ? engine.ablationFigures(n) : null;

  const beth34 = n.previousCytology === 'bethesda_3' || n.previousCytology === 'bethesda_4';
  const gate = concern && (concern.concern === 'high' || concern.concern === 'intermediate') && beth34;

  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${open ? 'border-teal-300' : 'border-slate-200'}`}>
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold">Nodule {nodule.noduleNumber}</span>
          <span className="text-slate-500">{n.lobe ? `${cap(n.lobe)}${n.pole ? ', ' + n.pole : ''}` : 'location —'}</span>
          <span className="text-slate-400">{vol ? `${vol} mL` : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${trCol}`}>{trCat}{t.insufficient ? '' : ` (${t.points})`}</span>
          {n.btaCategory && <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-700 text-white">{n.btaCategory}</span>}
          {follIndicated && <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${FOLL_COLOR[concern.concern].tag}`}>{concern.concern}</span>}
          <span className="text-slate-400">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-4">
          {/* A */}
          <section>
            <SectionTitle>A · Sonographic characteristics</SectionTitle>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <Field label="Lobe"><ChipRow options={OPT.lobe} value={n.lobe} disabled={disabled} onChange={(v) => set({ lobe: v })} /></Field>
              <Field label="Pole"><ChipRow options={OPT.pole} value={n.pole} disabled={disabled} onChange={(v) => set({ pole: v })} /></Field>
              <Field label="Size L×H×W (cm)">
                <DimTriplet dims={[n.length, n.height, n.width]} volume={vol} disabled={disabled} onChange={(k, x) => set({ [k]: x })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Composition"><ChipRow options={OPT.composition} value={n.composition} disabled={disabled} onChange={(v) => set({ composition: v })} /></Field>
              <Field label="Echogenicity"><ChipRow options={OPT.nEchogenicity} value={n.echogenicity} disabled={disabled} onChange={(v) => set({ echogenicity: v })} /></Field>
              <Field label="Shape"><ChipRow options={OPT.shape} value={n.shape} disabled={disabled} onChange={(v) => set({ shape: v })} /></Field>
              <Field label="Margins"><ChipRow options={OPT.margins} value={n.margins} disabled={disabled} onChange={(v) => set({ margins: v })} /></Field>
              <div className="col-span-2">
                <Field label="Echogenic foci (additive)">
                  <MultiRow options={FOCI} disabled={disabled} isOn={(k) => !!n[k]} onToggle={toggleFoci} />
                </Field>
              </div>
            </div>
          </section>

          {/* B */}
          <section className="border-t border-slate-100 pt-3">
            <SectionTitle>B · Standard risk classification</SectionTitle>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 mb-3">
              <span className={`text-sm font-bold px-3 py-1 rounded ${trCol}`}>{trCat}</span>
              <div className="text-sm"><b>{t.insufficient ? '—' : t.points + ' pts'}</b> · <span className="text-slate-500">{t.insufficient ? 'insufficient information' : TR_LABEL[t.category]}</span></div>
              <div className="ml-auto text-[11px] text-slate-400">{t.insufficient ? '' : (FNA[t.category] || '')}</div>
            </div>
            <div className="text-[11px] text-slate-400 mb-1">BTA U — engine suggests, reporter confirms</div>
            <ChipRow options={OPT.bta} value={n.btaCategory} disabled={disabled} onChange={(v) => set({ btaCategory: v })} />
            <div className="text-[11px] text-amber-600 mt-1">{sug.suggested ? <>Suggested <b>{sug.suggested}</b> — {sug.rationale}</> : sug.rationale}</div>

            <label className="flex items-center gap-2 text-sm text-slate-600 mt-3">
              <input type="checkbox" checked={!!abl} disabled={disabled} onChange={(e) => set({ ablationPlanning: e.target.checked })} />
              Ablation planning (auto-shows for mixed cystic–solid)
            </label>
            {abl && (
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-lg p-3 mt-2">
                <div className="text-xs font-semibold text-indigo-800 mb-2">Ablation planning</div>
                <div className="flex items-end gap-3 mb-2">
                  <Field label="Cystic component L×H×W (cm)">
                    <div className="flex gap-1">
                      <Num value={n.cysticLength} disabled={disabled} onChange={(x) => set({ cysticLength: x })} className="w-14" />
                      <Num value={n.cysticHeight} disabled={disabled} onChange={(x) => set({ cysticHeight: x })} className="w-14" />
                      <Num value={n.cysticWidth} disabled={disabled} onChange={(x) => set({ cysticWidth: x })} className="w-14" />
                    </div>
                  </Field>
                  <Field label="Viable solid on Doppler"><ChipRow options={OPT.viableSolidOnDoppler} value={n.viableSolidOnDoppler} disabled={disabled} onChange={(v) => set({ viableSolidOnDoppler: v })} /></Field>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                  {[['Total', abl.total], ['Cystic', abl.cysticVolume], ['Solid', abl.solidVolume], ['Solid %', abl.solidPercent]].map(([l, v]) => (
                    <div key={l} className="bg-white rounded border border-slate-200 py-1.5"><div className="text-[10px] text-slate-400">{l}</div><div className="font-semibold">{v == null ? '—' : v}</div></div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* C — follicular */}
          <section className="border-t border-slate-100 pt-3">
            <SectionTitle right={<ChipRow options={OPT.follicularIndicated} value={n.follicularIndicated} disabled={disabled} onChange={(v) => set({ follicularIndicated: v || 'not_indicated' })} />}>
              C · Follicular Neoplasm Sonographic Assessment
            </SectionTitle>
            {follIndicated && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Echotexture (anchor)"><ChipRow options={OPT.f_echotexture} value={f.echotexture} disabled={disabled} onChange={(v) => setF2({ echotexture: v })} /></Field>
                  <Field label="Halo (anchor)"><ChipRow options={OPT.f_halo} value={f.halo} disabled={disabled} onChange={(v) => setF2({ halo: v })} /></Field>
                  <div className="col-span-2"><Field label="Capsular interface (anchor)"><ChipRow options={OPT.f_capsularInterface} value={f.capsularInterface} disabled={disabled} onChange={(v) => setF2({ capsularInterface: v })} /></Field></div>
                  <Field label="Capsule tool"><ChipRow options={OPT.f_capsule} value={f.capsule} disabled={disabled} onChange={(v) => setF2({ capsule: v })} /></Field>
                  <Field label="Satellite nodule"><ChipRow options={OPT.f_satelliteNodule} value={f.satelliteNodule} disabled={disabled} onChange={(v) => setF2({ satelliteNodule: v })} /></Field>
                  <Field label="Tubercle-in-nodule"><ChipRow options={OPT.f_tubercleInNodule} value={f.tubercleInNodule} disabled={disabled} onChange={(v) => setF2({ tubercleInNodule: v })} /></Field>
                  <Field label="Capsular vascularity"><ChipRow options={OPT.f_capsularVascularity} value={f.capsularVascularity} disabled={disabled} onChange={(v) => setF2({ capsularVascularity: v })} /></Field>
                  <div className="col-span-2"><Field label="Invasive features (multi)"><MultiRow options={INVASIVE} disabled={disabled} isOn={(v) => (f.invasiveFeatures || []).includes(v)} onToggle={toggleInv} /></Field></div>
                </div>
                <div className={`rounded-lg p-3 text-sm border ${FOLL_COLOR[concern.concern].box}`}>
                  <div className={`font-semibold ${FOLL_COLOR[concern.concern].txt}`}>Sonographic concern: {concern.concern.toUpperCase()}</div>
                  {concern.features.length > 0 && <div className="text-xs mt-1 text-slate-600">Features: {concern.features.join(', ')}.</div>}
                  <div className="text-[11px] mt-1 text-slate-500 italic">
                    {concern.concern === 'low' && 'No sonographic features associated with an increased likelihood of follicular carcinoma are identified.'}
                    {concern.concern === 'incomplete' && 'Assessment incomplete — echotexture, halo and capsular interface are required.'}
                    {(concern.concern === 'high' || concern.concern === 'intermediate') && 'These findings are not diagnostic; distinction of follicular adenoma vs carcinoma requires histopathology.'}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* D */}
          <section className="border-t border-slate-100 pt-3">
            <SectionTitle>D · Clinical / procedural</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Previous cytology (Bethesda)"><ChipRow options={OPT.previousCytology} value={n.previousCytology} disabled={disabled} onChange={(v) => set({ previousCytology: v })} /></Field>
              <Field label="Management implications">
                <input className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" disabled={disabled}
                  defaultValue={n.managementImplications || ''} onBlur={(e) => set({ managementImplications: e.target.value })} />
              </Field>
            </div>
            {gate && (
              <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
                <b>⚠ Ablation safety gate.</b> {concern.concern} follicular concern with Bethesda {n.previousCytology === 'bethesda_3' ? 'III' : 'IV'} cytology.
                If an ablation modality (RFA/PEA) is in the plan, signing will require an explicit acknowledgement.
              </div>
            )}
          </section>

          {!disabled && (
            <div className="flex justify-end">
              <button type="button" onClick={() => onDelete(nodule.id)} className="text-xs text-red-500 hover:text-red-700">Remove nodule</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function cap(s) { return (s || '').charAt(0).toUpperCase() + (s || '').slice(1); }
