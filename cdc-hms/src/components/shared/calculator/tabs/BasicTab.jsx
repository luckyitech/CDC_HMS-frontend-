import { useEffect } from 'react';
import { CopyButton } from '../calcUi';
import { applyOp, formatCalc } from '../../../../utils/clinicalCalc';

const KEYS = ['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '⌫', '='];
const KEYBOARD = { '*': '×', '/': '÷', '-': '−', '+': '+', Enter: '=', '=': '=', Backspace: '⌫', Escape: 'C', '.': '.', '%': '%' };

/** A pocket calculator: left to right, no precedence — every press goes through `press`. */
export const press = (b, k) => {
  let { display, acc, op, fresh, line, lastExpr } = b;
  if (display === 'Error') { display = '0'; acc = null; op = null; fresh = true; }
  if (/^[0-9]$/.test(k)) { display = fresh || display === '0' ? k : display + k; fresh = false; }
  else if (k === '.') { if (fresh) { display = '0.'; fresh = false; } else if (!display.includes('.')) display += '.'; }
  else if (k === 'C') { display = '0'; acc = null; op = null; fresh = true; line = ''; lastExpr = ''; }
  else if (k === '⌫') { if (!fresh) display = display.length > 1 ? display.slice(0, -1) : '0'; }
  else if (k === '±') { display = display.startsWith('-') ? display.slice(1) : display === '0' ? '0' : `-${display}`; }
  else if (k === '%') { display = formatCalc(parseFloat(display) / 100); fresh = true; }
  else {
    const cur = parseFloat(display);
    if (op && !fresh) {
      const res = applyOp(acc, cur, op);
      if (k === '=') lastExpr = `${formatCalc(acc)} ${op} ${formatCalc(cur)} = ${formatCalc(res)}`;
      display = formatCalc(res); acc = res;
    } else if (!op) acc = cur;
    if (k === '=') { op = null; acc = null; line = lastExpr; } else { op = k; line = `${formatCalc(acc)} ${k}`; }
    fresh = true;
  }
  return { display, acc, op, fresh, line, lastExpr };
};

export default function BasicTab({ state, setIn, copy }) {
  const b = state.basic;
  const hit = (k) => setIn('basic', press(b, k));

  // The keyboard works while the panel is open and no field has focus.
  useEffect(() => {
    const onKey = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable) return;
      const k = /^[0-9]$/.test(e.key) ? e.key : KEYBOARD[e.key];
      if (!k) return;
      e.preventDefault();
      setIn('basic', press(b, k));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [b, setIn]);

  const style = (k) => ('÷×−+='.includes(k) ? (k === '=' ? 'bg-primary text-white' : 'bg-blue-50 text-primary') : 'C±%⌫'.includes(k) ? 'bg-gray-100 text-gray-700' : 'bg-gray-50 text-gray-900');

  return (
    <div className="mx-auto flex w-full max-w-[360px] flex-col gap-2.5">
      <div className="rounded-xl bg-gray-100 px-3.5 py-2.5 text-right">
        <div className="min-h-[16px] text-xs text-gray-500">{b.line}</div>
        <div className="truncate text-[30px] font-semibold tabular-nums text-gray-900">{b.display}</div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {KEYS.map((k) => (
          <button key={k} type="button" onClick={() => hit(k)} aria-label={k === '⌫' ? 'Backspace' : k} className={`h-11 rounded-xl text-lg font-semibold ${style(k)}`}>{k}</button>
        ))}
      </div>
      <CopyButton onClick={() => copy([{ head: b.lastExpr ? `Calculation: ${b.lastExpr}` : b.display, lines: [] }])}>Copy result</CopyButton>
      <p className="text-[11px] text-gray-500">Left to right, like a pocket calculator. The keyboard works too: digits, + − * /, Enter, Backspace, Esc.</p>
    </div>
  );
}
