import toast from "react-hot-toast";
import { code128Svg } from "./code128";
import { printElement } from "../hooks/usePrint";

// Shared print path: prints the given body on a page sized to the physical
// media. Used by patient barcode cards/labels (BarcodeActions), stock batch
// shelf labels and the discharge summary — one implementation, one place to fix
// printer quirks.
//
// Prints on the main document via printElement (NOT a pop-up window): iPad
// Safari ignores print() fired from a timer in a pop-up, and closing the pop-up
// right after print() killed the job before iOS rendered it.
//
// Thermal label size — confirm against the clinic's printer and adjust in one
// place. Common desktop thermal labels are 50×30mm. Batch labels deliberately
// print on the SAME printer and stock as patient labels (decision, 28 Jul).
export const LABEL_W_MM = 50;
export const LABEL_H_MM = 30;

// Must be called synchronously inside the tap/click handler (iOS gesture rule).
export const printHtml = (_title, pageW, pageH, bodyHtml) => {
  printElement(`
<div style="width:${pageW}mm; height:${pageH}mm; box-sizing:border-box; overflow:hidden;
            font-family: Arial, Helvetica, sans-serif; color:#000; background:#fff;
            display:flex; align-items:center; justify-content:center;">
  <style>
    .print-portal * { margin: 0; padding: 0; box-sizing: border-box; }
    .print-portal svg { max-width: 100%; height: auto; }
  </style>
  ${bodyHtml}
</div>`, { pageSize: `${pageW}mm ${pageH}mm`, pageMargin: "0" });
};

// Stock batch shelf label: item name, batch no, expiry, STK- barcode.
// Printed at intake and reprintable from the Items screen.
export const printStockBatchLabel = ({ labelCode, itemName, batchNo, expiryDate }) => {
  if (!labelCode) {
    toast.error("This batch has no label code yet");
    return;
  }
  const svg = code128Svg(labelCode, { height: 30, moduleWidth: 2, showText: true });
  const expiry = expiryDate
    ? new Date(expiryDate).toLocaleDateString("en-GB", { month: "2-digit", year: "numeric" })
    : null;
  printHtml(`Label ${labelCode}`, LABEL_W_MM, LABEL_H_MM, `
    <div style="width:${LABEL_W_MM}mm; height:${LABEL_H_MM}mm; padding:1.5mm 2mm;
                display:flex; flex-direction:column; justify-content:space-between;">
      <div style="font-size:8pt; font-weight:bold; white-space:nowrap; overflow:hidden;">
        ${itemName || ""}
      </div>
      <div style="font-size:6.5pt; color:#333;">
        ${batchNo ? `Batch: ${batchNo}` : ""}${batchNo && expiry ? " &middot; " : ""}${expiry ? `Exp: ${expiry}` : ""}
      </div>
      <div style="text-align:center;">${svg}</div>
    </div>`);
};
