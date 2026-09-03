import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Render the neuropathy report DOM (laid out at A4 width) into an A4 PDF blob.
// Mirrors the ultrasound report's Print/Save mechanism (jsPDF + a blob filed to
// Medical Documents), sourced from the rendered report so screen == print == PDF.
export const buildReportPdf = async (element, { filename = 'report.pdf' } = {}) => {
  // Let web fonts settle before capture. html2canvas measures text at capture
  // time; an unsettled font can drop the inter-word spaces in the letterhead
  // heading (COMPREHENSIVE DIABETES CENTRE rendering as one word).
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try { await document.fonts.ready; } catch { /* non-fatal */ }
  }
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    windowWidth: element.scrollWidth,
  });
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let imgW = pageW;
  let imgH = (canvas.height * imgW) / canvas.width;
  // Fit the whole report onto ONE A4 page — scale down if it is taller than the
  // page and centre it horizontally (a neuropathy report is always one page).
  if (imgH > pageH) {
    imgW *= pageH / imgH;
    imgH = pageH;
  }
  const x = (pageW - imgW) / 2;
  const img = canvas.toDataURL('image/jpeg', 0.92);
  doc.addImage(img, 'JPEG', x, 0, imgW, imgH);
  return { filename, blob: doc.output('blob') };
};

export default buildReportPdf;
