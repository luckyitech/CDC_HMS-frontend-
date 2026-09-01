// Neuropathy Studio — active driver for the Vibrotherm Dx probe over the
// browser's Web Serial API (Chrome / Edge). No bridge software to install: the
// portal opens the device's USB virtual COM port itself, with the user's
// explicit permission.
//
// PROTOCOL (solved & validated live against the real probe, 1 Sep 2026 — see
// VIBROTHERM-serial-protocol.md):
//   • 19200 8N1, no flow control. FTDI FT232 (VID 0x0403 / PID 0x6001).
//   • The probe is REQUEST-DRIVEN: a passive listener gets zero bytes. HMS must
//     open a writer and drive it with the SAME bytes the vendor app sends. This
//     is exactly as safe as running the vendor app — protocol bytes only, no
//     firmware/config writes; the >49 °C thermal cut-off stays firmware-side.
//   • Binary, bracket-framed:
//        '<'(0x3C) int dec '>'(0x3E)  → vibration (VPT), volts
//        '['(0x5B) int dec ']'(0x5D)  → thermal (hot/cold), °C
//     value = min(50, int + dec/10). Value bytes are always ≤50 (0x32), so they
//     never collide with the bracket/heartbeat codes (all ≥0x3C). Hot vs cold is
//     NOT in the frame — the exam UI derives it from flow state.
//   • 'S'(0x53) is a heartbeat ack and may appear anywhere, even mid-frame —
//     ignore it without disturbing frame state. Drop malformed/garbage frames.
//
// Command vocabulary (decompiled): H=heartbeat, I=init, T=start transmit,
// R=advance/position, B/A=mid-frame ack (vpt/thermal), C/Z=continue ack
// (vpt/thermal), V=VPT-select, D=done, r=record.
//
// No new npm dependencies. This is the ONLY file that knows the wire protocol.

export const SERIAL_SETTINGS = {
  baudRate: 19200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  flowControl: 'none',
};

// So Chrome's chooser only offers the probe (FTDI FT232 virtual COM port).
export const SERIAL_FILTERS = [{ usbVendorId: 0x0403, usbProductId: 0x6001 }];

export const isWebSerialSupported = () =>
  typeof navigator !== 'undefined' && 'serial' in navigator;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Frame bytes.
const B_HEARTBEAT = 0x53; // 'S'
const B_OPEN_VPT = 0x3c;  // '<'
const B_CLOSE_VPT = 0x3e; // '>'
const B_OPEN_TH = 0x5b;   // '['
const B_CLOSE_TH = 0x5d;  // ']'

// R-counts that land the machine on each screen (from the decompile / live run).
const RCOUNT = { vpt: 7, thermal: 3 };

/**
 * Connect to the probe and stream parsed readings by actively driving it.
 *
 * @param {Object}   opts
 * @param {Function} opts.onReading  ({ value:number, channel:'vpt'|'thermal' }) per frame
 * @param {Function} opts.onStatus   ('connecting'|'connected'|'disconnected'|'error', detail?)
 * @param {boolean}  opts.silent     reuse a previously-granted port without prompting
 * @param {'vpt'|'thermal'} opts.startScreen  which screen to open on (default 'vpt')
 * @returns {Promise<{ disconnect:()=>Promise<void>, switchScreen:(c)=>Promise<void>, port:SerialPort }>}
 */
