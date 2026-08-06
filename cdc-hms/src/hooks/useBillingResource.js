import { useState, useEffect, useCallback } from "react";
import { useBillingContext } from "../contexts/BillingContext";

/**
 * Fetch one billing resource, with its loading state and a reload handle.
 *
 * Every billing tab needs the same three things — fetch on mount, refetch when
 * a filter changes, refetch after a write — and each was growing its own copy
 * of the same dozen lines. This is that, once.
 *
 * Errors are already handled: `run` shows the server's own message and returns
 * a failure, so a tab renders its empty state rather than crashing. Callers
 * never write try/catch.
 *
 * `fetcher` MUST be memoised by the caller with useCallback, listing whatever
 * it closes over. That is what drives a refetch — the hook re-runs exactly when
 * the caller's own dependencies say it should:
 *
 *   const fetcher = useCallback(() => billingService.getCashUp(date), [date]);
 *   const { data, loading, reload } = useBillingResource(fetcher);
 */

// One definition of "what the state becomes after a fetch", used by both the
// mount effect and the manual reload so the two can never disagree.
const resultToState = (res) => ({ data: res.success ? res.data : null, loading: false });

export const useBillingResource = (fetcher) => {
  const { run } = useBillingContext();
  const [state, setState] = useState({ data: null, loading: true });

  useEffect(() => {
    // Guards against an out-of-order response. Change a filter twice quickly
    // and two requests are in flight; without this the SLOWER one wins and the
    // table shows results for a filter the user has already moved on from.
    let cancelled = false;

    (async () => {
      const res = await run(fetcher);
      if (!cancelled) setState(resultToState(res));
    })();

    return () => { cancelled = true; };
  }, [run, fetcher]);

  /**
   * Refetch after a write — a payment taken, an invoice voided.
   *
   * Deliberately leaves the current data on screen while it runs rather than
   * flashing an empty table, and is only ever called from an event handler.
   */
  const reload = useCallback(async () => {
    const res = await run(fetcher);
    setState(resultToState(res));
    return res;
  }, [run, fetcher]);

  return { data: state.data, loading: state.loading, reload };
};

export default useBillingResource;
