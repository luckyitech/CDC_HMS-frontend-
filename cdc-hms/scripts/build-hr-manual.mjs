#!/usr/bin/env node
/**
 * build-hr-manual.mjs — turns the HR Suite Manual (a Claude Doc with 13 tabs,
 * exported tab by tab as Markdown) into the HR Suite's Manual page content.
 *
 *   node scripts/build-hr-manual.mjs --export <dir> [--images <dir>] [--update-keys]
 *
 *   --export <dir>   the 13 exported tabs, saved as 01.md … 13.md (tab order).
 *   --images <dir>   OPTIONAL. The original screenshots (<name>.png). When given,
 *                    every screenshot is re-encoded to public/hr-manual/<name>.webp
 *                    (max 1300 px wide, WebP q75) with python3 + Pillow. Leave it
 *                    out when only the words changed: the existing .webp files
 *                    are kept (and checked to exist).
 *   --update-keys    write new checklist items into scripts/hr-manual/checklist-keys.json
 *                    (otherwise an unmatched checklist item stops the build).
 *   --backend <dir>  the backend repo: also writes <dir>/constants/hrChecklistKeys.json,
 *                    the built-in checklist keys and sections the API accepts
 *                    (routes/hrChecklist.js refuses any other). Commit it with the
 *                    frontend change; the backend's tests compare the two.
 *
 * Inputs kept beside this script, in scripts/hr-manual/:
 *   images.json          image caption (the alt text the export shows) → screenshot name.
 *                        The Markdown export drops pictures and keeps only
 *                        "[image: <alt>]", so a NEW screenshot in the doc needs
 *                        one line here (the build names any it cannot place).
 *   checklist-keys.json  the stable key of every checklist item. Ticks are
 *                        stored against these keys, so rewording an item keeps
 *                        its ticks: items are matched to keys by wording
 *                        similarity, not exact text.
 *   diagrams/*.jsx       the four diagrams (Claude Doc widgets, which the export
 *                        drops). Rendered to static SVG with the light theme.
 *
 * Output (generated — never edit by hand):
 *   src/components/hr/manual/manualContent.js   the tabs as a small block tree
 *   public/hr-manual/*.webp, *.svg               screenshots and diagrams
 *
 * No npm dependency is added: Markdown is parsed here, at build time, into a
 * plain block tree the page renders with React (no HTML injection at all).
 * esbuild (already installed with Vite) renders the diagram JSX.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(HERE, '..');
const CONFIG = path.join(HERE, 'hr-manual');
const OUT_MODULE = path.join(APP, 'src', 'components', 'hr', 'manual', 'manualContent.js');
const OUT_PUBLIC = path.join(APP, 'public', 'hr-manual');
const PUBLIC_URL = '/hr-manual';

// The doc's tabs, in order. `doc` is the Claude Doc tab id (for re-exporting);
// `diagram` names the widget the tab shows where the export says
// "[embedded content: …]".
export const TABS = [
  { n: 1,  slug: 'start-here',      title: 'Start here',                 doc: '1543cc11-2996', diagram: 'glance' },
  { n: 2,  slug: 'every-staff',     title: 'For every staff member',     doc: '55033461-5522' },
  { n: 3,  slug: 'leave',           title: 'Leave',                      doc: '9e06628e-f072', diagram: 'leave1' },
  { n: 4,  slug: 'staff-files',     title: 'Staff files & onboarding',   doc: 'f4593849-0b0a' },
  { n: 5,  slug: 'attendance',      title: 'Attendance & time',          doc: 'dab21509-86ad', diagram: 'hours1' },
  { n: 6,  slug: 'permissions',     title: 'Departments & permissions',  doc: 'c3b81c6b-4248' },
  { n: 7,  slug: 'roster',          title: 'Roster',                     doc: 'cc3e8073-48af' },
  { n: 8,  slug: 'appraisals',      title: 'Appraisals',                 doc: '7b2c91d3-feb4', diagram: 'appr1' },
  { n: 9,  slug: 'reports',         title: 'Reports, CPD & expiry',      doc: '5dd9a79a-6018' },
  { n: 10, slug: 'troubleshooting', title: 'Troubleshooting index',      doc: 'bd39bb8d-fdf5' },
  { n: 11, slug: 'quick-reference', title: 'Quick-reference cards',      doc: 'dfae41f3-c3b4' },
  { n: 12, slug: 'first-week',      title: 'First-week walkthrough',     doc: '88c22f16-2de3' },
  { n: 13, slug: 'glossary',        title: 'Glossary',                   doc: '31ef8964-cb1e' },
];

// Which checklists become the shared Checklist: the heading they sit under.
// Start here → "First steps after go-live"; First-week walkthrough → each day.
const CHECKLIST_SECTIONS = [
  { tab: 'start-here', heading: /^First steps after go-live$/, id: () => 'golive' },
  { tab: 'first-week', heading: /^Day (\d)\b/, id: (m) => `day${m[1]}` },
];

const MAX_WIDTH = 1300;
const WEBP_QUALITY = 75;

// --------------------------------------------------------------------------
// CLI
// --------------------------------------------------------------------------
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const die = (msg) => { console.error(`build-hr-manual: ${msg}`); process.exit(1); };
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

// --------------------------------------------------------------------------
// Inline Markdown → [{ t:'text', v } | { t:'b'|'i', c:[…] } | { t:'code', v } | { t:'link', href, c:[…] }]
// --------------------------------------------------------------------------
const decodeEntities = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

export const parseInline = (src) => {
  const out = [];
  let buf = '';
  const flush = () => { if (buf) { out.push({ t: 'text', v: decodeEntities(buf) }); buf = ''; } };
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    let m;
    if (rest[0] === '\\' && rest.length > 1) { buf += rest[1]; i += 2; continue; }
    if ((m = rest.match(/^\*\*(.+?)\*\*/s))) { flush(); out.push({ t: 'b', c: parseInline(m[1]) }); i += m[0].length; continue; }
    if ((m = rest.match(/^\*(?!\s)(.+?)\*(?!\*)/s))) { flush(); out.push({ t: 'i', c: parseInline(m[1]) }); i += m[0].length; continue; }
    if ((m = rest.match(/^`([^`]+)`/))) { flush(); out.push({ t: 'code', v: m[1] }); i += m[0].length; continue; }
    if ((m = rest.match(/^\[([^\]]+)\]\(([^)\s]+)\)/))) { flush(); out.push({ t: 'link', href: m[2], c: parseInline(m[1]) }); i += m[0].length; continue; }
    buf += rest[0]; i += 1;
  }
  flush();
  return out;
};

export const inlineText = (nodes) => nodes.map((n) => (n.t === 'text' || n.t === 'code' ? n.v : inlineText(n.c || []))).join('');

// --------------------------------------------------------------------------
// Block Markdown → [{ t:'h', level, c, id } | { t:'p', c } | { t:'list', ordered, start, items:[{ check, c:[blocks] }] }
//                   | { t:'table', head:[[inline]], rows:[[[inline]]] } | { t:'quote', c:[blocks] }
//                   | { t:'img', alt, caption } | { t:'embed', alt }]
// --------------------------------------------------------------------------
const PLACEHOLDER = /^&#91;(image|embedded content): (.*)\\\]$/;
const LIST_ITEM = /^( *)([-*+]|\d+[.)]) +(?:\[( |x|X)\] +)?(.*)$/;
const isTableRow = (l) => /^\s*\|/.test(l);
const splitRow = (l) => {
  const cells = [];
  let cur = '';
  const s = l.trim().replace(/^\|/, '').replace(/\|$/, '');
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] === '\\' && s[i + 1] === '|') { cur += '|'; i += 1; } else if (s[i] === '|') { cells.push(cur.trim()); cur = ''; } else cur += s[i];
  }
  cells.push(cur.trim());
  return cells;
};
const startsBlock = (l) => /^#{1,6} /.test(l) || LIST_ITEM.test(l) || isTableRow(l) || /^>/.test(l) || PLACEHOLDER.test(l.trim());

export const parseBlocks = (md) => {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }
    let m;
    if ((m = line.match(/^(#{1,6}) +(.*)$/))) { blocks.push({ t: 'h', level: m[1].length, c: parseInline(m[2].trim()) }); i += 1; continue; }
    if ((m = line.trim().match(PLACEHOLDER))) {
      blocks.push(m[1] === 'image' ? { t: 'img', alt: decodeEntities(m[2]) } : { t: 'embed', alt: decodeEntities(m[2]) });
      i += 1; continue;
    }
    if (isTableRow(line) && lines[i + 1] && /^\s*\|\s*:?-{2,}/.test(lines[i + 1])) {
      const head = splitRow(line).map(parseInline);
      i += 2;
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) { rows.push(splitRow(lines[i]).map(parseInline)); i += 1; }
      blocks.push({ t: 'table', head, rows });
      continue;
    }
    if (/^>/.test(line)) {
      const inner = [];
      while (i < lines.length && /^>/.test(lines[i])) { inner.push(lines[i].replace(/^> ?/, '')); i += 1; }
      blocks.push({ t: 'quote', c: parseBlocks(inner.join('\n')) });
      continue;
    }
    if ((m = line.match(LIST_ITEM))) {
      const indent = m[1].length;
      const ordered = /\d/.test(m[2]);
      const list = { t: 'list', ordered, start: ordered ? parseInt(m[2], 10) : 1, items: [] };
      while (i < lines.length) {
        const im = lines[i].match(LIST_ITEM);
        if (!im || im[1].length !== indent || /\d/.test(im[2]) !== ordered) break;
        const contentIndent = im[0].length - im[4].length;   // where the item's text starts
        const body = [im[4]];
        i += 1;
        // The item continues while lines are blank-then-indented, or indented.
        while (i < lines.length) {
          const l = lines[i];
          if (!l.trim()) {
            const next = lines.slice(i + 1).find((x) => x.trim());
            if (next !== undefined && (next.match(/^ */)[0].length >= contentIndent)) { body.push(''); i += 1; continue; }
            break;
          }
          const lead = l.match(/^ */)[0].length;
          if (lead >= contentIndent) { body.push(l.slice(contentIndent)); i += 1; continue; }
          if (lead > indent && LIST_ITEM.test(l)) { body.push(l.slice(Math.min(lead, contentIndent))); i += 1; continue; }
          if (!startsBlock(l) && lead > indent) { body.push(l.trim()); i += 1; continue; }
          break;
        }
        list.items.push({ check: im[3] === undefined ? null : im[3].toLowerCase() === 'x', c: parseBlocks(body.join('\n')) });
        while (i < lines.length && !lines[i].trim()) {
          const next = lines.slice(i).find((x) => x.trim());
          const nm = next && next.match(LIST_ITEM);
          if (nm && nm[1].length === indent && /\d/.test(nm[2]) === ordered) i += 1; else break;
        }
      }
      blocks.push(list);
      continue;
    }
    const para = [line.trim()];
    i += 1;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) { para.push(lines[i].trim()); i += 1; }
    blocks.push({ t: 'p', c: parseInline(para.join(' ')) });
  }
  return attachCaptions(blocks);
};

// "[image: X]" followed by a paragraph that is only *X* → one figure with a caption.
const attachCaptions = (blocks) => {
  const out = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const b = blocks[i];
    const next = blocks[i + 1];
    if (b.t === 'img' && next && next.t === 'p' && next.c.length === 1 && next.c[0].t === 'i') {
      out.push({ ...b, caption: next.c[0].c });
      i += 1;
    } else out.push(b);
  }
  return out;
};

// --------------------------------------------------------------------------
// Links between tabs: "Tab 6", "Tabs 2 and 8", bold "1. Start here", the
// Troubleshooting index's Tab column.
// --------------------------------------------------------------------------
const tabByNumber = new Map(TABS.map((t) => [t.n, t]));
const tabLink = (n, label) => {
  const tab = tabByNumber.get(Number(n));
  return tab ? { t: 'link', href: `#${tab.slug}`, c: [{ t: 'text', v: label }] } : { t: 'text', v: label };
};

