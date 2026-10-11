// Consultation calculator — copy to the clipboard (11 Oct 2026).
//
// A result is copied as blocks: { head, lines }. The head (the result line)
// goes in bold, the lines (inputs, date, reference bands) in normal weight.
// Both text/html and text/plain are written, so Ctrl+V / ⌘V paste bold into
// the consultation note and plain text anywhere else. The HTML carries the
// CALC_PASTE_MARK attribute: RichTextField lets formatting through only for
// pastes that carry it — every other paste stays plain text as before.
export const CALC_PASTE_MARK = 'data-cdc-calc';

const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const blocksToText = (blocks) => blocks
  .map((b) => [b.head, ...b.lines.map((l) => `  ${l}`)].join('\n'))
  .join('\n');

export const blocksToHtml = (blocks) => `<span ${CALC_PASTE_MARK}="1"></span>${blocks
  .map((b) => `<strong>${escapeHtml(b.head)}</strong>${b.lines.map((l) => `<br>${escapeHtml(l)}`).join('')}`)
  .join('<br>')}`;

export const isCalcPaste = (html) => typeof html === 'string' && html.includes(CALC_PASTE_MARK);

/**
 * Write the blocks to the clipboard. Synchronous execCommand inside the click
 * first (works everywhere, including where the async API is refused), the
 * async Clipboard API as a fallback. Resolves true when something was written.
 */
export const copyCalcBlocks = async (blocks) => {
  const text = blocksToText(blocks);
  const html = blocksToHtml(blocks);
  let done = false;
  const onCopy = (e) => {
    e.clipboardData.setData('text/html', html);
    e.clipboardData.setData('text/plain', text);
    e.preventDefault();
    done = true;
  };
  document.addEventListener('copy', onCopy);
  try { document.execCommand('copy'); } catch { /* fall through */ }
  document.removeEventListener('copy', onCopy);
  if (done) return true;
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([new window.ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      })]);
      return true;
    }
    if (navigator.clipboard) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* nothing written */ }
  return false;
};
