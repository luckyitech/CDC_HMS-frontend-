// Consultation notes — the formatting rules, frontend copy (10 Oct 2026).
// The SAME functions as backend/utils/noteSections.js (sanitizeNoteHtml,
// htmlToText, renderNoteText): what the editor shows is what the server
// keeps, and the plain text handed to the Admit / Refer note is what the
// server will put in ConsultationNote.notes. Change both together.
import { sectionDef } from '../constants/noteSections';

// ---------------------------------------------------------------------
// HTML — the allow-list sanitiser
// ---------------------------------------------------------------------
const INLINE = { strong: 'strong', b: 'strong', em: 'em', i: 'em', u: 'u', mark: 'mark' };
const BLOCK = { p: 'p', div: 'div', ul: 'ul', ol: 'ol', li: 'li' };
const MAX_HTML = 50000;

const escapeText = (s) => String(s)
  // a bare & (not already an entity) is escaped; real entities pass through
  .replace(/&(?!(?:[a-zA-Z]{2,10}|#\d{1,6}|#x[0-9a-fA-F]{1,5});)/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

/**
 * Keep only the tags a note may carry, drop every attribute, balance the
 * result. Text inside a dropped tag is kept; <script>/<style> contents are not.
 */
export const sanitizeNoteHtml = (html) => {
  let src = String(html == null ? '' : html);
  if (src.length > MAX_HTML) src = src.slice(0, MAX_HTML);
  src = src.replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  const out = [];
  const open = [];
  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>|[^<]+|</g;
  let m;
  while ((m = re.exec(src))) {
    const tok = m[0];
    if (tok[0] !== '<') { out.push(escapeText(tok)); continue; }
    if (tok === '<') { out.push('&lt;'); continue; }
    const name = m[1].toLowerCase();
    const closing = tok[1] === '/';
    if (name === 'br') { if (!closing) out.push('<br>'); continue; }
    const mapped = INLINE[name] || BLOCK[name];
    if (!mapped) continue;                       // unknown tag: dropped, text kept
    if (!closing) {
      // a <li> or <p> opened while one is still open closes it first (as a
      // browser does — contentEditable emits unclosed ones)
      if ((mapped === 'li' || mapped === 'p') && open[open.length - 1] === mapped) { open.pop(); out.push(`</${mapped}>`); }
      out.push(`<${mapped}>`);
      open.push(mapped);
    } else {
      const at = open.lastIndexOf(mapped);
      if (at < 0) continue;                      // stray close: dropped
      while (open.length > at) out.push(`</${open.pop()}>`);
    }
  }
  while (open.length) out.push(`</${open.pop()}>`);
  return out.join('')
    .replace(/<(strong|em|u|mark|p|div|li)><\/\1>/g, '')  // empty marks and blocks
    .replace(/(<(div|p)>(<br>|\s)*<\/\2>|<br>|\s)+$/g, '')   // no empty lines hang off the end
    .replace(/^(<br>|\s)+/g, '');
};

// ---------------------------------------------------------------------
// HTML → plain text
// ---------------------------------------------------------------------
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decodeEntities = (s) => String(s).replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (all, ent) => {
  if (ent[0] === '#') {
    const code = ent[1] === 'x' || ent[1] === 'X' ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
    return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : all;
  }
  return Object.prototype.hasOwnProperty.call(ENTITIES, ent) ? ENTITIES[ent] : all;
});

/** The text a section's HTML reads as: bullets become "• ", numbers "1. ". */
export const htmlToText = (html) => {
  const lists = [];   // stack of { kind, n }
  let out = '';
  const nl = () => { if (out && !out.endsWith('\n')) out += '\n'; };   // start a new line, never a blank one
  const src = String(html == null ? '' : html).replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '');
  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>|[^<]+|</g;
  let m;
  while ((m = re.exec(src))) {
    const tok = m[0];
    if (tok[0] !== '<' || tok === '<') { out += tok; continue; }
    const name = m[1].toLowerCase();
    const closing = tok[1] === '/';
    if (name === 'br') { out += '\n'; continue; }
    if (name === 'ul' || name === 'ol') {
      if (closing) { lists.pop(); nl(); } else { lists.push({ kind: name, n: 0 }); nl(); }
      continue;
    }
    if (name === 'li') {
      if (closing) { nl(); continue; }
      nl();
      const top = lists[lists.length - 1];
      if (!top) { out += '• '; continue; }
      top.n += 1;
      out += `${'  '.repeat(Math.max(0, lists.length - 1))}${top.kind === 'ol' ? `${top.n}. ` : '• '}`;
      continue;
    }
    // Enter in a contentEditable makes <div>next line</div>; a blank line is
    // <div><br></div>. A paragraph keeps a blank line after it.
    if (name === 'div') { if (!closing) nl(); continue; }
    if (name === 'p') { nl(); if (closing) out += '\n'; continue; }
  }
  const text = decodeEntities(out)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '');
  return text.split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').trim();
};

// ---------------------------------------------------------------------
// Items (ticks) → text, and the whole note → text
// ---------------------------------------------------------------------
export const itemsText = (kind, items) => {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return '';
  if (kind === 'chips') return list.filter((i) => i.value !== 'no').map((i) => i.item).join(', ');
  if (kind === 'meds') {
    const current = list.filter((i) => i.value === 'current').map((i) => `• ${i.item}`);
    const stopped = list.filter((i) => i.value === 'stopped').map((i) => `• ${i.item} (stopped)`);
    return [...current, ...stopped].join('\n');
  }
  return list.map((i) => `${i.item}: ${i.value}`).join(' · ');
};

/** One section as plain text: its ticks, then its text (no heading). */
export const sectionText = (section) => {
  const def = sectionDef(section.key) || { kind: 'text' };
  const parts = [itemsText(def.kind, section.items), htmlToText(section.html)].filter((p) => p && p.trim());
  return parts.join('\n');
};

/**
 * The whole note as plain text — "HEADING\ntext" per section, blank line
 * between. This is what ConsultationNote.notes holds for a note made of
 * sections, so search, the staff view and the Admit / Refer prefill keep
 * working unchanged.
 */
export const renderNoteText = (sections) => (Array.isArray(sections) ? sections : [])
  .map((s) => {
    const def = sectionDef(s.key);
    const body = sectionText(s);
    if (!def || !body) return '';
    const mark = s.reviewed ? ' (reviewed — no change)' : '';
    return `${def.label.toUpperCase()}${mark}\n${body}`;
  })
  .filter(Boolean)
  .join('\n\n');

/** Plain text → the note's HTML (line breaks kept) — legacy notes and drafts. */
export const textToHtml = (text) => {
  const t = String(text == null ? '' : text).replace(/\r\n?/g, '\n').trim();
  if (!t) return '';
  return sanitizeNoteHtml(t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>'));
};

/** Add text after what is already written (the generated skin note lands this way). */
export const appendHtml = (html, text) => {
  const add = textToHtml(text);
  if (!add) return html || '';
  const before = sanitizeNoteHtml(html);
  return before ? `${before}<br><br>${add}` : add;
};
