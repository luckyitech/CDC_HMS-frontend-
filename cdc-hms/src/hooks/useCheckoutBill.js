import { useState, useEffect, useCallback, useMemo } from "react";
import { useBillingContext } from "../contexts/BillingContext";
import billingService from "../services/billingService";
import { emptyPayment, validatePayment, paymentPayload, hasPayment } from "../components/billing/paymentForm";

/**
 * The bill behind the Confirm & Discharge modal.
 *
 * All of the checkout's billing behaviour lives here so QueueManagement — an
 * 800-line screen the clinic depends on — gains a hook call and a component
 * rather than three hundred lines of new logic.
 *
 * The shape of it:
 *
 *   - Opening the modal opens a DRAFT invoice for the visit. That call is
 *     idempotent, so reopening resumes the same bill instead of raising a
 *     second one.
 *   - Every tick, untick, scan or quantity change re-sends the SELECTION and
 *     the server sends back priced lines. The browser never resolves a label to
 *     a price and never computes VAT — one implementation of that, server-side.
 *   - Issuing and paying happen as part of the discharge, and both are safe to
 *     retry: an already-issued bill is not issued twice, and a payment already
 *     banked is not banked twice.
 *
 * When `enabled` is false — the user has no billing permission, or the modal is
 * shut — this does nothing at all and makes no requests.
 */

const SYNC_DELAY_MS = 500;

