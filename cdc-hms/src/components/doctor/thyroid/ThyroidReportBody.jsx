import * as engine from '../../../utils/thyroidUsEngine';
import { TR_COLOR, BTA_COLOR, LN_FEATURES } from '../../../constants/thyroidUs';

const LN_FEAT = Object.fromEntries(LN_FEATURES);
const SIDE_LABEL = { right: 'Right', left: 'Left', midline: 'Midline' };

/* Tabulated thyroid US report body — matches CDC_Thyroid_Ultrasound_Report_Template_v1.1.
 * Presentational only; renders from the (frozen) report + nodules. Used by both the
 * on-screen preview and the letterhead print (DRY). Measurement axis order on paper
 * is W × AP × L, per the clinic template (the tool captures L × H × W). */

const TR_DESC = { TR1: 'Benign', TR2: 'Not suspicious', TR3: 'Mildly suspicious', TR4: 'Moderately suspicious', TR5: 'Highly suspicious' };
const BTA_DESC = { U1: 'Normal', U2: 'Benign', U3: 'Indeterminate', U4: 'Suspicious', U5: 'Malignant' };
const L = {
  composition: { cystic: 'Cystic', spongiform: 'Spongiform', predominantly_cystic: 'Predominantly cystic', mixed_cystic_solid: 'Mixed cystic–solid', predominantly_solid: 'Predominantly solid', solid: 'Solid', other: 'Other', not_assessed: 'Not assessed' },
  echogenicity: { anechoic: 'Anechoic', isoechoic: 'Isoechoic', hyperechoic: 'Hyperechoic', hypoechoic: 'Hypoechoic', very_hypoechoic: 'Very hypoechoic', heterogeneous: 'Heterogeneous', not_assessed: 'Not assessed' },
  shape: { wider_than_tall: 'Wider-than-tall', taller_than_wide: 'Taller-than-wide', not_assessed: 'Not assessed' },
  margins: { smooth: 'Smooth', ill_defined: 'Ill-defined', lobulated: 'Lobulated', irregular: 'Irregular', extrathyroidal_extension: 'Extra-thyroidal extension', not_assessed: 'Not assessed' },
  vascularity: { minimal: 'Minimal', peripheral: 'Peripheral', internal: 'Internal', predominantly_peripheral_with_internal: 'Predominantly peripheral with internal', diffuse_internal_and_peripheral: 'Diffuse internal and peripheral', marked: 'Marked', not_assessed: 'Not assessed' },
  gland: { normal: 'normal', enlarged: 'enlarged', small: 'small', not_assessed: 'not assessed for' },
  echotexture: { homogeneous: 'homogeneous', heterogeneous: 'heterogeneous', diffusely_hypoechoic: 'diffusely hypoechoic', other: 'other' },
  glandEcho: { isoechoic: 'isoechoic', hypoechoic: 'hypoechoic', hyperechoic: 'hyperechoic', other: 'other' },
  glandVasc: { normal: 'normal', mildly_increased: 'mildly increased', increased: 'increased', markedly_increased: 'markedly increased', reduced: 'reduced', not_assessed: 'not assessed' },
  isthmus: { normal: 'normal in appearance', thickened: 'thickened', atrophic: 'atrophic', not_assessable: 'not assessable' },
};
const cap = (s) => (s || '').charAt(0).toUpperCase() + (s || '').slice(1);
const dash = (x) => (x == null || x === '' ? '—' : x);

// W × AP × L  (width × height × length) for paper
const wapl = (Wv, APv, Lv) => (Wv != null && APv != null && Lv != null ? `${Wv} × ${APv} × ${Lv}` : '—');

function fociFinding(n) {
  if (n.fociStatus === 'not_assessed') return 'Not assessed';
  const parts = [];
  if (n.fociMacrocalcification) parts.push('macrocalcification');
  if (n.fociRim) parts.push('peripheral (rim) calcification');
  if (n.fociInterruptedRim) parts.push('interrupted rim calcification');
  if (n.fociPunctate) parts.push('punctate echogenic foci');
  if (n.fociCometTail) parts.push('comet-tail artefact');
  return parts.length ? cap(parts.join(', ')) : 'None';
}

