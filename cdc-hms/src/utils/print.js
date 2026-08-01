import toast from "react-hot-toast";
import { code128Svg } from "./code128";

// Shared print path: opens a print window sized to the physical media and
// prints the given body. Used by patient barcode cards/labels
// (BarcodeActions) and stock batch shelf labels — one implementation, one
// place to fix printer quirks.
//
// Thermal label size — confirm against the clinic's printer and adjust in one
// place. Common desktop thermal labels are 50×30mm. Batch labels deliberately
// print on the SAME printer and stock as patient labels (decision, 28 Jul).
export const LABEL_W_MM = 50;
export const LABEL_H_MM = 30;

export const printHtml = (title, pageW, pageH, bodyHtml) => {
  const win = window.open("", "_blank", "width=480,height=360");
  if (!win) {
    toast.error("Pop-up blocked — allow pop-ups to print");
    return;
  }
  win.document.write(`<!doctype html>
<html>
<head>
<title>${title}</title>
<style>
  @page { size: ${pageW}mm ${pageH}mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${pageW}mm; height: ${pageH}mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff;
         display: flex; align-items: center; justify-content: center; }
  svg { max-width: 100%; height: auto; }
</style>
</head>
<body>${bodyHtml}</body>
</html>`);
  win.document.close();
  win.focus();
  // Give the window a beat to lay out (and any images to load), then print.
  setTimeout(() => {
    win.print();
    win.close();
  }, 500);
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