const linkTabRefs = (nodes) => nodes.flatMap((n) => {
  if (n.t === 'b') {
    const text = inlineText(n.c);
    const m = text.match(/^(\d{1,2})\. (.+)$/);
    if (m && tabByNumber.get(Number(m[1]))?.title === m[2]) return [{ t: 'b', c: [tabLink(m[1], text)] }];
    if (text === 'Glossary') return [{ t: 'b', c: [tabLink(13, text)] }];
    return [{ ...n, c: linkTabRefs(n.c) }];
  }
  if (n.t === 'i' || n.t === 'link') return [{ ...n, c: n.t === 'link' ? n.c : linkTabRefs(n.c) }];
  if (n.t !== 'text') return [n];
  const parts = [];
  const re = /\b(Tabs?) (\d{1,2})((?:(?:, | and )\d{1,2})*)/g;
  let last = 0;
  let m;
  while ((m = re.exec(n.v))) {
    if (m.index > last) parts.push({ t: 'text', v: n.v.slice(last, m.index) });
    parts.push(tabLink(m[2], `${m[1]} ${m[2]}`));
    const tail = m[3];
    const tailRe = /(, | and )(\d{1,2})/g;
    let tm;
    while ((tm = tailRe.exec(tail))) { parts.push({ t: 'text', v: tm[1] }); parts.push(tabLink(tm[2], tm[2])); }
    last = m.index + m[0].length;
  }
  if (last < n.v.length) parts.push({ t: 'text', v: n.v.slice(last) });
  return parts;
});

