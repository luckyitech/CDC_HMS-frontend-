// NeuropathyReport.jsx — the printable neuropathy report on the CDC letterhead.
//
// Layout mirrors the vendor "Vibrotherm Dx" form: a 4-quadrant study grid
// (Monofilament · Biothesiometry/VPT · Cold · Hot). The foot maps reuse the
// exam's NeuropathyFootMap (the real Vibrotherm foot template with grade-tinted
// site circles) so the report matches the capture screen exactly. Auto-derived-
// but-editable Right/Left interpretation + Final Result. Print / Download / Save
// reuse the ultrasound report's mechanism (a jsPDF blob filed via
// documentService), fitted to a single A4 page.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Printer, Download, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PrintLetterhead from './PrintLetterhead';
import NeuropathyFootMap from './NeuropathyFootMap';
import buildReportPdf from '../../utils/neuropathyPdf';
import documentService from '../../services/documentService';
import { PROTOCOL_SITES } from '../../constants/neuropathy';

const CHIP = { Normal: ['#dcfce7', '#166534'], Mild: ['#fef3c7', '#92400e'], Moderate: ['#ffedd5', '#9a3412'], Severe: ['#fee2e2', '#991b1b'] };
const RANK = { Normal: 0, Mild: 1, Moderate: 2, Severe: 3 };
const RESULTS = ['No Evidence of DPN', 'Mild DPN', 'Moderate DPN', 'Severe DPN'];

const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
const safe = (s, fallback) => String(s || fallback).replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || fallback;

