import { useState, useCallback } from "react";
import { ShieldCheck } from "lucide-react";
import billingService from "../../services/billingService";
import useBillingResource from "../../hooks/useBillingResource";
import { inputCls, StatCard } from "../shared/formUi";
import { formatAmount } from "../../utils/money";
import { Money, InvoiceStatus, TableScroll, Th, Td, EmptyRow } from "./billingUi";

// The audit half of the billing module: three reports that exist to be CHECKED
// rather than used.
//
// Each makes visible a way money could leave the clinic without a record:
//
//   Unbilled visits — a patient discharged with no bill issued
//   Removed items   — what the doctor ordered vs what was actually billed
//   Ad-hoc prices   — prices typed at the desk rather than set by an admin
//
// A good day makes all three boring. They share this one component because they
// share a shape — a date range, a headline count, and a table — and three
// near-identical files would drift apart the first time one was touched.

const REPORTS = {
  unbilled: {
    title: "Visits discharged without a bill",
    blurb:
      "This should be empty. Every checkout now raises a bill, so a row here means a service was left unpriced, or something failed — either way it is money the clinic never asked for.",
    good: "Nothing slipped through — every visit discharged in this range was billed.",
    fetch: (params) => billingService.getUnbilled(params),
    rows: (d) => d?.visits || [],
  },
  removed: {
    title: "Items the doctor ordered that were not billed",
    blurb:
      "The bill exists, was issued and was paid in full — but for less than the doctor ordered. A reason is required to remove an item; this is where those reasons get read. Watch for one person removing items far more often than everyone else.",
    good: "Nothing was removed from a bill in this range.",
    fetch: (params) => billingService.getRemovedItems(params),
    rows: (d) => d?.visits || [],
  },
  adhoc: {
    title: "Prices typed at the checkout desk",
    blurb:
      "These are the only prices in the system an administrator did not set — chosen by the person taking the money, for an item the price list did not cover. Each is attributed. This is also the queue of items that ought to be added to the price list properly.",
    good: "No prices were set at the desk in this range.",
    fetch: (params) => billingService.getAdhocPriced(params),
    rows: (d) => d?.lines || [],
  },
};

const dateOf = (iso) =>
  iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : "—";

const PatientCell = ({ patient }) => (patient ? (
  <>
    <span className="font-semibold text-gray-800">{patient.firstName} {patient.lastName}</span>
    <span className="ml-2 text-xs text-gray-400 font-mono">{patient.uhid}</span>
  </>
) : <span className="text-gray-400">—</span>);

