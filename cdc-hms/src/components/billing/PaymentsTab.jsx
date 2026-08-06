import { useState, useCallback } from "react";
import { useBillingContext } from "../../contexts/BillingContext";
import billingService from "../../services/billingService";
import useBillingResource from "../../hooks/useBillingResource";
import { inputCls, ByLine } from "../shared/formUi";
import { PAYMENT_TYPE_LABELS } from "../../utils/statusStyles";
import { Money, PaymentType, TableScroll, Th, Td, EmptyRow } from "./billingUi";

// The payment ledger — every payment, refund and reversal, in one place.
//
// Append-only: nothing here can be edited or deleted, which is why a reversal
// appears as its own row rather than the original quietly changing. Reversing
// is done from the invoice, where the balance it affects is visible.

const PaymentsTab = () => {
  const { currency, options } = useBillingContext();
  const [filters, setFilters] = useState({ method: "", type: "", from: "", to: "" });

  const fetcher = useCallback(
    () => billingService.getPayments(Object.fromEntries(Object.entries(filters).filter(([, v]) => v))),
    [filters]
  );
  const { data, loading } = useBillingResource(fetcher);
  const payments = data || [];

  const set = (field, value) => setFilters((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <div className="flex flex-wrap gap-3 items-center mb-4">
        {/* Methods come from the server's config, so a new one appears here
            without this file changing. */}
        <select className={`${inputCls} w-auto`} value={filters.method} onChange={(e) => set("method", e.target.value)}>
          <option value="">All methods</option>
          {options.paymentMethods.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        <select className={`${inputCls} w-auto`} value={filters.type} onChange={(e) => set("type", e.target.value)}>
          <option value="">All types</option>
          {Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-gray-500">
          From
          <input type="date" className={`${inputCls} w-auto`} value={filters.from} onChange={(e) => set("from", e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-500">
          To
          <input type="date" className={`${inputCls} w-auto`} value={filters.to} onChange={(e) => set("to", e.target.value)} />
        </label>
      </div>

      <TableScroll>
        <table className="w-full">
          <thead className="border-b-2 border-gray-200">
            <tr>
              <Th>Receipt</Th><Th>Type</Th><Th>Method</Th><Th>Reference</Th>
              <Th>Invoice</Th><Th>Patient</Th><Th>Taken</Th><Th right>Amount ({currency})</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.length === 0 && (
              <EmptyRow colSpan={8}>
                {loading ? "Loading payments…" : "No payments match those filters."}
              </EmptyRow>
            )}
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <Td className="font-mono text-xs font-semibold text-gray-800">{p.receiptNumber}</Td>
                <Td><PaymentType type={p.type} /></Td>
                <Td className="capitalize text-gray-600">{p.method}</Td>
                <Td className="font-mono text-xs text-gray-500">
                  {p.reference || <span className="font-sans italic text-gray-400">{p.reason || "—"}</span>}
                  {p.cardLast4 && <span className="text-gray-400"> ···{p.cardLast4}</span>}
                </Td>
                <Td className="font-mono text-xs text-gray-400">{p.Invoice?.invoiceNumber || "—"}</Td>
                <Td>
                  {p.Invoice?.Patient ? (
                    <span className="text-gray-700">
                      {p.Invoice.Patient.firstName} {p.Invoice.Patient.lastName}
                    </span>
                  ) : <span className="text-gray-400">—</span>}
                </Td>
                <Td><ByLine user={p.receivedByUser} at={p.receivedAt} /></Td>
                <Td right>
                  <Money minor={p.type === "payment" ? p.amountMinor : -p.amountMinor} bold />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </div>
  );
};

export default PaymentsTab;
