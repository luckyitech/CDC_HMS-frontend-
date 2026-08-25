import { useRef, useCallback } from "react";

/**
 * usePrint — reusable print hook for all print actions in the system.
 *
 * Usage:
 *   const { printRef, handlePrint } = usePrint();
 *
 * 1. Attach `ref={printRef}` to the div that contains the content to print.
 * 2. Call `handlePrint()` from a button or any event handler.
 *
 * Calls window.print() directly and synchronously on the tap that triggers
 * it, rather than building a hidden iframe and printing that (as the old
 * react-to-print-based version did). iOS Safari treats window.print() as
 * needing to fire essentially in the same tick as the user's tap — once an
 * iframe's create-and-load cycle plus a setTimeout sits in between, Safari
 * can silently drop the call with no dialog and no error, which is why
 * printing from an iPad went nowhere. See index.css's `@media print` block
 * for what actually controls what becomes visible during printing.
 *
 * Note for anyone tempted to position the print target with `position: fixed`
 * to escape a modal's overflow: WebKit/Safari does not paint fixed-position
 * elements into print output at all, so that prints a blank document there
 * while looking fine in Chrome. The target stays in static flow and the
 * clipping ancestors are neutralised instead.
 */
const usePrint = () => {
  const printRef = useRef(null);

  const handlePrint = useCallback(() => {
    const node = printRef.current;

    // Never bail out silently. A missing ref means the page prints unstyled
    // rather than the button appearing dead — a wrong printout is diagnosable,
    // a button that does nothing at all is not.
    if (!node) {
      console.warn("usePrint: printRef is not attached to any element; printing the page as-is.");
      window.print();
      return;
    }

    node.classList.add("is-printing");
    // Tells the print stylesheet that a specific target is taking over the
    // page. Without it, the stylesheet leaves a plain Cmd+P alone rather than
    // blanking the whole document.
    document.body.classList.add("is-printing-active");

    // Mark every ancestor up to <body> so the print stylesheet can undo the
    // modal overlays / scroll containers wrapping this content. Without it the
    // printed document is clipped to whatever one screenful of that container
    // showed. See the `.is-printing-ancestor` rules in index.css.
    const ancestors = [];
    for (let el = node.parentElement; el && el !== document.body; el = el.parentElement) {
      el.classList.add("is-printing-ancestor");
      ancestors.push(el);
    }

    let cleaned = false;
    let fallback;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      node.classList.remove("is-printing");
      document.body.classList.remove("is-printing-active");
      ancestors.forEach((el) => el.classList.remove("is-printing-ancestor"));
      window.removeEventListener("afterprint", cleanup);
      clearTimeout(fallback);
    };
    window.addEventListener("afterprint", cleanup);
    // Safety net: some mobile browsers don't reliably fire `afterprint`,
    // which would otherwise leave this node marked as the print target
    // indefinitely and bleed into the next, unrelated print action.
    fallback = setTimeout(cleanup, 3000);

    // Wrapped so a throw here can never leave the app stuck mid-print with
    // the screen UI hidden by the print stylesheet.
    try {
      window.print();
    } catch (err) {
      console.error("usePrint: window.print() failed", err);
      cleanup();
    }
  }, []);

  return { printRef, handlePrint };
};

export default usePrint;
