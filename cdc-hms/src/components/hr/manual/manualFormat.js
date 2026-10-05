/**
 * Helpers for the HR Suite Manual page: plain text of the block tree (for
 * search and labels), the search itself, and the "5 Oct 2026 10:14" stamp.
 */
import { hhmmOf } from '../hrFormat';

const CLINIC_TZ = 'Africa/Nairobi';

/** "5 Oct 2026 10:14", clinic time. */
export const stampOf = (iso) => (iso
  ? `${new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: CLINIC_TZ })} ${hhmmOf(iso)}`
  : '');

export const inlineText = (nodes) => (nodes || [])
  .map((n) => (n.t === 'text' || n.t === 'code' ? n.v : inlineText(n.c))).join('');

export const blockText = (b) => {
  switch (b.t) {
    case 'h': case 'p': return inlineText(b.c);
    case 'list': return b.items.map((it) => it.c.map(blockText).join(' ')).join(' ');
    case 'table': return [b.head, ...b.rows].map((r) => r.map(inlineText).join(' · ')).join(' ');
    case 'quote': return b.c.map(blockText).join(' ');
    case 'img': case 'diagram': return b.caption ? inlineText(b.caption) : (b.alt || '');
    default: return '';
  }
};

/**
 * One entry per findable piece: each paragraph, heading, list item, table row
 * and caption, remembering its tab, its top-level block (to scroll to) and the
 * heading it sits under (for context in the results).
 */
export const buildSearchIndex = (tabs) => {
  const out = [];
  tabs.forEach((tab) => {
    let heading = tab.heading;
    tab.blocks.forEach((b, index) => {
      const push = (text) => { if (text.trim()) out.push({ tab: tab.slug, tabTitle: `${tab.n}. ${tab.title}`, index, heading, text, lower: text.toLowerCase() }); };
      if (b.t === 'h') { heading = inlineText(b.c); push(heading); return; }
      if (b.t === 'list') { b.items.forEach((it) => push(it.c.map(blockText).join(' '))); return; }
      if (b.t === 'table') { b.rows.forEach((r) => push(r.map(inlineText).join(' · '))); return; }
      push(blockText(b));
    });
  });
  return out;
};

/** Every entry containing all the query's words; headings first. */
export const searchManual = (index, query, limit = 60) => {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return [];
  const hits = index.filter((e) => words.every((w) => e.lower.includes(w)));
  const score = (e) => (e.heading && words.every((w) => e.heading.toLowerCase().includes(w)) ? 0 : 1);
  return hits.map((e, i) => ({ e, i })).sort((a, b) => score(a.e) - score(b.e) || a.i - b.i).slice(0, limit).map((x) => x.e);
};

/** The snippet around the first match, cut to `size` characters. */
export const snippetOf = (text, query, size = 160) => {
  const first = query.toLowerCase().split(/\s+/).find((w) => w.length > 1) || '';
  const at = Math.max(0, text.toLowerCase().indexOf(first));
  const start = Math.max(0, at - Math.floor(size / 3));
  const cut = text.slice(start, start + size);
  return `${start > 0 ? '…' : ''}${cut}${start + size < text.length ? '…' : ''}`;
};

/** Splits text into [{ text, hit }] so matches can be marked. */
export const highlightParts = (text, query) => {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return [{ text, hit: false }];
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'i');
  return text.split(new RegExp(re.source, 'gi')).filter(Boolean)
    .map((part) => ({ text: part, hit: words.includes(part.toLowerCase()) }));
};
