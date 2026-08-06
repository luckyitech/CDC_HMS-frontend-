import { useState, useCallback } from "react";
import { useBillingContext } from "../../contexts/BillingContext";
import billingService from "../../services/billingService";
import useBillingResource from "../../hooks/useBillingResource";
import Button from "../shared/Button";
import { StatCard } from "../shared/formUi";
import { formatAmount } from "../../utils/money";
import { Money, InvoiceStatus, TableScroll, Th, Td, EmptyRow } from "./billingUi";
import RecordPaymentModal from "./RecordPaymentModal";

// Who owes money, oldest first — the oldest debt is the one least likely ever
// to be collected, so it belongs at the top rather than buried by date order.
//
// Balances follow the patient, so this is also what the desk checks when
// somebody comes back.

const daysSince = (iso) => {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
};

const OutstandingTab = () => {
  const { currency } = useBillingContext();
  const [paying, setPaying] = useState(null);

  const fetcher = useCallback(() => billingService.getOutstanding(), []);
  const { data: report, loading, reload } = useBillingResource(fetcher);

  const invoices = report?.invoices || [];
  const oldest = invoices[0];
  const oldestDays = daysSince(oldest?.issuedAt);
  const insurerTotal = invoices
    .filter((i) => i.payerType === "insurer")
    .reduce((sum, i) => sum + Number(i.balanceMinor), 0);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Owed in total"
          value={formatAmount(report?.totalMinor || 0)}
          sub={`${currency}, across ${report?.count ?? 0} bill(s)`}
          tone="amber"
        />
        <StatCard
          label="Oldest debt"
          value={oldest?.issuedAt
            ? new Date(oldest.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
            : "—"}
          sub={oldestDays === null ? "nothing outstanding" : `${oldestDays} day(s) ago`}
          tone="red"
        />
        <StatCard
          label="Awaiting an insurer"
          value={formatAmount(insurerTotal)}
          sub={insurerTotal === 0 ? "none" : `${currency}, billed to a scheme`}
          tone="blue"
        />
      </div>

      <div className="bg-white rounded-xl shadow p-5">
        <TableScroll>
          <table className="w-full">
            <thead className="border-b-2 border-gray-200">
              <tr>
                <Th>Invoice</Th><Th>Issued</Th><Th>Patient</Th><Th>Phone</Th>
                <Th>Payer</Th><Th>Status</Th><Th right>Balance ({currency})</Th><Th right />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.length === 0 && (
                <EmptyRow colSpan={8}>
                  {loading ? "Loading…" : "Nothing outstanding — every issued bill is settled."}
                </EmptyRow>
              )}
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <Td className="font-mono font-semibold text-gray-800">{inv.invoiceNumber}</Td>
                  <Td className="text-gray-500">
                    {inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString("en-GB", { dateStyle: "medium" }) : "—"}
                  </Td>
                  <Td>
                    {inv.Patient && (
                      <>
                        <span className="font-semibold text-gray-800">
                          {inv.Patient.firstName} {inv.Patient.lastName}
                        </span>
                        <span className="ml-2 text-xs text-gray-400 font-mono">{inv.Patient.uhid}</span>
                      </>
                    )}
                  </Td>
                  <Td className="font-mono text-xs text-gray-500">{inv.Patient?.phone || "—"}</Td>
                  <Td className="capitalize text-gray-600">{inv.payerType}</Td>
                  <Td><InvoiceStatus status={inv.status} /></Td>
                  <Td right><Money minor={inv.balanceMinor} bold /></Td>
                  <Td right>
                    <Button className="text-xs py-1 px-3" onClick={() => setPaying(inv)}>
                      Take payment
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </div>

      {paying && (
        <RecordPaymentModal
          invoice={paying}
          onClose={() => setPaying(null)}
          onRecorded={reload}
        />
      )}
    </div>
  );
};

export default OutstandingTab;
