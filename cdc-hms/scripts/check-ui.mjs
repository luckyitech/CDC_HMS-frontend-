#!/usr/bin/env node
// UI drift check (11 Oct 2026, design audit). Flags the three things that made
// the HMS inconsistent, so a new screen can't quietly bring them back:
//   1. a shadow on a box that sits ON the page (boxes are flat — use Card);
//   2. a page that caps or centres its own width (the layout is the frame);
//   3. a page that builds its own <h1> title (use PageHeader);
//   4. a hand-rolled dialog backdrop (use Modal / ModalOverlay);
//   5. the row hover spelled out (use the ui-hover class).
// Rules and reasons: docs/DRY-GUIDELINES.md §4.
// Run: npm run check:ui   (no dependencies; exits 1 when something is found)
// A deliberate exception: put `ui-allow` in a comment on the line or the line
// above, or (for whole files that float by nature) add the file to ALLOW below.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../src/', import.meta.url).pathname;
const walk = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : p.endsWith('.jsx') ? [p] : [];
});

// Things that float above the page may be raised.
const OVERLAY_FILE = /(Modal|Dialog|Drawer|Popover|Menu|Tooltip|Print|Letterhead|Overlay|Toast|SessionTimeout|ErrorFallback|NotFound|TapLanding|SkinCapture|LoginLayout|MainLayout)\b/;
const OVERLAY_CLASS = /\b(fixed|absolute|sticky)\b|max-h-\[|z-(40|50)\b|\bw-full\b.*\bmax-w-|\bmax-w-\S+.*\bw-full\b/;
// Small controls (buttons, pills, chips) are not boxes.
const CONTROL_CLASS = /\b(inline-flex|rounded-full|rounded-md|text-xs)\b|text-\[/;
// Files reviewed in the 11 Oct 2026 audit whose shadow / width / title is
// deliberate: they float, are a document preview, or are not a page frame.
const ALLOW = {
  'components/shared/NeuropathyReport.jsx': 'the report is shown as a sheet of paper',
  'components/doctor/ConsultationNotes.jsx': 'section picker menu floats over the note',
  'components/doctor/RemoteRequestPanel.jsx': 'slide-over panel',
  'components/mail/PatientEmailPanel.jsx': 'slide-over panel',
  'components/inbox/MessageBubble.jsx': 'chat bubble',
  'pages/admin/analytics/DoctorAnalytics.jsx': 'chart tooltip',
  'pages/hr/HrManual.jsx': 'image lightbox caption',
  'pages/patient/BookAppointment.jsx': 'step indicator inside the page',
  'pages/inpatient/AdmissionDetail.jsx': 'patient banner title + printed discharge HTML',
};
const SHADOW = /(?<![\w:-])shadow(-(sm|md|lg|xl|2xl))?(?![\w-])/;
const BOX = /\bbg-(white|gradient-to-\w+)\b/;
const BACKDROP = /\bfixed inset-0\b.*\bbg-black|\bbg-black\S*.*\bfixed inset-0\b/;
const PAGE_WIDTH = /\bmax-w-(3xl|4xl|5xl|6xl|7xl|screen-\w+)\b/;

const problems = [];
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file);
  const lines = readFileSync(file, 'utf8').split('\n');
  if (ALLOW[rel]) continue;
  const isPage = rel.startsWith('pages/') && !/^pages\/(auth|capture)\//.test(rel);
  if (/^pages\/(auth|capture)\//.test(rel)) continue;
  lines.forEach((line, i) => {
    if (/ui-allow/.test(line) || /ui-allow/.test(lines[i - 1] || '')) return;
    for (const m of line.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
      const cls = m[1] ?? m[2];
      if (SHADOW.test(cls) && BOX.test(cls) && !OVERLAY_CLASS.test(cls) && !CONTROL_CLASS.test(cls) && !OVERLAY_FILE.test(rel)) {
        problems.push(`${rel}:${i + 1}  shadow on an in-page box — use Card / ui-surface (flat)`);
      }
      if (isPage && PAGE_WIDTH.test(cls) && !OVERLAY_CLASS.test(cls) && !OVERLAY_FILE.test(rel)) {
        problems.push(`${rel}:${i + 1}  page caps its own width — the layout is the frame`);
      }
    }
    if (BACKDROP.test(line) && rel !== 'components/shared/Modal.jsx') {
      problems.push(`${rel}:${i + 1}  hand-rolled dialog backdrop — use Modal / ModalOverlay`);
    }
    if (/(?<![\w:/-])hover:bg-blue-50(?![\w/-])/.test(line)) {
      problems.push(`${rel}:${i + 1}  row hover spelled out — use the ui-hover class`);
    }
    if (isPage && /<h1\b/.test(line) && !OVERLAY_FILE.test(rel)) {
      problems.push(`${rel}:${i + 1}  hand-built page title — use PageHeader`);
    }
  });
}

if (problems.length) {
  console.log(`UI check: ${problems.length} problem(s)\n` + problems.map((p) => `  ${p}`).join('\n'));
  process.exit(1);
}
console.log('UI check: clean');
