import { useState } from "react";
import { notify } from "../../utils/notify";
import { useBillingContext } from "../../contexts/BillingContext";
import billingService from "../../services/billingService";
import Modal from "../shared/Modal";
import Button from "../shared/Button";
import { Money } from "./billingUi";
import PaymentBlock from "./PaymentBlock";
import { emptyPayment, validatePayment, paymentPayload } from "./paymentForm";

// Take a payment against an already-issued bill.
//
// Used from the invoice detail and from the outstanding list — one modal, so
// "take a payment" behaves identically wherever it is reached from. The
// checkout does not use this: there, payment is part of the discharge submit
// rather than an action of its own.

const RecordPaymentModal = ({ invoice, onClose, onRecorded }) => {
  const { options, currency, run } = useBillingContext();
  const [payment, setPayment] = useState(() => emptyPayment(options.paymentMethods));
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const problem = validatePayment(payment, options.paymentMethods);
    if (problem) return notify("error", problem);

    setSaving(true);
    const res = await run(() => billingService.recordPayment(paymentPayload(payment, invoice.id)));
    setSaving(false);

    if (res.success) {
      notify("success", `Payment recorded — receipt ${res.data.payment.receiptNumber}`);
      onRecorded?.(res.data.invoice);
      onClose();
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Payment · ${invoice.invoiceNumber}`} size="lg">
      <div className="flex justify-between items-baseline mb-5 pb-4 border-b">
        <div>
          <p className="font-semibold text-gray-800">
            {invoice.Patient ? `${invoice.Patient.firstName} ${invoice.Patient.lastName}` : "Patient"}
          </p>
          {invoice.Patient?.uhid && <p className="text-sm text-gray-500 font-mono">{invoice.Patient.uhid}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-gray-500 font-bold">Outstanding</p>
          <p className="text-xl font-bold text-amber-700">
            {currency} <Money minor={invoice.balanceMinor} />
          </p>
        </div>
      </div>

      <PaymentBlock
        value={payment}
        onChange={setPayment}
        methods={options.paymentMethods}
        balanceMinor={invoice.balanceMinor}
        currency={currency}
      />

      <div className="flex gap-3 pt-2">
        <div className="flex-1" />
        <Button variant="outline" onClick={onClose} disabled={saving} className="text-sm py-2">Cancel</Button>
        <Button onClick={submit} disabled={saving} className="text-sm py-2">
          {saving ? "Recording…" : "Record payment"}
        </Button>
      </div>
    </Modal>
  );
};

export default RecordPaymentModal;
