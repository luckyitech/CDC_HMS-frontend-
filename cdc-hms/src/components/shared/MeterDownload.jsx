import { useState, useCallback } from 'react';
import { Bluetooth, CheckCircle, AlertTriangle, XCircle, Loader2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from './Button';
import Modal from './Modal';
import { readMeter, isWebBluetoothSupported, METER_SOP } from '../../utils/glucoseBle';
import { glucoseService } from '../../services/glucoseService';

// The three-step progress strip at the top of every phase.
const STEPS = ['Connect', 'Read', 'Import'];
const Stepper = ({ step }) => (
  <div className="flex mb-4">
    {STEPS.map((s, i) => (
      <div key={s} className={`flex-1 text-center text-xs font-semibold py-1.5 border-b-[3px] ${i < step ? 'text-green-600 border-green-500' : i === step ? 'text-primary border-primary' : 'text-gray-400 border-gray-200'}`}>{i + 1} · {s}</div>
    ))}
  </div>
);

const EMPTY_LINK = { action: 'reassign', usedFromDate: '', reason: '' };
const fmtDelta = (s) => { const a = Math.abs(s); const h = Math.floor(a / 3600), m = Math.round((a % 3600) / 60); return `${h ? `${h} h ` : ''}${m} min ${s > 0 ? 'behind' : 'ahead of'} this PC`; };
// What to tell the nurse once the meter has been read. "Nothing new" is the
// normal second-visit outcome, not a fault — and an empty meter is different
// from an up-to-date one (the HMS asks only for records after the last one it
// holds, so zero back on a linked meter means everything is already on file).
const outcomeText = (data, who, r) => {
  const serial = data.meter?.deviceSerial || r?.device?.serial;
  if (data.nothingNew) {
    return data.linked
      ? { headline: 'Meter up to date — nothing new to import', detail: `Every reading on ${serial} is already on file${Number.isInteger(data.meter?.lastSequenceNumber) ? ` (records up to #${data.meter.lastSequenceNumber})` : ''}. Nothing was removed from the meter.` }
      : { headline: 'The meter has no readings stored', detail: `${serial} returned no records, so there is nothing to import and it has not been linked to ${who}. Nothing was removed from the meter.` };
  }
  const n = data.inserted;
  return {
    headline: `${n} reading${n === 1 ? '' : 's'} imported for ${who}`,
    detail: `From ${serial}.${data.duplicates ? ` ${data.duplicates} already on file.` : ''}${data.skippedBeforeUsedFrom ? ` ${data.skippedBeforeUsedFrom} skipped (before the "used since" date).` : ''} The doctor reviews them in the Glucose Management Centre.`,
  };
};

const readingsPayload = (r) => r.readings.map(({ sequenceNumber, measuredAt, timeOffsetMin, glucoseMgdl, unitsReported, sampleType, sampleLocation, sensorStatus, mealFlag, rawHex }) =>
  ({ sequenceNumber, measuredAt, timeOffsetMin, glucoseMgdl, unitsReported, sampleType, sampleLocation, sensorStatus, mealFlag, rawHex }));

/**
 * MeterDownload — read a patient's home glucose meter over Bluetooth and file
 * the readings, in one place for every caller:
 *   • inline, as the "Meter download" nursing action (NursingActionsTab)
 *   • in a modal, from the doctor's Glucose card and the Glucose Management
 *     Centre's own "Download meter" button (MeterDownloadModal below)
 *
 * Flow: Connect → Read → Import. One click. The meter is asked for everything
 * after the last record the HMS already holds and EVERY reading is filed as
 * read — implausible values, HI/LO and control-solution rows included, each
 * marked so the doctor can see and exclude them in the Glucose Management
 * Centre. The nurse reviews nothing (Emu, 12 Sep: "the app should just pull
 * all the data; the doctor will analyse and decide").
 *
 * The only thing that stops the flow is the serial ↔ patient link:
 *   linked / shared → import
 *   unlinked        → link the serial to this patient and import
 *   conflict        → the meter is Active on ANOTHER patient: ask since when
 *                     this patient has used it and re-assign (only readings
 *                     from that date on are filed; the other link is retired),
 *                     or mark it a shared household meter — with a reason,
 *                     logged. Nothing imports until the nurse answers.
 *
 * Props:
 *   patient     { uhid, name }
 *   onImported  (result) => void — after a successful import (refresh charts)
 *   compact     tighter layout for the modal
 */
const MeterDownload = ({ patient, onImported = () => {}, compact = false, variant = 'clinic' }) => {
  const [phase, setPhase] = useState('idle');   // idle | reading | conflict | importing | done | error
  const [progress, setProgress] = useState(null);
  const [read, setRead] = useState(null);       // readMeter() result
  const [pre, setPre] = useState(null);         // preflight result (conflict details)
  const [err, setErr] = useState(null);
  const [result, setResult] = useState(null);
  const [link, setLink] = useState(EMPTY_LINK);
  const [clockDone, setClockDone] = useState(false);

  const uhid = patient?.uhid;
  const supported = isWebBluetoothSupported();

  const reset = () => { setPhase('idle'); setProgress(null); setPre(null); setErr(null); setResult(null); setLink(EMPTY_LINK); setClockDone(false); setRead(null); };

  // ---- 3. Import — everything the meter returned, as read -----------------
  const patientName = patient?.name;
  const doImport = useCallback(async (r, linkPayload) => {
    setPhase('importing');
    try {
      const res = await glucoseService.importMeter(uhid, {
        device: r.device,
        readings: readingsPayload(r),
        hostTime: r.hostTime,
        meterTime: r.meterTime,
        link: linkPayload,
      });
      const data = res?.data || res;
      setResult(data); setPhase('done');
      toast.success(outcomeText(data, variant === 'patient' ? 'you' : (patientName || uhid), r).headline);
      onImported(data);
    } catch (e) {
      setErr(e?.message || 'Import failed.'); setPhase('error');
    }
  }, [uhid, patientName, onImported, variant]);

  // ---- 1 + 2. Connect, read, then straight into the import ---------------
  const connect = useCallback(async () => {
    if (!uhid) return;
    setErr(null); setResult(null); setPhase('reading'); setProgress({ phase: 'chooser', message: 'Choose the meter in the list — switch it on now.' });
    let preflight = null;
    const runPreflight = async (d) => {
      const p = await glucoseService.preflightMeter(uhid, { serial: d.serial, name: d.name, modelId: d.modelId, firmware: d.firmware });
      return p?.data || p;
    };
    try {
      const r = await readMeter({
        onProgress: setProgress,
        beforeFetch: async (device) => {
          preflight = await runPreflight(device);
          const last = preflight?.lastSequenceNumber;
          return { fromSequence: Number.isInteger(last) ? last + 1 : undefined };
        },
      });
      if (!preflight) preflight = await runPreflight(r.device);
      setRead(r); setPre(preflight);
      const state = preflight?.link || 'unlinked';
      // Nothing to file → no link question either; the API just records the sync.
      if (state === 'conflict' && r.readings.length) {
        if (variant === 'patient') {
          setErr('This meter is registered to another patient at the clinic. Please mention it at your next visit so we can sort it out — nothing was imported.');
          setPhase('error'); return;
        }
        setPhase('conflict'); return;
      }
      await doImport(r, state === 'unlinked' && r.readings.length ? { action: 'link' } : undefined);
    } catch (e) {
      if (e?.code === 'cancelled') { setPhase('idle'); setProgress(null); return; }
      setErr(e?.message || 'Could not read the meter.'); setPhase('error');
    }
  }, [uhid, doImport, variant]);

  const canResolve = !!link.reason.trim() && (link.action === 'share' || !!link.usedFromDate);
  const resolveConflict = () => {
    if (!canResolve || !read) return;
    doImport(read, { action: link.action, usedFromDate: link.action === 'reassign' ? link.usedFromDate : undefined, reason: link.reason.trim() });
  };

  const markClock = async () => {
    const meterId = result?.meter?.id || pre?.meter?.id;
    if (!meterId) return;
    try { await glucoseService.markClockCorrected(uhid, meterId); setClockDone(true); toast.success('Noted — applies to future downloads'); }
    catch (e) { toast.error(e?.message || 'Could not save'); }
  };

  // ---- render -------------------------------------------------------------
  if (!supported) {
    return (
      <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800 flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
<span>This browser cannot connect to a Bluetooth meter. {variant === 'patient' ? <>Open this page in <strong>Chrome</strong> on an Android phone, or on a computer with Bluetooth — it does not work on iPhone or Safari.</> : <>Open the HMS in <strong>Chrome or Edge</strong> on a PC with Bluetooth.</>}</span>
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
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200"><p className="font-semibold text-gray-800 mb-1">First time with this meter on this {variant === 'patient' ? 'device' : 'PC'}</p><p className="text-gray-600">{METER_SOP.firstTime}</p></div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200"><p className="font-semibold text-gray-800 mb-1">Already paired</p><p className="text-gray-600">{METER_SOP.later}</p><p className="text-xs text-gray-400 mt-1">{METER_SOP.chooserFirst}</p></div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={connect}><Bluetooth className="w-4 h-4" /> Connect and import</Button>
            <span className="text-xs text-gray-500">Read-only on the meter · nothing is deleted from it · every reading is filed{variant === 'patient' ? ' for your doctor to review' : ' for the doctor to review'}.</span>
          </div>
        </>
      )}

      {/* READING / IMPORTING */}
      {(phase === 'reading' || phase === 'importing') && (
        <>
          <Stepper step={phase === 'reading' ? 1 : 2} />
          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
            <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-gray-800">{phase === 'importing' ? 'Filing readings…' : progress?.message || 'Working…'}</p>
              {phase === 'reading' && progress?.phase === 'chooser' && <p className="text-gray-500 text-xs mt-0.5">{METER_SOP.chooserFirst}</p>}
              {phase === 'reading' && progress?.phase === 'pairing' && <p className="text-gray-500 text-xs mt-0.5">A first pairing takes about ten seconds.</p>}
            </div>
          </div>
        </>
      )}

      {/* CONFLICT — the one question the nurse is asked */}
      {phase === 'conflict' && pre && (
        <>
          <Stepper step={2} />
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-900 space-y-2">
            <p className="flex items-start gap-2"><XCircle className="w-5 h-5 flex-shrink-0" /><span><strong>This meter (<span className="font-mono">{read?.device?.serial}</span>) is linked to a different patient</strong> ({pre.others?.map((o) => o.patientMasked).join(', ')}). Nothing has been imported yet. Ask the patient <em>since when</em> they have used it — only readings from that date on will be filed under {patient?.name || 'this patient'}. If they have used it for more than about 3½ months, everything on the meter is theirs.</span></p>
            <label className="flex items-start gap-2"><input type="radio" name="mdl-conflict" className="mt-1" checked={link.action === 'reassign'} onChange={() => setLink({ ...link, action: 'reassign' })} /><span><strong>Re-assign the meter to this patient</strong> — the other patient&rsquo;s link is retired; their readings stay with them.</span></label>
            {link.action === 'reassign' && (
              <label className="block pl-6"><span className="text-gray-700">Patient has used this meter since</span> <input type="date" required className="ml-2 px-3 py-1.5 border-2 border-gray-300 rounded-lg" value={link.usedFromDate} onChange={(e) => setLink({ ...link, usedFromDate: e.target.value })} /></label>
            )}
            <label className="flex items-start gap-2"><input type="radio" name="mdl-conflict" className="mt-1" checked={link.action === 'share'} onChange={() => setLink({ ...link, action: 'share' })} /><span><strong>Shared household meter</strong> — both links stay active; this download is filed under this patient.</span></label>
            <label className="block"><span className="text-gray-700">Reason (required, logged with your name)</span>
              <input className="mt-1 w-full px-3 py-2 border-2 border-gray-300 rounded-lg" placeholder="e.g. Meter handed down from spouse on 1 Sep; confirmed with patient" value={link.reason} onChange={(e) => setLink({ ...link, reason: e.target.value })} /></label>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
            <Button onClick={resolveConflict} disabled={!canResolve}>{link.action === 'reassign' ? 'Re-assign meter and import' : 'Mark shared and import'}</Button>
            <Button variant="outline" onClick={reset}>Cancel</Button>
          </div>
        </>
      )}

      {/* DONE */}
      {phase === 'done' && result && (
        <>
          <Stepper step={3} />
          <div className="p-3 rounded-lg border border-green-200 bg-green-50 text-sm text-green-800 flex items-start gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            {(() => { const o = outcomeText(result, variant === 'patient' ? 'you' : (patient?.name || uhid), read); return <span><strong>{o.headline}.</strong> {o.detail}</span>; })()}
          </div>
          {result.clockDriftWarn && (
            <label className="flex items-start gap-2 text-sm text-amber-800 p-3 rounded-lg border border-amber-200 bg-amber-50">
              <input type="checkbox" className="mt-1" checked={clockDone} disabled={clockDone} onChange={markClock} />
              <span className="flex items-start gap-1.5"><Clock className="w-4 h-4 flex-shrink-0 mt-0.5" /><span><strong>The meter clock is {fmtDelta(result.clockDeltaSec)}.</strong> {METER_SOP.clock} Tick once you have set it on the meter.</span></span>
            </label>
          )}
          <div className="flex gap-3"><Button variant="outline" onClick={reset}>Download another meter</Button></div>
        </>
      )}
    </div>
  );
};

/** The same flow in a modal — for the doctor's Glucose card and the GMC. */
export const MeterDownloadModal = ({ isOpen, onClose, patient, onImported, variant = 'clinic' }) => (
  <Modal isOpen={isOpen} onClose={onClose} title={`${variant === 'patient' ? 'Sync my meter' : 'Download meter'} — ${patient?.name || patient?.uhid || ''}`} size="xl">
    <MeterDownload patient={patient} compact variant={variant} onImported={(r) => { onImported?.(r); }} />
  </Modal>
);

export default MeterDownload;
