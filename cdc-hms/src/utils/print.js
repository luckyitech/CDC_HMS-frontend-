import toast from "react-hot-toast";
import { code128Svg, encode } from "./code128";
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
// Thermal label size — the clinic's Xprinter thermal barcode printer runs
// 60×40mm label stock (Emu, 13 Oct 2026; was 50×30mm). Batch labels
// deliberately print on the SAME printer and stock as patient labels
// (decision, 28 Jul). Change the size here only.
export const LABEL_W_MM = 60;
export const LABEL_H_MM = 40;
// Inner margin of every thermal label. Keeps text and bars clear of the
// die-cut edge, which drifts by up to ~1mm as the roll feeds.
const LABEL_PAD_MM = 2.5;

// One dot of a 203 dpi thermal head (the Xprinter label range). Bars are sized
// in whole dots: 3 dots (0.375mm) per module when the code fits the label,
// else 2 dots (0.25mm, the smallest width a hand scanner reads reliably).
const THERMAL_DOT_MM = 25.4 / 203;

// Barcode for a thermal label, as wide as the label allows in whole dots.
export const labelBarcodeSvg = (text, { barHeightMm = 15 } = {}) => {
  const usableMm = LABEL_W_MM - LABEL_PAD_MM * 2;
  const modules = encode(text).totalModules + 20; // + the two 10-module quiet zones
  const dots = [3, 2].find((d) => modules * d * THERMAL_DOT_MM <= usableMm) ?? 2;
  return code128Svg(text, { moduleMm: dots * THERMAL_DOT_MM, barHeightMm, showText: true });
};

// Shared thermal-label layout: a bold title (up to two lines), one detail
// line, the barcode at the foot. Patient file labels and stock batch labels
// both use it, so they look and print the same.
export const printThermalLabel = ({ title, detail, code, copies = 1 }) => {
  printHtml(`Label ${code}`, LABEL_W_MM, LABEL_H_MM, `
    <div style="width:100%; height:100%; padding:${LABEL_PAD_MM}mm;
                display:flex; flex-direction:column; justify-content:space-between;">
      <div>
        <div style="font-size:11pt; font-weight:bold; line-height:1.15;
                    display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
          ${title || ""}
        </div>
        ${detail ? `<div style="font-size:8pt; margin-top:0.8mm;">${detail}</div>` : ""}
      </div>
      <div style="text-align:center; line-height:0;">${labelBarcodeSvg(code)}</div>
    </div>`, { copies });
};

// Must be called synchronously inside the tap/click handler (iOS gesture rule).
// `copies` prints the same page N times in ONE print job (one dialog): a
// thermal printer feeds one label per page.
export const printHtml = (_title, pageW, pageH, bodyHtml, { copies = 1 } = {}) => {
  const n = Math.max(1, Math.floor(Number(copies) || 1));
  const page = (last) => `
<div style="width:${pageW}mm; height:calc(${pageH}mm - 0.5mm); box-sizing:border-box; overflow:hidden; break-after:${last ? "avoid" : "page"};
            font-family: Arial, Helvetica, sans-serif; color:#000; background:#fff;
            display:flex; align-items:center; justify-content:center;">
  ${bodyHtml}
</div>`;
  printElement(`
<style>
  .print-portal * { margin: 0; padding: 0; box-sizing: border-box; }
  .print-portal svg { max-width: 100%; height: auto; }
</style>
${Array.from({ length: n }, (_, i) => page(i === n - 1)).join("")}`, { pageSize: `${pageW}mm ${pageH}mm`, pageMargin: "0" });
};

// Stock batch shelf label: item name, batch no, expiry, STK- barcode.
// Printed at intake (one per unit / pack — `copies`) and reprintable from the
// Items screen.
export const printStockBatchLabel = ({ labelCode, itemName, batchNo, expiryDate, copies = 1 }) => {
  if (!labelCode) {
    toast.error("This batch has no label code yet");
    return;
  }
  const expiry = expiryDate
    ? new Date(expiryDate).toLocaleDateString("en-GB", { month: "2-digit", year: "numeric" })
    : null;
  printThermalLabel({
    title: itemName,
    detail: [batchNo && `Batch: ${batchNo}`, expiry && `Exp: ${expiry}`].filter(Boolean).join(" &middot; "),
    code: labelCode,
    copies,
  });
};
