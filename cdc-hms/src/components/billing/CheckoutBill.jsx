import { AlertTriangle, Loader2 } from "lucide-react";
import { isAmountLike } from "../../utils/money";
import { Money } from "./billingUi";
import PaymentBlock from "./PaymentBlock";
import { hasPayment } from "./paymentForm";

// The money half of the Confirm & Discharge modal: totals, anything still
// unpriced, and the payment.
//
// Shown to EVERYONE who can discharge a patient, permission or not. When it was
// gated on 'billing.manage', a receptionist without it discharged patients and
// no bill was created at all — take the cash, close the visit, and nothing in
// the system said anything was ever owed. Billing rights now follow discharge
// rights exactly; 'billing.manage' guards changing and undoing the record
// instead.
//
// Every figure here comes from the server's draft invoice. Nothing on this
// screen adds anything up.

/**
 * One line that cannot be billed yet.
 *
 * There is no input here. A scanned SUPPLY is priced on its own row further up
 * the modal, where the supply state lives — that price is a one-off on this
 * bill and never touches the price list. A CHARGE or PROCEDURE whose price list
 * row has no price cannot be fixed from the desk at all: setting prices is
 * 'billing.manage' work, and letting the person taking the money set them is
 * the thing this module exists to prevent.
 */
const UnpricedLine = ({ line }) => (
  <div className="flex flex-wrap items-center gap-2 py-1.5 border-b border-amber-200 last:border-0">
    <span className="flex-1 min-w-[120px] text-sm font-semibold text-gray-800">
      {line.description}
      {line.quantity > 1 && <span className="text-gray-400 font-normal"> × {line.quantity}</span>}
    </span>
    <span className="text-xs text-amber-700">
      {line.stockBatchId ? "set a price on the row above" : "no price set — an administrator must price this"}
    </span>
  </div>
);

const CheckoutBill = ({ bill }) => {
  const { invoice, currency, methods, syncing, unpricedLines, payment, setPayment } = bill;

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
              This bill can’t be issued until {unpricedLines.length > 1 ? "they are" : "it is"} priced —
              or discharge now, and it stays as a draft under Billing → Invoices.
            </p>
          </div>
          {unpricedLines.map((line) => (
            <UnpricedLine key={line.id} line={line} />
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