const walkInline = (blocks, fn) => blocks.map((b) => {
  switch (b.t) {
    case 'h': case 'p': return { ...b, c: fn(b.c) };
    case 'list': return { ...b, items: b.items.map((it) => ({ ...it, c: walkInline(it.c, fn) })) };
    case 'quote': return { ...b, c: walkInline(b.c, fn) };
    case 'table': {
      const tabCol = inlineText(b.head[b.head.length - 1] || []) === 'Tab' ? b.head.length - 1 : -1;
      return {
        ...b,
        head: b.head.map(fn),
        rows: b.rows.map((r) => r.map((cell, ci) => (ci === tabCol
          ? inlineText(cell).split(/(\d{1,2})/).filter(Boolean).map((s) => (/^\d+$/.test(s) ? tabLink(s, s) : { t: 'text', v: s }))
          : fn(cell)))),
      };
    }
    case 'img': return b.caption ? { ...b, caption: fn(b.caption) } : b;
    default: return b;
  }
});

// --------------------------------------------------------------------------
// Headings get ids (for the contents list, search and deep links).
// --------------------------------------------------------------------------
const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 60) || 'section';
const addHeadingIds = (blocks, used = new Set()) => blocks.map((b) => {
  if (b.t === 'h') {
    let id = slugify(inlineText(b.c));
    let k = 2;
    while (used.has(id)) { id = `${slugify(inlineText(b.c))}-${k}`; k += 1; }
    used.add(id);
    return { ...b, id };
  }
  return b;
});

