import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { notify } from "../../utils/notify";
import { inputCls } from "../shared/formUi";
import { isAmountLike } from "../../utils/money";
import { Money } from "./billingUi";
import PaymentBlock from "./PaymentBlock";
import { hasPayment } from "./paymentForm";

// The money half of the Confirm & Discharge modal: totals, anything still
// unpriced, and the payment. Rendered only for a user holding billing.manage —
// everyone else sees the checkout exactly as it has always been.
//
// Every figure here comes from the server's draft invoice. Nothing on this
// screen adds anything up.

/** One unpriced line, with a box to price it if there is a service behind it. */
const UnpricedLine = ({ line, onPrice }) => {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!isAmountLike(amount)) return notify("error", "Enter a price like 1500 or 1500.00");
    setSaving(true);
    const res = await onPrice(line, amount);
    setSaving(false);
    if (res.success) notify("success", `${line.description} priced`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 py-2 border-b border-amber-200 last:border-0">
      <span className="flex-1 min-w-[120px] text-sm font-semibold text-gray-800">
        {line.description}
        {line.quantity > 1 && <span className="text-gray-400 font-normal"> × {line.quantity}</span>}
      </span>

      {line.serviceItemId ? (
        <>
          <input
            className={`${inputCls} w-28`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            inputMode="decimal"
            aria-label={`Price for ${line.description}`}
          />
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-3 py-2 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap"
          >
            {saving ? "Saving…" : "Save price"}
          </button>
        </>
      ) : (
        // Nothing to set a price on: no price list entry maps to this item, so
        // it has to be created and linked under Billing → Price List first.
        <span className="text-xs text-amber-700">
          not on the price list — add it under Billing to bill this
        </span>
      )}
    </div>
  );
};

const CheckoutBill = ({ bill }) => {
  const { invoice, currency, methods, syncing, unpricedLines, payment, setPayment, priceLine } = bill;

  if (!invoice) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
        <Loader2 className="w-4 h-4 animate-spin" /> Opening the bill…
      </div>
    );
  }

  const issued = invoice.status !== "draft";
  // The balance once the amount currently typed is banked. Shown so reception
  // sees what the patient will still owe BEFORE committing, not after.
  const balanceAfter = hasPayment(payment) && isAmountLike(payment.amount)
    ? invoice.balanceMinor - Math.round(Number(String(payment.amount).replace(/,/g, "")) * 100)
    : invoice.balanceMinor;

  return (
    <div className="space-y-5">
      {/* Totals */}
      <div>
        <div className="flex items-center gap-2 mb-2 pb-1 border-b">
          <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wide">Bill</h4>
          {syncing && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span><Money minor={invoice.subtotalMinor} />
          </div>
          {invoice.discountMinor > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Discount</span><Money minor={-invoice.discountMinor} />
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>{invoice.vatTotalMinor > 0 ? "VAT" : "VAT (exempt)"}</span>
            <Money minor={invoice.vatTotalMinor} />
          </div>
          <div className="flex justify-between font-bold text-gray-800 text-lg border-t pt-2 mt-1">
            <span>{unpricedLines.length > 0 ? "Total (incomplete)" : "Total"}</span>
            <span>{currency} <Money minor={invoice.totalMinor} bold /></span>
          </div>
        </div>
      </div>

      {/* Anything that cannot be billed yet */}
      {unpricedLines.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
          <div className="flex gap-2 items-start mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-bold">
                {unpricedLines.length} item{unpricedLines.length > 1 ? "s have" : " has"} no price.
              </span>{" "}
              Set {unpricedLines.length > 1 ? "them" : "it"} below to bill this visit, or discharge
              now — the bill stays as a draft under Billing → Invoices.
            </p>
          </div>
          {unpricedLines.map((line) => (
            <UnpricedLine key={line.id} line={line} onPrice={priceLine} />
          ))}
        </div>
      )}

      {/* Payment — only once there is something payable */}
      {unpricedLines.length === 0 && invoice.totalMinor > 0 && (
        <div>
          <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 pb-1 border-b">
            Payment
            <span className="ml-2 font-normal normal-case tracking-normal text-xs text-gray-400">
              optional — a balance follows the patient
            </span>
          </h4>

          <PaymentBlock
            value={payment}
            onChange={setPayment}
            methods={methods}
            balanceMinor={invoice.balanceMinor}
            currency={currency}
          />

          <div className={`flex justify-between text-sm font-bold pt-1 ${
            balanceAfter > 0 ? "text-amber-700" : "text-gray-800"
          }`}>
            <span>Balance {issued ? "" : "after payment"}</span>
            <span>{currency} <Money minor={balanceAfter} bold /></span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutBill;