// BTA U is descriptor-based (no points). Surface the sonographic criteria that
// informed the category, each flagged reassuring / indeterminate / suspicious.
function btaCriteria(n, fa) {
  const rows = [];
  const push = (feature, finding, sig) => { if (finding) rows.push({ feature, finding, sig }); };
  if (n.composition) {
    const solid = ['solid', 'predominantly_solid'].includes(n.composition);
    const cyst = ['cystic', 'spongiform', 'predominantly_cystic'].includes(n.composition);
    push('Composition', L.composition[n.composition], solid ? 'Solid — suspicious substrate' : cyst ? 'Predominantly cystic — reassuring' : 'Mixed cystic–solid — indeterminate');
  }
  if (n.echogenicity) {
    const hypo = ['hypoechoic', 'very_hypoechoic'].includes(n.echogenicity);
    push('Echogenicity', L.echogenicity[n.echogenicity], hypo ? 'Hypoechoic — suspicious' : 'Iso-/hyper-/anechoic — reassuring');
  }
  if (n.margins) {
    const susp = ['lobulated', 'irregular', 'extrathyroidal_extension'].includes(n.margins);
    push('Margins', L.margins[n.margins], susp ? 'Irregular / lobulated — suspicious' : 'Smooth / ill-defined — reassuring');
  }
  if (n.shape) push('Shape', L.shape[n.shape], n.shape === 'taller_than_wide' ? 'Taller-than-wide — suspicious' : 'Wider-than-tall — reassuring');
  if (n.fociStatus && n.fociStatus !== 'not_assessed') {
    push('Echogenic foci', fociFinding(n), n.fociStatus === 'none' ? 'None — reassuring' : n.fociPunctate ? 'Punctate foci — suspicious' : n.fociMacrocalcification ? 'Macrocalcification — indeterminate' : (n.fociRim || n.fociInterruptedRim) ? 'Rim calcification — indeterminate' : '—');
  }
  if (fa && fa.halo) {
    const susp = ['interrupted', 'nodular_irregular'].includes(fa.halo);
    push('Halo', fa.halo.replace(/_/g, ' '), susp ? 'Interrupted / nodular — suspicious' : 'Complete halo — reassuring');
  }
  return rows;
}
function sigClass(sig) {
  const s = (sig || '').toLowerCase();
  if (s.includes('suspicious')) return 'text-red-600';
  if (s.includes('reassuring')) return 'text-emerald-600';
  if (s.includes('indeterminate')) return 'text-amber-600';
  return 'text-gray-500';
}

function findings(r, nodules) {
  const paras = [];
  const rv = engine.volume(r.rightLength, r.rightHeight, r.rightWidth);
  const lv = engine.volume(r.leftLength, r.leftHeight, r.leftWidth);
  const nodBy = (lobe) => nodules.filter((n) => n.lobe === lobe).length;

  // diffuse
  const diffuse = [`The thyroid gland is ${L.gland[r.glandSize] || 'normal'} in size`];
  if (r.echotexture) diffuse.push(`with ${L.echotexture[r.echotexture] || r.echotexture} echotexture`);
  if (r.echogenicity) diffuse.push(`and ${L.glandEcho[r.echogenicity] || r.echogenicity} in background echogenicity`);
  let diffuseStr = diffuse.join(' ') + '.';
  if (r.vascularity && r.vascularity !== 'not_assessed') diffuseStr += ` Colour Doppler shows ${L.glandVasc[r.vascularity] || r.vascularity} vascularity.`;

  paras.push({ k: 'Right lobe', v: rv != null ? `The right lobe measures ${wapl(r.rightWidth, r.rightHeight, r.rightLength)} cm (${rv} mL)${nodBy('right') ? `, containing ${nodBy('right')} nodule(s) described below` : ' and is unremarkable'}.` : 'The right lobe was not measured.' });
  paras.push({ k: 'Left lobe', v: lv != null ? `The left lobe measures ${wapl(r.leftWidth, r.leftHeight, r.leftLength)} cm (${lv} mL)${nodBy('left') ? `, containing ${nodBy('left')} nodule(s) described below` : ' and is unremarkable'}.` : 'The left lobe was not measured.' });
  paras.push({ k: 'Isthmus', v: `The isthmus is ${L.isthmus[r.isthmusAppearance] || 'normal in appearance'}${r.isthmusThickness ? ` (${r.isthmusThickness} cm)` : ''}.` });
  paras.push({ k: 'Diffuse', v: diffuseStr });

  const general = [];
  if (r.retrosternalExtension && r.retrosternalExtension !== 'none') general.push(`${r.retrosternalExtension} retrosternal extension`);
  if (r.trachealDeviation === 'present') general.push('tracheal deviation');
  if (r.carotidDisplacement === 'present') general.push('carotid displacement');
  if (r.otherDiffuseAbnormalities) general.push(r.otherDiffuseAbnormalities);
  paras.push({ k: 'General', v: general.length ? cap(general.join('; ')) + '.' : 'No extrathyroidal extension, tracheal deviation or vascular displacement.' });
  return paras;
}

