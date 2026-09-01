// Neuropathy Studio — READ-ONLY link to the Vibrotherm Dx probe over the
// browser's Web Serial API (Chrome / Edge). No bridge software to install: the
// portal opens the device's USB virtual COM port itself, with the user's
// explicit permission, and only ever READS from it.
//
// SAFETY: this module never opens a writer and never sends a byte. The operator
// drives voltage/temperature on the physical device exactly as before, and the
// ≥49 °C thermal cut-off + alarm live in the device firmware. We only listen.
//
// PROTOCOL: the exact baud/framing and how a line becomes a reading are set in
// SERIAL_SETTINGS / parseVibrothermLine below. They are PROVISIONAL until the
// live capture on the clinic Windows PC confirms them — the vendor app is a
// .NET SerialPort reader (DataReceived / ReadByte), so the stream is expected
// to be simple text or fixed-width bytes. Adjust ONLY here.

export const SERIAL_SETTINGS = {
  baudRate: 9600,      // PROVISIONAL — confirm from the Windows capture / decompile
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  flowControl: 'none',
};

// Optional USB vendor/product filters so the chooser only lists the probe.
// Left empty (all ports shown) until the capture tells us the chip (FTDI /
// CP210x / Prolific). e.g. [{ usbVendorId: 0x0403 }] for FTDI.
export const SERIAL_FILTERS = [];

export const isWebSerialSupported = () =>
  typeof navigator !== 'undefined' && 'serial' in navigator;

/**
 * Turn one line from the device into a reading, or null if it isn't one.
 * PROVISIONAL parser: takes the last numeric token on the line. When the real
 * framing is known (e.g. "V:18" / "T:42.3" / raw bytes), replace this body —
 * nothing else in the app needs to change.
 *
 * Returns { value:number, modality:'VPT'|'HOT'|'COLD'|null, raw:string } | null
 */
export const parseVibrothermLine = (line) => {
  const raw = String(line).trim();
  if (!raw) return null;
  const m = raw.match(/-?\d+(?:\.\d+)?/g);
  if (!m) return null;
  const value = Number(m[m.length - 1]);
  if (Number.isNaN(value)) return null;
  // If the device tags the channel, honour it; otherwise the UI's current
  // modality decides what the number means.
  const up = raw.toUpperCase();
  const modality = /VIB|VPT|VOLT|\bV\b/.test(up) ? 'VPT'
    : /HOT|WARM/.test(up) ? 'HOT'
    : /COLD|COOL/.test(up) ? 'COLD'
    : null;
  return { value, modality, raw };
};

/**
 * Connect to the probe (read-only) and stream parsed readings.
 *
 * @param {Object}   opts
 * @param {Function} opts.onReading  ({ value, modality, raw }) — every parsed line
 * @param {Function} opts.onStatus   ('connecting'|'connected'|'disconnected'|'error', detail?)
 * @param {boolean}  opts.silent     reuse a previously-granted port without prompting
 * @returns {Promise<{ disconnect: () => Promise<void>, port: SerialPort }>}
 */
export const connectVibrotherm = async ({ onReading, onStatus = () => {}, silent = false } = {}) => {
  if (!isWebSerialSupported()) {
    throw new Error('Web Serial is not available in this browser. Use Chrome or Edge on the exam PC.');
  }

  let port = null;
  if (silent) {
    const granted = await navigator.serial.getPorts();
    port = granted[0] || null;
    if (!port) throw new Error('No previously-authorised probe port.');
  } else {
    // Must be called from a user gesture (button click) — the browser shows its port chooser.
    port = await navigator.serial.requestPort({ filters: SERIAL_FILTERS });
  }

  onStatus('connecting');
  await port.open(SERIAL_SETTINGS);

  let closed = false;
  const decoder = new TextDecoderStream();
  const readableClosed = port.readable.pipeTo(decoder.writable).catch(() => {});
  const reader = decoder.readable.getReader();

  onStatus('connected', { info: port.getInfo?.() });

  // Read loop — split on CR/LF, parse each complete line, hand it up.
  (async () => {
    let buffer = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const parts = buffer.split(/\r\n|\r|\n/);
        buffer = parts.pop() ?? '';
        for (const line of parts) {
          const reading = parseVibrothermLine(line);
          if (reading) onReading(reading);
        }
      }
    } catch (err) {
      if (!closed) onStatus('error', err);
    } finally {
      if (!closed) onStatus('disconnected');
    }
  })();

  const disconnect = async () => {
    closed = true;
    try { await reader.cancel(); } catch { /* already closed */ }
    try { await readableClosed; } catch { /* ignore */ }
    try { await port.close(); } catch { /* ignore */ }
    onStatus('disconnected');
  };

  // The device being unplugged surfaces here.
  port.addEventListener?.('disconnect', () => { if (!closed) { closed = true; onStatus('disconnected'); } });

  return { disconnect, port };
};
