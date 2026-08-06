import { useState, useCallback } from "react";
import { useBillingContext } from "../../contexts/BillingContext";
import billingService from "../../services/billingService";
import useBillingResource from "../../hooks/useBillingResource";
import { inputCls, StatCard } from "../shared/formUi";
import { formatAmount } from "../../utils/money";
import { Money, PaymentType, TableScroll, Th, Td, EmptyRow } from "./billingUi";

// The sheet the admin reconciles at close of day — against the drawer, the
// M-Pesa statement and the bank's card settlement file.
//
// REVERSALS SUBTRACT. A till that took 55,400 and reversed 2,000 shows 55,400,
// not 57,400 — the server applies each payment's sign before grouping, and this
// screen only displays what it returns.

const CashUpTab = () => {
  const { currency } = useBillingContext();
  const [date, setDate] = useState("");        // empty = today AT THE CLINIC
  // Refetches whenever the date changes, because the fetcher depends on it.
  const fetcher = useCallback(() => billingService.getCashUp(date || undefined), [date]);
  const { data: report, loading } = useBillingResource(fetcher);

  const reversals = report?.byType?.find((t) => t.key === "reversal");
  const refunds = report?.byType?.find((t) => t.key === "refund");
  const corrections = (reversals?.totalMinor || 0) + (refunds?.totalMinor || 0);

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center mb-5">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Date
          <input type="date" className={`${inputCls} w-auto`} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <span className="text-sm text-gray-400">
          {report?.date ? `Showing ${report.date}` : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Taken today"
          value={formatAmount(report?.totalMinor || 0)}
          sub={`${currency}, net of reversals`}
          tone="green"
        />
        <StatCard
          label="Payments"
          value={report?.count ?? 0}
          sub={`across ${report?.byMethod?.length || 0} method(s)`}
          tone="blue"
        />
        <StatCard
          label="Corrections"
          value={formatAmount(corrections)}
          sub={corrections === 0 ? "none today" : "reversals and refunds"}
          tone="red"
        />
      </div>

      <div className="bg-white rounded-xl shadow p-5 mb-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 pb-1 border-b">By method</p>
        <TableScroll>
          <table className="w-full">
            <thead>
              <tr><Th>Method</Th><Th right>Payments</Th><Th right>Amount ({currency})</Th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(report?.byMethod || []).length === 0 && (
                <EmptyRow colSpan={3}>{loading ? "Loading…" : "Nothing was taken on this day."}</EmptyRow>
              )}
              {(report?.byMethod || []).map((m) => (
                <tr key={m.key}>
                  <Td className="font-semibold text-gray-800">{m.label}</Td>
                  <Td right className="text-gray-500 tabular-nums">{m.count}</Td>
                  <Td right><Money minor={m.totalMinor} bold /></Td>
                </tr>
              ))}
              {report && report.byMethod?.length > 0 && (
                <tr className="border-t-2 border-gray-200">
                  <Td className="font-bold text-gray-800">Total</Td>
                  <Td right className="text-gray-500 tabular-nums">{report.count}</Td>
                  <Td right className="text-base"><Money minor={report.totalMinor} bold /></Td>
                </tr>
              )}
            </tbody>
          </table>
        </TableScroll>
      </div>

      <div className="bg-white rounded-xl shadow p-5 mb-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 pb-1 border-b">By person</p>
        <TableScroll>
          <table className="w-full">
            <thead>
              <tr><Th>Taken by</Th><Th right>Payments</Th><Th right>Amount ({currency})</Th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(report?.byUser || []).length === 0 && <EmptyRow colSpan={3}>—</EmptyRow>}
              {(report?.byUser || []).map((u) => (
                <tr key={u.key}>
                  <Td className="font-semibold text-gray-800">{u.label}</Td>
                  <Td right className="text-gray-500 tabular-nums">{u.count}</Td>
                  <Td right><Money minor={u.totalMinor} bold /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </div>

      <div className="bg-white rounded-xl shadow p-5">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 pb-1 border-b">
          Every movement, in order
        </p>
        <TableScroll>
          <table className="w-full">
            <thead>
              <tr>
                <Th>Time</Th><Th>Receipt</Th><Th>Type</Th><Th>Method</Th>
                <Th>Reference</Th><Th>Invoice</Th><Th right>Amount</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(report?.payments || []).length === 0 && (
                <EmptyRow colSpan={7}>{loading ? "Loading…" : "No payments recorded on this day."}</EmptyRow>
              )}
              {(report?.payments || []).map((p) => (
                <tr key={p.id}>
                  <Td className="text-gray-500">
                    {new Date(p.receivedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </Td>
                  <Td className="font-mono text-xs">{p.receiptNumber}</Td>
                  <Td><PaymentType type={p.type} /></Td>
                  <Td className="capitalize">{p.method}</Td>
                  <Td className="font-mono text-xs text-gray-500">
                    {p.reference || <span className="font-sans italic">{p.reason || "—"}</span>}
                  </Td>
                  <Td className="font-mono text-xs text-gray-400">{p.Invoice?.invoiceNumber || "—"}</Td>
                  <Td right>
                    <Money minor={p.type === "payment" ? p.amountMinor : -p.amountMinor} bold />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>

        {report?.payments?.length > 0 && (
          <p className="text-xs text-gray-400 mt-4">
            Card takings settle net of the merchant fee, so the bank will deposit slightly
            less than the card total above. The gross is what belongs on this sheet.
          </p>
        )}
      </div>
    </div>
  );
};

export default CashUpTab;
