import { useRef } from "react";

/**
 * usePrint — reusable print hook for every print action in the system.
 *
 * Usage:
 *   const { printRef, handlePrint } = usePrint();
 *   <button onClick={handlePrint}>Print</button>
 *   <div ref={printRef}>…document body…</div>
 *
 * Why this is NOT react-to-print any more.
 * react-to-print prints by building a hidden <iframe> and calling print() on
 * it. Desktop browsers print the iframe fine — but iOS / iPadOS Safari CANNOT
 * print an iframe and silently prints the visible page instead. So on the
 * clinic tablets every prescription / lab request came out looking like a
 * "screenshot" of the app screen rather than the clean letterhead document.
 *
 * Instead we print the MAIN document, which every browser (tablets included)
 * prints correctly: on print we clone the ref'd content into a `.print-portal`
 * appended directly to <body>, and an injected @media print stylesheet hides
 * the live app (#root) and shows only the portal. Tailwind classes still apply
 * because it is the same document, so the printout is identical to what desktop
 * produced before. Everything is torn down again on `afterprint`.
 *
 * Default paper size A4 (changeable in the browser dialog). The @page margin
 * gives multi-page documents top/bottom breathing room; the content's own
 * padding controls the sides.
 */
const usePrint = ({ pageSize = "A4" } = {}) => {
  const printRef = useRef(null);

  const handlePrint = () => {
    const node = printRef.current;
    if (!node) return;

    // A detached copy of the content, mounted as a direct child of <body> so a
    // single CSS rule can isolate it from the rest of the app when printing.
    const portal = document.createElement("div");
    portal.className = "print-portal";
    portal.appendChild(node.cloneNode(true));

    const style = document.createElement("style");
    style.setAttribute("data-print-style", "");
    style.textContent = `
      /* Off-screen on screen; only ever visible on paper. */
      .print-portal { display: none; }
      @page {
        size: ${pageSize};
        /* Vertical margin gives every page breathing room — a footer gap at the
           bottom of one page and a header gap at the top of the next, so multi-
           page documents never run content to the paper edge at a break. */
        margin: 14mm 0;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          background: #fff !important;
        }
        /* Hide the live app; print ONLY the cloned document. This is what makes
           it work on iOS/iPadOS Safari (which prints the main document, never an
           iframe). */
        body > #root { display: none !important; }
        body > .print-portal { display: block !important; }
        /* Multi-page hygiene. Without these a long table splits mid-row and the
           column headings never reappear, so page 2 is a wall of unlabelled
           values — for a medication list that is a dispensing hazard, not just
           untidy. */
        .print-portal thead { display: table-header-group; }
        .print-portal tfoot { display: table-footer-group; }
        .print-portal tr, .print-portal img { break-inside: avoid; page-break-inside: avoid; }
        /* Never leave a heading stranded as the last line of a page. */
        .print-portal h1, .print-portal h2, .print-portal h3, .print-portal h4 {
          break-after: avoid; page-break-after: avoid;
        }
        /* Force full-colour printing across all browsers and devices, iOS included. */
        .print-portal * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(portal);

    let torndown = false;
    const cleanup = () => {
      if (torndown) return;
      torndown = true;
      window.removeEventListener("afterprint", cleanup);
      portal.remove();
      style.remove();
    };
    window.addEventListener("afterprint", cleanup);

    // Wait for any images in the clone (the letterhead logo) to be ready before
    // printing, then fire. A timed fallback tears down for the rare browser that
    // never emits `afterprint`.
    const imgs = Array.from(portal.querySelectorAll("img"));
    const ready = Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
            })
      )
    );

    ready.then(() => {
      // A beat for layout, then print.
      setTimeout(() => {
        window.print();
        setTimeout(cleanup, 2000);
      }, 50);
    });
  };

  return { printRef, handlePrint };
};

export default usePrint;