// --------------------------------------------------------------------------
// Checklists → stable keys
// --------------------------------------------------------------------------
const words = (s) => new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2));
const similarity = (a, b) => {
  const A = words(a); const B = words(b);
  if (!A.size || !B.size) return 0;
  let both = 0;
  A.forEach((w) => { if (B.has(w)) both += 1; });
  return both / (A.size + B.size - both);
};

const assignKeys = (sectionId, texts, keysFile, update) => {
  const known = (keysFile[sectionId] || []).slice();
  const used = new Set();
  const keys = texts.map((text) => {
    let best = null;
    let bestScore = 0;
    known.forEach((k) => {
      if (used.has(k.key)) return;
      const s = k.text === text ? 1 : similarity(k.text, text);
      if (s > bestScore) { best = k; bestScore = s; }
    });
    if (best && bestScore >= 0.5) { used.add(best.key); return best.key; }
    if (!update) die(`checklist item in "${sectionId}" has no key: "${text}"\n  Re-run with --update-keys to add one (existing ticks are kept by key).`);
    let key = `${sectionId}-${slugify(text).split('-').slice(0, 4).join('-')}`;
    let k = 2;
    const all = new Set(Object.values(keysFile).flat().map((x) => x.key));
    while (all.has(key) || used.has(key)) { key = `${key}-${k}`; k += 1; }
    used.add(key);
    console.warn(`  new checklist key ${key} ← "${text}"`);
    return key;
  });
  if (update) keysFile[sectionId] = texts.map((text, i) => ({ key: keys[i], text }));
  return keys;
};

