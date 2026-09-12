// Glucose Management Centre — driver for home glucose meters over the
// browser's Web Bluetooth API (Chrome / Edge; not Safari, not iOS). Nothing to
// install: the portal connects to the meter itself, with the user's explicit
// permission, exactly as utils/vibrothermSerial.js does for the probe.
//
// PROTOCOL: the standard Bluetooth SIG Glucose Profile / Glucose Service
// (0x1808), which the Accu-Chek Instant implements (verified live against a
// real meter on 12 Sep 2026 — claude/accu-chek-instant-ble-findings.md). Not
// reverse-engineering: the meter is read through its certified
// interoperability profile, and this driver is READ-ONLY on it — the Record
// Access Control Point (0x2A52) is only ever asked to report records, never
// to delete (op 0x02).
//
// What the 12 Sep run established, and what shapes this file:
//   • Identity: the meter advertises as `meter+<serial>`; the DIS serial
//     characteristic (0x2A25) is blocklisted by Web Bluetooth, so the serial is
//     parsed from the name. Model (0x2A24 = "973") and firmware (0x2A26) read.
//   • Chars on the Instant: 0x2A08 Date Time · 0x2A18 Measurement ·
//     0x2A51 Feature · 0x2A52 RACP. NO 0x2A34 Context — no meal tags, ever.
//     No Current Time service, no Battery service.
//   • Units: flags bit2 = 0 → kg/L; the SFLOAT mantissa is an exact integer
//     mg/dL. The mol/L branch is kept for other meters.
//   • The meter CLOSES the link 60 s after the last exchange, so a session is
//     ONE SHOT: connect → identity → clock → count → fetch → disconnect.
//   • Stock Chrome has no getDevices(), so the chooser appears every time.
//     Open it FIRST, then switch the meter on: it advertises only briefly.
//   • Pairing: meter off → hold ▼ until the Bluetooth symbol shows; the 6-digit
//     PIN is on the back label, asked once by the OS, never on reconnection.
//
// TIME: every timestamp this driver returns is the METER's wall clock as a
// naive 'YYYY-MM-DD HH:mm:ss' string. Nothing here converts or corrects it —
// the backend stores it verbatim and records the drift beside it.
//
// No new npm dependencies. This is the ONLY file that knows the GATT layout.

export const GLUCOSE_SERVICE = 0x1808;
export const DEVICE_INFO_SERVICE = 0x180a;

const CHAR = {
  DATE_TIME: 0x2a08,
  MEASUREMENT: 0x2a18,
  CONTEXT: 0x2a34,
  FEATURE: 0x2a51,
  RACP: 0x2a52,
  MANUFACTURER: 0x2a29,
  MODEL: 0x2a24,
  FIRMWARE: 0x2a26,
};

// RACP op codes / operators (only the read-only subset is ever written).
const RACP = {
  REPORT_RECORDS: 0x01,
  ABORT: 0x03,
  REPORT_COUNT: 0x04,
  RESP_COUNT: 0x05,
  RESP_CODE: 0x06,
  OP_ALL: 0x01,
  OP_GTE: 0x03,
  FILTER_SEQ: 0x01,
  RESULT_SUCCESS: 0x01,
};

const RACP_RESULT_TEXT = {
  1: 'success', 2: 'op code not supported', 3: 'invalid operator', 4: 'operator not supported',
  5: 'invalid operand', 6: 'no records found', 7: 'abort unsuccessful', 8: 'procedure not completed', 9: 'operand not supported',
};

// SIG sample types / locations, for display.
export const SAMPLE_TYPES = {
  1: 'capillary whole blood', 2: 'capillary plasma', 3: 'venous whole blood', 4: 'venous plasma',
  5: 'arterial whole blood', 6: 'arterial plasma', 7: 'undetermined whole blood', 8: 'undetermined plasma',
  9: 'interstitial fluid', 10: 'control solution',
};
export const SAMPLE_TYPE_CONTROL_SOLUTION = 10;

export const isWebBluetoothSupported = () =>
  typeof navigator !== 'undefined' && !!navigator.bluetooth;

export const serialFromName = (name) => {
  const m = /^meter\+(\d+)$/i.exec(String(name || '').trim());
  return m ? m[1] : null;
};

