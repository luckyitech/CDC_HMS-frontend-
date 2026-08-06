import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Money } from "./billingUi";
import ReceiptPrint from "./ReceiptPrint";

// Shown after a discharge that issued a bill: the numbers reception may be
// asked for, and the receipt.
//
// Nothing prints by itself. A print dialog on every discharge gets dismissed
// reflexively, and then the one patient who did want a receipt has to be
// chased down the corridor.

const Line = ({ label, children, emphasis = false }) => (
  <div className={`flex justify-between ${emphasis ? "border-t pt-2 text-amber-700 font-bold" : ""}`}>
    <span className={emphasis ? "" : "text-gray-500"}>{label}</span>
    <span className={emphasis ? "" : "font-semibold"}>{children}</span>
  </div>
);

const DischargedBill = ({ invoice, patientName, onClose }) => {
  const [printing, setPrinting] = useState(false);
  if (!invoice) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">Discharged</h3>
          <p className="text-sm text-gray-500 mb-4">
            {patientName ? `${patientName}'s bill was issued.` : "The bill was issued."}
          </p>

          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2 text-left">
            <Line label="Invoice">
              <span className="font-mono">{invoice.invoiceNumber}</span>
            </Line>
            <Line label="Total"><Money minor={invoice.totalMinor} /></Line>
            <Line label="Paid"><Money minor={invoice.amountPaidMinor} /></Line>
            {invoice.balanceMinor > 0 && (
              <Line label="Balance carried forward" emphasis>
                <Money minor={invoice.balanceMinor} />
              </Line>
            )}
          </div>

          <div className="flex gap-3 mt-5">
            <button
              onClick={() => setPrinting(true)}
              className="flex-1 px-4 py-2.5 rounded-lg border-2 border-primary text-primary text-sm font-bold hover:bg-blue-50"
            >
              Print receipt
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-bold hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {printing && <ReceiptPrint invoice={invoice} onClose={() => setPrinting(false)} />}
    </>
  );
};

export default DischargedBill;