export const useCheckoutBill = ({ enabled, queueItem, charges, procedures, supplies }) => {
  const { config, options, currency, run, loadConfig } = useBillingContext();

  const [invoice, setInvoice] = useState(null);
  const [opening, setOpening] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [payment, setPayment] = useState(() => emptyPayment(options.paymentMethods));

  // Stops a retried discharge banking the same payment twice. State rather
  // than a ref so it can be reset in the render-phase block below — refs may
  // not be written during render.
  const [banked, setBanked] = useState(false);

  const queueId = queueItem?.id;

  // ---- reset when the modal moves to a different visit ---------------------
  // Adjusted during render rather than in an effect, which is what React
  // recommends for "a prop changed, so this state is stale".
  //
  // As an effect it was also a race: the effect that opens the draft is
  // declared first, so a reset running afterwards could null out an invoice
  // that had just arrived. Doing it here means the reset is already applied
  // before any effect runs.
  const [lastQueueId, setLastQueueId] = useState(queueId);
  if (queueId !== lastQueueId) {
    setLastQueueId(queueId);
    setInvoice(null);
    setPayment(emptyPayment(options.paymentMethods));
    setBanked(false);
  }

  // ---- make sure the clinic's billing config is loaded ---------------------
  // The payment methods, their reference rules and the currency all come from
  // it. Only the Billing page used to fetch it, so a receptionist who went
  // straight from the queue to a discharge — the normal path — was shown a
  // payment form with NO methods on it and could not take money at all.
  useEffect(() => {
    if (!enabled || config) return;
    loadConfig();
  }, [enabled, config, loadConfig]);

  // ---- open the draft ------------------------------------------------------
  useEffect(() => {
    if (!enabled || !queueId) return;
    let cancelled = false;

    (async () => {
      setOpening(true);
      const res = await run(() => billingService.openForQueue(queueId), {
        fallback: "Could not open the bill for this visit",
      });
      if (cancelled) return;
      setOpening(false);
      if (res.success) setInvoice(res.data);
    })();

    return () => { cancelled = true; };
  }, [enabled, queueId, run]);

  // ---- keep the draft in step with the screen ------------------------------
  // A string key rather than the arrays themselves: QueueManagement rebuilds
  // those on every render, so depending on them directly would sync forever.
  // `p` is the price reception typed for a supply that no service prices. It
  // rides along in the selection — and therefore in this key — so it survives
  // the re-sync that replaces every line, and so typing it triggers one.
  const selectionKey = useMemo(() => JSON.stringify({
    charges,
    procedures,
    supplies: (supplies || []).map((s) => ({
      b: s.stockBatchId, q: Number(s.quantity), n: s.name, p: s.adhocPrice || null,
    })),
  }), [charges, procedures, supplies]);

  const invoiceId = invoice?.id;
  const isDraft = invoice?.status === "draft";

  useEffect(() => {
    if (!enabled || !invoiceId || !isDraft) return;
    let cancelled = false;

    // Debounced: ticking three charges in quick succession is one request, not
    // three, and the last one wins.
    const timer = setTimeout(async () => {
      setSyncing(true);
      const selection = JSON.parse(selectionKey);
      const res = await run(
        () => billingService.setSelection(invoiceId, {
          charges: selection.charges,
          procedures: selection.procedures,
          supplies: selection.supplies.map((s) => ({
            stockBatchId: s.b, quantity: s.q, name: s.n, adhocPrice: s.p,
          })),
        }),
        { fallback: "Could not price this visit" }
      );
      if (cancelled) return;
      setSyncing(false);
      if (res.success) setInvoice(res.data);
    }, SYNC_DELAY_MS);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [enabled, invoiceId, isDraft, selectionKey, run]);

  // ---- what the screen needs to render ------------------------------------
  const lines = useMemo(() => invoice?.lines || [], [invoice]);

  // Charges and procedures match on description — the line's description IS
  // the label the doctor ticked. Supplies match on batch, which is exact and
  // survives a service being named differently from its stock item.
  const lineByLabel = useMemo(
    () => new Map(lines.filter((l) => !l.stockBatchId).map((l) => [l.description, l])),
    [lines]
  );
  const lineByBatch = useMemo(
    () => new Map(lines.filter((l) => l.stockBatchId).map((l) => [l.stockBatchId, l])),
    [lines]
  );

  const unpricedLines = useMemo(
    () => lines.filter((l) => l.unitPriceMinor === null || l.unitPriceMinor === undefined),
    [lines]
  );

  // A bill with nothing on it is not a bill; one with an unpriced line would
  // quietly undercharge. Either way there is nothing to issue.
  const canIssue = lines.length > 0 && unpricedLines.length === 0;

  // Pricing an unpriced item no longer happens here.
  //
  // A scanned supply that no service prices is given a price ON ITS OWN ROW in
  // the checkout, which sets `adhocPrice` in the supply state and flows through
  // the selection above. That keeps it a ONE-OFF price on ONE line: it never
  // touches the price list, so the person taking the money cannot set what the
  // clinic charges — only what this patient is charged for this item, with
  // their name recorded against it.
  //
  // An unpriced SERVICE (a charge or procedure whose price list row has none)
  // is deliberately not fixable from here: changing the price list is
  // 'billing.manage' work. The visit still discharges; the bill stays a draft
  // and appears on the Unbilled visits report.

  /**
   * Issue the bill and bank the payment, as part of the discharge.
   *
   * Called only when `canIssue`; the caller discharges without a bill
   * otherwise. Both steps are individually skippable on a retry, because by the
   * time this runs the supplies have already left stock and the visit MUST be
   * closable.
   */
  const finalise = useCallback(async () => {
    if (!invoice) return { ok: false, message: "No bill is open for this visit" };

    let current = invoice;

    // 1. Issue — skipped if a previous attempt already got this far.
    if (current.status === "draft") {
      const res = await run(() => billingService.issueInvoice(current.id));
      if (!res.success) return { ok: false, message: res.message };
      current = res.data;
      setInvoice(current);
    }

    // 2. Payment — only if reception entered one, and only once. `banked` is
    // the state flag set by a previous attempt; bankedPayment is what this
    // attempt recorded, if anything.
    let bankedPayment = null;
    if (hasPayment(payment) && !banked) {
      const problem = validatePayment(payment, options.paymentMethods);
      if (problem) return { ok: false, message: problem, invoice: current };

      const res = await run(() => billingService.recordPayment(paymentPayload(payment, current.id)));
      if (!res.success) return { ok: false, message: res.message, invoice: current };

      setBanked(true);
      bankedPayment = res.data.payment;
      current = res.data.invoice;
      setInvoice(current);
    }

    return { ok: true, invoice: current, payment: bankedPayment };
  }, [invoice, payment, banked, options.paymentMethods, run]);

  return {
    invoice,
    currency,
    methods: options.paymentMethods,
    busy: opening || syncing,
    syncing,
    lineByLabel,
    lineByBatch,
    unpricedLines,
    canIssue,
    payment,
    setPayment,
    finalise,
  };
};

export default useCheckoutBill;
