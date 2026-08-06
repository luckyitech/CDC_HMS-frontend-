import { isAmountLike } from "../../utils/money";

// The rules a payment form obeys, kept out of the component so they can be
// shared by the checkout (which submits a payment as part of the discharge)
// and by RecordPaymentModal (which submits one on its own).
//
// Every rule here is also enforced on the server. These exist so the desk hears
// about a problem immediately rather than after a round trip — the server
// remains the authority, and anything this misses it still rejects.

/** A blank payment, defaulting to the first method the server offers. */
export const emptyPayment = (methods = []) => ({
  method: methods[0]?.value || "cash",
  amount: "",
  reference: "",
  cardLast4: "",
  insuranceScheme: "",
  insuranceMemberNo: "",
});

/** Has the user entered anything worth submitting? */
export const hasPayment = (payment) => !!String(payment?.amount ?? "").trim();

/**
 * Why this payment can't be submitted yet, or null if it can.
 *
 * Which fields are required comes from the SERVER's method spec, not from a
 * list here — so a method added on the backend is validated correctly with no
 * change to this file.
 */
export const validatePayment = (payment, methods = []) => {
  const spec = methods.find((m) => m.value === payment.method);
  if (!spec) return "Choose a payment method";

  if (!hasPayment(payment)) return "Enter the amount received";
  if (!isAmountLike(payment.amount)) return "Amount must be a figure like 2500 or 2500.50";
  if (Number(String(payment.amount).replace(/,/g, "")) <= 0) return "Amount must be more than zero";

  if (spec.reference === "required" && !String(payment.reference).trim()) {
    return `Enter the ${spec.referenceLabel?.toLowerCase() || "reference"}`;
  }
  if (spec.capturesCardLast4 && payment.cardLast4 && !/^\d{4}$/.test(payment.cardLast4.trim())) {
    return "Card digits must be the last four digits of the card";
  }
  return null;
};

/** The request body for POST /billing/payments. */
export const paymentPayload = (payment, invoiceId) => ({
  invoiceId,
  method: payment.method,
  amount: String(payment.amount).trim(),
  reference: payment.reference?.trim() || null,
  cardLast4: payment.cardLast4?.trim() || null,
  insuranceScheme: payment.insuranceScheme?.trim() || null,
  insuranceMemberNo: payment.insuranceMemberNo?.trim() || null,
});