export const connectVibrotherm = async ({
  onReading = () => {},
  onStatus = () => {},
  silent = false,
  startScreen = 'vpt',
} = {}) => {
  if (!isWebSerialSupported()) {
    throw new Error('Web Serial is not available in this browser. Use Chrome or Edge on the exam PC.');
  }

  let port = null;
  if (silent) {
    const granted = await navigator.serial.getPorts();
    port = granted[0] || null;
    if (!port) throw new Error('No previously-authorised probe port.');
  } else {
    // Must be called from a user gesture (button click) — browser shows the chooser.
    port = await navigator.serial.requestPort({ filters: SERIAL_FILTERS });
  }

  onStatus('connecting');
  await port.open(SERIAL_SETTINGS);

  let running = true;
  let heartbeat = null;
  let activeReader = null;

  // --- serialized writer: one write at a time, in order ---
  const writer = port.writable.getWriter();
  const enc = new TextEncoder();
  let txChain = Promise.resolve();
  const tx = (str) => {
    if (!running) return txChain;
    txChain = txChain.then(() => writer.write(enc.encode(str))).catch(() => {});
    return txChain;
  };

  // Drive the machine onto a screen: init + start + advance N positions.
  const gotoScreen = async (channel) => {
    await tx('IIII');
    await sleep(180);
    await tx('T');
    await sleep(180);
    await tx('R'.repeat(RCOUNT[channel] ?? RCOUNT.vpt));
    await sleep(180);
  };

  // --- byte state machine ---
  let channel = null;   // 'vpt' | 'thermal' while inside a frame
  let intByte = null;
  let decByte = null;
  const resetFrame = () => { channel = null; intByte = null; decByte = null; };

  const handleByte = (b) => {
    if (b === B_HEARTBEAT) return;                 // 'S' anywhere — ignore
    if (b === B_OPEN_VPT) { channel = 'vpt'; intByte = null; decByte = null; return; }
    if (b === B_OPEN_TH)  { channel = 'thermal'; intByte = null; decByte = null; return; }
    if (b === B_CLOSE_VPT || b === B_CLOSE_TH) {
      if (channel && intByte !== null) {
        const value = Math.min(50, intByte + (decByte ?? 0) / 10);
        onReading({ value, channel });
        tx(channel === 'vpt' ? 'C' : 'Z');          // continue ack
      }
      resetFrame();                                 // drop doubled/garbage closes
      return;
    }
    // value byte inside a frame (always ≤50, so never a control byte)
    if (channel) {
      if (intByte === null) {
        intByte = b;
        tx(channel === 'vpt' ? 'B' : 'A');          // mid-frame ack
      } else {
        decByte = b;                                // keep latest before close
      }
    }
    // stray byte outside a frame → ignore
  };

  // --- init handshake, heartbeat, then the overrun-recovering read loop ---
  onStatus('connected', { info: port.getInfo?.() });

  (async () => {
    try {
      await tx('H');
      await sleep(180);
      await gotoScreen(startScreen);
    } catch { /* init best-effort */ }

    heartbeat = setInterval(() => { tx('H'); }, 1000);

    // Re-acquire the reader after a BufferOverrunError while the port is open.
    while (running && port.readable) {
      const reader = port.readable.getReader();
      activeReader = reader;
      try {
        while (running) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) for (let i = 0; i < value.length; i += 1) handleByte(value[i]);
        }
      } catch (err) {
        if (!running) break;
        // BufferOverrunError (and friends) — recover by re-acquiring below.
        onStatus('error', err);
        resetFrame();
      } finally {
        try { reader.releaseLock(); } catch { /* already released */ }
        activeReader = null;
      }
      if (running) await sleep(60);
    }
  })();

  const disconnect = async () => {
    running = false;
    if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }
    try { await tx('D'); } catch { /* ignore */ }          // vendor's "done"
    try { await activeReader?.cancel(); } catch { /* ignore */ }
    try { writer.releaseLock(); } catch { /* ignore */ }
    try { await port.close(); } catch { /* ignore */ }
    onStatus('disconnected');
  };

  // Optional: if the live test shows the machine does NOT auto-follow the
  // operator from vibration → thermal, wire this to the exam's modality switch.
  // Unused by default — the assumed design is that the device follows itself.
  const switchScreen = async (chan) => { await gotoScreen(chan); };

  // Physical unplug surfaces here.
  port.addEventListener?.('disconnect', () => {
    if (running) { running = false; onStatus('disconnected'); }
  });

  return { disconnect, switchScreen, port };
};
