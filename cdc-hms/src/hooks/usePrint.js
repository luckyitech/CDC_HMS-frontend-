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
        /* Vertical margin gives every page breathing room — a footer gap at the
           bottom of one page and a header gap at the top of the next, so multi-
           page documents never run content to the paper edge at a break. */
        margin: 14mm 0;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
      }
      /* Multi-page hygiene. Without these a long table splits mid-row and the
         column headings never reappear, so page 2 is a wall of unlabelled
         values — for a medication list that is a dispensing hazard, not just
         untidy. */
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr, img { break-inside: avoid; page-break-inside: avoid; }
      /* Never leave a heading stranded as the last line of a page. */
      h1, h2, h3, h4 { break-after: avoid; page-break-after: avoid; }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    `,
  });

  return { printRef, handlePrint };
};

export default usePrint;
