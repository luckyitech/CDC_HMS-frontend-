import * as engine from '../../../utils/thyroidUsEngine';
import { TR_COLOR, FOLL_COLOR } from '../../../constants/thyroidUs';

// Live volumes, per-nodule chips and the validation list. Read-only mirror of state.
export default function LiveResultsPanel({ report, nodules }) {
  const r = engine.volume(report.rightLength, report.rightHeight, report.rightWidth);
  const l = engine.volume(report.leftLength, report.leftHeight, report.leftWidth);
  const total = (r || l) ? Math.round(((Number(r) || 0) + (Number(l) || 0)) * 10) / 10 : null;
  const { errors, warnings } = engine.validateReport(report, nodules);

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Live results</div>

      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1.5">Volumes (mL)</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Right" value={r} />
          <Stat label="Left" value={l} />
          <Stat label="Total" value={total} accent />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1.5">Nodules</div>
        {!nodules.length ? (
          <div className="text-xs text-gray-400">{report.noNodules ? 'No nodules identified' : 'None entered yet'}</div>
        ) : (
          <div className="space-y-1.5">
            {nodules.map((n) => {
              const t = engine.computeTirads(n);
              const finalTr = n.tiradsFinal || (t.insufficient ? null : t.category);
              const cat = finalTr || 'TR—';
              const col = finalTr ? TR_COLOR[finalTr] : 'bg-gray-400 text-white';
              const conc = n.follicularIndicated === 'indicated' && n.ThyroidNoduleFollicularAssessment
                ? engine.follicularConcern(n.ThyroidNoduleFollicularAssessment, n).concern : null;
              return (
                <div key={n.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Nodule {n.noduleNumber}</span>
                  <span className="flex gap-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${col}`}>{cat}</span>
                    {n.btaCategory && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-700 text-white">{n.btaCategory}</span>}
                    {conc && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${FOLL_COLOR[conc].tag}`}>{conc}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1.5">Before signing</div>
        <ul className="space-y-1 text-xs">
          {errors.length === 0 && warnings.length === 0 && <li className="text-emerald-600 flex gap-1.5"><span>✓</span><span>Ready to sign</span></li>}
          {errors.map((e, i) => <li key={'e' + i} className="text-rose-600 flex gap-1.5"><span>●</span><span>{e}</span></li>)}
          {warnings.map((w, i) => <li key={'w' + i} className="text-amber-600 flex gap-1.5"><span>▲</span><span>{w}</span></li>)}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <div className="text-[11px] text-gray-400">{label}</div>
      <div className={`font-semibold ${accent ? 'text-primary' : ''}`}>{value != null ? value : '—'}</div>
    </div>
  );
}
