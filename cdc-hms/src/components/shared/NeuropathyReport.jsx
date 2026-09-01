// NeuropathyReport.jsx — the printable neuropathy assessment report on the
// clinic letterhead (DRY: PrintLetterhead + usePrint, the LabRequestPrint
// pattern). Renders a graded, locked study exactly as the server stored it.
import usePrint from '../../hooks/usePrint';
import PrintLetterhead from './PrintLetterhead';
import { FOOT_LABELS, PROTOCOL_SITES, SITE_LABELS, MODALITY_META, GRADE_CLASSES } from '../../constants/neuropathy';

const fmtDay = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

const Chip = ({ grade, children }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${GRADE_CLASSES[grade] || GRADE_CLASSES.pending}`}>{children}</span>
);

const ModalityBlock = ({ title, unit, right, left }) => (
  <div>
    <p className="text-[10.5px] uppercase tracking-wider text-gray-400 font-semibold">{title}</p>
    <p className="text-sm mt-1">
      <span className="text-gray-500">Right</span>{' '}
      <Chip grade={right.grade}>{right.grade || 'Not tested'}</Chip>
      {right.avg != null && <span className="font-mono ml-1">{right.avg}{unit}</span>}
      <span className="text-gray-300 mx-2">·</span>
      <span className="text-gray-500">Left</span>{' '}
      <Chip grade={left.grade}>{left.grade || 'Not tested'}</Chip>
      {left.avg != null && <span className="font-mono ml-1">{left.avg}{unit}</span>}
    </p>
  </div>
);

/**
 * Props:
 *   study   — formatted study from the API (with `readings`)
 *   onClose
 */
const NeuropathyReport = ({ study, onClose }) => {
  const { printRef, handlePrint } = usePrint();
  if (!study) return null;

  const s = study.summary || {};
  const R = s.right || {}; const L = s.left || {};
  const readingAt = (foot, site, mod) => study.readings?.find((r) => r.foot === foot && r.site === site && r.modality === mod);
  const cell = (foot, site, mod) => {
    const r = readingAt(foot, site, mod);
    if (!r || r.omitted || r.value == null) return <span className="text-gray-300">—</span>;
    if (mod === 'MONO') return r.value === 1 ? 'felt' : <span className="text-red-600 font-semibold">not felt</span>;
    return <span className="font-mono">{r.value}</span>;
  };
  const monoText = (m) => (m?.tested ? (m.insensate ? `${m.insensate} of ${m.tested} sites insensate` : `intact (${m.tested} sites)`) : null);
  const monoGrade = (m) => (m?.tested ? (m.insensate ? 'Severe' : 'Normal') : null);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="print:hidden sticky top-0 bg-white border-b-2 border-gray-200 p-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">Neuropathy Assessment</h3>
          <div className="flex gap-3">
            <button onClick={handlePrint} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 font-semibold transition">🖨️ Print</button>
            <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition">Done</button>
          </div>
        </div>

        <div ref={printRef} className="p-8">
          <PrintLetterhead show />

          <div className="flex justify-between items-start border-b-2 border-primary pb-3 mb-4 mt-4">
            <div>
              <p className="text-lg font-bold text-primary">Neuropathy Assessment</p>
              <p className="text-xs text-gray-500">Biothesiometry (VPT) · Thermal perception · 10 g monofilament — plantar protocol</p>
            </div>
            <div className="text-right text-xs text-gray-600">
              <p className="font-semibold text-gray-800 text-sm">{study.patientName}</p>
              <p className="font-mono">{study.uhid}{study.patientGender ? ` · ${study.patientGender}` : ''}</p>
              <p>{fmtDay(study.studyDate)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <ModalityBlock title="Biothesiometry (VPT)" unit=" V" right={R.vpt || {}} left={L.vpt || {}} />
            <ModalityBlock title="Hot perception" unit=" °C" right={R.hot || {}} left={L.hot || {}} />
            <ModalityBlock title="Cold perception" unit=" °C" right={R.cold || {}} left={L.cold || {}} />
            <div>
              <p className="text-[10.5px] uppercase tracking-wider text-gray-400 font-semibold">10 g monofilament</p>
              <p className="text-sm mt-1">
                <span className="text-gray-500">Right</span> <Chip grade={monoGrade(R.mono)}>{monoText(R.mono) || 'Not tested'}</Chip>
                <span className="text-gray-300 mx-2">·</span>
                <span className="text-gray-500">Left</span> <Chip grade={monoGrade(L.mono)}>{monoText(L.mono) || 'Not tested'}</Chip>
              </p>
            </div>
          </div>

          {/* per-site readings */}
          <table className="w-full text-xs mt-6 border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-2 border border-gray-200">Site</th>
                {['VPT', 'HOT', 'COLD', 'MONO'].map((m) => (
                  <th key={m} colSpan={2} className="p-2 border border-gray-200 text-center">{MODALITY_META[m].label}{MODALITY_META[m].unit ? ` (${MODALITY_META[m].unit})` : ''}</th>
                ))}
              </tr>
              <tr className="bg-gray-50 text-gray-500">
                <th className="border border-gray-200" />
                {['VPT', 'HOT', 'COLD', 'MONO'].flatMap((m) => [<th key={m + 'R'} className="p-1 border border-gray-200 font-normal">R</th>, <th key={m + 'L'} className="p-1 border border-gray-200 font-normal">L</th>])}
              </tr>
            </thead>
            <tbody>
              {PROTOCOL_SITES.map((site) => (
                <tr key={site}>
                  <td className="p-2 border border-gray-200 text-gray-700">{SITE_LABELS[site]}</td>
                  {['VPT', 'HOT', 'COLD', 'MONO'].flatMap((m) => [
                    <td key={m + 'R'} className="p-2 border border-gray-200 text-center">{cell('R', site, m)}</td>,
                    <td key={m + 'L'} className="p-2 border border-gray-200 text-center">{cell('L', site, m)}</td>,
                  ])}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-gray-400 mt-1">Grades: VPT Normal ≤15 · Mild 16–20 · Moderate 21–25 · Severe ≥26 V. Hot ≤42 · 42.1–45 · 45.1–48 · ≥48.1 °C. Cold ≥20 · 15–19.9 · 10–14.9 · &lt;10 °C. Per-foot averages are the mean of the tested sites.</p>

          {(study.remarks || study.impression) && (
            <div className="mt-5 text-sm space-y-2">
              {study.remarks && <p><span className="font-semibold text-gray-800">Remarks:</span> <span className="text-gray-700">{study.remarks}</span></p>}
              {study.impression && <p><span className="font-semibold text-gray-800">Impression:</span> <span className="text-gray-700">{study.impression}</span></p>}
            </div>
          )}

          <div className="mt-8 flex justify-between text-xs text-gray-600">
            <p>Performed by: <span className="font-semibold text-gray-800">{study.performedByName || '—'}</span></p>
            <p>Completed: {study.completedAt ? new Date(study.completedAt).toLocaleString('en-GB') : '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NeuropathyReport;