const AuditTab = ({ report }) => {
  const spec = REPORTS[report];
  const [range, setRange] = useState({ from: "", to: "" });

  const fetcher = useCallback(
    () => spec.fetch(Object.fromEntries(Object.entries(range).filter(([, v]) => v))),
    [spec, range]
  );
  const { data, loading } = useBillingResource(fetcher);
  const rows = spec.rows(data);

  const set = (field, value) => setRange((prev) => ({ ...prev, [field]: value }));

  return (
    <div>
      <div className="bg-white rounded-xl shadow p-5 mb-4">
        <h3 className="text-lg font-bold text-gray-800">{spec.title}</h3>
        <p className="text-sm text-gray-600 mt-1 max-w-3xl">{spec.blurb}</p>

        <div className="flex flex-wrap gap-3 items-center mt-4">
          <label className="flex items-center gap-2 text-sm text-gray-500">
            From
            <input type="date" className={`${inputCls} w-auto`} value={range.from} onChange={(e) => set("from", e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-500">
            To
            <input type="date" className={`${inputCls} w-auto`} value={range.to} onChange={(e) => set("to", e.target.value)} />
          </label>
          {report === "unbilled" && !range.from && !range.to && (
            <span className="text-xs text-gray-400">
              Showing today. Set a range to look further back.
            </span>
          )}
        </div>
      </div>

      {/* Headline. Zero is the good answer on all three, so it is said out loud
          rather than left as an empty table the reader has to interpret. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <StatCard
          label={report === "adhoc" ? "Prices set at the desk" : "Needs a look"}
          value={data?.count ?? 0}
          sub={rows.length === 0 ? "nothing to review" : "review each one"}
          tone={rows.length === 0 ? "green" : "amber"}
        />
        {report === "adhoc" && (
          <StatCard label="Value" value={formatAmount(data?.totalMinor || 0)} sub="KES, billed at desk-set prices" tone="blue" />
        )}
        {report === "removed" && (data?.byStaff || []).slice(0, 1).map((s) => (
          <StatCard key={s.staff} label="Most removals" value={s.itemsRemoved} sub={`${s.staff} · ${s.visits} visit(s)`} tone="red" />
        ))}
      </div>

      {/* Who removed what, when that is the question being asked. */}
      {report === "removed" && (data?.byStaff || []).length > 0 && (
        <div className="bg-white rounded-xl shadow p-5 mb-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 pb-1 border-b">By staff member</p>
          <TableScroll>
            <table className="w-full">
              <thead><tr><Th>Staff</Th><Th right>Visits</Th><Th right>Items removed</Th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {data.byStaff.map((s) => (
                  <tr key={s.staff}>
                    <Td className="font-semibold text-gray-800">{s.staff}</Td>
                    <Td right className="tabular-nums text-gray-500">{s.visits}</Td>
                    <Td right className="tabular-nums font-bold text-gray-800">{s.itemsRemoved}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-5">
        <TableScroll>
          <table className="w-full">
            <thead className="border-b-2 border-gray-200">
              {report === "unbilled" && (
                <tr><Th>Discharged</Th><Th>Patient</Th><Th>By</Th><Th>What was ordered</Th></tr>
              )}
              {report === "removed" && (
                <tr><Th>Discharged</Th><Th>Patient</Th><Th>By</Th><Th>Removed</Th><Th>Reason given</Th></tr>
              )}
              {report === "adhoc" && (
                <tr><Th>When</Th><Th>Item</Th><Th>Patient</Th><Th>Priced by</Th><Th>Invoice</Th><Th right>Amount</Th></tr>
              )}
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 && (
                <EmptyRow colSpan={6}>
                  {loading ? "Loading…" : (
                    <span className="inline-flex items-center gap-2 text-green-700">
                      <ShieldCheck className="w-4 h-4" /> {spec.good}
                    </span>
                  )}
                </EmptyRow>
              )}

              {report === "unbilled" && rows.map((v) => (
                <tr key={v.queueId} className="hover:bg-gray-50">
                  <Td className="text-gray-500">{dateOf(v.dischargedAt)}</Td>
                  <Td><PatientCell patient={v.patient} /></Td>
                  <Td className="text-gray-700">{v.dischargedBy || "—"}</Td>
                  <Td className="text-gray-600">
                    {[...v.charges, ...v.procedures].join(", ") || <span className="text-gray-400">nothing recorded</span>}
                  </Td>
                </tr>
              ))}

              {report === "removed" && rows.map((v) => (
                <tr key={v.queueId} className="hover:bg-gray-50">
                  <Td className="text-gray-500">{dateOf(v.dischargedAt)}</Td>
                  <Td><PatientCell patient={v.patient} /></Td>
                  <Td className="text-gray-700">{v.dischargedBy}</Td>
                  <Td><span className="text-red-700 font-medium">{v.removed.join(", ")}</span></Td>
                  <Td className="text-gray-600">
                    {v.reason || <span className="text-amber-700 italic">no reason given</span>}
                  </Td>
                </tr>
              ))}

              {report === "adhoc" && rows.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <Td className="text-gray-500">{dateOf(l.createdAt)}</Td>
                  <Td className="font-semibold text-gray-800">
                    {l.description}
                    {l.quantity > 1 && <span className="text-gray-400 font-normal"> × {l.quantity}</span>}
                  </Td>
                  <Td><PatientCell patient={l.Invoice?.Patient} /></Td>
                  <Td className="text-gray-700">
                    {l.pricedAtCheckoutBy
                      ? `${l.pricedAtCheckoutBy.firstName} ${l.pricedAtCheckoutBy.lastName}`
                      : "—"}
                  </Td>
                  <Td>
                    <span className="font-mono text-xs text-gray-500">{l.Invoice?.invoiceNumber || "draft"}</span>
                    {l.Invoice?.status && <span className="ml-2"><InvoiceStatus status={l.Invoice.status} size="xs" /></span>}
                  </Td>
                  <Td right><Money minor={l.grossMinor} bold /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </div>
    </div>
  );
};

export default AuditTab;
