import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Render the neuropathy report DOM (laid out at A4 width) into an A4 PDF blob.
// Mirrors the ultrasound report's Print/Save mechanism (jsPDF + a blob filed to
// Medical Documents), sourced from the rendered report so screen == print == PDF.
export const buildReportPdf = async (element, { filename = 'report.pdf' } = {}) => {
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
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;
  const img = canvas.toDataURL('image/jpeg', 0.92);

  if (imgH <= pageH) {
    doc.addImage(img, 'JPEG', 0, 0, imgW, imgH);
  } else {
    // Taller than one page — slice it across pages (standard html2canvas trick).
    let remaining = imgH;
    let pos = 0;
    doc.addImage(img, 'JPEG', 0, pos, imgW, imgH);
    remaining -= pageH;
    while (remaining > 0) {
      pos -= pageH;
      doc.addPage();
      doc.addImage(img, 'JPEG', 0, pos, imgW, imgH);
      remaining -= pageH;
    }
  }
  return { filename, blob: doc.output('blob') };
};

export default buildReportPdf;
