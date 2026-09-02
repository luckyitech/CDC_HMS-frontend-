import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Wifi, WifiOff, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import bridgeService from '../../services/bridgeService';

// Live status of the DICOM bridge (the clinic Mac that receives HS70A images)
// plus a manual "Restart listener" button. Rendered only in the Radiology Suite.
// The bridge heartbeats the backend every ~30s; we poll status every 20s.

const POLL_MS = 20000;

const fmtAgo = (s) => {
  if (s == null) return '—';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const fmtDur = (s) => {
  if (s == null) return '';
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
};

const TONE = {
  green: { dot: 'bg-emerald-500', ring: 'ring-emerald-400', pill: 'bg-emerald-100 text-emerald-800', text: 'text-emerald-700' },
  amber: { dot: 'bg-amber-500',   ring: 'ring-amber-400',   pill: 'bg-amber-100 text-amber-800',     text: 'text-amber-700' },
  red:   { dot: 'bg-red-500',     ring: 'ring-red-400',     pill: 'bg-red-100 text-red-800',         text: 'text-red-700' },
  slate: { dot: 'bg-slate-400',   ring: 'ring-slate-300',   pill: 'bg-slate-100 text-slate-700',     text: 'text-slate-600' },
};

const BridgeStatusBar = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState(false);
  const timer = useRef(null);
  const timeouts = useRef([]);

  const load = useCallback(async () => {
    try {
      const { data } = await bridgeService.getStatus();
      setStatus(data?.data ?? null);
    } catch {
      setStatus({ error: true });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    timer.current = setInterval(load, POLL_MS);
    const pending = timeouts.current;
    return () => {
      clearInterval(timer.current);
      pending.forEach(clearTimeout);
    };
  }, [load]);

  const onRestart = async () => {
    setRestarting(true);
    try {
      await bridgeService.requestRestart();
      toast.success('Restart requested — the bridge reconnects within ~30s.');
      timeouts.current.push(setTimeout(load, 3000));
      timeouts.current.push(setTimeout(load, 12000));
      timeouts.current.push(setTimeout(() => { setRestarting(false); load(); }, 35000));
    } catch {
      toast.error('Could not request a restart.');
      setRestarting(false);
    }
  };

  // ---- derive display state ----
  let tone = 'slate';
  let Icon = Wifi;
  let label = 'Checking bridge…';
  let meta = null;
  let pulse = false;

  if (loading && !status) {
    tone = 'slate'; Icon = Loader2; label = 'Checking bridge…';
  } else if (!status || status.error) {
    tone = 'slate'; Icon = AlertTriangle; label = 'Bridge status unavailable';
  } else if (!status.configured) {
    tone = 'slate'; Icon = AlertTriangle; label = 'Waiting for the bridge to check in';
    meta = 'No heartbeat yet from the bridge Mac.';
  } else if (status.online && status.listenerOk !== false) {
    tone = 'green'; Icon = Wifi; pulse = true; label = 'DICOM bridge online';
    meta = `Last image ${fmtAgo(status.secondsSinceImage)} · Queue ${status.queueDepth ?? 0}`
      + (status.aeTitle ? ` · ${status.aeTitle}${status.localIp ? ` · ${status.localIp}` : ''}` : '');
  } else if (status.online) {
    tone = 'amber'; Icon = RefreshCw; pulse = true; label = 'Listener reconnecting';
    meta = 'The bridge is up but its DICOM listener failed a self-check — rebinding automatically.';
  } else {
    tone = 'red'; Icon = WifiOff; label = 'DICOM bridge offline';
    meta = `No contact for ${fmtDur(status.secondsSinceHeartbeat)} · the bridge Mac may be off, asleep, or off-network.`;
  }

  const t = TONE[tone];
  const btnLabel = restarting ? 'Requesting…' : (status?.restartPending ? 'Restarting…' : 'Restart listener');
  const btnBusy = restarting || status?.restartPending;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        {pulse && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${t.dot}`} />}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${t.dot}`} />
      </span>

      <Icon size={16} className={`${t.text} ${btnBusy ? 'animate-spin' : ''}`} />
      <span className={`font-semibold ${t.text}`}>{label}</span>

      {status?.configured && status?.restartPending && (
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TONE.amber.pill}`}>Restart requested</span>
      )}
      {status?.restartRequestedBy && status?.restartPending && (
        <span className="text-xs text-slate-400">by {status.restartRequestedBy}</span>
      )}

      {meta && <span className="text-sm text-slate-500">{meta}</span>}

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          title="Refresh status"
        >
          <RefreshCw size={14} />
        </button>
        <button
          type="button"
          onClick={onRestart}
          disabled={btnBusy}
          className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition
            ${btnBusy
              ? 'cursor-default border-teal-200 bg-teal-50 text-teal-600'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
        >
          {btnBusy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {btnLabel}
        </button>
      </div>
    </div>
  );
};

export default BridgeStatusBar;
