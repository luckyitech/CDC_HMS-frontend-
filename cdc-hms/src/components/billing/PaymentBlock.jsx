import { Field, inputCls } from "../shared/formUi";
import { toAmountInput } from "../../utils/money";

// Payment capture — the one implementation, used by the invoice detail, the
// outstanding list and the discharge checkout.
//
// NOTHING HERE PROCESSES A PAYMENT. The card cleared on the bank's POS terminal
// and the M-Pesa on Safaricom's rails; this records money that has already
// moved, with whatever reference reconciles it against a statement later.
//
// Which fields appear, and which are required, comes entirely from the server's
// method spec (`options.paymentMethods`). There is no hardcoded list of methods
// in the frontend: adding one to the backend's constants/billing.js makes it
// appear here, correctly labelled, with no change to this file.

// emptyPayment / validatePayment / paymentPayload live in ./paymentForm.js —
// they are plain functions, and keeping them out of this file lets React Fast
// Refresh work on the component.

/**
 * @param {object} value        the payment being built
 * @param {func}   onChange     receives the whole updated payment
 * @param {array}  methods      options.paymentMethods from the server
 * @param {number} balanceMinor outstanding balance, for the "Pay full" shortcut
 */
const PaymentBlock = ({ value, onChange, methods = [], balanceMinor = null, currency = "KES" }) => {
  const spec = methods.find((m) => m.value === value.method);
  const set = (field, v) => onChange({ ...value, [field]: v });

  const pickMethod = (method) => {
    // Clearing the method-specific fields on switch stops a card's last-4
    // riding along on an M-Pesa payment, where it would be meaningless.
    onChange({ ...value, method, reference: "", cardLast4: "", insuranceScheme: "", insuranceMemberNo: "" });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {methods.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => pickMethod(m.value)}
            aria-pressed={value.method === m.value}
            className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all ${
              value.method === m.value
                ? "border-primary bg-blue-50 text-primary"
                : "border-gray-300 text-gray-600 hover:border-gray-400"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <Field label={`Amount (${currency})`}>
          <div className="flex gap-2">
            <input
              className={inputCls}
              value={value.amount}
              onChange={(e) => set("amount", e.target.value)}
              placeholder="0.00"
              inputMode="decimal"
            />
            {balanceMinor > 0 && (
              <button
                type="button"
                onClick={() => set("amount", toAmountInput(balanceMinor))}
                className="px-3 py-2 rounded-lg border-2 border-gray-300 text-sm font-semibold text-gray-600 hover:border-gray-400 whitespace-nowrap"
              >
                Pay full
              </button>
            )}
          </div>
        </Field>

        {/* Cash has nothing to reconcile against, so it shows no reference box
            at all rather than an optional one nobody should fill in. */}
        {spec && spec.reference !== "none" && (
          <Field
            label={spec.referenceLabel || "Reference"}
            hint={spec.reference === "optional" ? "Optional" : undefined}
          >
            <input
              className={inputCls}
              value={value.reference}
              onChange={(e) => set("reference", e.target.value)}
              placeholder={spec.referenceLabel}
            />
          </Field>
        )}

        {spec?.capturesCardLast4 && (
          <Field
            label="Card last 4 digits"
            hint="Last four only — never the full number, expiry or CVV."
          >
            <input
              className={inputCls}
              value={value.cardLast4}
              onChange={(e) => set("cardLast4", e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="4242"
              inputMode="numeric"
            />
          </Field>
        )}

        {spec?.capturesInsurer && (
          <>
            <Field label="Scheme">
              <input
                className={inputCls}
                value={value.insuranceScheme}
                onChange={(e) => set("insuranceScheme", e.target.value)}
                placeholder="e.g. SHA, Jubilee"
              />
            </Field>
            <Field label="Member number">
              <input
                className={inputCls}
                value={value.insuranceMemberNo}
                onChange={(e) => set("insuranceMemberNo", e.target.value)}
              />
            </Field>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentBlock;
