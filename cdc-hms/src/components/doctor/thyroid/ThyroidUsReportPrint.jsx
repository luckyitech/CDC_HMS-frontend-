import { Printer } from 'lucide-react';
import PrintLetterhead from '../../shared/PrintLetterhead';
import usePrint from '../../../hooks/usePrint';
import * as engine from '../../../utils/thyroidUsEngine';
import { TR_LABEL } from '../../../constants/thyroidUs';

/**
 * Prints a SIGNED thyroid ultrasound report on the CDC letterhead, from the
 * frozen reportSnapshot (falls back to live data for an unsigned preview).
 * Same modal + usePrint idiom as PrescriptionPrint.
 */
export default function ThyroidUsReportPrint({ report, nodules = [], patient, onClose }) {
  const { printRef, handlePrint } = usePrint();
  if (!report) return null;

  const snap = report.reportSnapshot || null;
  const r = snap?.report || report;
  const nods = snap?.nodules || nodules;
  const pt = snap?.patient || patient || {};
  const narrative = snap?.narrative || report.findingsNarrative || engine.generateNarrative?.(r, nods) || '';
  const conclusion = (snap?.conclusion || r.conclusion || []);
  const rightVol = engine.volume(r.rightLength, r.rightHeight, r.rightWidth);
  const leftVol = engine.volume(r.leftLength, r.leftHeight, r.leftWidth);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="print:hidden sticky top-0 bg-white border-b-2 border-gray-200 p-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">Thyroid Ultrasound Report</h3>
          <div className="flex gap-3">
            <button onClick={handlePrint} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"><Printer className="w-4 h-4" /> Print</button>
            <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold">Close</button>
          </div>
        </div>

        <div ref={printRef} className="p-8 text-[13px] text-gray-800">
          <PrintLetterhead show />

          <h2 className="text-center text-lg font-bold mb-1">{r.studyType === 'focused' ? 'FOCUSED THYROID ULTRASOUND REPORT' : 'THYROID ULTRASOUND REPORT'}</h2>
          <div className="text-center text-xs text-gray-500 mb-4">Report {r.reportNumber}</div>

          {/* patient block */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-4 border-b border-gray-200 pb-3">
            <Line k="Patient" v={`${pt.firstName || ''} ${pt.lastName || ''}`.trim() || '—'} />
            <Line k="UHID" v={pt.uhid || '—'} />
            <Line k="Sex" v={pt.sex || pt.gender || '—'} />
            <Line k="Exam date" v={r.examDate || '—'} />
            <Line k="Referring clinician" v={r.referringClinician || '—'} />
          </div>

          {/* findings narrative */}
          <Section title="Findings">
            <pre className="whitespace-pre-wrap font-sans leading-relaxed">{narrative}</pre>
          </Section>

          {/* measurements */}
          {r.studyType !== 'focused' && (rightVol != null || leftVol != null) && (
            <Section title="Thyroid measurements">
              <table className="w-full text-left border-collapse">
                <thead><tr className="border-b border-gray-300"><th className="py-1">Lobe</th><th>L × H × W (cm)</th><th>Volume (mL)</th></tr></thead>
                <tbody>
                  <MeasRow lobe="Right" L={r.rightLength} H={r.rightHeight} W={r.rightWidth} vol={rightVol} />
                  <MeasRow lobe="Left" L={r.leftLength} H={r.leftHeight} W={r.leftWidth} vol={leftVol} />
                  {r.isthmusThickness && <tr><td className="py-1">Isthmus</td><td>{r.isthmusThickness} (AP)</td><td>—</td></tr>}
                </tbody>
              </table>
            </Section>
          )}

          {/* nodules */}
          {r.noNodules ? (
            <Section title="Nodules"><p>No discrete thyroid nodules identified.</p></Section>
          ) : nods.length > 0 && (
            <Section title="Nodules">
              {nods.map((n) => {
                const t = engine.computeTirads(n);
                const fa = n.ThyroidNoduleFollicularAssessment;
                const conc = (n.follicularIndicated === 'indicated' && fa) ? engine.follicularConcern(fa, n) : null;
                return (
                  <div key={n.id || n.noduleNumber} className="mb-3 pb-2 border-b border-gray-100 last:border-0">
                    <div className="font-semibold">Nodule {n.noduleNumber} — {cap(n.lobe)}{n.pole ? `, ${n.pole}` : ''}{engine.volume(n.length, n.height, n.width) ? `, ${n.length}×${n.height}×${n.width} cm (${engine.volume(n.length, n.height, n.width)} mL)` : ''}</div>
                    <div className="text-gray-700">
                      ACR TI-RADS: {t.insufficient ? 'insufficient information' : `${t.category} (${t.points} points) — ${TR_LABEL[t.category]}`}
                      {n.btaCategory && <> · BTA {n.btaCategory}</>}
                      {n.btaRationale && <span className="text-gray-500"> ({n.btaRationale})</span>}
                    </div>
                    {conc && <div className="text-gray-700">Follicular sonographic concern: <b>{conc.concern.toUpperCase()}</b>{conc.features.length ? ` — ${conc.features.join(', ')}` : ''}. Not diagnostic; histopathology required for adenoma vs carcinoma.</div>}
                  </div>
                );
              })}
            </Section>
          )}

          {/* cervical nodes */}
          <Section title="Cervical lymph nodes">
            <p>{r.lymphNodeAssessment === 'normal' ? 'No suspicious cervical lymphadenopathy.' : r.lymphNodeAssessment === 'suspicious' ? 'Suspicious cervical lymph node(s) — see findings.' : 'Not assessed.'}</p>
          </Section>

          {/* conclusion + plan */}
          <Section title="Conclusion">
            <ul className="list-disc ml-5">{conclusion.map((c, i) => <li key={i}>{c}</li>)}</ul>
          </Section>
          {(r.plan?.length || r.planOther) && (
            <Section title="Recommendation">
              <ul className="list-disc ml-5">{(r.plan || []).map((p, i) => <li key={i}>{p}</li>)}{r.planOther && <li>{r.planOther}</li>}</ul>
            </Section>
          )}

          {/* signature */}
          <div className="mt-8 pt-4 border-t border-gray-300">
            <div className="font-semibold">{report.signedName || snap?.signatory?.name || '________________'}</div>
            <div className="text-gray-600 text-xs">{report.signedDesignation || snap?.signatory?.role || ''}{report.signedLicence ? ` · ${report.signedLicence}` : ''}</div>
            <div className="text-gray-500 text-xs mt-1">Electronically signed{report.signedAt ? ` — ${new Date(report.signedAt).toLocaleString()}` : ''}{report.firstSignedAt && report.reopenedAt ? ` (first signed ${new Date(report.firstSignedAt).toLocaleString()})` : ''}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) { return (<div className="mb-3"><div className="font-bold text-primary uppercase text-xs tracking-wide mb-1">{title}</div>{children}</div>); }
function Line({ k, v }) { return (<div><span className="text-gray-500">{k}: </span><span className="font-medium">{v}</span></div>); }
function MeasRow({ lobe, L, H, W, vol }) { return (<tr className="border-b border-gray-100"><td className="py-1">{lobe}</td><td>{L != null && H != null && W != null ? `${L} × ${H} × ${W}` : '—'}</td><td>{vol != null ? vol : '—'}</td></tr>); }
function cap(s) { return (s || '').charAt(0).toUpperCase() + (s || '').slice(1); }
