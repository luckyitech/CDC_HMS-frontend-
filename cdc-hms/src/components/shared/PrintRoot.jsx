import PrintLetterhead from './PrintLetterhead';

/**
 * PrintRoot — the off-screen print target every print action shares, so EVERY
 * printed document carries the same clinic letterhead (DRY). Pair with usePrint:
 *
 *   const { printRef, handlePrint } = usePrint();
 *   <button onClick={handlePrint}>Print</button>
 *   <PrintRoot printRef={printRef}>…document body…</PrintRoot>
 *
 * Positioned off-screen (NOT display:none — a display:none element is never
 * rendered at all, so print CSS could never bring it back). The
 * `print-target` class is what index.css's `@media print` block and
 * usePrint's `is-printing` toggle key off to show this and hide everything
 * else in the app when this specific instance is the one being printed.
 */
const PrintRoot = ({ printRef, children }) => (
  <div ref={printRef} className="print-target fixed top-0 -left-[10000px] w-[210mm] bg-white" aria-hidden="true">
    <div className="p-8 bg-white">
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
