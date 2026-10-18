import { useState, useEffect } from 'react';
import hrService from '../../services/hrService';
import { Pill, agoLabel } from './hrFormat';

/**
 * "Scanner online · 40 s ago" / "Scanner offline · last seen 09:12" — the
 * fingerprint scanner's relay reports in every minute (17 Oct 2026, Emu: a
 * status, never an alert). Always shown: before a scanner is registered, or
 * before its relay has ever connected, it reads offline too (Emu, 18 Oct
 * 2026). Refreshes every minute while the page is open.
 */
const REFRESH_MS = 60 * 1000;

const ScannerStatusPill = () => {
  const [scanners, setScanners] = useState(null);   // null until the first answer
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    const load = () => hrService.scannerStatus()
      .then((res) => { if (alive) { setScanners(res?.data || []); setNow(Date.now()); } })
      .catch(() => {});
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (scanners === null) return null;
  if (!scanners.length) {
    return <Pill tone="bad" className="!text-xs"><span className="inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />Scanner offline · not set up yet</Pill>;
  }
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {scanners.map((s) => (
        <Pill key={s.id} tone={s.online ? 'ok' : 'bad'} className="!text-xs">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
          {scanners.length > 1 ? s.label : 'Scanner'} {s.online ? `online · ${agoLabel(s.lastSeenAt, now)}` : `offline · ${s.lastSeenAt ? `last seen ${agoLabel(s.lastSeenAt, now)}` : 'never connected'}`}
        </Pill>
      ))}
    </span>
  );
};

export default ScannerStatusPill;
