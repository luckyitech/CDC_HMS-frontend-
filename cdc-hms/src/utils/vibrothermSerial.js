// Neuropathy Studio — active driver for the Vibrotherm Dx probe over the
// browser's Web Serial API (Chrome / Edge). No bridge software to install: the
// portal opens the device's USB virtual COM port itself, with the user's
// explicit permission.
//
// PROTOCOL (validated live against the real probe, 1 & 3 Sep 2026 — see
// claude/VIBROTHERM-mode-switching-SOLVED.md, which supersedes the older
// serial-protocol / command-reference notes on how the probe is switched):
//   • 19200 8N1, no flow control. FTDI FT232 (VID 0x0403 / PID 0x6001).
//   • The probe is REQUEST-DRIVEN: a passive listener gets zero bytes. HMS must
//     open a writer and drive it with the SAME bytes the vendor app sends. This
//     is exactly as safe as running the vendor app — protocol bytes only, no
//     firmware/config writes; the >49 °C thermal cut-off stays firmware-side.
//   • Binary, bracket-framed, value = min(50, int + dec/10). Value bytes are
//     always ≤50 (0x32), so they never collide with the control codes (≥0x3C).
//     TWO frame kinds, and the bracket tells you WHICH KIND, not which probe:
//        '<'(0x3C) int dec '>'(0x3E)  → 'stream'   — the live reading of whatever
//                                       probe is armed (volts on VPT, °C on
//                                       hot/cold). Acked B (mid) / C (continue).
//        '['(0x5B) int dec ']'(0x5D)  → 'recorded' — sent ONCE when the operator
//                                       presses the machine's physical REC
//                                       button: the reading at that instant
//                                       (proven 3 Sep 2026: 15.4 °C, 12.2 °C,
//                                       matching the LCD). Acked A / Z.
//     During a thermal ramp the device stops streaming and emits a static status
//     ('NN' 0x3E, e.g. 03/04/05) — no live °C exists on the wire then; the
//     perception temperature arrives only as a 'recorded' frame on REC.
//     The exam DRIVES the probe from the selected tab (gotoScreen); hot vs cold
//     is flow state.
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
const B_HEARTBEAT = 0x53;   // 'S'
const B_OPEN_STREAM = 0x3c; // '<'  live stream frame
const B_CLOSE_STREAM = 0x3e;// '>'
const B_OPEN_REC = 0x5b;    // '['  recorded (REC button) frame
const B_CLOSE_REC = 0x5d;   // ']'

// Mode-select sequences — PROVEN LIVE against the machine, 3 Sep 2026 (see
// claude/VIBROTHERM-mode-switching-SOLVED.md). Two facts overturn the earlier
// notes:
//   1. VPT is NOT reached by the vendor's btnNEXTvpt navigation (IIII·T·2s·R×7
//      walks AWAY from vibration into thermal). The vibration probe is ARMED by
//      the vendor's VPT-select/record choreography (V · r×4). IIII-prefixed
//      (= vendor btnBACKcold) it works from ANY state, and streams live volts
//      that track the amplitude knob. The stream idles after a while — re-arm
//      by calling it again (the exam does this per site).
//   2. Thermal is entered via the vendor's btnNEXThot/cold nav, but only from
//      the base screen: sent from INSIDE a live VPT stream it parks on an idle
//      "09" screen. So exit VPT (D) and park on base (R) first. Hot/cold differ
//      only in the vendor's I-count and post-T wait; the wire frame is °C
//      either way and the exam labels it from the active tab.
// The device does NOT tag the probe in the frame — the PC drives it here.
// All of this was proven with the heartbeat and frame acks LEFT RUNNING during
// the sequences, so gotoScreen deliberately pauses nothing.
const SCREENS = {
  vpt:  { kind: 'vpt' },                                       // IIII·900·V·450·r×4
  hot:  { kind: 'thermal', inits: 4, postT: 2000, rcount: 3 },  // D·R · IIII·T·2s·R×3
  cold: { kind: 'thermal', inits: 3, postT: 1000, rcount: 3 },  // D·R · III·T·1s·R×3
};