// --------------------------------------------------------------------------
// Images: caption → screenshot; WebP size read from the file header.
// --------------------------------------------------------------------------
const webpSize = (file) => {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') throw new Error(`${file} is not WebP`);
  const chunk = b.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (chunk === 'VP8L') { const bits = b.readUInt32LE(21); return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 }; }
  if (chunk === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  throw new Error(`${file}: unknown WebP chunk ${chunk}`);
};
const svgSize = (file) => {
  const m = fs.readFileSync(file, 'utf8').match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : { w: 760, h: 400 };
};

const encodeImages = (srcDir, names) => {
  fs.mkdirSync(OUT_PUBLIC, { recursive: true });
  const py = `
import sys
from PIL import Image
src, out, maxw, q = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
for name in sys.argv[5:]:
    im = Image.open(f"{src}/{name}.png").convert("RGB")
    if im.width > maxw:
        im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    im.save(f"{out}/{name}.webp", "WEBP", quality=q, method=6)
`;
  execFileSync('python3', ['-c', py, srcDir, OUT_PUBLIC, String(MAX_WIDTH), String(WEBP_QUALITY), ...names], { stdio: 'inherit' });
};

// --------------------------------------------------------------------------
// Diagrams: JSX (Claude Doc widget source) → static SVG, light theme.
// --------------------------------------------------------------------------
const THEME = {
  '--cds-text-primary': '#1f2937',
  '--cds-text-secondary': '#6b7280',
  '--cds-chart-axis': '#94a3b8',
  '--cds-chart-categorical-1': '#2563eb',
  '--cds-chart-status-good': '#16a34a',
  '--cds-chart-status-critical': '#dc2626',
};
const SVG_ATTR = {
  strokeWidth: 'stroke-width', fillOpacity: 'fill-opacity', strokeOpacity: 'stroke-opacity', fontSize: 'font-size',
  fontWeight: 'font-weight', fontFamily: 'font-family', textAnchor: 'text-anchor', markerEnd: 'marker-end',
  markerStart: 'marker-start', strokeDasharray: 'stroke-dasharray', strokeLinecap: 'stroke-linecap',
  strokeLinejoin: 'stroke-linejoin', dominantBaseline: 'dominant-baseline', className: 'class',
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const themed = (v) => String(v).replace(/var\((--[\w-]+)\)/g, (_, name) => THEME[name] || '#6b7280');
const svgElement = (tag, props, ...children) => {
  const flat = children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false);
  const attrs = Object.entries(props || {})
    .filter(([k]) => !k.startsWith('data-claude'))
    .map(([k, v]) => ` ${SVG_ATTR[k] || k}="${esc(themed(v))}"`).join('');
  return { svg: `<${tag}${attrs}>${flat.map((c) => (typeof c === 'object' ? c.svg : esc(c))).join('')}</${tag}>` };
};

const renderDiagram = async (name) => {
  let esbuild;
  try { esbuild = await import('esbuild'); } catch { return false; }
  const src = fs.readFileSync(path.join(CONFIG, 'diagrams', `${name}.jsx`), 'utf8');
  const { code } = await esbuild.transform(src, { loader: 'jsx', jsxFactory: '__svgElement', jsxFragment: '__svgFragment', format: 'cjs' });
  const mod = { exports: {} };
  new Function('module', 'exports', '__svgElement', code)(mod, mod.exports, svgElement);
  const component = mod.exports.default || mod.exports;
  let svg = component().svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" ');
  svg = svg.replace(/(<svg[^>]*viewBox="0 0 (\d+) (\d+)"[^>]*>)/, '$1<rect width="$2" height="$3" fill="#ffffff"/>');
  fs.writeFileSync(path.join(OUT_PUBLIC, `${name}.svg`), `${svg}\n`);
  return true;
};

