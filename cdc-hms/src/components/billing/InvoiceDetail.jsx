import { useState } from "react";
import { Printer, Undo2, Ban, Trash2 } from "lucide-react";
import { notify } from "../../utils/notify";
import { useBillingContext } from "../../contexts/BillingContext";
import billingService from "../../services/billingService";
import Button from "../shared/Button";
import ReasonModal from "../shared/ReasonModal";
import { ByLine } from "../shared/formUi";
import { Money, InvoiceStatus, PaymentType, TableScroll, Th, Td } from "./billingUi";
import RecordPaymentModal from "./RecordPaymentModal";
import ReceiptPrint from "./ReceiptPrint";

// One invoice, opened from the list: its lines, its payments, and the only
// three things that may be done to it.
//
// An issued invoice is never edited. It can be paid, its payments can be
// reversed, and the whole bill can be voided with a reason — that is the
// complete set, and it is the same set the server enforces.

const InvoiceDetail = ({ invoice, onChanged, onClose }) => {
  const { currency, run } = useBillingContext();
  const [paying, setPaying] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [reversing, setReversing] = useState(null); // the payment being reversed
  const [voiding, setVoiding] = useState(false);
  const [busy, setBusy] = useState(false);

  const patient = invoice.Patient;
  const isDraft = invoice.status === "draft";
  const isVoid = invoice.status === "void";
  const canPay = !isDraft && !isVoid && invoice.balanceMinor > 0;

  // Which payments have already been reversed — read straight off the rows,
  // since a reversal names what it undid. No extra association to fetch, and
  // it cannot disagree with the ledger it was derived from.
  const reversedIds = new Set(
    (invoice.payments || []).map((p) => p.reversesPaymentId).filter(Boolean)
  );

  const refresh = async () => {
    const res = await run(() => billingService.getInvoice(invoice.id));
    if (res.success) onChanged?.(res.data);
  };

  const reversePayment = async (reason) => {
    setBusy(true);
    const res = await run(() => billingService.reversePayment(reversing.id, reason));
    setBusy(false);
    setReversing(null);
    if (res.success) {
      notify("success", "Payment reversed");
      onChanged?.(res.data.invoice);
    }
  };

  const voidInvoice = async (reason) => {
    setBusy(true);
    const res = await run(() => billingService.voidInvoice(invoice.id, reason));
    setBusy(false);
    setVoiding(false);
    if (res.success) {
      notify("success", `${invoice.invoiceNumber} voided`);
      onChanged?.(res.data);
    }
  };

  const discard = async () => {
    setBusy(true);
    const res = await run(() => billingService.discardInvoice(invoice.id));
    setBusy(false);
    if (res.success) {
      notify("success", "Draft discarded");
      onClose?.();
      onChanged?.(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-5 mt-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-1">
        <span className="font-mono font-bold text-lg text-gray-800">
          {invoice.invoiceNumber || "Draft bill"}
        </span>
        <InvoiceStatus status={invoice.status} />
        <div className="flex-1" />
        <ByLine user={invoice.issuedByUser} at={invoice.issuedAt} />
      </div>
      <p className="text-sm text-gray-600 mb-4">
        {patient ? `${patient.firstName} ${patient.lastName}` : invoice.customerName}
        {patient?.uhid && <span className="font-mono text-gray-400"> · {patient.uhid}</span>}
        {patient?.phone && <span className="text-gray-400"> · {patient.phone}</span>}
      </p>

      {isVoid && invoice.voidReason && (
        <p className="text-sm bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 mb-4 text-gray-600">
          <span className="font-semibold">Voided:</span> {invoice.voidReason}
        </p>
      )}

      {/* Lines */}
      <TableScroll>
        <table className="w-full">
          <thead className="border-b-2 border-gray-200">
            <tr>
              <Th>Item</Th>
              <Th right>Qty</Th>
              <Th right>Unit</Th>
              <Th right>Amount</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(invoice.lines || []).map((line) => (
              <tr key={line.id}>
                <Td>
                  <span className="text-gray-800">{line.description}</span>
                  {line.vatMinor > 0 && (
                    <span className="ml-2 text-xs text-gray-400">
                      incl. VAT <Money minor={line.vatMinor} />
                    </span>
                  )}
                </Td>
                <Td right className="tabular-nums">{line.quantity}</Td>
                <Td right><Money minor={line.unitPriceMinor} /></Td>
                <Td right><Money minor={line.grossMinor} bold /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>

      {/* Totals */}
      <div className="ml-auto max-w-xs mt-4 text-sm space-y-1">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span><Money minor={invoice.subtotalMinor} />
        </div>
        <div className="flex justify-between text-gray-600">
          <span>{invoice.vatTotalMinor > 0 ? "VAT" : "VAT (exempt)"}</span>
          <Money minor={invoice.vatTotalMinor} />
        </div>
        <div className="flex justify-between font-bold text-gray-800 text-base border-t pt-2 mt-1">
          <span>Total</span><span>{currency} <Money minor={invoice.totalMinor} bold /></span>
        </div>
        <div className="flex justify-between text-gray-600 pt-1">
          <span>Paid</span><Money minor={invoice.amountPaidMinor} />
        </div>
        <div className={`flex justify-between font-bold ${invoice.balanceMinor > 0 ? "text-amber-700" : "text-gray-800"}`}>
          <span>Balance</span><span>{currency} <Money minor={invoice.balanceMinor} bold /></span>
        </div>
      </div>

      {/* Payments — append-only, so a reversal appears beside what it undid */}
      {(invoice.payments || []).length > 0 && (
        <>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-6 mb-2 pb-1 border-b">
            Payments
          </p>
          <TableScroll>
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Receipt</Th>
                  <Th>Type</Th>
                  <Th>Method</Th>
                  <Th>Reference</Th>
                  <Th>Taken</Th>
                  <Th right>Amount</Th>
                  <Th right />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.payments.map((p) => (
                  <tr key={p.id}>
                    <Td className="font-mono text-xs">{p.receiptNumber}</Td>
                    <Td><PaymentType type={p.type} /></Td>
                    <Td className="capitalize">{p.method}</Td>
                    <Td className="font-mono text-xs text-gray-500">
                      {p.reference || (p.reason ? <span className="font-sans italic">{p.reason}</span> : "—")}
                      {p.cardLast4 && <span> ···{p.cardLast4}</span>}
                    </Td>
                    <Td><ByLine user={p.receivedByUser} at={p.receivedAt} /></Td>
                    <Td right>
                      <Money minor={p.type === "payment" ? p.amountMinor : -p.amountMinor} bold />
                    </Td>
                    <Td right>
                      {/* Only a payment can be reversed, and only once — the
                          server enforces both; this just hides a dead button. */}
                      {p.type === "payment" && !reversedIds.has(p.id) && (
                        <Button
                          variant="outline"
                          className="text-xs py-1 px-2 border-red-300 text-red-600 hover:bg-red-600"
                          onClick={() => setReversing(p)}
                          disabled={busy}
                        >
                          <Undo2 className="w-3 h-3" /> Reverse
                        </Button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t">
        {canPay && (
          <Button onClick={() => setPaying(true)} disabled={busy} className="text-sm py-2">
            Take payment
          </Button>
        )}
        {!isDraft && (
          <Button variant="outline" onClick={() => setPrinting(true)} className="text-sm py-2">
            <Printer className="w-4 h-4" /> Print
          </Button>
        )}
        <div className="flex-1" />
        {isDraft && (
          <Button
            variant="outline"
            onClick={discard}
            disabled={busy}
            className="text-sm py-2 border-red-300 text-red-600 hover:bg-red-600"
          >
            <Trash2 className="w-4 h-4" /> Discard draft
          </Button>
        )}
        {!isDraft && !isVoid && (
          <Button
            variant="outline"
            onClick={() => setVoiding(true)}
            disabled={busy}
            className="text-sm py-2 border-red-300 text-red-600 hover:bg-red-600"
          >
            <Ban className="w-4 h-4" /> Void invoice
          </Button>
        )}
      </div>

      {paying && (
        <RecordPaymentModal
          invoice={invoice}
          onClose={() => setPaying(false)}
          onRecorded={() => refresh()}
        />
      )}
      {printing && <ReceiptPrint invoice={invoice} onClose={() => setPrinting(false)} />}
      {reversing && (
        <ReasonModal
          isOpen
          destructive
          title={`Reverse ${reversing.receiptNumber}`}
          message="This writes a reversal for the full amount and puts the balance back. Nothing is deleted — both rows stay on the record, so the correction is visible."
          confirmLabel="Reverse payment"
          placeholder="e.g. Keyed against the wrong patient"
          onConfirm={reversePayment}
          onClose={() => setReversing(null)}
        />
      )}
      {voiding && (
        <ReasonModal
          isOpen
          destructive
          title={`Void ${invoice.invoiceNumber}`}
          message="A void invoice cannot be un-voided. Raise a corrected bill afterwards — the visit is released for a new one."
          confirmLabel="Void invoice"
          placeholder="e.g. Billed against the wrong visit"
          onConfirm={voidInvoice}
          onClose={() => setVoiding(false)}
        />
      )}
    </div>
  );
};

export default InvoiceDetail;