/**
 * Connect to the probe and stream parsed readings by actively driving it.
 *
 * @param {Object}   opts
 * @param {Function} opts.onReading  ({ value:number, channel:'stream'|'recorded' }) per frame —
 *                                   'stream' = live reading, 'recorded' = the machine's REC button
 * @param {Function} opts.onStatus   ('connecting'|'connected'|'disconnected'|'error', detail?)
 * @param {boolean}  opts.silent     reuse a previously-granted port without prompting
 * @param {'vpt'|'hot'|'cold'|'none'} opts.startScreen  which screen to open on (default 'vpt'; 'none' = read only)
 * @param {Function} [opts.onRaw]   optional raw inbound byte observer (Uint8Array) for protocol work
 * @returns {Promise<{ disconnect:()=>Promise<void>, switchScreen:(c)=>Promise<void>, port:SerialPort }>}
 */
export const connectVibrotherm = async ({
  onReading = () => {},
  onStatus = () => {},
  silent = false,
  startScreen = 'vpt',
  onRaw = null,      // optional: (Uint8Array chunk) => void — raw inbound bytes, for protocol work
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
  await port.open(SERIAL_SETTINGS);   // default DTR/RTS asserted — holding them low mutes the device

  let running = true;
  let heartbeat = null;
  let activeReader = null;
  // Liveness watchdog state. The VPT stream idles after ~20-30 s and only a full
  // re-arm restarts it (a bare 'V'/'rrrr' does nothing). So we track the active
  // screen and the last value frame, and silently re-arm VPT when it goes quiet
  // — that keeps the readout matching the LCD without a per-site command.
  let currentScreen = 'idle';   // 'vpt' | 'thermal' | 'idle'
  let lastFrameAt = Date.now();
  let arming = false;
  let watchdog = null;
  const REARM_IDLE_MS = 1500;   // re-arm VPT after this long with no value frame

  // --- serialized writer: one write at a time, in order ---
  const writer = port.writable.getWriter();
  const enc = new TextEncoder();
  let txChain = Promise.resolve();
  const tx = (str) => {
    if (!running) return txChain;
    txChain = txChain.then(() => writer.write(enc.encode(str))).catch(() => {});
    return txChain;
  };

  // Drive the machine onto a modality screen (sequences above). Deliberately
  // leaves the heartbeat and frame acks running — that is the condition under
  // which every switch was proven live; pausing them was NOT part of the recipe.
  const gotoScreen = async (screen) => {
    const cfg = SCREENS[screen] || SCREENS.vpt;
    arming = true;
    currentScreen = cfg.kind === 'vpt' ? 'vpt' : 'thermal';
    try {
    if (cfg.kind === 'vpt') {
      // Arm the live VPT stream (vendor btnBACKcold): works from any state.
      await sleep(500);
      await tx('IIII');                  // reset step (device beeps ×3)
      await sleep(900);
      await tx('V');                     // VPT-select
      await sleep(450);
      await tx('rrrr');                  // record-step ×4 → live volts, tracks the knob
      await sleep(300);
      return;
    }
    // Thermal: leave a live VPT stream and park on the base screen first, then
    // the vendor's btnNEXThot / btnNEXTcold navigation.
    await tx('D');                       // exit the VPT screen
    await sleep(600);
    await tx('R');                       // park on base
    await sleep(600);
    await sleep(500);
    await tx('I'.repeat(cfg.inits));     // init / reset
    await sleep(500);
    await tx('T');                       // start transmit
    await sleep(cfg.postT);              // CRITICAL: let the mode actually change
    await tx('R'.repeat(cfg.rcount));    // navigate to the thermal read position
    await sleep(300);
    } finally {
      lastFrameAt = Date.now();          // grace period before the watchdog judges idle
      arming = false;
    }
  };

  // --- byte state machine ---
  let channel = null;   // 'stream' | 'recorded' while inside a frame
  let intByte = null;
  let decByte = null;
  const resetFrame = () => { channel = null; intByte = null; decByte = null; };

  const handleByte = (b) => {
    if (b === B_HEARTBEAT) return;                 // 'S' anywhere — ignore
    if (b === B_OPEN_STREAM) { channel = 'stream'; intByte = null; decByte = null; return; }
    if (b === B_OPEN_REC)    { channel = 'recorded'; intByte = null; decByte = null; return; }
    if (b === B_CLOSE_STREAM || b === B_CLOSE_REC) {
      if (channel && intByte !== null) {
        const value = Math.min(50, intByte + (decByte ?? 0) / 10);
        if (channel === 'stream') lastFrameAt = Date.now();   // only the live stream feeds the watchdog
        onReading({ value, channel });
      }
      // ALWAYS ack a close bracket, even with no frame head in hand. The device
      // is request-driven and re-sends the frame TAIL ('dec >') until it gets
      // the continue-ack; when a state change (e.g. starting a thermal ramp)
      // drops the head, a head-gated ack deadlocks it — which showed up as the
      // "static 03 3e" ramp and the "VPT idles" symptoms (3 Sep 2026). The
      // vendor's handler acks per byte, statelessly; so do we.
      tx(b === B_CLOSE_STREAM ? 'C' : 'Z');
      resetFrame();                                 // drop doubled/garbage closes
      return;
    }
    // value byte inside a frame (always ≤50, so never a control byte)
    if (channel) {
      if (intByte === null) {
        intByte = b;
        tx(channel === 'stream' ? 'B' : 'A');       // mid-frame ack
      } else {
        decByte = b;                                // keep latest before close
      }
    }
    // stray byte outside a frame → ignore
  };

  // --- init handshake, heartbeat, then the overrun-recovering read loop ---
  onStatus('connected', { info: port.getInfo?.() });

  (async () => {
    // Heartbeat runs from connect for the life of the link (the device answers
    // each 'H' with 'S'). 'none' = connect + read only, no navigation.
    if (running) heartbeat = setInterval(() => { tx('H'); }, 1000);
    // Watchdog: re-arm VPT if its live stream has gone quiet. Only acts on the
    // VPT screen (thermal streams continuously); never overlaps an in-flight arm.
    if (running) watchdog = setInterval(() => {
      if (!running || arming || currentScreen !== 'vpt') return;
      if (Date.now() - lastFrameAt > REARM_IDLE_MS) { gotoScreen('vpt').catch(() => {}); }
    }, 500);
    try {
      if (startScreen !== 'none') await gotoScreen(startScreen);
    } catch { /* init best-effort */ }

    // Re-acquire the reader after a BufferOverrunError while the port is open.
    while (running && port.readable) {
      const reader = port.readable.getReader();
      activeReader = reader;
      try {
        while (running) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value && value.length) {
            if (onRaw) { try { onRaw(value); } catch { /* observer errors never break the link */ } }
            for (let i = 0; i < value.length; i += 1) handleByte(value[i]);
          }
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
    if (watchdog) { clearInterval(watchdog); watchdog = null; }
    try { await tx('D'); } catch { /* ignore */ }          // vendor's "done"
    try { await activeReader?.cancel(); } catch { /* ignore */ }
    try { writer.releaseLock(); } catch { /* ignore */ }
    try { await port.close(); } catch { /* ignore */ }
    onStatus('disconnected');
  };

  // Called by the exam on a modality change. 'vpt' | 'hot' | 'cold' arms/navigates
  // that screen; a falsy screen (MONO uses no probe) just parks the watchdog so
  // it stops re-arming VPT in the background.
  const switchScreen = async (screen) => {
    if (!screen) { currentScreen = 'idle'; return; }
    await gotoScreen(screen);
  };

  // Physical unplug surfaces here.
  port.addEventListener?.('disconnect', () => {
    if (running) { running = false; onStatus('disconnected'); }
  });

  // `send` writes raw command bytes — kept for protocol work from the console
  // (connect with silent:true + startScreen:'none', then link.send('…')).
  return { disconnect, switchScreen, port, send: tx };
};