const Chip = ({ g }) => {
  if (!g || !CHIP[g]) return null;
  const [bg, fg] = CHIP[g];
  return <span style={{ background: bg, color: fg, padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{g}</span>;
};

/**
 * Props:
 *   study   — formatted study from the API (summary + readings + patient fields)
 *   onClose
 */
const NeuropathyReport = ({ study, onClose }) => {
  const bodyRef = useRef(null);
  const rInterpRef = useRef(null);
  const lInterpRef = useRef(null);
  const remarksRef = useRef(null);
  const [busy, setBusy] = useState(null);

  const R = useMemo(() => study?.summary?.right || {}, [study]);
  const L = useMemo(() => study?.summary?.left || {}, [study]);

  const readingVal = (foot, site, mod) => {
    const r = study?.readings?.find((x) => x.foot === foot && x.site === site && x.modality === mod);
    return !r || r.omitted ? null : num(r.value);
  };
  // { R: { site: value }, L: { site: value } } for one modality — the shape NeuropathyFootMap wants.
  const modReadings = (mod) => {
    const out = { R: {}, L: {} };
    ['R', 'L'].forEach((foot) => PROTOCOL_SITES.forEach((site) => {
      const v = readingVal(foot, site, mod);
      if (v !== null) out[foot][site] = v;
    }));
    return out;
  };

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
    const g = (o, lbl, unit) => (o && o.grade ? `${lbl} ${o.grade.toLowerCase()}${o.avg != null ? ` (${o.avg}${unit})` : ''}` : null);
    [g(F.vpt, 'VPT', ' V'), g(F.cold, 'cold', ' °C'), g(F.hot, 'hot', ' °C')].forEach((x) => x && parts.push(x));
    if (F.mono?.tested) parts.push(F.mono.insensate ? `monofilament ${F.mono.insensate}/${F.mono.tested} insensate` : 'monofilament intact');
    return parts.length ? `${parts.join('; ')}.` : '';
  };

  useEffect(() => {
    if (rInterpRef.current) rInterpRef.current.innerText = study?.rightInterpretation || autoInterp(R);
    if (lInterpRef.current) lInterpRef.current.innerText = study?.leftInterpretation || autoInterp(L);
    if (remarksRef.current) remarksRef.current.innerText = study?.remarks || '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [study?.id]);

  if (!study) return null;

  const AvgLine = ({ mod }) => {
    const unit = mod === 'VPT' ? 'V' : '°C';
    const key = mod.toLowerCase();
    const cell = (lbl, o) => (
      <span className="nr-pair"><b>{lbl}</b> {o && o.avg != null ? <>{o.avg} {unit} <Chip g={o.grade} /></> : <span style={{ color: '#9ca3af' }}>—</span>}</span>
    );
    return (
      <div className="nr-avg">
        {cell('R', R[key])}{cell('L', L[key])}
        <span style={{ color: '#9ca3af', fontSize: 9.5 }}>Average {mod === 'VPT' ? '(Volts)' : '(°C)'}</span>
      </div>
    );
  };

  const Quadrant = ({ title, color, mod, legend }) => (
    <div className="nr-cell">
      <div className="nr-stitle" style={{ color }}>{title}</div>
      <NeuropathyFootMap readings={modReadings(mod)} modality={mod} active={null} readOnly size="compact" />
      {legend ? <div className="nr-legend">{legend}</div> : <AvgLine mod={mod} />}
    </div>
  );

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

  const editableStyle = { minHeight: 16, outline: 'none', borderBottom: '1px solid #d1d5db', padding: '2px 3px' };

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
          <div ref={bodyRef} style={{ width: 794, background: '#fff', padding: '24px 34px 16px', color: '#1f2937', fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
            <style>{`
              .nr-demo{display:grid;grid-template-columns:1fr 1fr;border:1px solid #d1d5db;margin:10px 0 4px}
              .nr-demo .nr-col{padding:6px 10px;display:grid;grid-template-columns:80px 1fr;row-gap:3px;background:#fff;font-size:11.5px}
              .nr-demo .nr-col:first-child{border-right:1px solid #d1d5db}
              .nr-demo b{font-weight:600;color:#374151}
              .nr-demo .nr-v{border-bottom:1px dotted #cbd5e1;min-height:15px;padding-left:4px;color:#111}
              .nr-grid{display:grid;grid-template-columns:1fr 16px 1fr;gap:2px 0;margin-top:4px}
              .nr-cc{writing-mode:vertical-rl;transform:rotate(180deg);text-align:center;font-size:8.5px;color:#9ca3af;align-self:center}
              .nr-cell{padding:2px 4px}
              .nr-stitle{text-align:center;font-weight:700;font-size:11.5px;letter-spacing:.02em;margin-bottom:2px}
              .nr-avg{display:flex;align-items:baseline;gap:8px;justify-content:center;margin-top:2px;font-size:11px;color:#374151}
              .nr-pair{display:flex;gap:4px;align-items:baseline}
              .nr-legend{text-align:center;font-size:10px;color:#6b7280;margin-top:2px}
              .nr-rowline{display:grid;grid-template-columns:118px 1fr;gap:8px;margin-top:6px;font-size:11.5px;align-items:start}
              .nr-rowline .nr-l2{font-weight:700;color:#374151;padding-top:2px}
              .nr-result{margin-top:10px;border:1.5px solid #111;padding:7px 10px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
              .nr-opt{display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer}
              .nr-cbox{width:13px;height:13px;border:1.4px solid #374151;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800}
              .nr-opt.sel{color:#991b1b;font-weight:700}
              .nr-opt.sel .nr-cbox{border-color:#dc2626;background:#fee2e2;color:#b91c1c}
              .nr-sign{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:22px;font-size:11px;color:#374151}
              .nr-foot-note{margin-top:14px;border-top:1px solid #e5e7eb;padding-top:6px;font-size:9px;color:#9ca3af;display:flex;justify-content:space-between}
            `}</style>

            <PrintLetterhead show />

            <div className="nr-demo">
              <div className="nr-col">
                <b>UHID</b><span className="nr-v">{study.uhid || ''}</span>
                <b>Name</b><span className="nr-v">{study.patientName || ''}</span>
                <b>Age / Sex</b><span className="nr-v">{[study.patientAge, study.patientGender].filter(Boolean).join(' · ')}</span>
              </div>
              <div className="nr-col">
                <b>Date</b><span className="nr-v">{fmtDay(study.studyDate)}</span>
                <b>Referral</b><span className="nr-v">{study.referral || ''}</span>
                <b>Performed by</b><span className="nr-v">{study.performedByName || ''}</span>
              </div>
            </div>

            <div className="nr-grid">
              <Quadrant title="10 g MONOFILAMENT STUDY" color="#111827" mod="MONO" legend={<>&#10003; Felt (present) &nbsp;·&nbsp; &#10007; Not felt (absent)</>} />
              <div className="nr-cc">** Clinically Correlated</div>
              <Quadrant title="BIOTHESIOMETRY STUDY" color="#15803d" mod="VPT" />
              <Quadrant title="COLD PERCEPTION STUDY" color="#1d4ed8" mod="COLD" />
              <div className="nr-cc" />
              <Quadrant title="HOT PERCEPTION STUDY" color="#dc2626" mod="HOT" />
            </div>

            <div className="nr-rowline"><span className="nr-l2">Right interpretation</span><div ref={rInterpRef} contentEditable suppressContentEditableWarning style={editableStyle} /></div>
            <div className="nr-rowline"><span className="nr-l2">Left interpretation</span><div ref={lInterpRef} contentEditable suppressContentEditableWarning style={editableStyle} /></div>
            <div className="nr-rowline"><span className="nr-l2">Remarks</span><div ref={remarksRef} contentEditable suppressContentEditableWarning style={editableStyle} /></div>

            <div className="nr-result">
              <b style={{ fontSize: 12 }}>Final Result :</b>
              {RESULTS.map((r) => (
                <span key={r} className={`nr-opt${finalResult === r ? ' sel' : ''}`} onClick={() => setFinalResult(r)}>
                  <span className="nr-cbox">{finalResult === r ? '✓' : ''}</span>{r}
                </span>
              ))}
            </div>

            <div className="nr-sign">
              <div style={{ borderTop: '1px solid #6b7280', paddingTop: 3 }}>Consultant :<br /><span style={{ color: '#9ca3af' }}>Specialisation :</span></div>
              <div style={{ borderTop: '1px solid #6b7280', paddingTop: 3, textAlign: 'right' }}>&nbsp;<br /><span style={{ color: '#9ca3af' }}>(Examiner)</span></div>
            </div>

            <div className="nr-foot-note"><span>Comprehensive Diabetes Centre · Nairobi</span><span>NEUROPATHY FUNCTION REPORT</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NeuropathyReport;
