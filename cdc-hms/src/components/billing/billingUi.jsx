import StatusBadge from "../shared/StatusBadge";
import {
  INVOICE_STATUS_TONES, INVOICE_STATUS_LABELS,
  PAYMENT_TYPE_TONES, PAYMENT_TYPE_LABELS,
} from "../../utils/statusStyles";
import { formatAmount, isUnpriced } from "../../utils/money";

// Small shared pieces for the billing tabs. Colours come from the app-wide
// StatusBadge + statusStyles maps, never hand-rolled classes — the same rule
// stockUi follows.

/**
 * An amount, right-aligned with tabular figures so columns of money line up.
 *
 * Takes MINOR UNITS (integer cents), because that is what every billing
 * endpoint returns. Renders an em dash for a null price — "nobody has set one"
 * is not the same fact as "0.00", and showing zero would read as free.
 */
export const Money = ({ minor, className = "", bold = false }) => {
  if (isUnpriced(minor)) return <span className="text-gray-400">—</span>;
  const negative = Number(minor) < 0;
  return (
    <span
      className={`tabular-nums whitespace-nowrap ${bold ? "font-bold" : ""} ${
        negative ? "text-red-600" : ""
      } ${className}`}
    >
      {formatAmount(minor)}
    </span>
  );
};

/** Invoice lifecycle badge: Draft / Issued / Part paid / Paid / Void. */
export const InvoiceStatus = ({ status, size = "sm" }) => (
  <StatusBadge size={size} tone={INVOICE_STATUS_TONES[status] || "neutral"}>
    {INVOICE_STATUS_LABELS[status] || status}
  </StatusBadge>
);

/** Payment direction badge: Payment / Refund / Reversal. */
export const PaymentType = ({ type, size = "xs" }) => (
  <StatusBadge shape="tag" size={size} bordered={false} tone={PAYMENT_TYPE_TONES[type] || "neutral"}>
    {PAYMENT_TYPE_LABELS[type] || type}
  </StatusBadge>
);

/**
 * Flags a service with no price set.
 *
 * Amber rather than red: an unpriced service is unfinished setup, not a fault.
 * It blocks a bill being ISSUED, never a patient being discharged.
 */
export const UnpricedBadge = ({ size = "xs" }) => (
  <StatusBadge shape="tag" size={size} tone="amber">
    Not priced
  </StatusBadge>
);

/**
 * Wraps a table so wide content scrolls inside its own box rather than pushing
 * the page sideways. Every billing table uses it.
 */
export const TableScroll = ({ children }) => (
  <div className="overflow-x-auto -mx-2 px-2">{children}</div>
);

/** Column headers, styled once. */
export const Th = ({ children, right = false, className = "" }) => (
  <th
    className={`px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap ${
      right ? "text-right" : "text-left"
    } ${className}`}
  >
    {children}
  </th>
);

/** Body cells, styled once. */
export const Td = ({ children, right = false, className = "" }) => (
  <td className={`px-3 py-3 text-sm ${right ? "text-right" : ""} ${className}`}>{children}</td>
);

/** The empty state every list shares, so none of them invents its own. */
export const EmptyRow = ({ colSpan, children }) => (
  <tr>
    <td colSpan={colSpan} className="px-3 py-10 text-center text-gray-500 text-sm">
      {children}
    </td>
  </tr>
);
