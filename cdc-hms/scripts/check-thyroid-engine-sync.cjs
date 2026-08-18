#!/usr/bin/env node
/* Guards that the shared body of the thyroid engine (everything ABOVE the
 * "===== EXPORT MARKER =====" line) is byte-identical between:
 *   backend/utils/thyroidUsEngine.js   (CommonJS, authoritative)
 *   cdc-hms/src/utils/thyroidUsEngine.js (ESM mirror, drives the live chips)
 *
 * The two live in separate repos; in local dev they sit side by side
 * (…/backend and …/frontend). Override the backend path with
 * THYROID_ENGINE_BACKEND if your layout differs.
 *
 * Run: node cdc-hms/scripts/check-thyroid-engine-sync.js   (npm run check:thyroid-engine)
 * Exit 0 = in sync, 1 = drift (prints the first differing line).
 */
const fs = require('fs');
const path = require('path');

const MARKER = '// ===== EXPORT MARKER =====';
const FRONT = path.resolve(__dirname, '..', 'src', 'utils', 'thyroidUsEngine.js');
const BACK = process.env.THYROID_ENGINE_BACKEND
  || path.resolve(__dirname, '..', '..', '..', 'backend', 'utils', 'thyroidUsEngine.js');

function sharedBody(file) {
  const src = fs.readFileSync(file, 'utf8');
  const last = src.lastIndexOf(MARKER);       // the real marker, not the mention in the header comment
  if (last < 0) throw new Error(`marker not found in ${file}`);
  const eol = src.indexOf('\n', last);
  return src.slice(0, eol === -1 ? src.length : eol);
}

try {
  if (!fs.existsSync(BACK)) {
    console.error(`[thyroid-engine-sync] backend engine not found at:\n  ${BACK}\nSet THYROID_ENGINE_BACKEND to its path. Skipping (not a failure in isolated frontend CI).`);
    process.exit(0);
  }
  const a = sharedBody(BACK);
  const b = sharedBody(FRONT);
  if (a === b) { console.log('[thyroid-engine-sync] ✓ backend and frontend engines are in sync'); process.exit(0); }

  const la = a.split('\n'), lb = b.split('\n');
  const n = Math.max(la.length, lb.length);
  for (let i = 0; i < n; i++) {
    if (la[i] !== lb[i]) {
      console.error('[thyroid-engine-sync] ✗ DRIFT at line ' + (i + 1));
      console.error('  backend : ' + JSON.stringify(la[i]));
      console.error('  frontend: ' + JSON.stringify(lb[i]));
      break;
    }
  }
  process.exit(1);
} catch (e) {
  console.error('[thyroid-engine-sync] error:', e.message);
  process.exit(1);
}
