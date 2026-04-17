import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

/**
 * usePrint — reusable print hook for all print actions in the system.
 *
 * Usage:
 *   const { printRef, handlePrint } = usePrint();
 *
 * 1. Attach `ref={printRef}` to the div that contains the content to print.
 * 2. Call `handlePrint()` from a button or any event handler.
 *
 * Default paper size: A4 (user can change in the browser print dialog).
 * @page margin is set to 0 so the content's own padding controls spacing,
 * and browser-added headers/footers (date, URL) are suppressed.
 */
const usePrint = ({ pageSize = "A4" } = {}) => {
  const printRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    pageStyle: `
      @page {
        size: ${pageSize};
        margin: 0;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
      }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    `,
  });

  return { printRef, handlePrint };
};

export default usePrint;
