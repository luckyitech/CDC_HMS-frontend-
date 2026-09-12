import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bluetooth, Clock, ExternalLink } from 'lucide-react';
import { glucoseService } from '../../services/glucoseService';
import { MeterDownloadModal } from './MeterDownload';
import { useUserContext } from '../../contexts/UserContext';

/**
 * GlucoseSummaryCard — the compact Glucose Management Centre for the
 * consultation's right-hand summary panel (ConsultationSummaryPanel).
 *
 * The doctor sees, while writing notes: whether the meter was downloaded
 * today, the clock warning, the 14-day TIR bar and four headline figures —
 * and can download the meter (modal) or open the full centre (Patient file →
 * Diagnostics → Charts). Self-contained: it loads its own summary so the
 * panel stays presentational and Consultation.jsx is untouched.
 *
 * Same numbers as the full centre (both read GET …/glucose/summary).
 */
const MMOL = 18;
const BAND = { veryLow: '#b91c1c', low: '#ef4444', inRange: '#16a34a', high: '#f59e0b', veryHigh: '#c2410c' };
const mmol = (mg) => (mg === null || mg === undefined ? '—' : (Math.round((mg / MMOL) * 10) / 10).toFixed(1));
const fmtDelta = (s) => { const a = Math.abs(s); const h = Math.floor(a / 3600), m = Math.round((a % 3600) / 60); return `${h ? `${h} h ` : ''}${m} min ${s > 0 ? 'behind' : 'ahead'}`; };

const GlucoseSummaryCard = ({ patient }) => {
  const navigate = useNavigate();
  const { currentUser } = useUserContext();
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const uhid = patient?.uhid;

  const load = useCallback(async () => {
    if (!uhid) return;
    try { const r = await glucoseService.getSummary(uhid, { days: 14 }); setData(r?.data || r); }
    catch { setData(null); }
  }, [uhid]);
  useEffect(() => { load(); }, [load]);

  const m = data?.metrics;
  const t = data?.targets?.targets;
  const meters = data?.meters || [];
  const last = meters.filter((x) => x.lastSyncAt).sort((a, b) => new Date(b.lastSyncAt) - new Date(a.lastSyncAt))[0] || null;
  const today = last && new Date(last.lastSyncAt).toDateString() === new Date().toDateString();
  const clock = meters.find((x) => x.status === 'Active' && x.lastClockDeltaSec !== null && Math.abs(x.lastClockDeltaSec) > 600 && (!x.clockCorrectedAt || new Date(x.clockCorrectedAt) < new Date(x.lastSyncAt)));

  const openCentre = () => {
    const base = `/${currentUser?.role === 'admin' ? 'admin' : 'doctor'}`;
    navigate(`${base}/patient-profile/${uhid}`, { state: { activeTab: 'medical-documents', diagnosticsSub: 'charts', fromConsultation: true } });
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
        {last ? (
          <span className={`px-2 py-0.5 rounded-full border font-semibold ${today ? 'bg-green-50 border-green-300 text-green-800' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>
            Meter downloaded {today ? new Date(last.lastSyncAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : new Date(last.lastSyncAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        ) : <span className="px-2 py-0.5 rounded-full border bg-gray-100 border-gray-200 text-gray-600 font-semibold">No meter downloaded yet</span>}
        <span className="text-gray-500">last 14 d · {data?.targets?.individualised ? 'individual targets' : 'consensus targets'}</span>
      </div>

      {clock && (
        <div className="p-2 rounded-lg border border-amber-200 bg-amber-50 text-[11px] text-amber-800 flex items-start gap-1.5">
          <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span><strong>Meter clock {fmtDelta(clock.lastClockDeltaSec)}.</strong> Times are the meter&rsquo;s own; time-of-day is low-confidence until it&rsquo;s set.</span>
        </div>
      )}

      {m && t ? (
        <>
          <div>
            <div className="flex justify-between text-[11px]"><b className="text-gray-700">Time in range · 14 d</b><span className="text-gray-500">target &gt; {t.tirGoalPct} %</span></div>
            <div className={`flex h-3.5 rounded overflow-hidden gap-px bg-gray-200 my-1 ${m.sufficient ? '' : 'opacity-40'}`}>
              {[['veryLowPct', BAND.veryLow], ['lowPct', BAND.low], ['inRangePct', BAND.inRange], ['highPct', BAND.high], ['veryHighPct', BAND.veryHigh]].map(([k, c]) => <div key={k} style={{ width: `${m.tir[k]}%`, background: c }} />)}
            </div>
            <div className="flex justify-between text-[11px]"><span style={{ color: BAND.low }}>{m.tir.belowPct} % low</span><b style={{ color: BAND.inRange }}>{m.tir.inRangePct} % in range</b><span style={{ color: BAND.veryHigh }}>{m.tir.abovePct} % high</span></div>
            {!m.sufficient && <p className="text-[10px] text-amber-700 mt-0.5">Too little data to quote ({m.readings} readings over {m.days} days)</p>}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              ['est. GMI (SMBG)', m.gmiPct !== null ? `${m.gmiPct} %` : '—', data.hba1c ? `HbA1c ${data.hba1c.value} %` : 'no HbA1c'],
              ['Mean', `${mmol(m.meanMgdl)} mmol/L`, `CV ${m.cvPct ?? '—'} %`],
              ['Hypos', String(m.hypoCount), `${m.hypoLevel2Count} below ${mmol(t.tbrLevel2Mgdl)}`],
              ['Readings', String(m.readings), `${m.readingsPerDay} / day`],
            ].map(([k, v, s]) => (
              <div key={k} className={`p-2 rounded-lg bg-gray-50 border border-gray-200 ${k.startsWith('est.') && !m.sufficient ? 'opacity-40' : ''}`}>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-500">{k}</p>
                <p className="text-base font-extrabold text-gray-800 leading-tight">{v}</p>
                <p className="text-[10px] text-gray-500">{s}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-gray-400">{data ? 'No glucose data in the last 14 days.' : 'Loading…'}</p>
      )}

      <div className="flex gap-1.5">
        <button type="button" onClick={() => setOpen(true)} className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-semibold border border-primary text-primary rounded-lg px-2 py-1.5 hover:bg-blue-50"><Bluetooth className="w-3.5 h-3.5" /> Download meter</button>
        <button type="button" onClick={openCentre} className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-semibold bg-primary text-white rounded-lg px-2 py-1.5 hover:bg-blue-700">Open full centre <ExternalLink className="w-3.5 h-3.5" /></button>
      </div>

      <MeterDownloadModal isOpen={open} onClose={() => setOpen(false)} patient={patient} onImported={() => load()} />
    </div>
  );
};

export default GlucoseSummaryCard;
