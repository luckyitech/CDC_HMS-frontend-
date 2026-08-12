import PrintLetterhead from './PrintLetterhead';

/**
 * PrintRoot — the off-screen print target every print action shares, so EVERY
 * printed document carries the same clinic letterhead (DRY). Pair with usePrint:
 *
 *   const { printRef, handlePrint } = usePrint();
 *   <button onClick={handlePrint}>Print</button>
 *   <PrintRoot printRef={printRef}>…document body…</PrintRoot>
 *
 * Positioned off-screen (NOT display:none — react-to-print needs it rendered;
 * a 0-height ancestor makes Chrome emit a blank first page).
 */
const PrintRoot = ({ printRef, children }) => (
  <div className="fixed top-0 -left-[10000px] w-[210mm] bg-white" aria-hidden="true">
    <div ref={printRef} className="p-8 bg-white">
      <PrintLetterhead show />
      {children}
      <div className="mt-8">
        <p className="text-xs text-gray-500">This is a computer-generated document</p>
        <p className="text-xs text-gray-500">Comprehensive Diabetes Centre · Nairobi, Kenya</p>
      </div>
    </div>
  </div>
);

export default PrintRoot;
