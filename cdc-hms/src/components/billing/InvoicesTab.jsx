import { useState, useCallback } from "react";
import { Search } from "lucide-react";
import { useBillingContext } from "../../contexts/BillingContext";
import billingService from "../../services/billingService";
import useBillingResource from "../../hooks/useBillingResource";
import { inputCls } from "../shared/formUi";
import { INVOICE_STATUS_LABELS } from "../../utils/statusStyles";
import { Money, InvoiceStatus, TableScroll, Th, Td, EmptyRow } from "./billingUi";
import InvoiceDetail from "./InvoiceDetail";

// Every bill the clinic has raised.
//
// A draft shows no number: numbers are assigned at issue, so a checkout that
// gets abandoned leaves no gap in the sequence that would look like a deleted
// invoice to anyone auditing the books.

const STATUS_FILTERS = ["", ...Object.keys(INVOICE_STATUS_LABELS)];

const InvoicesTab = () => {
  const { currency, run } = useBillingContext();
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ status: "", from: "", to: "", q: "" });

  const fetcher = useCallback(
    () => billingService.getInvoices(Object.fromEntries(Object.entries(filters).filter(([, v]) => v))),
    [filters]
  );
  const { data, loading, reload } = useBillingResource(fetcher);
  const invoices = data || [];

  const set = (field, value) => setFilters((prev) => ({ ...prev, [field]: value }));

  // A write in the detail — a payment, a reversal, a void — changes totals the
  // list also shows, so the list is refetched rather than patched in place.
  // The server is the only thing that knows what an invoice now totals, and
  // guessing here is how a screen ends up disagreeing with the ledger.
  // A null means the draft was discarded.
  const onChanged = (updated) => {
    setSelected(updated || null);
    reload();
  };

  const open = async (row) => {
    if (selected?.id === row.id) return setSelected(null);
    // The list rows carry no lines or payments — fetch the full invoice.
    const res = await run(() => billingService.getInvoice(row.id));
    if (res.success) setSelected(res.data);
  };

  return (
    <div>
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <select className={`${inputCls} w-auto`} value={filters.status} onChange={(e) => set("status", e.target.value)}>
            {STATUS_FILTERS.map((s) => (
              <option key={s || "all"} value={s}>{s ? INVOICE_STATUS_LABELS[s] : "All statuses"}</option>
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

          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Invoice number…"
              value={filters.q}
              onChange={(e) => set("q", e.target.value)}
            />
          </div>
        </div>

        <TableScroll>
          <table className="w-full">
            <thead className="border-b-2 border-gray-200">
              <tr>
                <Th>Number</Th>
                <Th>Date</Th>
                <Th>Patient</Th>
                <Th right>Total ({currency})</Th>
                <Th right>Paid</Th>
                <Th right>Balance</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.length === 0 && (
                <EmptyRow colSpan={7}>
                  {loading ? "Loading invoices…" : "No bills match those filters."}
                </EmptyRow>
              )}
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => open(inv)}
                  className={`cursor-pointer hover:bg-gray-50 ${selected?.id === inv.id ? "bg-blue-50" : ""} ${
                    inv.status === "void" ? "opacity-55" : ""
                  }`}
                >
                  <Td className="font-mono font-semibold text-gray-800">
                    {inv.invoiceNumber || <span className="font-sans text-gray-400 font-normal">— draft</span>}
                  </Td>
                  <Td className="text-gray-500">
                    {new Date(inv.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                  </Td>
                  <Td>
                    {inv.Patient ? (
                      <>
                        <span className="font-semibold text-gray-800">
                          {inv.Patient.firstName} {inv.Patient.lastName}
                        </span>
                        <span className="ml-2 text-xs text-gray-400 font-mono">{inv.Patient.uhid}</span>
                      </>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </Td>
                  <Td right><Money minor={inv.totalMinor} /></Td>
                  <Td right><Money minor={inv.amountPaidMinor} /></Td>
                  <Td right><Money minor={inv.balanceMinor} bold={inv.balanceMinor > 0} /></Td>
                  <Td><InvoiceStatus status={inv.status} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </div>

      {selected && (
        <InvoiceDetail
          invoice={selected}
          onChanged={onChanged}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};

export default InvoicesTab;
