import { useState, useEffect, useCallback } from 'react';
import { useThyroidUltrasound } from '../../../contexts/ThyroidUltrasoundContext';
import * as engine from '../../../utils/thyroidUsEngine';
import { OPT, STEPS } from '../../../constants/thyroidUs';
import { ChipRow, Field, Num, DimTriplet } from './ui';
import NoduleCard from './NoduleCard';
import LiveResultsPanel from './LiveResultsPanel';
import ThyroidUsReportPrint from './ThyroidUsReportPrint';

export default function ThyroidUsWorkspace({ patient, onClose }) {
  const ctx = useThyroidUltrasound();
  const { active, saving } = ctx;
  const [step, setStep] = useState(0);
  const [openNodule, setOpenNodule] = useState(null);
  const [catalog, setCatalog] = useState({ indication: [], plan: [] });
  const [preview, setPreview] = useState(null);
  const [confirmWarnings, setConfirmWarnings] = useState(false);
  const [ackAblation, setAckAblation] = useState(false);
  const [signing, setSigning] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    ctx.getCatalog('indication').then((d) => setCatalog((c) => ({ ...c, indication: d }))).catch(() => {});
    ctx.getCatalog('plan').then((d) => setCatalog((c) => ({ ...c, plan: d }))).catch(() => {});
  }, []); // eslint-disable-line

  const loadPreview = useCallback(() => { ctx.preview().then(setPreview).catch(() => {}); }, [ctx]);
  useEffect(() => { if (STEPS[step].id === 'sign') loadPreview(); }, [step, loadPreview]);

  if (!active) return null;
  const { report, nodules, permissions } = active;
  const ro = !permissions.canEdit;   // read-only when signed / not author
  const up = (patch) => ctx.updateReport(patch);

  const toggleArr = (field, code) => {
    const arr = Array.isArray(report[field]) ? [...report[field]] : [];
    const i = arr.indexOf(code); i >= 0 ? arr.splice(i, 1) : arr.push(code);
    up({ [field]: arr });
  };

  const doSign = async () => {
    setSigning(true);
    try {
      const res = await ctx.sign({
        conclusion: report.conclusion, plan: report.plan, planOther: report.planOther,
        confirmWarnings, ablationWarningAcknowledged: ackAblation,
      });
      if (!res.success) { loadPreview(); }
    } catch (e) {
      const body = e?.response?.data;
      if (body) setPreview((p) => ({ ...(p || {}), errors: body.errors || p?.errors || [], warnings: body.warnings || p?.warnings || [], needsAblationAck: body.needsAblationAck }));
    } finally { setSigning(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col">
      {/* top bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-600 text-white grid place-items-center font-bold text-sm">CDC</div>
          <div>
            <div className="font-semibold text-[15px] leading-tight">Thyroid Ultrasound Report {report.reportNumber ? `· ${report.reportNumber}` : ''}</div>
            <div className="text-xs text-slate-500 leading-tight">
              {patient ? `${patient.firstName || ''} ${patient.lastName || ''} · ${patient.uhid || ''}` : ''} · {report.status}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs flex items-center gap-1 ${saving ? 'text-amber-600' : 'text-emerald-600'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${saving ? 'bg-amber-400' : 'bg-emerald-500'}`} />{saving ? 'Saving…' : 'Saved'}
          </span>
          {permissions.canReopen && <button onClick={() => ctx.reopen()} className="text-xs text-teal-700 border border-teal-200 rounded-md px-2.5 py-1.5">Reopen</button>}
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded-md px-2.5 py-1.5">Close</button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* step rail */}
        <nav className="col-span-12 lg:col-span-2 bg-white border-r border-slate-200 p-3 flex lg:flex-col gap-1 overflow-auto">
          {STEPS.map((s, i) => (
            <button key={s.id} onClick={() => setStep(i)} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left whitespace-nowrap ${i === step ? 'bg-teal-50' : 'hover:bg-slate-50'}`}>
              <span className={`w-6 h-6 rounded-full grid place-items-center text-xs font-semibold ${i === step ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{i + 1}</span>
              <span className="hidden lg:block">
                <span className={`text-[13px] font-medium ${i === step ? 'text-teal-800' : 'text-slate-700'}`}>{s.label}</span>
                {s.sub && <><br /><span className="text-[11px] text-slate-400">{s.sub}</span></>}
              </span>
            </button>
          ))}
        </nav>

        {/* main */}
        <main className="col-span-12 lg:col-span-7 p-5 lg:p-7 overflow-auto">
          {STEPS[step].id === 'appearance' && (
            <Panel title="General appearance of the thyroid" sub="Overall gland — size, echotexture, echogenicity and vascularity.">
              <Row label="Indication"><ChipRow options={catalog.indication.map((c) => [c.code, c.label])} value={null} disabled={ro}
                onChange={(v) => toggleArr('indications', v)} /></Row>
              <SelectedTags codes={report.indications} catalog={catalog.indication} />
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
              <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
                <div className="text-sm font-semibold text-slate-700 mb-2">Isthmus</div>
                <Field label="Thickness (cm)"><Num value={report.isthmusThickness} disabled={ro} onChange={(x) => up({ isthmusThickness: x })} className="w-24" /></Field>
              </div>
            </Panel>
          )}

          {STEPS[step].id === 'nodules' && (
            <Panel title="Nodules" sub="Add nodules one at a time — unlimited. Each carries its own ACR TI-RADS and BTA U."
              action={!ro && <button onClick={async () => { await ctx.addNodule({}); setOpenNodule('last'); }} className="text-sm bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 rounded-lg font-medium">+ Add nodule</button>}>
              <label className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                <input type="checkbox" checked={!!report.noNodules} disabled={ro || nodules.length > 0} onChange={(e) => up({ noNodules: e.target.checked })} /> No discrete nodules identified
              </label>
              <div className="space-y-3">
                {nodules.length === 0 && <div className="text-sm text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl p-6 text-center">No nodules yet.</div>}
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
            <Panel title="Cervical lymph node evaluation" sub="Overall assessment; note individual nodes if abnormal.">
              <Row label="Assessment"><ChipRow options={OPT.lymphNodeAssessment} value={report.lymphNodeAssessment} disabled={ro} onChange={(v) => up({ lymphNodeAssessment: v })} /></Row>
              {report.lymphNodeAssessment === 'suspicious' && (
                <textarea disabled={ro} defaultValue={report.otherDiffuseAbnormalities || ''} onBlur={(e) => up({ otherDiffuseAbnormalities: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm mt-2" rows={3} placeholder="Suspicious node detail — level, size, features…" />
              )}
            </Panel>
          )}

          {STEPS[step].id === 'conclusion' && (
            <Panel title="Conclusion & recommendation" sub="Auto-drafted at preview — editable. Dominant lesion first.">
              <div className="text-sm font-semibold text-slate-700 mb-1.5">Conclusion</div>
              <textarea disabled={ro} value={(report.conclusion || []).join('\n')} onChange={(e) => up({ conclusion: e.target.value.split('\n').filter(Boolean) })}
                className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm leading-relaxed min-h-[120px] mb-5" placeholder="One bullet per line…" />
              <div className="text-sm font-semibold text-slate-700 mb-2">Recommendation / plan</div>
              <ChipRow options={catalog.plan.map((c) => [c.code, c.label])} value={null} disabled={ro} onChange={(v) => toggleArr('plan', v)} />
              <SelectedTags codes={report.plan} catalog={catalog.plan} />
            </Panel>
          )}

          {STEPS[step].id === 'sign' && (
            <Panel title="Preview & sign" sub="Review, then sign. Signing freezes a snapshot and locks the report.">
              {!preview ? <div className="text-sm text-slate-400">Computing…</div> : (
                <div className="space-y-4">
                  {preview.errors?.length > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
                      <b>Cannot sign yet:</b><ul className="mt-1 list-disc ml-5">{preview.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                    </div>
                  )}
                  {preview.warnings?.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                      <ul className="list-disc ml-5">{preview.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                      <label className="flex items-center gap-2 mt-2 text-slate-700"><input type="checkbox" checked={confirmWarnings} onChange={(e) => setConfirmWarnings(e.target.checked)} /> I have reviewed these warnings.</label>
                    </div>
                  )}
                  {preview.needsAblationAck && (
                    <label className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
                      <input type="checkbox" checked={ackAblation} onChange={(e) => setAckAblation(e.target.checked)} /> I acknowledge the ablation safety warning.
                    </label>
                  )}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm">
                    <div className="font-bold text-center mb-1">THYROID ULTRASOUND REPORT</div>
                    <div className="text-center text-xs text-slate-500 mb-3">Comprehensive Diabetes Centre · Nairobi</div>
                    <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed">{preview.narrative}</pre>
                    <div className="mt-3 pt-3 border-t border-slate-100"><b>Conclusion:</b>
                      <ul className="list-disc ml-5">{(report.conclusion || preview.conclusion || []).map((c, i) => <li key={i}>{c}</li>)}</ul>
                    </div>
                  </div>
                  {!ro && (
                    <div className="flex justify-end">
                      <button onClick={doSign} disabled={signing || (preview.errors?.length > 0)} className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-semibold text-sm">
                        {signing ? 'Signing…' : 'Sign report'}
                      </button>
                    </div>
                  )}
                  {report.status === 'signed' && (
                    <div className="flex items-center justify-between">
                      <div className="text-emerald-700 text-sm font-medium">Signed by {report.signedName} · {new Date(report.signedAt).toLocaleString()}</div>
                      <button onClick={() => setShowPrint(true)} className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium">Print report</button>
                    </div>
                  )}
                </div>
              )}
            </Panel>
          )}

          <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-200">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} className={`text-sm text-slate-500 px-4 py-2 rounded-lg border border-slate-200 ${step === 0 ? 'invisible' : ''}`}>← Back</button>
            {step < STEPS.length - 1 && <button onClick={() => setStep((s) => s + 1)} className="text-sm bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg font-medium">Next →</button>}
          </div>
        </main>

        {/* live */}
        <aside className="col-span-12 lg:col-span-3 bg-slate-50 border-l border-slate-200 p-4 overflow-auto">
          <LiveResultsPanel report={report} nodules={nodules} />
        </aside>
      </div>

      {showPrint && <ThyroidUsReportPrint report={report} nodules={nodules} patient={patient} onClose={() => setShowPrint(false)} />}
    </div>
  );
}

function Panel({ title, sub, action, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1"><h2 className="text-lg font-bold">{title}</h2>{action}</div>
      {sub && <p className="text-sm text-slate-500 mb-5">{sub}</p>}
      <div className="space-y-5">{children}</div>
    </div>
  );
}
function Row({ label, children }) { return (<div><div className="text-sm font-semibold text-slate-700 mb-2">{label}</div>{children}</div>); }
function SelectedTags({ codes, catalog }) {
  if (!codes?.length) return null;
  return <div className="flex flex-wrap gap-1.5 mt-2">{codes.map((c) => { const it = catalog.find((x) => x.code === c); return <span key={c} className="text-xs bg-teal-50 text-teal-800 border border-teal-200 rounded px-2 py-0.5">{it?.label || c}</span>; })}</div>;
}
function Lobe({ title, p, report, disabled, up }) {
  const vol = engine.volume(report[p + 'Length'], report[p + 'Height'], report[p + 'Width']);
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-2"><div className="text-sm font-semibold text-slate-700">{title}</div></div>
      <DimTriplet dims={[report[p + 'Length'], report[p + 'Height'], report[p + 'Width']]} volume={vol} disabled={disabled}
        onChange={(k, x) => up({ [p + cap(k)]: x })} />
    </div>
  );
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
