// NeuropathyReport.jsx — the printable neuropathy report on the CDC letterhead.
//
// One A4 page: title, patient block, a 2x2 study grid (Monofilament ·
// Biothesiometry/VPT · Cold · Hot) whose foot maps reuse the exam's
// NeuropathyFootMap on the real Vibrotherm TEMPLATE artwork, per-panel R/L
// averages + grade beside each title, auto-derived-but-editable interpretation
// and Final Result. Print / Download / Save reuse the ultrasound report's
// mechanism (html2canvas -> jsPDF blob filed via documentService).
//
// The report computes its own averages/grades from the raw readings (via the
// shared constants) rather than the stored summary, so a mis-captured thermal
// 0 C is treated as NOT TESTED and excluded — a signed report is always correct
// regardless of when the study was completed. (A matching exclusion in the
// backend averageReadings would keep the study list in step — flagged, not yet
// done.)
import { useEffect, useMemo, useRef, useState } from 'react';
import { Printer, Download, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PrintLetterhead from './PrintLetterhead';
import NeuropathyFootMap from './NeuropathyFootMap';
import buildReportPdf from '../../utils/neuropathyPdf';
import documentService from '../../services/documentService';
import { PROTOCOL_SITES, averageReadings, gradeValue, monoSummary } from '../../constants/neuropathy';

// One grade palette [tint, ring, text] — shared by the pills here and, in spirit,
// by the foot-map markers (GRADE_SPOT). Kept as literal hex for html2canvas.
const PAL = {
  Normal:   ['#dff2e6', '#1f8a4c', '#14532d'],
  Mild:     ['#fdf1d3', '#c07d00', '#7a4a00'],
  Moderate: ['#fbe5d8', '#d9531e', '#8a3110'],
  Severe:   ['#f9dde1', '#c11d2e', '#8a1420'],
  NT:       ['#eef1f6', '#9aa6b6', '#5b6b82'],
};
const RANK = { Normal: 0, Mild: 1, Moderate: 2, Severe: 3 };
const RESULTS = ['No Evidence of DPN', 'Mild DPN', 'Moderate DPN', 'Severe DPN'];

const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
const safe = (s, fallback) => String(s || fallback).replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || fallback;

const Pill = ({ g }) => {
  if (!g || !PAL[g]) return null;
  const [bg, ring, fg] = PAL[g];
  return <span style={{ background: bg, color: fg, border: `1px solid ${ring}`, padding: '0 6px', borderRadius: 8, fontSize: 9.5, fontWeight: 700, lineHeight: '15px', display: 'inline-block' }}>{g === 'NT' ? 'Not tested' : g}</span>;
};

const NeuropathyReport = ({ study, onClose }) => {
  const bodyRef = useRef(null);
  const rInterpRef = useRef(null);
  const lInterpRef = useRef(null);
  const remarksRef = useRef(null);
  const [busy, setBusy] = useState(null);

  // Raw reading, with the not-tested rule applied: omitted -> null, and a thermal
  // 0 C -> null (an artefact, never a real perception threshold). VPT 0 and
  // monofilament 0 (= not felt) are genuine and kept.
  const readingVal = (foot, site, mod) => {
    const r = study?.readings?.find((x) => x.foot === foot && x.site === site && x.modality === mod);
    if (!r || r.omitted) return null;
    const v = num(r.value);
    if (v === 0 && (mod === 'HOT' || mod === 'COLD')) return null;
    return v;
  };
  // { R:{site:value}, L:{site:value} } for one modality — the shape the foot map wants.
  const modReadings = (mod) => {
    const out = { R: {}, L: {} };
    ['R', 'L'].forEach((foot) => PROTOCOL_SITES.forEach((site) => {
      const v = readingVal(foot, site, mod);
      if (v !== null) out[foot][site] = v;
    }));
    return out;
  };

  // Per-foot summary recomputed from the readings (not study.summary).
  const footSummary = (foot) => {
    const s = {};
    ['VPT', 'HOT', 'COLD'].forEach((m) => {
      const vals = PROTOCOL_SITES.map((site) => readingVal(foot, site, m));
      const tested = vals.filter((v) => v !== null);
      const avg = averageReadings(m, vals);
      s[m.toLowerCase()] = avg === null ? null : { avg, grade: gradeValue(m, avg), n: tested.length };
    });
    const mono = monoSummary(PROTOCOL_SITES.map((site) => readingVal(foot, site, 'MONO')));
    s.mono = mono; // { tested, insensate }
    return s;
  };
  const R = useMemo(() => footSummary('R'), [study]); // eslint-disable-line react-hooks/exhaustive-deps
  const L = useMemo(() => footSummary('L'), [study]); // eslint-disable-line react-hooks/exhaustive-deps

  const worstRank = useMemo(() => {
    let r = 0;
    [R, L].forEach((f) => {
      ['vpt', 'hot', 'cold'].forEach((m) => { const g = f[m]?.grade; if (g && RANK[g] > r) r = RANK[g]; });
      if (f.mono?.insensate > 0) r = Math.max(r, RANK.Severe);
    });
    return r;
  }, [R, L]);

  const [finalResult, setFinalResult] = useState(RESULTS[worstRank]);
  useEffect(() => { setFinalResult(RESULTS[worstRank]); }, [worstRank, study?.id]);

  const autoInterp = (F) => {
    const parts = [];
    const g = (o, lbl, unit) => (o && o.grade ? `${lbl} ${o.grade.toLowerCase()} (${o.avg}${unit}${o.n < 6 ? `, ${o.n} of 6 sites` : ''})` : null);
    [g(F.vpt, 'VPT', ' V'), g(F.cold, 'cold', ' °C'), g(F.hot, 'hot', ' °C')].forEach((x) => x && parts.push(x));
    if (F.mono?.tested) parts.push(F.mono.insensate ? `monofilament ${F.mono.insensate}/${F.mono.tested} not felt` : 'monofilament intact');
    return parts.length ? `${parts.join('; ')}.` : '';
  };

  useEffect(() => {
    if (rInterpRef.current) rInterpRef.current.innerText = study?.rightInterpretation || autoInterp(R);
    if (lInterpRef.current) lInterpRef.current.innerText = study?.leftInterpretation || autoInterp(L);
    if (remarksRef.current) remarksRef.current.innerText = study?.remarks || '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [study?.id]);

  if (!study) return null;

  // A panel: title + R/L average & grade in the header, feet below.
  const Panel = ({ title, sub, color, mod }) => {
    const unit = mod === 'VPT' ? 'V' : '°C';
    const key = mod.toLowerCase();
    const side = (lbl, o) => (
      <span className="nr-side">
        <i>{lbl}</i>
        {o && o.avg != null
          ? <><b>{o.avg} {unit}</b><Pill g={o.grade} /></>
          : <span style={{ color: '#9aa6b6' }}>—</span>}
      </span>
    );
    const monoSide = (lbl, m) => (
      <span className="nr-side">
        <i>{lbl}</i>
        {m.tested
          ? <><b>{m.insensate}/{m.tested} not felt</b><Pill g={m.insensate === 0 ? 'Normal' : m.insensate <= 2 ? 'Mild' : m.insensate <= 4 ? 'Moderate' : 'Severe'} /></>
          : <span style={{ color: '#9aa6b6' }}>—</span>}
      </span>
    );
    return (
      <div className="nr-panel">
        <div className="nr-phead">
          <span className="nr-ptitle" style={{ color }}>{title}{sub ? <small> · {sub}</small> : null}</span>
          <span className="nr-avg">
            {mod === 'MONO' ? <>{monoSide('R', R.mono)}{monoSide('L', L.mono)}</> : <>{side('R', R[key])}{side('L', L[key])}</>}
          </span>
        </div>
        <NeuropathyFootMap readings={modReadings(mod)} modality={mod} active={null} readOnly size="compact" art="template" showLabels />
      </div>
    );
  };

  const doAction = async (kind) => {
    if (busy) return;
    setBusy(kind);
    try {
      const filename = `${safe(study.uhid, 'CDC')}_${safe(study.patientName, 'Patient')}_Neuropathy.pdf`;
      const { blob } = await buildReportPdf(bodyRef.current, { filename });
      if (kind === 'download') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      } else if (kind === 'print') {
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (!win) toast.error('Allow pop-ups to print, or use Download.');
      } else if (kind === 'save') {
        if (!study.uhid) { toast.error('No patient on this study to file to.'); return; }
        const fd = new FormData();
        fd.append('file', new File([blob], filename, { type: 'application/pdf' }));
        fd.append('uhid', study.uhid);
        fd.append('documentCategory', 'Neuropathy Screening Test');
        fd.append('testType', 'Neuropathy Assessment');
        if (study.studyDate) fd.append('testDate', study.studyDate);
        fd.append('notes', `Final result: ${finalResult}`);
        await documentService.upload(fd);
        toast.success("Saved to the patient's Medical Documents.");
      }
    } catch (err) {
      console.error('NeuropathyReport action failed:', err);
      toast.error('Could not generate the report PDF.');
    } finally {
      setBusy(null);
    }
  };

  const editable = { minHeight: 13, outline: 'none', padding: '1px 4px', borderBottom: '1px solid #d6dce6' };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl my-4" style={{ width: 834 }}>
        {/* toolbar — screen only */}
        <div className="sticky top-0 bg-white border-b-2 border-gray-200 p-3 flex justify-between items-center rounded-t-lg z-10">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Neuropathy Report</h3>
            <p className="text-xs text-gray-500">Interpretations &amp; Final Result are editable — click the text or a result box before printing/saving.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => doAction('print')} disabled={!!busy} className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              {busy === 'print' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} Print
            </button>
            <button onClick={() => doAction('download')} disabled={!!busy} className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              {busy === 'download' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PDF
            </button>
            <button onClick={() => doAction('save')} disabled={!!busy} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save to record
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-300">Done</button>
          </div>
        </div>

        {/* printable body — fixed A4 width for the PDF capture */}
        <div className="mx-auto" style={{ width: 794, padding: '2px' }}>
          <div ref={bodyRef} style={{ width: 794, background: '#fff', padding: '12px 30px 9px', color: '#14213d', fontFamily: 'Segoe UI, system-ui, Helvetica, Arial, sans-serif', fontSize: 12 }}>
            <style>{`
              .nr-title{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin:5px 0 5px}
              .nr-title h2{margin:0;font-size:17px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#14213d}
              .nr-title .nr-meta{color:#6a7891;font-size:11px;text-align:right}
              .nr-title .nr-meta b{color:#3d4a63;font-weight:600}
              .nr-pt{display:grid;grid-template-columns:1fr 1fr;column-gap:20px;border:1px solid #d6dce6;border-radius:4px;padding:5px 12px}
              .nr-pt dl{margin:0;display:grid;grid-template-columns:74px 1fr;row-gap:2px;align-content:start}
              .nr-pt dt{color:#6a7891;font-weight:600;font-size:10px;letter-spacing:.03em;text-transform:uppercase}
              .nr-pt dd{margin:0;font-weight:600;color:#14213d;font-size:12px}
              .nr-pt dd.e{color:#9aa6b6;font-weight:400}
              .nr-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;margin-top:7px}
              .nr-panel{border:1px solid #d6dce6;border-radius:4px;padding:4px 6px 2px}
              .nr-phead{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:2px 10px;padding-bottom:3px;margin-bottom:1px;border-bottom:1px solid #eef1f6}
              .nr-ptitle{font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
              .nr-ptitle small{font-weight:400;letter-spacing:0;text-transform:none;color:#6a7891;font-size:10.5px}
              .nr-avg{display:flex;gap:12px;font-size:10.5px}
              .nr-side{display:flex;align-items:center;gap:5px;white-space:nowrap}
              .nr-side i{font-style:normal;color:#9aa6b6;font-weight:700;letter-spacing:.05em;font-size:9.5px}
              .nr-side b{font-weight:600;color:#14213d}
              .nr-legend{display:flex;flex-wrap:wrap;gap:2px 14px;justify-content:center;color:#6a7891;font-size:9.5px;margin:4px 0 2px}
              .nr-legend span{display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
              .nr-legend i{width:9px;height:9px;border-radius:50%;border:1.5px solid;display:inline-block}
              .nr-interp{display:grid;grid-template-columns:112px 1fr;row-gap:3px;column-gap:10px;align-items:start;margin-top:5px}
              .nr-interp .nr-l2{color:#6a7891;font-weight:600;font-size:10px;letter-spacing:.03em;text-transform:uppercase;padding-top:3px}
              .nr-remarks{border:1px solid #d6dce6;border-radius:4px;min-height:26px;padding:4px 8px;color:#14213d}
              .nr-result{margin-top:7px;border:1.4px solid #14213d;border-radius:4px;padding:5px 12px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
              .nr-result .nr-rl{font-weight:700;letter-spacing:.05em;text-transform:uppercase;font-size:11px}
              .nr-opt{display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer;color:#3d4a63}
              .nr-cbox{width:13px;height:13px;border:1.3px solid #3d4a63;border-radius:2px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;box-sizing:border-box}
              .nr-opt.sel{color:#8a1420;font-weight:700}
              .nr-opt.sel .nr-cbox{border-color:#c11d2e;background:#c11d2e;color:#fff}
              .nr-sign{display:grid;grid-template-columns:1fr 1fr;gap:44px;margin-top:11px;font-size:10.5px;color:#6a7891}
              .nr-sign div{border-top:1px solid #3d4a63;padding-top:4px}
              .nr-sign b{display:block;color:#14213d;font-weight:600;font-size:11.5px;min-height:14px}
              .nr-fn{margin-top:7px;border-top:1px solid #d6dce6;padding-top:4px;font-size:9px;color:#9aa6b6;display:flex;justify-content:space-between}
            `}</style>

            <PrintLetterhead show />

            <div className="nr-title">
              <h2>Neuropathy Function Report</h2>
              <div className="nr-meta">
                {study.studyNumber ? <>Study <b>#{study.studyNumber}</b> · </> : null}
                Vibrotherm Dx · Plantar protocol, 6 sites per foot
              </div>
            </div>

            <div className="nr-pt">
              <dl>
                <dt>UHID</dt><dd>{study.uhid || '—'}</dd>
                <dt>Name</dt><dd>{study.patientName || '—'}</dd>
                <dt>Age / Sex</dt><dd className={[study.patientAge, study.patientGender].filter(Boolean).length ? '' : 'e'}>{[study.patientAge, study.patientGender].filter(Boolean).join(' · ') || '—'}</dd>
              </dl>
              <dl>
                <dt>Date</dt><dd>{fmtDay(study.studyDate)}</dd>
                <dt>Referral</dt><dd className={study.referral ? '' : 'e'}>{study.referral || '—'}</dd>
                <dt>Performed by</dt><dd>{study.performedByName || '—'}</dd>
              </dl>
            </div>

            <div className="nr-grid">
              <Panel title="Monofilament" sub="10 g" color="#14213d" mod="MONO" />
              <Panel title="Biothesiometry" sub="VPT" color="#1f8a4c" mod="VPT" />
              <Panel title="Cold perception" color="#1a63c6" mod="COLD" />
              <Panel title="Hot perception" color="#c11d2e" mod="HOT" />
            </div>

            <div className="nr-legend">
              <span><i style={{ borderColor: '#1f8a4c', background: '#dff2e6' }} />Normal / felt</span>
              <span><i style={{ borderColor: '#c07d00', background: '#fdf1d3' }} />Mild</span>
              <span><i style={{ borderColor: '#d9531e', background: '#fbe5d8' }} />Moderate</span>
              <span><i style={{ borderColor: '#c11d2e', background: '#f9dde1' }} />Severe / not felt</span>
              <span>Averages: VPT whole volts · thermal to 0.1 °C · monofilament = sites not felt / tested · a site with no marker was not tested and is excluded</span>
            </div>

            <div className="nr-interp">
              <span className="nr-l2">Right foot</span><div ref={rInterpRef} contentEditable suppressContentEditableWarning style={editable} />
              <span className="nr-l2">Left foot</span><div ref={lInterpRef} contentEditable suppressContentEditableWarning style={editable} />
              <span className="nr-l2">Remarks</span><div ref={remarksRef} contentEditable suppressContentEditableWarning className="nr-remarks" />
            </div>

            <div className="nr-result">
              <span className="nr-rl">Final result</span>
              {RESULTS.map((r) => (
                <span key={r} className={`nr-opt${finalResult === r ? ' sel' : ''}`} onClick={() => setFinalResult(r)}>
                  <span className="nr-cbox">{finalResult === r ? '✓' : ''}</span>{r}
                </span>
              ))}
            </div>

            <div className="nr-sign">
              <div><b>{study.performedByName || ''}</b>Examiner · signature</div>
              <div><b>&nbsp;</b>Consultant · signature</div>
            </div>

            <div className="nr-fn">
              <span>Comprehensive Diabetes Centre · Nairobi</span>
              <span>Generated {new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · CDC HMS</span>
              <span>Page 1 of 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NeuropathyReport;
