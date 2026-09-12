import { useState, useCallback, useMemo } from 'react';
import { Bluetooth, CheckCircle, AlertTriangle, XCircle, Loader2, Clock, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from './Button';
import Modal from './Modal';
import { readMeter, isWebBluetoothSupported, METER_SOP, SAMPLE_TYPE_CONTROL_SOLUTION } from '../../utils/glucoseBle';
import { glucoseService } from '../../services/glucoseService';

// The four-step progress strip at the top of every phase.
const Stepper = ({ step }) => (
  <div className="flex mb-4">
    {['Connect', 'Read', 'Preview', 'Import'].map((s, i) => (
      <div key={s} className={`flex-1 text-center text-xs font-semibold py-1.5 border-b-[3px] ${i < step ? 'text-green-600 border-green-500' : i === step ? 'text-primary border-primary' : 'text-gray-400 border-gray-200'}`}>{i + 1} · {s}</div>
    ))}
  </div>
);

/**
 * MeterDownload — read a patient's home glucose meter over Bluetooth and file
 * the readings, in one place for every caller:
 *   • inline, as the "Meter download" nursing action (NursingActionsTab)
 *   • in a modal, from the doctor's Glucose card and the Glucose Management
 *     Centre's own "Download meter" button (MeterDownloadModal below)
 *
 * Flow: Connect → Read (the meter is asked for everything after the last
 * record the HMS already holds) → Preview → Import. Nothing is filed until the
 * preview is confirmed (plan §8 rule 1). The preview shows the meter's
 * identity, how many records are new, the date range, the meter-clock drift,
 * rows flagged for review (implausible values — a bad strip reads clean on the
 * meter; HI/LO; control solution) and the serial ↔ patient link state:
 *   linked    → import
 *   unlinked  → confirm this is the patient's meter (and since when) → import
 *   conflict  → the meter is Active on ANOTHER patient: re-assign it with the
 *               date this patient started using it (only readings from then
 *               on are filed), or mark it a shared household meter — with a
 *               reason, logged. Nothing imports until the nurse decides.
 *
 * Props:
 *   patient     { uhid, name }
 *   onImported  (result) => void — after a successful import (refresh charts)
 *   compact     tighter layout for the modal
 */
const MeterDownload = ({ patient, onImported = () => {}, compact = false }) => {
  const [phase, setPhase] = useState('idle');   // idle | reading | preview | importing | done | error
  const [progress, setProgress] = useState(null);
  const [read, setRead] = useState(null);       // readMeter() result
  const [pre, setPre] = useState(null);         // preflight result
  const [err, setErr] = useState(null);
  const [result, setResult] = useState(null);
  const [excluded, setExcluded] = useState(() => new Set());
  const [link, setLink] = useState({ confirm: false, action: 'reassign', usedFromDate: '', reason: '' });
  const [clockDone, setClockDone] = useState(false);

  const uhid = patient?.uhid;
  const supported = isWebBluetoothSupported();

  const reset = () => { setPhase('idle'); setProgress(null); setRead(null); setPre(null); setErr(null); setResult(null); setExcluded(new Set()); setLink({ confirm: false, action: 'reassign', usedFromDate: '', reason: '' }); setClockDone(false); };

  // ---- 1. Connect + read ------------------------------------------------
  const connect = useCallback(async () => {
    if (!uhid) return;
    setErr(null); setResult(null); setPhase('reading'); setProgress({ phase: 'chooser', message: 'Choose the meter in the list — switch it on now.' });
    let preflight = null;
    try {
      const r = await readMeter({
        onProgress: setProgress,
        beforeFetch: async (device) => {
          preflight = await glucoseService.preflightMeter(uhid, { serial: device.serial, name: device.name, modelId: device.modelId, firmware: device.firmware });
          preflight = preflight?.data || preflight;
          const last = preflight?.lastSequenceNumber;
          return { fromSequence: Number.isInteger(last) ? last + 1 : undefined };
        },
      });
      if (!preflight) {
        const p = await glucoseService.preflightMeter(uhid, { serial: r.device.serial, name: r.device.name, modelId: r.device.modelId, firmware: r.device.firmware });
        preflight = p?.data || p;
      }
      setRead(r); setPre(preflight);
      // Pre-tick the implausible rows for exclusion; the nurse can untick.
      const pl = preflight?.plausible || { minMgdl: 20, maxMgdl: 600 };
      setExcluded(new Set(r.readings.filter((x) => x.glucoseMgdl !== null && (x.glucoseMgdl < pl.minMgdl || x.glucoseMgdl > pl.maxMgdl)).map((x) => x.sequenceNumber)));
      setPhase('preview');
    } catch (e) {
      if (e?.code === 'cancelled') { setPhase('idle'); setProgress(null); return; }
      setErr(e?.message || 'Could not read the meter.'); setPhase('error');
    }
  }, [uhid]);

  // ---- derived preview facts --------------------------------------------
  const facts = useMemo(() => {
    if (!read) return null;
    const rows = read.readings;
    const lastSeq = pre?.lastSequenceNumber;
    const fresh = rows.filter((x) => !Number.isInteger(lastSeq) || x.sequenceNumber > lastSeq);
    const usedFrom = pre?.usedFromDate || (pre?.link !== 'linked' && link.usedFromDate) || null;
    const beforeUsedFrom = usedFrom ? fresh.filter((x) => x.measuredAt && x.measuredAt.slice(0, 10) < usedFrom).length : 0;
    const times = rows.map((x) => x.measuredAt).filter(Boolean).sort();
    const pl = pre?.plausible || { minMgdl: 20, maxMgdl: 600 };
    const flagged = rows.filter((x) => x.glucoseMgdl === null || x.glucoseMgdl < pl.minMgdl || x.glucoseMgdl > pl.maxMgdl || x.sensorStatus !== 0 || x.sampleType === SAMPLE_TYPE_CONTROL_SOLUTION);
    let clockDeltaSec = null;
    if (read.meterTime && read.hostTime) {
      const p = (s) => { const [d, t] = s.split(' '); const [y, m, dd] = d.split('-').map(Number); const [h, mi, se] = t.split(':').map(Number); return Date.UTC(y, m - 1, dd, h, mi, se); };
      clockDeltaSec = Math.round((p(read.hostTime) - p(read.meterTime)) / 1000);
    }
    const warnSec = pre?.clockDrift?.warnSec ?? 600;
    return { rows, fresh, beforeUsedFrom, first: times[0] || null, last: times[times.length - 1] || null, flagged, clockDeltaSec, clockWarn: clockDeltaSec !== null && Math.abs(clockDeltaSec) > warnSec, seqRange: rows.length ? [rows[0].sequenceNumber, rows[rows.length - 1].sequenceNumber] : null };
  }, [read, pre, link.usedFromDate]);

  const linkState = pre?.link || 'unlinked';
  const canImport = (() => {
    if (!facts || phase !== 'preview') return false;
    if (linkState === 'linked' || linkState === 'shared') return true;
    if (linkState === 'unlinked') return link.confirm;
    if (linkState === 'conflict') return !!link.reason.trim() && (link.action === 'share' || !!link.usedFromDate);
    return false;
  })();

  // ---- 2. Import ---------------------------------------------------------
  const doImport = async () => {
    if (!canImport) return;
    setPhase('importing');
    const linkPayload = linkState === 'unlinked'
      ? { action: 'link', usedFromDate: link.usedFromDate || undefined }
      : linkState === 'conflict'
        ? { action: link.action, usedFromDate: link.action === 'reassign' ? link.usedFromDate : undefined, reason: link.reason.trim() }
        : undefined;
    try {
      const res = await glucoseService.importMeter(uhid, {
        device: read.device,
        readings: read.readings.map(({ sequenceNumber, measuredAt, timeOffsetMin, glucoseMgdl, unitsReported, sampleType, sampleLocation, sensorStatus, mealFlag, rawHex }) =>
          ({ sequenceNumber, measuredAt, timeOffsetMin, glucoseMgdl, unitsReported, sampleType, sampleLocation, sensorStatus, mealFlag, rawHex })),
        hostTime: read.hostTime,
        meterTime: read.meterTime,
        link: linkPayload,
        excludeSequenceNumbers: [...excluded],
      });
      const data = res?.data || res;
      setResult(data); setPhase('done');
      toast.success(`${data.inserted} reading${data.inserted === 1 ? '' : 's'} imported for ${patient?.name || uhid}`);
      onImported(data);
    } catch (e) {
      setErr(e?.message || 'Import failed.'); setPhase('error');
    }
  };

  const markClock = async () => {
    const meterId = result?.meter?.id || pre?.meter?.id;
    if (!meterId) return;
    try { await glucoseService.markClockCorrected(uhid, meterId); setClockDone(true); toast.success('Meter clock noted as corrected'); }
    catch (e) { toast.error(e?.message || 'Could not save'); }
  };

  const fmtDelta = (s) => { const a = Math.abs(s); const h = Math.floor(a / 3600), m = Math.round((a % 3600) / 60); return `${h ? `${h} h ` : ''}${m} min ${s > 0 ? 'behind' : 'ahead of'} this PC`; };
  const mmol = (mg) => (mg === null ? '—' : (mg / 18).toFixed(1));

  // ---- render -------------------------------------------------------------
  if (!supported) {
    return (
      <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800 flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span>This browser cannot talk to Bluetooth meters. Open the HMS in <strong>Chrome or Edge</strong> on a PC with Bluetooth.</span>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {/* IDLE / ERROR — connect */}
      {(phase === 'idle' || phase === 'error') && (
        <>
          <Stepper step={0} />
          {err && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 flex items-start gap-2"><XCircle className="w-5 h-5 flex-shrink-0" /><span>{err}</span></div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200"><p className="font-semibold text-gray-800 mb-1">First time with this meter on this PC</p><p className="text-gray-600">{METER_SOP.firstTime}</p></div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200"><p className="font-semibold text-gray-800 mb-1">Already paired</p><p className="text-gray-600">{METER_SOP.later}</p><p className="text-xs text-gray-400 mt-1">{METER_SOP.chooserFirst}</p></div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={connect}><Bluetooth className="w-4 h-4" /> Connect to meter</Button>
            <span className="text-xs text-gray-500">Read-only on the meter · nothing is deleted from it · nothing is filed until you confirm the preview.</span>
          </div>
        </>
      )}

      {/* READING */}
      {phase === 'reading' && (
        <>
          <Stepper step={1} />
          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
            <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-gray-800">{progress?.message || 'Working…'}</p>
              {progress?.phase === 'chooser' && <p className="text-gray-500 text-xs mt-0.5">{METER_SOP.chooserFirst}</p>}
              {progress?.phase === 'pairing' && <p className="text-gray-500 text-xs mt-0.5">A first pairing takes about ten seconds.</p>}
            </div>
          </div>
        </>
      )}

      {/* PREVIEW */}
      {phase === 'preview' && facts && (
        <>
          <Stepper step={2} />

          {linkState === 'linked' && (
            <div className="p-3 rounded-lg border border-green-200 bg-green-50 text-sm text-green-800 flex items-start gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span><strong>Meter is linked to this patient.</strong> <span className="font-mono">{read.device.name}</span>{pre?.meter?.linkedByName ? ` · linked by ${pre.meter.linkedByName}` : ''}{Number.isInteger(pre?.lastSequenceNumber) ? ` · last download had records up to #${pre.lastSequenceNumber}` : ' · first download'}</span>
            </div>
          )}
          {linkState === 'shared' && (
            <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-sm text-blue-800 flex items-start gap-2"><Link2 className="w-5 h-5 flex-shrink-0" /><span><strong>Shared household meter</strong> — linked to this patient and one other. Only readings dated on or after {pre?.usedFromDate || 'the link date'} are this patient's.</span></div>
          )}
          {linkState === 'unlinked' && (
            <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-sm text-blue-900 space-y-2">
              <p className="flex items-start gap-2"><Link2 className="w-5 h-5 flex-shrink-0" /><span><strong>This meter is not linked to any patient yet.</strong> Confirm it is {patient?.name || 'this patient'}&rsquo;s and it will be linked for future downloads.</span></p>
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={link.confirm} onChange={(e) => setLink({ ...link, confirm: e.target.checked })} /> I have checked the serial on the back of the meter (<span className="font-mono">{read.device.serial}</span>) and this is the patient&rsquo;s own meter.</label>
              <label className="block text-sm"><span className="text-gray-700">Since when has the patient used this meter? <span className="text-gray-400">(leave blank if all the readings on it are theirs)</span></span>
                <input type="date" className="mt-1 px-3 py-1.5 border-2 border-gray-300 rounded-lg" value={link.usedFromDate} onChange={(e) => setLink({ ...link, usedFromDate: e.target.value })} /></label>
            </div>
          )}
          {linkState === 'conflict' && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-900 space-y-2">
              <p className="flex items-start gap-2"><XCircle className="w-5 h-5 flex-shrink-0" /><span><strong>This meter is linked to a different patient</strong> ({pre.others?.map((o) => o.patientMasked).join(', ')}). Nothing has been imported. Ask the patient <em>since when</em> they have used it — only readings from that date on will be filed under {patient?.name || 'this patient'}. If they have used it for more than about 3½ months, everything on the meter is theirs.</span></p>
              <label className="flex items-start gap-2"><input type="radio" name="mdl-conflict" className="mt-1" checked={link.action === 'reassign'} onChange={() => setLink({ ...link, action: 'reassign' })} /><span><strong>Re-assign the meter to this patient</strong> — the other patient&rsquo;s link is retired; their readings stay with them.</span></label>
              {link.action === 'reassign' && (
                <label className="block pl-6"><span className="text-gray-700">Patient has used this meter since</span> <input type="date" required className="ml-2 px-3 py-1.5 border-2 border-gray-300 rounded-lg" value={link.usedFromDate} onChange={(e) => setLink({ ...link, usedFromDate: e.target.value })} /></label>
              )}
              <label className="flex items-start gap-2"><input type="radio" name="mdl-conflict" className="mt-1" checked={link.action === 'share'} onChange={() => setLink({ ...link, action: 'share' })} /><span><strong>Shared household meter</strong> — both links stay active; this download is filed under this patient.</span></label>
              <label className="block"><span className="text-gray-700">Reason (required, logged with your name)</span>
                <input className="mt-1 w-full px-3 py-2 border-2 border-gray-300 rounded-lg" placeholder="e.g. Meter handed down from spouse on 1 Sep; confirmed with patient" value={link.reason} onChange={(e) => setLink({ ...link, reason: e.target.value })} /></label>
            </div>
          )}

          {facts.clockDeltaSec !== null && facts.clockWarn && (
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800 flex items-start gap-2">
              <Clock className="w-5 h-5 flex-shrink-0" />
              <span><strong>Meter clock is {fmtDelta(facts.clockDeltaSec)}.</strong> Readings will be filed with the meter&rsquo;s own times, unchanged. {METER_SOP.clock}</span>
            </div>
          )}
          {read.meterTime === null && (
            <p className="text-xs text-gray-500">The meter did not report its clock, so drift cannot be checked — compare a recent reading&rsquo;s time with the meter display.</p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-sm">
            {[
              ['Device', pre?.modelName || read.device.modelId || 'Meter', `${read.device.manufacturer || ''} ${read.device.modelId ? `"${read.device.modelId}"` : ''} · fw ${read.device.firmware || '—'}`],
              ['On the meter', `${read.count ?? read.readings.length} records`, facts.seqRange ? `#${facts.seqRange[0]} – #${facts.seqRange[1]}` : ''],
              ['New for this patient', String(facts.fresh.length), Number.isInteger(pre?.lastSequenceNumber) ? `up to #${pre.lastSequenceNumber} already on file` : 'first download'],
              ['Date range (meter time)', facts.first ? `${facts.first.slice(0, 10)} → ${facts.last.slice(0, 10)}` : '—', facts.beforeUsedFrom ? `${facts.beforeUsedFrom} before the "used since" date will be skipped` : ''],
              ['Units', read.readings[0]?.unitsReported === 'mol/L' ? 'mmol/L → mg/dL' : 'mg/dL → mmol/L', 'stored in mg/dL, shown in mmol/L'],
              ['Flagged for review', String(facts.flagged.length), facts.flagged.length ? 'tick to exclude from the charts' : 'nothing unusual'],
            ].map(([k, v, s]) => (
              <div key={k} className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{k}</p>
                <p className="font-bold text-gray-800 truncate" title={v}>{v}</p>
                {s && <p className="text-[11px] text-gray-500 truncate" title={s}>{s}</p>}
              </div>
            ))}
          </div>

          {facts.flagged.length > 0 && (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500"><tr><th className="text-left px-3 py-2">#</th><th className="text-left px-3 py-2">Meter time</th><th className="text-left px-3 py-2">Value</th><th className="text-left px-3 py-2">Why flagged</th><th className="text-left px-3 py-2">Exclude</th></tr></thead>
                <tbody>
                  {facts.flagged.map((x) => {
                    const pl = pre?.plausible || { minMgdl: 20, maxMgdl: 600 };
                    const why = x.sampleType === SAMPLE_TYPE_CONTROL_SOLUTION ? 'control solution (never counted)'
                      : x.sensorStatus & 0x20 ? 'meter says HI / LO (kept, not counted)'
                        : x.sensorStatus ? `meter status 0x${x.sensorStatus.toString(16)} (kept, not counted)`
                          : x.glucoseMgdl === null ? 'no value' : x.glucoseMgdl < pl.minMgdl ? 'implausibly low — bad strip?' : 'implausibly high';
                    const auto = x.sampleType === SAMPLE_TYPE_CONTROL_SOLUTION || x.sensorStatus !== 0;
                    return (
                      <tr key={x.sequenceNumber} className="border-t border-gray-100 bg-amber-50/60">
                        <td className="px-3 py-2 text-gray-500">{x.sequenceNumber}</td>
                        <td className="px-3 py-2">{x.measuredAt}</td>
                        <td className="px-3 py-2 font-semibold">{x.sensorStatus & 0x20 ? 'HI / LO' : `${mmol(x.glucoseMgdl)} mmol/L`}</td>
                        <td className="px-3 py-2 text-amber-800">{why}</td>
                        <td className="px-3 py-2">{auto ? <span className="text-xs text-gray-500">automatic</span> : <input type="checkbox" checked={excluded.has(x.sequenceNumber)} onChange={(e) => { const n = new Set(excluded); e.target.checked ? n.add(x.sequenceNumber) : n.delete(x.sequenceNumber); setExcluded(n); }} />}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
            <Button onClick={doImport} disabled={!canImport}>
              {linkState === 'conflict' ? (link.action === 'reassign' ? 'Re-assign meter and import' : 'Mark shared and import') : linkState === 'unlinked' ? `Link meter and import ${facts.fresh.length}` : `Import ${facts.fresh.length} reading${facts.fresh.length === 1 ? '' : 's'}`}
            </Button>
            <Button variant="outline" onClick={reset}>Cancel</Button>
            <span className="text-xs text-gray-500">Every reading is stored with the meter&rsquo;s serial, this download&rsquo;s batch and your name.</span>
          </div>
        </>
      )}

      {phase === 'importing' && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200 text-sm"><Loader2 className="w-5 h-5 text-primary animate-spin" /> Filing readings…</div>
      )}

      {/* DONE */}
      {phase === 'done' && result && (
        <>
          <Stepper step={4} />
          <div className="p-3 rounded-lg border border-green-200 bg-green-50 text-sm text-green-800 flex items-start gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span><strong>{result.inserted} reading{result.inserted === 1 ? '' : 's'} imported for {patient?.name || uhid}.</strong>{result.excluded ? ` ${result.excluded} excluded at your request.` : ''}{result.duplicates ? ` ${result.duplicates} already on file.` : ''}{result.skippedBeforeUsedFrom ? ` ${result.skippedBeforeUsedFrom} skipped (before the "used since" date).` : ''} Batch <span className="font-mono">{result.batchId}</span>.</span>
          </div>
          {result.clockDriftWarn && (
            <label className="flex items-start gap-2 text-sm text-amber-800 p-3 rounded-lg border border-amber-200 bg-amber-50">
              <input type="checkbox" className="mt-1" checked={clockDone} disabled={clockDone} onChange={markClock} />
              <span><strong>The meter clock was {fmtDelta(result.clockDeltaSec)}.</strong> Tick once you have set it on the meter.</span>
            </label>
          )}
          <div className="flex gap-3"><Button variant="outline" onClick={reset}>Download another meter</Button></div>
        </>
      )}
    </div>
  );
};

/** The same flow in a modal — for the doctor's Glucose card and the GMC. */
export const MeterDownloadModal = ({ isOpen, onClose, patient, onImported }) => (
  <Modal isOpen={isOpen} onClose={onClose} title={`Download meter — ${patient?.name || patient?.uhid || ''}`} size="xl">
    <MeterDownload patient={patient} compact onImported={(r) => { onImported?.(r); }} />
  </Modal>
);

export default MeterDownload;
