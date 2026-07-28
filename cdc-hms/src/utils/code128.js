// Code128 barcode generator — from scratch, zero dependencies.
//
// Encodes a string as a Code128 (Set B) barcode and renders it as SVG.
// Set B covers ASCII 32–127 (uppercase, lowercase, digits, dashes), which is
// everything the clinic's identifiers use: CDC042, LAB-2026-001, RX-2026-001,
// AST-…, STK-…. The 107-entry pattern table below is public-domain reference
// data from the Code128 specification — checked into our source, not a dep.
//
// Each entry is six digits: alternating bar/space widths (in modules),
// always starting with a bar. Index = Code128 value (0–106).

const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213',
  '122312', '132212', '221213', '221312', '231212', '112232', '122132',
  '122231', '113222', '123122', '123221', '223211', '221132', '221231',
  '213212', '223112', '312131', '311222', '321122', '321221', '312212',
  '322112', '322211', '212123', '212321', '232121', '111323', '131123',
  '131321', '112313', '132113', '132311', '211313', '231113', '231311',
  '112133', '112331', '132131', '113123', '113321', '133121', '313121',
  '211331', '231131', '213113', '213311', '213131', '311123', '311321',
  '331121', '312113', '312311', '332111', '314111', '221411', '431111',
  '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114',
  '413111', '241112', '134111', '111242', '121142', '121241', '114212',
  '124112', '124211', '411212', '421112', '421211', '212141', '214121',
  '412121', '111143', '111341', '131141', '114113', '114311', '411113',
  '411311', '113141', '114131', '311141', '411131', '211412', '211214',
  '211232',
];

const START_B = 104;
const STOP_PATTERN = '2331112'; // stop char + termination bar

/**
 * Encode text as a sequence of bar/space widths (in modules).
 * @param {string} text - ASCII 32–126 only (validated).
 * @returns {{ widths: number[], totalModules: number }}
 *          widths[0] is a bar, widths[1] a space, alternating.
 */
export const encode = (text) => {
  const value = String(text ?? '');
  if (!value.length) throw new Error('code128: empty payload');
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c < 32 || c > 126) {
      throw new Error(`code128: unsupported character "${value[i]}" at ${i}`);
    }
  }

  const codes = [START_B];
  let checksum = START_B;
  for (let i = 0; i < value.length; i++) {
    const v = value.charCodeAt(i) - 32;
    codes.push(v);
    checksum += v * (i + 1);
  }
  codes.push(checksum % 103);

  let pattern = '';
  for (const code of codes) pattern += PATTERNS[code];
  pattern += STOP_PATTERN;

  const widths = [];
  let totalModules = 0;
  for (const ch of pattern) {
    const w = parseInt(ch, 10);
    widths.push(w);
    totalModules += w;
  }
  return { widths, totalModules };
};

/**
 * Render a Code128 barcode as an SVG string.
 *
 * @param {string} text - the payload (e.g. "CDC042")
 * @param {Object} [opts]
 * @param {number} [opts.height=48]      bar height in px
 * @param {number} [opts.moduleWidth=2]  px per module (2+ for reliable scans)
 * @param {number} [opts.quiet=10]       quiet zone in modules each side (spec min)
 * @param {string} [opts.color='#000']   bar colour — keep black for scanners
 * @param {boolean}[opts.showText=false] print the payload under the bars
 * @returns {string} standalone <svg> markup
 */
export const code128Svg = (text, opts = {}) => {
  const {
    height = 48,
    moduleWidth = 2,
    quiet = 10,
    color = '#000',
    showText = false,
  } = opts;

  const { widths, totalModules } = encode(text);
  const textZone = showText ? 16 : 0;
  const w = (totalModules + quiet * 2) * moduleWidth;
  const h = height + textZone;

  let x = quiet * moduleWidth;
  let bars = '';
  let isBar = true;
  for (const mw of widths) {
    const px = mw * moduleWidth;
    if (isBar) {
      bars += `<rect x="${x}" y="0" width="${px}" height="${height}" fill="${color}"/>`;
    }
    x += px;
    isBar = !isBar;
  }

  const label = showText
    ? `<text x="${w / 2}" y="${height + 12}" text-anchor="middle" font-family="monospace" font-size="12" letter-spacing="2" fill="${color}">${text}</text>`
    : '';

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" ` +
    `viewBox="0 0 ${w} ${h}" role="img" aria-label="Barcode ${text}">` +
    `<rect width="${w}" height="${h}" fill="#fff"/>${bars}${label}</svg>`
  );
};

export default code128Svg;