const pad = (n) => String(n).padStart(2, '0');
const hex = (dv) => Array.from(new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength)).map((b) => b.toString(16).padStart(2, '0')).join(' ');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// IEEE-11073 16-bit SFLOAT: 12-bit two's-complement mantissa × 10^(4-bit
// two's-complement exponent). Reserved values → null.
export const sfloat = (u16) => {
  if (u16 === 0x07ff || u16 === 0x0800 || u16 === 0x07fe || u16 === 0x0802 || u16 === 0x0801) return null;
  let mant = u16 & 0x0fff;
  let exp = u16 >> 12;
  if (mant >= 0x0800) mant -= 0x1000;
  if (exp >= 0x0008) exp -= 0x0010;
  return mant * 10 ** exp;
};

// 7-byte SIG date-time → 'YYYY-MM-DD HH:mm:ss' (naive).
const readDateTime = (dv, o) => {
  const y = dv.getUint16(o, true);
  if (!y) return null;
  return `${y}-${pad(dv.getUint8(o + 2))}-${pad(dv.getUint8(o + 3))} ${pad(dv.getUint8(o + 4))}:${pad(dv.getUint8(o + 5))}:${pad(dv.getUint8(o + 6))}`;
};

// Add whole minutes to a naive 'YYYY-MM-DD HH:mm:ss' without a timezone.
const addMinutesNaive = (s, minutes) => {
  if (!s || !minutes) return s;
  const [d, t] = s.split(' ');
  const [y, mo, da] = d.split('-').map(Number);
  const [h, mi, se] = t.split(':').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, da, h, mi, se) + minutes * 60000);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())} ${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}:${pad(dt.getUTCSeconds())}`;
};

// The importing PC's own clock, in the same naive shape — for the drift
// calculation server-side (host − meter).
export const hostTimeNaive = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

// 0x2A18 Glucose Measurement → the row shape the import endpoint takes.
export const decodeMeasurement = (dv) => {
  const flags = dv.getUint8(0);
  const sequenceNumber = dv.getUint16(1, true);
  const baseTime = readDateTime(dv, 3);
  let o = 10;
  let timeOffsetMin = null;
  if (flags & 0x01) { timeOffsetMin = dv.getInt16(o, true); o += 2; }
  let glucoseMgdl = null, unitsReported = 'kg/L', sampleType = null, sampleLocation = null, rawValue = null;
  if (flags & 0x02) {
    rawValue = sfloat(dv.getUint16(o, true));
    const tl = dv.getUint8(o + 2);
    sampleType = tl & 0x0f;
    sampleLocation = tl >> 4;
    o += 3;
    if (flags & 0x04) {
      // mol/L → mmol/L → mg/dL
      unitsReported = 'mol/L';
      glucoseMgdl = rawValue === null ? null : Math.round(rawValue * 1000 * 18.0182 * 10) / 10;
    } else {
      // kg/L × 100 000 = mg/dL (integer on the Instant)
      glucoseMgdl = rawValue === null ? null : Math.round(rawValue * 100000 * 10) / 10;
    }
  }
  let sensorStatus = 0;
  if (flags & 0x08) { sensorStatus = dv.getUint16(o, true); o += 2; }
  return {
    sequenceNumber,
    measuredAt: addMinutesNaive(baseTime, timeOffsetMin || 0),
    baseTime,
    timeOffsetMin,
    glucoseMgdl,
    unitsReported,
    sampleType,
    sampleLocation,
    sensorStatus,
    contextFollows: !!(flags & 0x10),
    mealFlag: null,
    rawHex: hex(dv),
  };
};

// 0x2A34 Glucose Measurement Context → { sequenceNumber, meal } (other meters).
export const decodeContext = (dv) => {
  const flags = dv.getUint8(0);
  const sequenceNumber = dv.getUint16(1, true);
  let o = 3;
  if (flags & 0x80) o += 1;                 // extended flags
  if (flags & 0x01) o += 3;                 // carbohydrate id + SFLOAT
  let meal = null;
  if (flags & 0x02) { meal = dv.getUint8(o); o += 1; }
  return { sequenceNumber, meal };
};

// 0x2A08 Date Time (the meter's clock) → naive string.
export const decodeDateTime = (dv) => readDateTime(dv, 0);

const readStringChar = async (service, uuid) => {
  try {
    const c = await service.getCharacteristic(uuid);
    const v = await c.readValue();
    return new TextDecoder().decode(v).replace(/\0+$/, '').trim() || null;
  } catch {
    return null;   // absent, or blocklisted (0x2A25)
  }
};

/**
 * Open Chrome's device chooser and read the meter in one shot.
 *
 * @param {object}   opts
 * @param {number}   [opts.fromSequence]  fetch records with seq ≥ this (incremental); omit for all
 * @param {function} [opts.beforeFetch]   async (deviceInfo) => ({ fromSequence }) — called once the
 *                                        meter is identified and BEFORE records are requested, so the
 *                                        caller can ask the server what it already holds for this serial
 *                                        (kept short: the meter drops the link 60 s after the last exchange)
 * @param {function} [opts.onProgress]    ({ phase, received, total, message }) => void
 * @param {number}   [opts.timeoutMs]     whole-session timeout (default 60 s)
 * @returns {Promise<{ device, meterTime, hostTime, count, readings, contexts, timings, cancelled }>}
 *   device   { name, serial, browserId, manufacturer, modelId, firmware, feature, hasContext }
 *   readings decodeMeasurement() rows, in sequence order
 *
 * Throws with .code:
 *   'unsupported' — no Web Bluetooth in this browser
 *   'cancelled'   — the user closed the chooser
 *   'disconnected'— the meter dropped the link mid-session (retry: switch it on again)
 *   'racp'        — the meter refused the record request (message says why)
 *   'timeout'
 */
export const readMeter = async ({ fromSequence, beforeFetch, onProgress = () => {}, timeoutMs = 60000 } = {}) => {
  if (!isWebBluetoothSupported()) {
    const e = new Error('This browser cannot talk to Bluetooth meters. Use Chrome or Edge on this PC.');
    e.code = 'unsupported'; throw e;
  }
  const t0 = performance.now();
  const timings = {};
  const progress = (phase, extra = {}) => onProgress({ phase, ...extra });

  let device;
  try {
    progress('chooser', { message: 'Choose the meter in the list — switch it on now.' });
    device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [GLUCOSE_SERVICE] }, { namePrefix: 'meter' }],
      optionalServices: [GLUCOSE_SERVICE, DEVICE_INFO_SERVICE],
    });
  } catch (err) {
    const e = new Error('No meter was chosen.');
    e.code = 'cancelled'; e.cause = err; throw e;
  }

  const readings = new Map();   // seq → row (dedups a re-sent frame)
  const contexts = new Map();
  let count = null;
  let disconnected = false;
  let racpResolve = null, racpReject = null;
  const waitRacp = (label) => new Promise((resolve, reject) => {
    racpResolve = resolve; racpReject = reject;
    setTimeout(() => reject(Object.assign(new Error(`The meter did not answer (${label}).`), { code: 'timeout' })), timeoutMs);
  });

  const onDisconnected = () => {
    disconnected = true;
    if (racpReject) racpReject(Object.assign(new Error('The meter closed the connection. Switch it on and try again.'), { code: 'disconnected' }));
  };
  device.addEventListener('gattserverdisconnected', onDisconnected);

  try {
    progress('connecting', { message: 'Connecting…' });
    const tc = performance.now();
    const server = await device.gatt.connect();
    timings.connectMs = Math.round(performance.now() - tc);

    const td = performance.now();
    const glucose = await server.getPrimaryService(GLUCOSE_SERVICE);
    const chars = await glucose.getCharacteristics();
    const uuids = new Set(chars.map((c) => parseInt(c.uuid.slice(4, 8), 16)));
    const hasContext = uuids.has(CHAR.CONTEXT);

    const measurement = await glucose.getCharacteristic(CHAR.MEASUREMENT);
    const racp = await glucose.getCharacteristic(CHAR.RACP);
    let context = null;
    if (hasContext) { try { context = await glucose.getCharacteristic(CHAR.CONTEXT); } catch { context = null; } }

    let feature = null;
    try { feature = (await (await glucose.getCharacteristic(CHAR.FEATURE)).readValue()).getUint16(0, true); } catch { feature = null; }

    // Enabling notifications is the first encrypted operation: on a first-ever
    // pairing this is where the OS asks for the PIN (~10 s); later < 300 ms.
    progress('pairing', { message: 'Pairing… if the PC asks for a PIN, type the 6 digits on the back of the meter.' });
    measurement.addEventListener('characteristicvaluechanged', (ev) => {
      const row = decodeMeasurement(ev.target.value);
      readings.set(row.sequenceNumber, row);
      progress('reading', { received: readings.size, total: count, message: `Reading… ${readings.size}${count ? ` of ${count}` : ''}` });
    });
    await measurement.startNotifications();
    if (context) {
      context.addEventListener('characteristicvaluechanged', (ev) => {
        const c = decodeContext(ev.target.value);
        contexts.set(c.sequenceNumber, c);
      });
      try { await context.startNotifications(); } catch { /* optional */ }
    }
    racp.addEventListener('characteristicvaluechanged', (ev) => {
      const dv = ev.target.value;
      const op = dv.getUint8(0);
      if (op === RACP.RESP_COUNT) { racpResolve?.({ count: dv.getUint16(2, true) }); }
      else if (op === RACP.RESP_CODE) {
        const requestOp = dv.getUint8(2), result = dv.getUint8(3);
        if (result === RACP.RESULT_SUCCESS || (requestOp === RACP.REPORT_RECORDS && result === 6)) racpResolve?.({ requestOp, result });
        else racpReject?.(Object.assign(new Error(`The meter refused the request: ${RACP_RESULT_TEXT[result] || 'code ' + result}.`), { code: 'racp' }));
      }
    });
    await racp.startIndications();
    timings.discoverMs = Math.round(performance.now() - td);

    // Identity + clock. DIS serial (0x2A25) is blocklisted: identity is the name.
    let manufacturer = null, modelId = null, firmware = null;
    try {
      const dis = await server.getPrimaryService(DEVICE_INFO_SERVICE);
      manufacturer = await readStringChar(dis, CHAR.MANUFACTURER);
      modelId = await readStringChar(dis, CHAR.MODEL);
      firmware = await readStringChar(dis, CHAR.FIRMWARE);
    } catch { /* no DIS */ }
    let meterTime = null;
    try { meterTime = decodeDateTime(await (await glucose.getCharacteristic(CHAR.DATE_TIME)).readValue()); } catch { meterTime = null; }
    const hostTime = hostTimeNaive();

    const deviceInfo = {
      name: device.name || null,
      serial: serialFromName(device.name),
      browserId: device.id || null,
      manufacturer, modelId, firmware, feature, hasContext,
    };
    progress('identified', { device: deviceInfo, meterTime, hostTime, message: `Connected to ${device.name}` });
    if (beforeFetch) {
      try {
        const hint = await beforeFetch(deviceInfo);
        if (hint && Number.isInteger(hint.fromSequence)) fromSequence = hint.fromSequence;
      } catch { /* a failed hint just means a full fetch — the server dedups */ }
    }

    // Count, then fetch — in one pass, before the 60 s idle disconnect.
    const tq = performance.now();
    const countP = waitRacp('record count');
    await racp.writeValueWithResponse(new Uint8Array([RACP.REPORT_COUNT, RACP.OP_ALL]));
    count = (await countP).count;
    timings.countMs = Math.round(performance.now() - tq);
    progress('counted', { total: count, message: `${count} records on the meter` });

    const tf = performance.now();
    if (count > 0) {
      const doneP = waitRacp('records');
      const cmd = Number.isInteger(fromSequence) && fromSequence > 0
        ? new Uint8Array([RACP.REPORT_RECORDS, RACP.OP_GTE, RACP.FILTER_SEQ, fromSequence & 0xff, (fromSequence >> 8) & 0xff])
        : new Uint8Array([RACP.REPORT_RECORDS, RACP.OP_ALL]);
      await racp.writeValueWithResponse(cmd);
      await doneP;
      // Notifications can trail the RACP "done" by a few ms.
      await sleep(150);
    }
    timings.fetchMs = Math.round(performance.now() - tf);
    timings.totalMs = Math.round(performance.now() - t0);

    // Attach meal context if any meter ever sends it.
    for (const [seq, c] of contexts) { const r = readings.get(seq); if (r && c.meal != null) r.mealFlag = c.meal; }

    return {
      device: deviceInfo,
      meterTime,
      hostTime,
      count,
      readings: [...readings.values()].sort((a, b) => a.sequenceNumber - b.sequenceNumber),
      timings,
    };
  } finally {
    device.removeEventListener('gattserverdisconnected', onDisconnected);
    try { if (device.gatt?.connected) device.gatt.disconnect(); } catch { /* already gone */ }
    if (disconnected) progress('disconnected', { message: 'Disconnected from the meter.' });
  }
};

// Plain-language SOP, shared by every place a meter is connected (one source).
export const METER_SOP = Object.freeze({
  firstTime: 'With the meter OFF, hold ▼ until the Bluetooth symbol shows, then pick it in the list. Type the 6-digit PIN from the label on the back of the meter — once only.',
  later: 'Switch the meter on with a short press and pick it in the list. No PIN.',
  chooserFirst: 'Open the list first, then switch the meter on — it only advertises for a short while.',
  clock: 'If the meter clock is out, set it on the meter now. The readings are fine; only their times are suspect.',
});
