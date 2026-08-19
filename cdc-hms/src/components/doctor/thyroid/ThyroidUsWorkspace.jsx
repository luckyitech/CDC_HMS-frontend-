import { useState, useEffect, useCallback, useRef } from 'react';
import { useThyroidUltrasound } from '../../../contexts/ThyroidUltrasoundContext';
import * as engine from '../../../utils/thyroidUsEngine';
import { OPT, STEPS } from '../../../constants/thyroidUs';
import { ChipRow, Field, Num, DimTriplet } from './ui';
import NoduleCard from './NoduleCard';
import LiveResultsPanel from './LiveResultsPanel';
import ImageReviewPane from './ImageReviewPane';
import ThyroidUsReportPrint from './ThyroidUsReportPrint';
import ThyroidImagePicker from './ThyroidImagePicker';
import LymphNodePanel from './LymphNodePanel';
import ThyroidSignPreview from './ThyroidSignPreview';
import { exportThyroidReportPdf } from '../../../utils/thyroidRadiologyPdf';
import { ultrasoundService } from '../../../services/ultrasoundService';

const IMG_LAYOUTS = {
  l32: { cols: 3, rows: 2, orientation: 'landscape' },
  l23: { cols: 2, rows: 3, orientation: 'landscape' },
  p23: { cols: 2, rows: 3, orientation: 'portrait' },
  p32: { cols: 3, rows: 2, orientation: 'portrait' },
};

