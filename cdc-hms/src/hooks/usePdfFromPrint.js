import { useCallback } from 'react';

// Turn the same letterhead DOM that usePrint prints into a PDF Blob, for
// "Send via WhatsApp". Uses jsPDF + html2canvas (both already in the bundle as
// jsPDF's optional dependency), so no server-side PDF and no new dependency.
// The server stores the exact bytes it receives on the outbound message.
const usePdfFromPrint = (printRef) => useCallback(async (filename = 'document.pdf') => {
  const node = printRef?.current;
  if (!node) throw new Error('Nothing to render.');
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')]);
  const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const img = canvas.toDataURL('image/jpeg', 0.92);
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;
  let remaining = imgH;
  let position = 0;
  // Paginate a tall document across A4 pages.
  while (remaining > 0) {
    pdf.addImage(img, 'JPEG', 0, position, imgW, imgH);
    remaining -= pageH;
    if (remaining > 0) { pdf.addPage(); position -= pageH; }
  }
  const blob = pdf.output('blob');
  return new File([blob], filename, { type: 'application/pdf' });
}, [printRef]);

export default usePdfFromPrint;
