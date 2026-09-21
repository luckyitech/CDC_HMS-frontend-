// PrintDocument — the building blocks every clinical printout is made of, so a
// prescription, a lab request and a lab report all share one compact layout
// (DRY §4e). Pair with usePrint + PrintLetterhead:
//
//   <PrintPreviewModal title="…" onPrint={handlePrint} onClose={…}>
//     <div ref={printRef} className="p-6">
//       <PrintLetterhead show />
//       <PrintDocHeader icon="℞" label="Prescription No." number="RX-…" date="…" />
//       <PrintPatientLine items={[{ label: "Patient", value: name }]} />
//       <PrintSection title="…"><PrintTable columns={…} rows={…} /></PrintSection>
//       <PrintSignatures><PrintSignature label="Prescribed by:" name="…" /></PrintSignatures>
//     </div>
//   </PrintPreviewModal>
import { Printer } from "lucide-react";

const btn = "px-6 py-2 rounded-lg font-semibold transition flex items-center gap-2";

/** On-screen preview window with the toolbar; the toolbar never prints. */
export const PrintPreviewModal = ({
  title, onPrint, onClose, closeLabel = "Close", leadingActions, trailingActions, maxWidth = "max-w-4xl", children,
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div className={`bg-white rounded-lg shadow-2xl ${maxWidth} w-full max-h-[90vh] overflow-y-auto`}>
      <div className="print:hidden sticky top-0 bg-white border-b-2 border-gray-200 p-4 flex justify-between items-center gap-3">
        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        <div className="flex flex-wrap justify-end gap-3">
          {leadingActions}
          <button onClick={onPrint} className={`${btn} bg-primary text-white hover:bg-blue-700`}>
            <Printer className="w-4 h-4" /> Print
          </button>
          {trailingActions}
          <button onClick={onClose} className={`${btn} bg-gray-200 text-gray-800 hover:bg-gray-300`}>
            {closeLabel}
          </button>
        </div>
      </div>
      {children}
    </div>
  </div>
);

/** Document number on the left (with its symbol), issue date opposite it. */
export const PrintDocHeader = ({ icon, label, number, date, dateLabel = "Date" }) => (
  <div className="mb-4 flex justify-between items-center">
    <div className="flex items-center gap-2">
      <span className="text-3xl font-bold text-primary leading-none">{icon}</span>
      <div>
        <p className="text-xs text-gray-600 uppercase tracking-wide">{label}</p>
        <p className="text-lg font-bold text-gray-800">{number}</p>
      </div>
    </div>
    {date && (
      <div className="text-right">
        <p className="text-xs text-gray-600 uppercase tracking-wide">{dateLabel}</p>
        <p className="text-lg font-bold text-gray-800">{date}</p>
      </div>
    )}
  </div>
);

/** Patient identity on ONE line — no section heading, no wasted rows.
 *  items: [{ label, value }] — empty values are skipped. */
export const PrintPatientLine = ({ items }) => (
  <p className="mb-4 text-sm flex flex-wrap gap-x-5 gap-y-1">
    {items.filter((i) => i.value != null && i.value !== "").map((i) => (
      <span key={i.label}>
        <span className="text-gray-600">{i.label}:</span>{" "}
        <span className="font-semibold text-gray-800">{i.value}</span>
      </span>
    ))}
  </p>
);

export const PrintSection = ({ title, children }) => (
  <div className="mb-4">
    {title && <h3 className="font-bold text-gray-800 mb-1.5">{title}</h3>}
    {children}
  </div>
);

const cell = "border border-gray-300 px-3 py-1.5 text-sm text-left";

/** The bordered table used for medications, tests and results.
 *  columns: [{ header, cell: (row, index) => node, className? }]
 *  perRow: items side by side per table row (2 halves a long test list's
 *  height); the column set repeats and numbering runs DOWN each column
 *  (1–8 on the left, 9–15 on the right), the way a list is read. */
export const PrintTable = ({ columns, rows, perRow = 1 }) => {
  const depth = Math.ceil(rows.length / perRow);
  const sets = Array.from({ length: perRow }, (_, s) => s);
  const lines = Array.from({ length: depth }, (_, li) => sets.map((s) => s * depth + li));

  return (
    <table className="w-full border-collapse border-2 border-gray-300">
      <thead>
        <tr>
          {sets.flatMap((s) => columns.map((c) => (
            <th key={`${s}-${c.header}`} className={`${cell} font-bold`}>{c.header}</th>
          )))}
        </tr>
      </thead>
      <tbody>
        {lines.map((line, li) => (
          <tr key={li}>
            {sets.flatMap((s) => columns.map((c) => {
              const idx = line[s];
              return (
                <td key={`${s}-${c.header}`} className={`${cell} ${c.className || ""}`}>
                  {idx < rows.length ? c.cell(rows[idx], idx) : ""}
                </td>
              );
            }))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

/** Small-print notice line above the signatures. */
export const PrintNotice = ({ children }) => (
  <p className="mb-4 text-xs text-gray-700">{children}</p>
);

/** Signature row — one or more PrintSignature side by side, never split
 *  across a page break. `aside` sits at the far right (e.g. collection date). */
export const PrintSignatures = ({ children, aside }) => (
  <div className="pt-4 border-t-2 border-gray-300 break-inside-avoid flex flex-wrap justify-between items-end gap-x-10 gap-y-4">
    <div className="flex flex-wrap gap-x-16 gap-y-4">{children}</div>
    {aside && <div className="text-xs text-gray-600">{aside}</div>}
  </div>
);

/** A signature line with the signer underneath. The line is sized to sign on,
 *  without the empty half-page a taller box left on short documents. */
export const PrintSignature = ({ label, name, subtitle, regNo }) => (
  <div>
    <p className="text-xs text-gray-600 mb-1">{label}</p>
    <div className="border-b-2 border-gray-400 w-56 h-9 mb-1.5"></div>
    {name && <p className="font-bold text-gray-800">{name}</p>}
    {subtitle && <p className="text-xs text-gray-600">{subtitle}</p>}
    {regNo && <p className="text-xs text-gray-500 mt-1">Reg. No: {regNo}</p>}
  </div>
);
