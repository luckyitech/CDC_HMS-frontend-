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
 */
const usePrint = () => {
  const printRef = useRef(null);

  const handlePrint = useCallback(() => {
    const node = printRef.current;
    if (!node) return;

    node.classList.add("is-printing");
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      node.classList.remove("is-printing");
      window.removeEventListener("afterprint", cleanup);
      clearTimeout(fallback);
    };
    window.addEventListener("afterprint", cleanup);
    // Safety net: some mobile browsers don't reliably fire `afterprint`,
    // which would otherwise leave this node marked as the print target
    // indefinitely and bleed into the next, unrelated print action.
    const fallback = setTimeout(cleanup, 3000);

    window.print();
  }, []);

  return { printRef, handlePrint };
};

export default usePrint;
