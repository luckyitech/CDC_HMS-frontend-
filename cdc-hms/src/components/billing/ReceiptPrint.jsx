import usePrint from "../../hooks/usePrint";
import { useBillingContext } from "../../contexts/BillingContext";
import { formatAmount } from "../../utils/money";
import { PAYMENT_TYPE_LABELS } from "../../utils/statusStyles";

// The printed bill — one template, reached from the invoice detail and from the
// discharge success screen. Same full-screen preview + no-print toolbar pattern
// as LabTestPrint and PrescriptionPrint, so printing behaves the same
// everywhere in the app.
//
// It renders what the invoice RECORDED, never a re-derivation: every figure
// here is a stored column. An invoice printed today and reprinted next year
// must say the same thing even if prices have changed since.

// Fallback identity, matching the header the lab and prescription printouts
// already use. The clinic can override all three under Billing settings, which
// is what a tax invoice needs — a KRA PIN cannot be hardcoded.
const DEFAULTS = {
  clinicName: "COMPREHENSIVE DIABETES CENTRE",
  clinicAddress: "Nairobi, Kenya",
};

const Row = ({ label, value, bold = false, tone = "" }) => (
  <div className={`flex justify-between gap-4 ${bold ? "font-bold" : ""} ${tone}`}>
    <span>{label}</span>
    <span className="tabular-nums whitespace-nowrap">{value}</span>
  </div>
);

const ReceiptPrint = ({ invoice, onClose }) => {
  const { printRef, handlePrint } = usePrint();
  const { config, currency } = useBillingContext();

  if (!invoice) return null;

  const clinic = {
    name: config?.clinicName || DEFAULTS.clinicName,
    pin: config?.clinicPin || null,
    address: config?.clinicAddress || DEFAULTS.clinicAddress,
  };

  const patient = invoice.Patient;
  const lines = invoice.lines || [];
  // Reversed payments still print: the receipt is a record of what happened at
  // the desk, and quietly dropping a reversal would make the arithmetic on the
  // page impossible to follow.
  const payments = invoice.payments || [];

  const issued = invoice.issuedAt ? new Date(invoice.issuedAt) : new Date(invoice.createdAt);
  // A tax invoice only claims to be one when the clinic is actually registered.
  const title = config?.vatRegistered ? "TAX INVOICE" : "INVOICE";

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="no-print print:hidden flex justify-between items-center p-4 bg-gray-100 border-b-2 border-gray-300">
        <h2 className="text-xl font-bold text-gray-800">
          Print Preview — {invoice.invoiceNumber || "Draft bill"}
        </h2>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            🖨️ Print
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-semibold"
          >
            Close
          </button>
        </div>
      </div>

      <div ref={printRef} id="receipt-print-content" className="max-w-2xl mx-auto p-10 bg-white text-gray-900">
        {/* Clinic identity */}
        <div className="text-center border-b-4 border-primary pb-5 mb-5">
          <h1 className="text-2xl font-bold text-primary">{clinic.name}</h1>
          {clinic.pin && <p className="text-sm text-gray-700 mt-1">PIN {clinic.pin}</p>}
          <p className="text-xs text-gray-500">{clinic.address}</p>
        </div>

        {/* Document identity */}
        <div className="flex justify-between items-start mb-5 text-sm">
          <div>
            <p className="font-bold text-gray-800">{title}</p>
            <p className="text-gray-600">
              {issued.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
            </p>
            {invoice.issuedByUser && (
              <p className="text-gray-500 text-xs">
                Served by {invoice.issuedByUser.firstName} {invoice.issuedByUser.lastName}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="font-mono font-bold text-gray-800">{invoice.invoiceNumber || "— draft —"}</p>
            {payments.length > 0 && (
              <p className="font-mono text-xs text-gray-600">
                Receipt {payments[payments.length - 1].receiptNumber}
              </p>
            )}
          </div>
        </div>

        {/* Who is being billed */}
        <div className="mb-5 pb-4 border-b border-gray-300 text-sm">
          <p className="font-bold text-gray-800">
            {patient ? `${patient.firstName} ${patient.lastName}` : invoice.customerName || "Patient"}
          </p>
          {patient?.uhid && <p className="text-gray-600 font-mono text-xs">{patient.uhid}</p>}
          {invoice.customerName && patient && (
            <p className="text-gray-600 text-xs mt-1">Billed to {invoice.customerName}</p>
          )}
          {invoice.customerPin && <p className="text-gray-600 text-xs">PIN {invoice.customerPin}</p>}
        </div>

        {/* Lines */}
        <table className="w-full text-sm mb-5">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-2 font-semibold text-gray-600">Item</th>
              <th className="text-right py-2 font-semibold text-gray-600 whitespace-nowrap">Qty × Unit</th>
              <th className="text-right py-2 font-semibold text-gray-600">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-b border-gray-100">
                <td className="py-2 pr-3">{line.description}</td>
                <td className="py-2 text-right text-gray-600 tabular-nums whitespace-nowrap">
                  {line.quantity} × {formatAmount(line.unitPriceMinor)}
                </td>
                <td className="py-2 text-right tabular-nums font-semibold">
                  {formatAmount(line.grossMinor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="ml-auto max-w-xs text-sm space-y-1">
          <Row label="Subtotal" value={formatAmount(invoice.subtotalMinor)} />
          {invoice.discountMinor > 0 && (
            <Row label="Discount" value={`−${formatAmount(invoice.discountMinor)}`} />
          )}
          <Row
            label={invoice.vatTotalMinor > 0 ? "VAT" : "VAT (exempt)"}
            value={formatAmount(invoice.vatTotalMinor)}
          />
          <div className="border-t-2 border-gray-800 mt-2 pt-2">
            <Row label="TOTAL" value={`${currency} ${formatAmount(invoice.totalMinor)}`} bold />
          </div>

          {payments.length > 0 && <div className="border-t border-gray-300 mt-3 pt-2 space-y-1" />}
          {payments.map((p) => (
            <Row
              key={p.id}
              label={
                p.type === "payment"
                  ? `Paid — ${p.method}${p.reference ? ` ${p.reference}` : ""}`
                  : `${PAYMENT_TYPE_LABELS[p.type] || p.type}${p.reason ? ` — ${p.reason}` : ""}`
              }
              value={(p.type === "payment" ? "" : "−") + formatAmount(p.amountMinor)}
              tone={p.type === "payment" ? "" : "text-gray-600"}
            />
          ))}

          <div className="border-t border-gray-800 mt-2 pt-2">
            <Row
              label={invoice.balanceMinor > 0 ? "BALANCE DUE" : "Balance"}
              value={`${currency} ${formatAmount(invoice.balanceMinor)}`}
              bold
              tone={invoice.balanceMinor > 0 ? "text-amber-700" : ""}
            />
          </div>
        </div>

        {/* Fiscalisation footer. Honest about state rather than implying a
            submission that has not happened. */}
        <div className="text-center text-xs text-gray-500 mt-10 pt-4 border-t border-gray-200">
          {invoice.etimsStatus === "submitted" && invoice.etimsInvoiceNo ? (
            <p>eTIMS {invoice.etimsInvoiceNo}</p>
          ) : invoice.etimsStatus === "not_applicable" ? null : (
            <p>eTIMS: not submitted</p>
          )}
          <p className="mt-1">Thank you — please keep this receipt.</p>
        </div>
      </div>
    </div>
  );
};

export default ReceiptPrint;