// --------------------------------------------------------------------------
// main
// --------------------------------------------------------------------------
const main = async () => {
  const exportDir = opt('--export');
  if (!exportDir) die('usage: node scripts/build-hr-manual.mjs --export <dir with 01.md … 13.md> [--images <dir>] [--update-keys]');
  const imageMap = readJson(path.join(CONFIG, 'images.json'));
  const keysPath = path.join(CONFIG, 'checklist-keys.json');
  const keysFile = readJson(keysPath);
  const update = flag('--update-keys');

  fs.mkdirSync(OUT_PUBLIC, { recursive: true });
  const usedImages = new Set();
  const missing = [];
  const checklist = [];

  const tabs = TABS.map((tab) => {
    const file = path.join(exportDir, `${String(tab.n).padStart(2, '0')}.md`);
    if (!fs.existsSync(file)) die(`missing ${file}`);
    let md = fs.readFileSync(file, 'utf8');
    // The doc's byline ("Oct 5, 2026 · @Ebrahim") is doc chrome, not manual text.
    md = md.replace(/^[A-Z][a-z]{2} \d{1,2}, \d{4} · @.*$/m, '');
    let blocks = parseBlocks(md);
    // The tab's own "# Title" becomes the page title.
    let heading = tab.title;
    if (blocks[0]?.t === 'h' && blocks[0].level === 1) { heading = inlineText(blocks[0].c); blocks = blocks.slice(1); }
    blocks = walkInline(blocks, linkTabRefs);
    blocks = addHeadingIds(blocks);

    const resolve = (list) => list.map((b) => {
      if (b.t === 'img') {
        const name = imageMap[b.alt];
        if (!name) { missing.push(`${tab.n}. ${tab.title}: "${b.alt}"`); return b; }
        usedImages.add(name);
        return { ...b, name };
      }
      if (b.t === 'embed') {
        if (!tab.diagram) { missing.push(`${tab.n}. ${tab.title}: diagram "${b.alt}" has no diagrams/*.jsx`); return b; }
        return { t: 'diagram', alt: b.alt, name: tab.diagram };
      }
      if (b.t === 'list') return { ...b, items: b.items.map((it) => ({ ...it, c: resolve(it.c) })) };
      if (b.t === 'quote') return { ...b, c: resolve(b.c) };
      return b;
    });
    blocks = resolve(blocks);

    // Checklists: the list right after a matching heading.
    CHECKLIST_SECTIONS.filter((s) => s.tab === tab.slug).forEach((rule) => {
      blocks.forEach((b, i) => {
        if (b.t !== 'h') return;
        const m = inlineText(b.c).match(rule.heading);
        if (!m) return;
        const list = blocks.slice(i + 1).find((x) => x.t === 'list' || x.t === 'h');
        if (!list || list.t !== 'list' || !list.items.every((it) => it.check !== null)) return;
        const sectionId = rule.id(m);
        const texts = list.items.map((it) => inlineText(it.c[0]?.c || []));
        const keys = assignKeys(sectionId, texts, keysFile, update);
        list.items = list.items.map((it, k) => ({ ...it, key: keys[k] }));
        list.checklist = sectionId;
        checklist.push({
          id: sectionId, title: inlineText(b.c), tab: tab.slug, anchor: b.id,
          items: list.items.map((it, k) => ({ key: keys[k], text: texts[k], c: it.c[0]?.c || [] })),
        });
      });
    });

    return { n: tab.n, slug: tab.slug, title: tab.title, heading, blocks };
  });

  if (missing.length) die(`these pictures have no entry in scripts/hr-manual/images.json:\n  ${missing.join('\n  ')}`);
  if (update) fs.writeFileSync(keysPath, `${JSON.stringify(keysFile, null, 1)}\n`);

  // Images
  const imageDir = opt('--images');
  if (imageDir) encodeImages(imageDir, [...usedImages].sort());
  const sizes = {};
  for (const name of usedImages) {
    const f = path.join(OUT_PUBLIC, `${name}.webp`);
    if (!fs.existsSync(f)) die(`${f} is missing — run with --images <dir of PNGs>`);
    sizes[name] = webpSize(f);
  }
  for (const tab of TABS.filter((t) => t.diagram)) {
    const ok = await renderDiagram(tab.diagram);
    const f = path.join(OUT_PUBLIC, `${tab.diagram}.svg`);
    if (!ok && !fs.existsSync(f)) die(`esbuild not found and ${f} missing`);
    sizes[tab.diagram] = svgSize(f);
  }
  const withSrc = (list) => list.map((b) => {
    if (b.t === 'img' && b.name) return { ...b, src: `${PUBLIC_URL}/${b.name}.webp`, ...sizes[b.name] };
    if (b.t === 'diagram') return { ...b, src: `${PUBLIC_URL}/${b.name}.svg`, ...sizes[b.name] };
    if (b.t === 'list') return { ...b, items: b.items.map((it) => ({ ...it, c: withSrc(it.c) })) };
    if (b.t === 'quote') return { ...b, c: withSrc(b.c) };
    return b;
  });
  tabs.forEach((t) => { t.blocks = withSrc(t.blocks); });

  const header = `// GENERATED by scripts/build-hr-manual.mjs from the HR Suite Manual (Claude Doc,
// 13 tabs exported as Markdown). Do not edit by hand: edit the doc, re-export
// and re-run the script (see the script's header for the steps).
//
// MANUAL_TABS      the manual, one block tree per tab (rendered by ManualBlocks.jsx)
// CHECKLIST_SECTIONS  the shared go-live / first-week checklist. Each item's
//                  \`key\` is what the server stores ticks against
//                  (HrChecklistItems.itemKey) — keys are stable across re-exports.
`;
  const body = `${header}
export const MANUAL_BUILT_AT = ${JSON.stringify(new Date().toISOString().slice(0, 10))};

export const MANUAL_TABS = ${JSON.stringify(tabs)};

export const CHECKLIST_SECTIONS = ${JSON.stringify(checklist)};
`;
  fs.mkdirSync(path.dirname(OUT_MODULE), { recursive: true });
  fs.writeFileSync(OUT_MODULE, body);
  const backendDir = opt('--backend');
  if (backendDir) {
    const out = path.join(backendDir, 'constants', 'hrChecklistKeys.json');
    if (!fs.existsSync(path.dirname(out))) die(`${backendDir} does not look like the backend repo (no constants/)`);
    const keys = {
      _generated: 'by cdc-hms/scripts/build-hr-manual.mjs from the HR Suite Manual — do not edit by hand',
      sections: Object.fromEntries(checklist.map((s) => [s.id, s.items.map((i) => i.key)])),
    };
    fs.writeFileSync(out, `${JSON.stringify(keys, null, 1)}\n`);
    console.log(`build-hr-manual: wrote ${out}`);
  } else {
    console.warn('build-hr-manual: no --backend given — the API key list (backend constants/hrChecklistKeys.json) was not updated');
  }
  const imgBytes = fs.readdirSync(OUT_PUBLIC).reduce((n, f) => n + fs.statSync(path.join(OUT_PUBLIC, f)).size, 0);
  console.log(`build-hr-manual: ${tabs.length} tabs, ${usedImages.size} screenshots, ${TABS.filter((t) => t.diagram).length} diagrams, `
    + `${checklist.reduce((n, s) => n + s.items.length, 0)} checklist items in ${checklist.length} sections; `
    + `module ${(body.length / 1024).toFixed(0)} KB, images ${(imgBytes / 1e6).toFixed(2)} MB`);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
