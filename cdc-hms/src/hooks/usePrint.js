import { useRef } from "react";

/**
 * usePrint — reusable print hook for every print action in the system.
 *
 * Usage:
 *   const { printRef, handlePrint } = usePrint();
 *   <button onClick={handlePrint}>Print</button>
 *   <div ref={printRef}>…document body…</div>
 *
 * Why this is NOT react-to-print.
 * react-to-print prints by building a hidden <iframe> and calling print() on
 * it. Desktop browsers print the iframe fine — but iOS / iPadOS Safari CANNOT
 * print an iframe and silently prints the visible page instead, so on the
 * clinic tablets every prescription / lab request came out looking like a
 * "screenshot" of the app screen rather than the letterhead document.
 *
 * Instead we print the MAIN document, which every browser (tablets included)
 * prints correctly: on print we clone the ref'd content into a `.print-portal`
 * appended directly to <body>, and an injected @media print stylesheet hides
 * the live app (#root) and shows only the portal. Tailwind classes still apply
 * because it is the same document, so the printout matches what desktop
 * produced before. Everything is torn down again on `afterprint`.
 *
 * ⚠️ iOS gesture rule: Safari on iPad/iPhone only honours window.print() when it
 * is called SYNCHRONOUSLY inside the tap handler. Calling it from a promise or
 * setTimeout callback (e.g. after waiting for images to load) is silently
 * ignored — the button appears to do nothing. So we print immediately here. The
 * letterhead logo is already loaded (it is shown in the on-screen preview / the
 * off-screen PrintRoot), so the clone renders fully without any wait.
 *
 * ⚠️ iOS teardown rule: on iPad window.print() returns immediately and the print
 * sheet renders the page LATER (and re-renders it whenever the printer or paper
 * changes). iOS may also fire `afterprint` straight away. Tearing the portal
 * down on `afterprint` or on a timer therefore removed the document before
 * iOS captured it, so nothing (or the app screen) printed. We now leave the
 * portal in place — it is display:none on screen — and remove it on the user's
 * next tap/keypress in the app (which can only happen once the print sheet is
 * closed) or at the start of the next print.
 *
 * Default paper size A4 (changeable in the browser dialog). The @page margin
 * gives multi-page documents top/bottom breathing room; the content's own
 * padding controls the sides.
 */
let teardownActive = null;

/**
 * printElement — print a DOM node (cloned) or an HTML string on the main
 * document. Shared by usePrint and the label/summary printers in utils/print.
 * Must be called synchronously inside the tap/click handler (iOS gesture rule).
 */
export const printElement = (content, { pageSize = "A4", pageMargin = "14mm 0" } = {}) => {
  teardownActive?.();

  // A detached copy of the content, mounted as a direct child of <body> so a
  // single CSS rule can isolate it from the rest of the app when printing.
  const portal = document.createElement("div");
  portal.className = "print-portal";
  if (typeof content === "string") portal.innerHTML = content;
  else portal.appendChild(content.cloneNode(true));

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
      margin: ${pageMargin};
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

  const cleanup = () => {
    if (teardownActive !== cleanup) return;
    teardownActive = null;
    document.removeEventListener("pointerdown", cleanup, true);
    document.removeEventListener("keydown", cleanup, true);
    portal.remove();
    style.remove();
  };
  teardownActive = cleanup;

  // Print NOW, synchronously inside the user gesture (see the iOS note above).
  window.print();

  // Tear down on the next interaction with the app (see the iOS teardown rule).
  // Registered after this tick so the tap that started the print can't trigger it.
  setTimeout(() => {
    if (teardownActive !== cleanup) return;
    document.addEventListener("pointerdown", cleanup, true);
    document.addEventListener("keydown", cleanup, true);
  }, 0);
};

const usePrint = ({ pageSize = "A4" } = {}) => {
  const printRef = useRef(null);

  const handlePrint = () => {
    const node = printRef.current;
    if (!node) return;
    printElement(node, { pageSize });
  };

  return { printRef, handlePrint };
};

export default usePrint;
