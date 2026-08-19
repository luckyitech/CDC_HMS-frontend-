import { jsPDF } from 'jspdf';
import * as engine from './thyroidUsEngine';
import { TR_LABEL } from '../constants/thyroidUs';

/**
 * Combined thyroid radiology PDF: structured findings pages (drawn in jsPDF from
 * the frozen snapshot — content single-sourced, no new dependency) followed by
 * the machine-image montage (the same cell-composition as the Radiology Studio).
 *
 * @param snapshotOrReport report (uses reportSnapshot when signed)
 * @param nodules  array
 * @param patient  { uhid, firstName, lastName, sex }
 * @param images   [{ src, brightness, scale, offsetX, offsetY }] object URLs, in order
 * @param opts     { output: 'save'|'blob', montage: {orientation, cols, rows} }
 */
export async function exportThyroidReportPdf(snapshotOrReport, nodules = [], patient = {}, images = [], opts = {}) {
  const r = snapshotOrReport.reportSnapshot?.report || snapshotOrReport;
  const nods = snapshotOrReport.reportSnapshot?.nodules || nodules;
  const pt = snapshotOrReport.reportSnapshot?.patient || patient;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const M = 16, W = 210, LH = 5.4;
  let y = M;
  const ensure = (need = LH) => { if (y + need > 285) { doc.addPage(); y = M; } };
  const h = (txt) => { ensure(8); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(13, 110, 130); doc.text(txt.toUpperCase(), M, y); doc.setTextColor(0); y += LH + 1; };
  const p = (txt, opt = {}) => {
    doc.setFont('helvetica', opt.bold ? 'bold' : 'normal'); doc.setFontSize(opt.size || 10);
    const lines = doc.splitTextToSize(txt, W - 2 * M);
    lines.forEach((ln) => { ensure(); doc.text(ln, opt.x || M, y); y += (opt.size ? opt.size * 0.5 : LH); });
  };

  // header
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(13, 110, 130);
  doc.text('COMPREHENSIVE DIABETES CENTRE', M, y); y += 6;
  doc.setTextColor(0); doc.setFontSize(11);
  doc.text(r.studyType === 'focused' ? 'Focused Thyroid Ultrasound Report' : 'Thyroid Ultrasound Report', M, y); y += 5;
  doc.setFontSize(8.5); doc.setTextColor(110);
  doc.text(`Report ${r.reportNumber || ''}`, M, y); doc.setTextColor(0); y += 4;
  doc.setDrawColor(180); doc.line(M, y, W - M, y); y += 6;

  // patient
  p(`Patient: ${(pt.firstName || '') + ' ' + (pt.lastName || '')}    UHID: ${pt.uhid || '—'}    Sex: ${pt.sex || pt.gender || '—'}    Exam date: ${r.examDate || '—'}`);
  y += 1;

  // findings
  h('Findings');
  p(snapshotOrReport.reportSnapshot?.narrative || r.findingsNarrative || engine.generateNarrative?.(r, nods) || '');
  y += 1;

  // measurements
  const rv = engine.volume(r.rightLength, r.rightHeight, r.rightWidth);
  const lv = engine.volume(r.leftLength, r.leftHeight, r.leftWidth);
  if (r.studyType !== 'focused' && (rv != null || lv != null)) {
    h('Thyroid measurements');
    if (rv != null) p(`Right lobe: ${r.rightLength} × ${r.rightHeight} × ${r.rightWidth} cm — ${rv} mL`);
    if (lv != null) p(`Left lobe: ${r.leftLength} × ${r.leftHeight} × ${r.leftWidth} cm — ${lv} mL`);
    if (r.isthmusThickness) p(`Isthmus: ${r.isthmusThickness} cm (AP)`);
    y += 1;
  }

  // nodules
  h('Nodules');
  if (r.noNodules) p('No discrete thyroid nodules identified.');
  else nods.forEach((n) => {
    const t = engine.computeTirads(n);
    const fa = n.ThyroidNoduleFollicularAssessment;
    const conc = (n.follicularIndicated === 'indicated' && fa) ? engine.follicularConcern(fa, n) : null;
    p(`Nodule ${n.noduleNumber} — ${cap(n.lobe)}${n.pole ? ', ' + n.pole : ''}${engine.volume(n.length, n.height, n.width) ? `, ${n.length}×${n.height}×${n.width} cm (${engine.volume(n.length, n.height, n.width)} mL)` : ''}`, { bold: true });
    p(`ACR TI-RADS: ${t.insufficient ? 'insufficient information' : `${t.category} (${t.points} pts) — ${TR_LABEL[t.category]}`}${n.btaCategory ? ` · BTA ${n.btaCategory}` : ''}`);
    if (conc) p(`Follicular concern: ${conc.concern.toUpperCase()}${conc.features.length ? ' — ' + conc.features.join(', ') : ''}. Not diagnostic; histopathology required.`);
    y += 1;
  });

  // nodes + conclusion + plan
  h('Cervical lymph nodes');
  p(r.lymphNodeAssessment === 'normal' ? 'No suspicious cervical lymphadenopathy.' : r.lymphNodeAssessment === 'suspicious' ? 'Suspicious cervical lymph node(s).' : 'Not assessed.');
  y += 1;
  h('Conclusion');
  (r.conclusion || []).forEach((c) => p('• ' + c));
  if (r.plan?.length || r.planOther) { y += 1; h('Recommendation'); (r.plan || []).forEach((pl) => p('• ' + pl)); if (r.planOther) p('• ' + r.planOther); }

  // signature
  y += 4; ensure(14); doc.setDrawColor(180); doc.line(M, y, W - M, y); y += 5;
  p(snapshotOrReport.signedName || snapshotOrReport.reportSnapshot?.signatory?.name || '________________', { bold: true });
  p(`${snapshotOrReport.signedDesignation || ''}${snapshotOrReport.signedLicence ? ' · ' + snapshotOrReport.signedLicence : ''}`, { size: 8 });
  p(`Electronically signed${snapshotOrReport.signedAt ? ' — ' + new Date(snapshotOrReport.signedAt).toLocaleString() : ''}`, { size: 8 });

  // ---- image montage pages (same composition as the Radiology Studio) ----
  if (images.length) {
    const cols = opts.montage?.cols || 2, rows = opts.montage?.rows || 3, per = cols * rows;
    const HH = 10, gap = 4, gridW = W - 2 * M, gridH = 297 - 2 * M - HH;
    const cw = (gridW - (cols - 1) * gap) / cols, ch = (gridH - (rows - 1) * gap) / rows;
    for (let i = 0; i < images.length; i++) {
      if (i % per === 0) { doc.addPage(); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Ultrasound images', M, M + 4); doc.setDrawColor(180); doc.line(M, M + HH - 2, W - M, M + HH - 2); }
      const slot = i % per, col = slot % cols, row = Math.floor(slot / cols);
      const x = M + col * (cw + gap), yy = M + HH + row * (ch + gap);
      try {
        const canvas = await composeCell(images[i], cw, ch);
        doc.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', x, yy, cw, ch);
      } catch { /* skip a broken image */ }
      doc.setDrawColor(225); doc.rect(x, yy, cw, ch);
      if (images[i].caption) { doc.setFontSize(7); doc.setTextColor(90); doc.text(String(images[i].caption).slice(0, 60), x + 1, yy + ch - 1); doc.setTextColor(0); }
    }
  }

  const safe = (s, f) => (String(s || '').replace(/[^A-Za-z0-9 _-]/g, '').replace(/\s+/g, ' ').trim() || f);
  const filename = `${safe(pt.uhid, 'unassigned')}_${safe((pt.firstName || '') + ' ' + (pt.lastName || ''), 'Patient')}_Thyroid Ultrasound.pdf`;
  if (opts.output === 'blob') return { filename, blob: doc.output('blob') };
  doc.save(filename);
  return { filename };
}

const PX = 12;
function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('img')); im.src = src; }); }
async function composeCell(img, cellW, cellH) {
  const el = await loadImage(img.src);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(cellW * PX); canvas.height = Math.round(cellH * PX);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.filter = `brightness(${img.brightness ?? 1})`;
  const fit = Math.min(canvas.width / el.naturalWidth, canvas.height / el.naturalHeight);
  const dw = el.naturalWidth * fit * (img.scale ?? 1), dh = el.naturalHeight * fit * (img.scale ?? 1);
  const dx = (canvas.width - dw) / 2 + (img.offsetX ?? 0) * canvas.width;
  const dy = (canvas.height - dh) / 2 + (img.offsetY ?? 0) * canvas.height;
  ctx.drawImage(el, dx, dy, dw, dh);
  return canvas;
}
function cap(s) { return (s || '').charAt(0).toUpperCase() + (s || '').slice(1); }

export default exportThyroidReportPdf;
