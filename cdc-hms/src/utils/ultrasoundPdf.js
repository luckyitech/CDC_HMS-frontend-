import { jsPDF } from 'jspdf';

/**
 * HMIS V4 — client-side ultrasound PDF report.
 *
 * Layout configurable: orientation portrait/landscape, grid 2×3 or 3×2.
 * WYSIWYG guarantee: each cell is composed on an offscreen canvas with the
 * cell's exact aspect ratio, using the same transform as the workspace
 * preview — image contained in the cell, scaled about the centre, panned by
 * offset × cell size, clipped by the cell. What fills the box on screen
 * fills the cell in print; nothing is cropped that isn't cropped on screen.
 */

const MARGIN = 12;      // mm
const HEADER_H = 20;    // mm
const CELL_GAP = 4;     // mm
const PX_PER_MM = 12;   // ≈300 dpi cell rendering

/** Load a blob/object URL into an HTMLImageElement. */
const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('Failed to load image for PDF export'));
  img.src = src;
});

/**
 * Compose one cell: mirrors the preview exactly.
 *   contained-fit → scale about centre → translate by offset × cell size,
 * clipped to the cell bounds. Brightness baked in.
 */
const composeCell = (img, { brightness = 1, scale = 1, offsetX = 0, offsetY = 0 }, cellW, cellH) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(cellW * PX_PER_MM);
  canvas.height = Math.round(cellH * PX_PER_MM);
  const ctx = canvas.getContext('2d');
  // Black cell background — matches the on-screen box (and JPEG has no alpha)
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.filter = `brightness(${brightness})`;

  const fit0 = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
  const dw = img.naturalWidth * fit0 * scale;
  const dh = img.naturalHeight * fit0 * scale;
  const dx = (canvas.width - dw) / 2 + offsetX * canvas.width;
  const dy = (canvas.height - dh) / 2 + offsetY * canvas.height;

  ctx.drawImage(img, dx, dy, dw, dh);
  return canvas;
};

const drawHeader = (doc, geom, { patientName, uhid, studyDate, exportedAt }, pageNum, pageCount) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Ultrasound Report — Comprehensive Diabetes Centre', MARGIN, MARGIN + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(
    `Patient: ${patientName || '—'}   ·   ID: ${uhid || '—'}   ·   Study date: ${studyDate || '—'}`,
    MARGIN,
    MARGIN + 11,
  );
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Exported: ${exportedAt}`, MARGIN, MARGIN + 15.5);
  doc.text(`Page ${pageNum} of ${pageCount}`, geom.pageW - MARGIN, MARGIN + 15.5, { align: 'right' });
  doc.setTextColor(0);
  doc.setDrawColor(180);
  doc.line(MARGIN, MARGIN + HEADER_H - 2, geom.pageW - MARGIN, MARGIN + HEADER_H - 2);
};

/**
 * Generate the PDF.
 *
 * @param {Array}  images  [{ src, brightness, scale, offsetX, offsetY }] in order
 * @param {Object} patient { patientName, uhid, studyDate }
 * @param {Object} opts    { orientation, cols, rows, output: 'save'|'blob' }
 * @returns {Promise<{filename: string, blob?: Blob}>}
 */
export const exportUltrasoundPdf = async (images, patient, opts = {}) => {
  if (!images.length) throw new Error('No images selected for export.');

  const orientation = opts.orientation === 'portrait' ? 'portrait' : 'landscape';
  const cols = opts.cols || (orientation === 'landscape' ? 3 : 2);
  const rows = opts.rows || (orientation === 'landscape' ? 2 : 3);
  const perPage = cols * rows;

  const pageW = orientation === 'landscape' ? 297 : 210;
  const pageH = orientation === 'landscape' ? 210 : 297;
  const gridW = pageW - 2 * MARGIN;
  const gridH = pageH - 2 * MARGIN - HEADER_H;
  const cellW = (gridW - (cols - 1) * CELL_GAP) / cols;
  const cellH = (gridH - (rows - 1) * CELL_GAP) / rows;
  const geom = { pageW, pageH };

  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const pageCount = Math.ceil(images.length / perPage);
  const exportedAt = new Date().toLocaleString();

  for (let i = 0; i < images.length; i++) {
    const page = Math.floor(i / perPage);
    const slot = i % perPage;

    if (slot === 0) {
      if (page > 0) doc.addPage();
      drawHeader(doc, geom, { ...patient, exportedAt }, page + 1, pageCount);
    }

    const col = slot % cols;
    const row = Math.floor(slot / cols);
    const cellX = MARGIN + col * (cellW + CELL_GAP);
    const cellY = MARGIN + HEADER_H + row * (cellH + CELL_GAP);

    const img = await loadImage(images[i].src);
    const canvas = composeCell(img, images[i], cellW, cellH);

    // The canvas IS the cell — place it exactly. JPEG keeps the file ~10×
    // smaller than PNG (must stay under the 25MB document-upload limit).
    doc.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', cellX, cellY, cellW, cellH);

    // Faint cell border for visual structure
    doc.setDrawColor(225);
    doc.rect(cellX, cellY, cellW, cellH);
  }

  // Filename: <ClinicNumber>_<Name>_<Imaging modality>.pdf
  const safe = (s, fallback) =>
    (String(s || '').replace(/[^A-Za-z0-9 _-]/g, '').replace(/\s+/g, ' ').trim() || fallback);
  const filename = `${safe(patient.uhid, 'unassigned')}_${safe(patient.patientName, 'Patient')}_${safe(patient.modality, 'Ultrasound')}.pdf`;

  if (opts.output === 'blob') {
    return { filename, blob: doc.output('blob') };
  }
  doc.save(filename);
  return { filename };
};

export default exportUltrasoundPdf;