export default function ThyroidReportBody({ report, nodules = [], patient = {} }) {
  const snap = report.reportSnapshot || null;
  const r = snap?.report || report;
  const nods = snap?.nodules || nodules;
  const pt = snap?.patient || patient;
  const dob = pt.dob || pt.dateOfBirth;   // snapshot uses dob; live patient uses dateOfBirth

  const rv = engine.volume(r.rightLength, r.rightHeight, r.rightWidth);
  const lv = engine.volume(r.leftLength, r.leftHeight, r.leftWidth);
  const total = (rv || lv) ? Math.round(((Number(rv) || 0) + (Number(lv) || 0)) * 10) / 10 : null;
  // age at examination (stable — no Date.now in render)
  const age = pt.age || (dob && r.examDate ? Math.floor((new Date(r.examDate) - new Date(dob)) / 3.15576e10) : '');

  return (
    <div className="text-[13px] text-gray-800 leading-relaxed">
      <h2 className="text-center text-lg font-bold">{r.studyType === 'focused' ? 'FOCUSED THYROID ULTRASOUND REPORT' : 'THYROID ULTRASOUND REPORT'}</h2>
      <div className="text-center text-xs text-gray-500 mb-3">Report {r.reportNumber}</div>

      {/* patient table */}
      <table className="w-full border-collapse mb-3">
        <tbody>
          <tr>
            <td className="border border-gray-300 px-2 py-1 bg-gray-50 font-semibold w-1/4">Patient Name</td><td className="border border-gray-300 px-2 py-1 w-1/4">{`${pt.firstName || ''} ${pt.lastName || ''}`.trim() || pt.name || '—'}</td>
            <td className="border border-gray-300 px-2 py-1 bg-gray-50 font-semibold w-1/4">UHID / Clinic No.</td><td className="border border-gray-300 px-2 py-1 w-1/4">{dash(pt.uhid)}</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-2 py-1 bg-gray-50 font-semibold">Date of Birth</td><td className="border border-gray-300 px-2 py-1">{dash(dob)}</td>
            <td className="border border-gray-300 px-2 py-1 bg-gray-50 font-semibold">Age / Sex</td><td className="border border-gray-300 px-2 py-1">{age || '—'} / {dash(pt.sex || pt.gender)}</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-2 py-1 bg-gray-50 font-semibold">Date of Examination</td><td className="border border-gray-300 px-2 py-1">{dash(r.examDate)}</td>
            <td className="border border-gray-300 px-2 py-1 bg-gray-50 font-semibold">Referring Clinician</td><td className="border border-gray-300 px-2 py-1">{dash(r.referringClinician)}</td>
          </tr>
        </tbody>
      </table>

      <H>Indication</H>
      <p>{[...(r.indications || []).map((c) => cap(c.replace(/_/g, ' '))), ...(r.indicationOther ? [r.indicationOther] : [])].join('; ') || '—'}</p>

      <H>Equipment and Technique</H>
      <p>High-resolution ultrasound of the thyroid gland and the central and lateral neck compartments was performed using a high-frequency linear-array transducer (7–15 MHz). Grey-scale imaging was supplemented by colour Doppler interrogation. Images were acquired in the transverse and longitudinal planes. Nodules were characterised and stratified according to both the ACR TI-RADS and the British Thyroid Association ultrasound classification (BTA U).</p>

      <H>Findings</H>
      {findings(r, nods).map((p, i) => <p key={i} className="mb-1"><span className="font-semibold">{p.k}: </span>{p.v}</p>)}

      <H>Thyroid Measurements</H>
      <table className="w-full border-collapse">
        <thead><tr>{['Structure', 'Dimensions (W × AP × L, cm)', 'Volume (mL)'].map((h) => <th key={h} className="border border-gray-300 px-2 py-1 bg-gray-100 text-left">{h}</th>)}</tr></thead>
        <tbody>
          <tr><td className="border border-gray-300 px-2 py-1">Right Lobe</td><td className="border border-gray-300 px-2 py-1">{wapl(r.rightWidth, r.rightHeight, r.rightLength)}</td><td className="border border-gray-300 px-2 py-1">{dash(rv)}</td></tr>
          <tr><td className="border border-gray-300 px-2 py-1">Left Lobe</td><td className="border border-gray-300 px-2 py-1">{wapl(r.leftWidth, r.leftHeight, r.leftLength)}</td><td className="border border-gray-300 px-2 py-1">{dash(lv)}</td></tr>
          <tr><td className="border border-gray-300 px-2 py-1">Isthmus</td><td className="border border-gray-300 px-2 py-1">{r.isthmusThickness ? `${r.isthmusThickness} (AP)` : '—'}</td><td className="border border-gray-300 px-2 py-1">—</td></tr>
          <tr><td className="border border-gray-300 px-2 py-1 font-semibold">Total Thyroid Volume</td><td className="border border-gray-300 px-2 py-1"></td><td className="border border-gray-300 px-2 py-1 font-semibold">{dash(total)}</td></tr>
        </tbody>
      </table>

      <H>Thyroid Nodule(s)</H>
      {r.noNodules || !nods.length ? (
        <p>No discrete thyroid nodules identified.</p>
      ) : nods.map((n) => {
        const t = engine.computeTirads(n);
        const b = t.breakdown || {};
        const finalTr = n.tiradsFinal || (t.insufficient ? null : t.category);   // reporter's confirmed/overridden TR
        const overridden = n.tiradsFinal && !t.insufficient && n.tiradsFinal !== t.category;
        const fa = n.ThyroidNoduleFollicularAssessment;
        const conc = (n.follicularIndicated === 'indicated' && fa) ? engine.follicularConcern(fa, n) : null;
        const nvol = engine.volume(n.length, n.height, n.width);
        return (
          <div key={n.id || n.noduleNumber} className="mb-4">
            <div className="font-bold mb-1">Nodule {n.noduleNumber}</div>
            <table className="w-full border-collapse mb-2">
              <tbody>
                <KV k="Location" v={`${cap(n.lobe)}${n.pole ? `, ${n.pole} pole` : ''}`} />
                <KV k="Measurements (cm)" v={nvol != null ? wapl(n.width, n.height, n.length) : (n.dimensionsUnavailable ? 'Dimensions unavailable' : '—')} />
                <KV k="Volume (mL)" v={nvol} />
                <KV k="Composition" v={L.composition[n.composition]} />
                <KV k="Echogenicity" v={L.echogenicity[n.echogenicity]} />
                <KV k="Shape" v={L.shape[n.shape]} />
                <KV k="Margins" v={L.margins[n.margins]} />
                <KV k="Echogenic Foci" v={fociFinding(n)} />
                <KV k="Internal Vascularity" v={L.vascularity[n.vascularity]} />
                <KV k="Additional Features" v={(n.additionalFeatures || []).join(', ') || (n.additionalFeaturesOther || '—')} />
              </tbody>
            </table>

            <div className="font-semibold mb-1">Nodule Classification — ACR TI-RADS &amp; BTA U</div>
            <table className="w-full border-collapse mb-1">
              <thead><tr>{['Feature', 'Finding', 'Points'].map((h) => <th key={h} className="border border-gray-300 px-2 py-1 bg-gray-100 text-left">{h}</th>)}</tr></thead>
              <tbody>
                <tr><td className="border border-gray-300 px-2 py-1">Composition</td><td className="border border-gray-300 px-2 py-1">{dash(L.composition[n.composition])}</td><td className="border border-gray-300 px-2 py-1 text-center">{b.composition ?? '—'}</td></tr>
                <tr><td className="border border-gray-300 px-2 py-1">Echogenicity</td><td className="border border-gray-300 px-2 py-1">{dash(L.echogenicity[n.echogenicity])}</td><td className="border border-gray-300 px-2 py-1 text-center">{b.echogenicity ?? '—'}</td></tr>
                <tr><td className="border border-gray-300 px-2 py-1">Shape</td><td className="border border-gray-300 px-2 py-1">{dash(L.shape[n.shape])}</td><td className="border border-gray-300 px-2 py-1 text-center">{b.shape ?? '—'}</td></tr>
                <tr><td className="border border-gray-300 px-2 py-1">Margins</td><td className="border border-gray-300 px-2 py-1">{dash(L.margins[n.margins])}</td><td className="border border-gray-300 px-2 py-1 text-center">{b.margins ?? '—'}</td></tr>
                <tr><td className="border border-gray-300 px-2 py-1">Echogenic Foci</td><td className="border border-gray-300 px-2 py-1">{fociFinding(n)}</td><td className="border border-gray-300 px-2 py-1 text-center">{b.foci ?? '—'}</td></tr>
              </tbody>
            </table>
            <p className="mb-1 flex items-center gap-2 flex-wrap"><b>ACR TI-RADS Score:</b> {t.insufficient ? 'Insufficient information' : `${t.points} points`} <span className="text-gray-400">·</span> <b>Final Classification:</b>
              {finalTr ? <><span className={`px-2 py-0.5 rounded text-xs font-bold ${TR_COLOR[finalTr]}`}>{finalTr}</span> {TR_DESC[finalTr]}</> : '—'}
              {overridden && <span className="text-[11px] text-gray-500">(reporter override — computed {t.category})</span>}</p>
            <RefBar items={['TR1 / Benign', 'TR2 / Not Suspicious', 'TR3 / Mildly Suspicious', 'TR4 / Moderately Suspicious', 'TR5 / Highly Suspicious']} active={finalTr} activeClass={TR_COLOR[finalTr]} />
            <p className="mb-1 mt-2 flex items-center gap-2 flex-wrap"><b>BTA U Category:</b>
              {n.btaCategory ? <><span className={`px-2 py-0.5 rounded text-xs font-bold ${BTA_COLOR[n.btaCategory]}`}>{n.btaCategory}</span> {BTA_DESC[n.btaCategory]}</> : '—'}{n.btaRationale ? <span className="text-gray-500">({n.btaRationale})</span> : ''}</p>
            <RefBar items={['U1 / Normal', 'U2 / Benign', 'U3 / Indeterminate', 'U4 / Suspicious', 'U5 / Malignant']} active={n.btaCategory} activeClass={BTA_COLOR[n.btaCategory]} />
            {(() => { const crit = btaCriteria(n, fa); return crit.length ? (
              <div className="mt-2">
                <div className="text-[12px] font-semibold text-gray-600 mb-1">BTA U — sonographic criteria considered</div>
                <table className="w-full border-collapse">
                  <thead><tr>{['Feature', 'Finding', 'Significance'].map((h) => <th key={h} className="border border-gray-300 px-2 py-1 bg-gray-100 text-left">{h}</th>)}</tr></thead>
                  <tbody>
                    {crit.map((c) => (
                      <tr key={c.feature}>
                        <td className="border border-gray-300 px-2 py-1">{c.feature}</td>
                        <td className="border border-gray-300 px-2 py-1">{c.finding}</td>
                        <td className={`border border-gray-300 px-2 py-1 ${sigClass(c.sig)}`}>{c.sig}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null; })()}
            {Array.isArray(n.btaFeatures) && n.btaFeatures.length > 0 && (
              <div className="mt-2 text-[12.5px]">
                <b>BTA U features noted:</b>
                <ul className="list-disc ml-5">{n.btaFeatures.map((x, i) => <li key={i}>{x.text} <span className="text-gray-400">({x.code})</span></li>)}</ul>
              </div>
            )}
            {conc && <p className="mt-2 text-[12.5px]"><b>Follicular neoplasm sonographic assessment:</b> {conc.concern.toUpperCase()} concern{conc.features.length ? ` — ${conc.features.join(', ')}` : ''}. These findings are not diagnostic of follicular carcinoma; histopathological assessment of capsular/vascular invasion is required.</p>}
          </div>
        );
      })}

      <H>Cervical Lymph Nodes</H>
      {Array.isArray(r.lymphNodes) && r.lymphNodes.length ? (() => {
        const anySusp = r.lymphNodes.some((n) => n.suspicious);
        return (
          <>
            <p className="mb-2">{anySusp
              ? 'Abnormal cervical lymph node(s) identified, as tabulated below.'
              : 'The cervical lymph nodes logged below demonstrate a benign / reactive sonographic appearance (preserved fatty hilum, reniform morphology).'}</p>
            <table className="w-full border-collapse">
              <thead><tr>{['Level', 'Side', 'Short axis (mm)', 'Status', 'Suspicious features'].map((h) => <th key={h} className="border border-gray-300 px-2 py-1 bg-gray-100 text-left">{h}</th>)}</tr></thead>
              <tbody>
                {r.lymphNodes.map((n) => (
                  <tr key={n.id}>
                    <td className="border border-gray-300 px-2 py-1">{dash(n.level)}</td>
                    <td className="border border-gray-300 px-2 py-1">{dash(SIDE_LABEL[n.side])}</td>
                    <td className="border border-gray-300 px-2 py-1">{n.shortAxis ? n.shortAxis : '—'}</td>
                    <td className={`border border-gray-300 px-2 py-1 font-semibold ${n.suspicious ? 'text-red-600' : 'text-emerald-600'}`}>{n.suspicious ? 'Suspicious' : 'Benign / reactive'}</td>
                    <td className="border border-gray-300 px-2 py-1">{(n.features || []).map((c) => LN_FEAT[c] || c).join(', ') || '—'}{n.note ? ` — ${n.note}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        );
      })() : (
        <p>{r.lymphNodeAssessment === 'normal' ? 'No suspicious cervical lymphadenopathy. Visualised nodes demonstrate a normal fatty hilum and reniform morphology.' : r.lymphNodeAssessment === 'suspicious' ? `Suspicious cervical lymph node(s) identified.${r.otherDiffuseAbnormalities ? ' ' + r.otherDiffuseAbnormalities : ''}` : 'The cervical lymph nodes were not assessed.'}</p>
      )}

      <H>Conclusion</H>
      <ul className="list-disc ml-5">{(r.conclusion || []).map((c, i) => <li key={i}>{c}</li>)}{!(r.conclusion || []).length && <li className="text-gray-400 list-none">—</li>}</ul>

      <H>Plan</H>
      <ul className="list-disc ml-5">{(r.plan || []).map((p, i) => <li key={i}>{p.replace(/_/g, ' ')}</li>)}{r.planOther && <li>{r.planOther}</li>}{!(r.plan || []).length && !r.planOther && <li className="text-gray-400 list-none">—</li>}</ul>

      {/* signatory */}
      <div className="mt-8 pt-3 border-t-2 border-gray-300">
        <div className="text-xs text-gray-500">Reported and authorised by</div>
        <div className="font-bold">{report.signedName || 'Dr. Ebrahim Yusuf Ebrahim'}</div>
        <div className="text-xs text-gray-600">{report.signedDesignation || 'Consultant Physician · Endocrinologist · Interventional Thyroidologist'}{report.signedLicence ? ` · ${report.signedLicence}` : ''}</div>
        <div className="text-xs text-gray-500 mt-1">Electronically signed{report.signedAt ? ` — ${new Date(report.signedAt).toLocaleString()}` : ''}</div>
      </div>
    </div>
  );
}

function H({ children }) {
  return <div className="text-primary font-bold uppercase text-[13px] tracking-wide border-b border-gray-200 pb-1 mt-5 mb-2">{children}</div>;
}
function KV({ k, v }) {
  return <tr><td className="border border-gray-300 px-2 py-1 bg-gray-50 font-semibold w-1/2">{k}</td><td className="border border-gray-300 px-2 py-1">{dash(v)}</td></tr>;
}

function RefBar({ items, active, activeClass }) {
  return (
    <div className="flex gap-0.5 text-[10px]">
      {items.map((it) => {
        const on = active && it.startsWith(active);
        return <div key={it} className={`flex-1 text-center px-1 py-0.5 border ${on ? `${activeClass || 'bg-primary text-white'} border-transparent font-bold` : 'bg-gray-50 text-gray-500 border-gray-200'}`}>{it}</div>;
      })}
    </div>
  );
}