export default function ThyroidUsWorkspace({ patient, onClose, seed = null }) {
  const ctx = useThyroidUltrasound();
  const { active, saving } = ctx;
  const seedAppliedRef = useRef(false);
  const [step, setStep] = useState(0);
  const [openNodule, setOpenNodule] = useState(null);
  const [catalog, setCatalog] = useState({ indication: [], plan: [] });
  const [preview, setPreview] = useState(null);
  const [confirmWarnings, setConfirmWarnings] = useState(false);
  const [ackAblation, setAckAblation] = useState(false);
  const [signDespite, setSignDespite] = useState(false);
  const [signing, setSigning] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showSignPreview, setShowSignPreview] = useState(false);

  // Resizable split between the image/results pane (left) and the form (right).
  const [isWide, setIsWide] = useState(typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [leftPct, setLeftPct] = useState(() => {
    const saved = Number(typeof localStorage !== 'undefined' && localStorage.getItem('thyroid_ws_split'));
    return saved >= 20 && saved <= 75 ? saved : 38;
  });
  const splitRef = useRef(null);
  const dragging = useRef(false);

  useEffect(() => {
    const onResize = () => setIsWide(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const startDrag = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev) => {
      if (!dragging.current || !splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(75, Math.max(20, pct)));
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      try { localStorage.setItem('thyroid_ws_split', String(Math.round(leftPctRef.current))); } catch { /* ignore */ }
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  // keep a ref of the latest leftPct for the drag-end persist
  const leftPctRef = useRef(leftPct);
  useEffect(() => { leftPctRef.current = leftPct; }, [leftPct]);

  useEffect(() => {
    ctx.getCatalog('indication').then((d) => setCatalog((c) => ({ ...c, indication: d }))).catch(() => {});
    ctx.getCatalog('plan').then((d) => setCatalog((c) => ({ ...c, plan: d }))).catch(() => {});
  }, []); // eslint-disable-line

  const loadPreview = useCallback(() => { ctx.preview().then(setPreview).catch(() => {}); }, [ctx]);
  useEffect(() => { if (STEPS[step].id === 'sign') loadPreview(); }, [step, loadPreview]);

  // Seed from the imaging worklist: attach the chosen (edited) images to this
  // report and store the chosen montage layout. Runs once when the report loads.
  const activeReportId = active?.report?.id;
  useEffect(() => {
    if (!activeReportId || !seed?.imageIds?.length || seedAppliedRef.current) return;
    seedAppliedRef.current = true;
    (async () => {
      try {
        await ctx.setImages(seed.imageIds.map((UltrasoundImageId, i) => ({ UltrasoundImageId, orderIndex: i })));
        if (seed.layoutId) await ctx.updateReport({ imageLayout: seed.layoutId });
      } catch (e) { console.error('Seed apply failed', e); }
    })();
  }, [activeReportId, seed, ctx]);

  if (!active) return null;
  const { report, nodules, permissions } = active;
  const ro = !permissions.canEdit;   // read-only when signed / not author
  const up = (patch) => ctx.updateReport(patch);

  const toggleArr = (field, code) => {
    const arr = Array.isArray(report[field]) ? [...report[field]] : [];
    const i = arr.indexOf(code); i >= 0 ? arr.splice(i, 1) : arr.push(code);
    up({ [field]: arr });
  };

  const downloadCombinedPdf = async () => {
    const imgs = active.images || [];
    const descriptors = [];
    for (const link of imgs) {
      const ui = link.UltrasoundImage;
      if (!ui) continue;
      try {
        const res = await ultrasoundService.getFile(ultrasoundService.filenameFromUrl(ui.fileUrl));
        descriptors.push({ src: URL.createObjectURL(res.data ?? res), brightness: Number(link.brightness) || 1, scale: Number(link.scale) || 1, offsetX: Number(link.offsetX) || 0, offsetY: Number(link.offsetY) || 0, caption: ui.studyDescription || ui.fileName });
      } catch { /* skip unavailable image */ }
    }
    const montage = IMG_LAYOUTS[report.imageLayout] || IMG_LAYOUTS.l32;
    await exportThyroidReportPdf(report, nodules, patient, descriptors, { output: 'save', montage });
  };

  const doSign = async () => {
    setSigning(true);
    try {
      const res = await ctx.sign({
        conclusion: report.conclusion, plan: report.plan, planOther: report.planOther,
        confirmWarnings, ablationWarningAcknowledged: ackAblation, signDespiteIncomplete: signDespite,
      });
      if (res.success) { setShowSignPreview(false); setShowPrint(true); }   // saved to record → offer print
      else { loadPreview(); }
    } catch (e) {
      // api error handler may reject with the axios error or a plain body
      const body = e?.response?.data || e?.data || e || {};
      setPreview((p) => ({ ...(p || {}), errors: body.errors || p?.errors || [], warnings: body.warnings || p?.warnings || [], needsAblationAck: body.needsAblationAck, needsConfirm: body.needsConfirm }));
    } finally { setSigning(false); }
  };

  return (
    <div className="bg-gray-100 flex flex-col rounded-xl border border-gray-200 overflow-hidden min-h-[78vh]">
      {/* top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary text-white grid place-items-center font-bold text-sm">CDC</div>
          <div>
            <div className="font-semibold text-[15px] leading-tight">Thyroid Ultrasound Report {report.reportNumber ? `· ${report.reportNumber}` : ''}</div>
            <div className="text-xs text-gray-500 leading-tight">
              {patient ? `${patient.firstName || ''} ${patient.lastName || ''} · ${patient.uhid || ''}` : ''} · {report.status}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs flex items-center gap-1 ${saving ? 'text-amber-600' : 'text-emerald-600'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${saving ? 'bg-amber-400' : 'bg-emerald-500'}`} />{saving ? 'Saving…' : 'Saved'}
          </span>
          {permissions.canReopen && <button onClick={() => ctx.reopen()} className="text-xs text-primary border border-blue-200 rounded-md px-2.5 py-1.5">Reopen</button>}
          <button onClick={onClose} className="text-xs text-gray-600 hover:text-gray-900 border border-gray-200 rounded-md px-2.5 py-1.5">← Back to reports</button>
        </div>
      </div>

      <div ref={splitRef} className={`flex-1 flex ${isWide ? 'flex-row' : 'flex-col'} overflow-hidden`}>
        {/* LEFT: image review (top) + live results (bottom) — review while reporting */}
        <aside style={isWide ? { width: `${leftPct}%` } : undefined} className="border-r border-gray-200 bg-gray-50 flex flex-col overflow-hidden shrink-0">
          <div className="flex-1 p-3 overflow-auto min-h-[260px]">
            <ImageReviewPane patient={patient} reportImages={active.images || []} onSetImages={ctx.setImages} disabled={ro} />
          </div>
          <div className="border-t border-gray-200 p-3 overflow-auto shrink-0" style={{ maxHeight: '44%' }}>
            <LiveResultsPanel report={report} nodules={nodules} />
          </div>
        </aside>

        {/* draggable divider */}
        {isWide && (
          <div onMouseDown={startDrag} title="Drag to resize"
            className="w-1.5 shrink-0 cursor-col-resize bg-gray-200 hover:bg-primary active:bg-primary transition-colors" />
        )}

        {/* RIGHT: reporting */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* horizontal step rail */}
          <nav className="flex gap-1.5 p-3 border-b border-gray-200 bg-white overflow-x-auto shrink-0">
            {STEPS.map((s, i) => (
              <button key={s.id} onClick={() => setStep(i)} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap border ${i === step ? 'bg-blue-50 border-primary text-primary font-medium' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                <span className={`w-5 h-5 rounded-full grid place-items-center text-[11px] font-semibold ${i === step ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>{i + 1}</span>
                {s.label}
              </button>
            ))}
          </nav>

          {/* main */}
          <main className="flex-1 p-5 lg:p-7 overflow-auto">
          {STEPS[step].id === 'appearance' && (
            <Panel title="General appearance of the thyroid" sub="Overall gland — size, echotexture, echogenicity and vascularity.">
              <Row label="Indication"><ChipRow options={catalog.indication.map((c) => [c.code, c.label])} value={null} disabled={ro}
                onChange={(v) => toggleArr('indications', v)} /></Row>
              <SelectedTags codes={report.indications} catalog={catalog.indication} />
              <textarea disabled={ro} value={report.indicationOther || ''} onChange={(e) => up({ indicationOther: e.target.value })}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm mt-2" rows={2}
                placeholder="Other indication (free text) — combined with any selected above" />
              <Row label="Gland size"><ChipRow options={OPT.glandSize} value={report.glandSize} disabled={ro} onChange={(v) => up({ glandSize: v })} /></Row>
              <Row label="Echotexture"><ChipRow options={OPT.echotexture} value={report.echotexture} disabled={ro} onChange={(v) => up({ echotexture: v })} /></Row>
              <Row label="Background echogenicity"><ChipRow options={OPT.echogenicity} value={report.echogenicity} disabled={ro} onChange={(v) => up({ echogenicity: v })} /></Row>
              <Row label="Vascularity"><ChipRow options={OPT.vascularity} value={report.vascularity} disabled={ro} onChange={(v) => up({ vascularity: v })} /></Row>
              <Row label="Doppler pattern"><ChipRow options={OPT.doppler} value={report.doppler} disabled={ro} onChange={(v) => up({ doppler: v })} /></Row>
              <Row label="Isthmus appearance"><ChipRow options={OPT.isthmusAppearance} value={report.isthmusAppearance} disabled={ro} onChange={(v) => up({ isthmusAppearance: v })} /></Row>
            </Panel>
          )}

          {STEPS[step].id === 'measurements' && (
            <Panel title="Thyroid dimensions" sub="L × H × W in cm. Lobe volume = L × H × W × 0.52, computed live.">
              <Lobe title="Right lobe" p="right" report={report} disabled={ro} up={up} />
              <Lobe title="Left lobe" p="left" report={report} disabled={ro} up={up} />
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Isthmus</div>
                <Field label="Thickness (cm)"><Num value={report.isthmusThickness} disabled={ro} onChange={(x) => up({ isthmusThickness: x })} className="w-24" /></Field>
              </div>
            </Panel>
          )}

          {STEPS[step].id === 'nodules' && (
            <Panel title="Nodules" sub="Add nodules one at a time — unlimited. Each carries its own ACR TI-RADS and BTA U."
              action={!ro && <button onClick={async () => { await ctx.addNodule({}); setOpenNodule('last'); }} className="text-sm bg-primary hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg font-medium">+ Add nodule</button>}>
              <label className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <input type="checkbox" checked={!!report.noNodules} disabled={ro || nodules.length > 0} onChange={(e) => up({ noNodules: e.target.checked })} /> No discrete nodules identified
              </label>
              <div className="space-y-3">
                {nodules.length === 0 && <div className="text-sm text-gray-400 bg-white border border-dashed border-gray-200 rounded-xl p-6 text-center">No nodules yet.</div>}
                {nodules.map((n, idx) => (
                  <NoduleCard key={n.id} nodule={n}
                    open={openNodule === n.id || (openNodule === 'last' && idx === nodules.length - 1)}
                    onToggle={() => setOpenNodule(openNodule === n.id ? null : n.id)}
                    onSave={ctx.updateNodule} onSaveFollicular={ctx.saveFollicular} onDelete={ctx.deleteNodule} disabled={ro} />
                ))}
              </div>
            </Panel>
          )}

          {STEPS[step].id === 'nodes' && (
            <Panel title="Cervical lymph node evaluation" sub="Overall assessment, then log nodes by level. Unlimited nodes per level; tick None or Suspicious and select the suspicious features.">
              <Row label="Overall assessment"><ChipRow options={OPT.lymphNodeAssessment} value={report.lymphNodeAssessment} disabled={ro} onChange={(v) => up({ lymphNodeAssessment: v })} /></Row>
              {report.lymphNodeAssessment !== 'not_assessed' && (
                <LymphNodePanel nodes={report.lymphNodes} disabled={ro}
                  onChange={(arr) => up({ lymphNodes: arr, ...(arr.some((x) => x.suspicious) ? { lymphNodeAssessment: 'suspicious' } : {}) })} />
              )}
            </Panel>
          )}

          {STEPS[step].id === 'conclusion' && (
            <Panel title="Conclusion & recommendation" sub="Auto-drafted at preview — editable. Dominant lesion first.">
              <div className="text-sm font-semibold text-gray-700 mb-1.5">Conclusion</div>
              <textarea disabled={ro} value={(report.conclusion || []).join('\n')} onChange={(e) => up({ conclusion: e.target.value.split('\n').filter(Boolean) })}
                className="w-full bg-white border border-gray-200 rounded-xl p-4 text-sm leading-relaxed min-h-[120px] mb-5" placeholder="One bullet per line…" />
              <div className="text-sm font-semibold text-gray-700 mb-2">Recommendation / plan</div>
              <ChipRow options={catalog.plan.map((c) => [c.code, c.label])} value={null} disabled={ro} onChange={(v) => toggleArr('plan', v)} />
              <SelectedTags codes={report.plan} catalog={catalog.plan} />
              <textarea disabled={ro} value={report.planOther || ''} onChange={(e) => up({ planOther: e.target.value })}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm mt-2" rows={2}
                placeholder="Other recommendation (free text) — combined with any selected above" />
            </Panel>
          )}

          {STEPS[step].id === 'sign' && (
            <Panel title="Preview & sign" sub="Review, then sign. Signing freezes a snapshot and locks the report.">
              {!preview ? <div className="text-sm text-gray-400">Computing…</div> : (
                <div className="space-y-4">
                  {preview.errors?.length > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
                      <b>Outstanding items:</b><ul className="mt-1 list-disc ml-5">{preview.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                      <div className="text-[12px] text-rose-600/80 mt-1.5">You can still sign at your discretion — the option is on the preview.</div>
                    </div>
                  )}
                  {preview.warnings?.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                      <ul className="list-disc ml-5">{preview.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                      <label className="flex items-center gap-2 mt-2 text-gray-700"><input type="checkbox" checked={confirmWarnings} onChange={(e) => setConfirmWarnings(e.target.checked)} /> I have reviewed these warnings.</label>
                    </div>
                  )}
                  {preview.needsAblationAck && (
                    <label className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
                      <input type="checkbox" checked={ackAblation} onChange={(e) => setAckAblation(e.target.checked)} /> I acknowledge the ablation safety warning.
                    </label>
                  )}
                  <div className="bg-white border border-gray-200 rounded-xl p-3">
                    <ThyroidImagePicker patient={patient} disabled={ro}
                      pool={(active.images || []).map((l) => l.UltrasoundImage).filter(Boolean)}
                      selectedIds={(active.images || []).map((im) => im.UltrasoundImageId)}
                      onSave={(imgs) => ctx.setImages(imgs)} />
                  </div>
                  {!ro && (
                    <div className="flex justify-end">
                      <button onClick={() => setShowSignPreview(true)} className="bg-primary hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm">
                        Preview &amp; sign →
                      </button>
                    </div>
                  )}
                  {report.status === 'signed' && (
                    <div className="flex items-center justify-between">
                      <div className="text-emerald-700 text-sm font-medium">Signed by {report.signedName} · {new Date(report.signedAt).toLocaleString()}</div>
                      <div className="flex gap-2">
                        <button onClick={downloadCombinedPdf} className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Combined radiology PDF</button>
                        <button onClick={() => setShowPrint(true)} className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium">Print report</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Panel>
          )}

          <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-200">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} className={`text-sm text-gray-500 px-4 py-2 rounded-lg border border-gray-200 ${step === 0 ? 'invisible' : ''}`}>← Back</button>
            {step < STEPS.length - 1 && <button onClick={() => setStep((s) => s + 1)} className="text-sm bg-primary hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium">Next →</button>}
          </div>
          </main>
        </div>
      </div>

      {showSignPreview && (
        <ThyroidSignPreview
          report={{ ...report, conclusion: (report.conclusion && report.conclusion.length ? report.conclusion : preview?.conclusion) || [] }}
          nodules={nodules} patient={patient}
          errors={preview?.errors || []}
          signDespite={signDespite} onToggleDespite={setSignDespite}
          signing={signing} onSign={doSign} onClose={() => setShowSignPreview(false)} />
      )}
      {showPrint && <ThyroidUsReportPrint report={report} nodules={nodules} patient={patient} onClose={() => setShowPrint(false)} />}
    </div>
  );
}

function Panel({ title, sub, action, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1"><h2 className="text-lg font-bold">{title}</h2>{action}</div>
      {sub && <p className="text-sm text-gray-500 mb-5">{sub}</p>}
      <div className="space-y-5">{children}</div>
    </div>
  );
}
function Row({ label, children }) { return (<div><div className="text-sm font-semibold text-gray-700 mb-2">{label}</div>{children}</div>); }
function SelectedTags({ codes, catalog }) {
  if (!codes?.length) return null;
  return <div className="flex flex-wrap gap-1.5 mt-2">{codes.map((c) => { const it = catalog.find((x) => x.code === c); return <span key={c} className="text-xs bg-blue-50 text-primary border border-blue-200 rounded px-2 py-0.5">{it?.label || c}</span>; })}</div>;
}
function Lobe({ title, p, report, disabled, up }) {
  const vol = engine.volume(report[p + 'Length'], report[p + 'Height'], report[p + 'Width']);
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-2"><div className="text-sm font-semibold text-gray-700">{title}</div></div>
      <DimTriplet dims={[report[p + 'Length'], report[p + 'Height'], report[p + 'Width']]} volume={vol} disabled={disabled}
        onChange={(k, x) => up({ [p + cap(k)]: x })} />
    </div>
  );
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
