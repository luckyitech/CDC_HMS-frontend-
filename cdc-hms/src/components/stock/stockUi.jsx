import { useState, useEffect, useCallback, useRef } from "react";
import { ScanLine, Loader2, AlertTriangle } from "lucide-react";
import barcodeService from "../../services/barcodeService";
import { useUserContext } from "../../contexts/UserContext";
import { hasPermission } from "../../utils/permissions";
import { notify } from "../../utils/notify";
import Button from "../shared/Button";
import Modal from "../shared/Modal";
import StatusBadge from "../shared/StatusBadge";
import SharedStatCard from "../shared/StatCard";
import {
  STOCK_STATUS_TONES, STOCK_MOVEMENT_TONES, STOCK_MOVEMENT_LABELS,
} from "../../utils/statusStyles";

// Small shared pieces for the stock tabs — one implementation each for the
// field row, headline card, status badge, movement badge, the scan-a-batch
// box and the FEFO override modal, so every tab stays uniform. Colours and
// badge shapes come from the app-wide StatusBadge + statusStyles, not
// hand-rolled classes.

// Form field label — matches the house convention (ClinicalCatalog/EditUser).
export const Field = ({ label, children, hint }) => (
  <div className="mb-4">
    <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
    {children}
    {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
  </div>
);

// Who a movement went to (13 Oct 2026): a registered patient, or a walk-in
// (not registered — name and phone on the movement). One rule for every table
// and CSV.
export const recipientText = (m) => {
  if (m?.Patient) return `${m.Patient.firstName} ${m.Patient.lastName}`;
  if (m?.recipientName) return `Walk-in: ${m.recipientName}${m.recipientPhone ? ` · ${m.recipientPhone}` : ""}`;
  return "";
};
export const Recipient = ({ m, showUhid = false }) => {
  if (m?.Patient) {
    return (
      <span>
        {m.Patient.firstName} {m.Patient.lastName}
        {showUhid && <span className="block text-gray-400 font-mono">{m.Patient.uhid}</span>}
      </span>
    );
  }
  if (m?.recipientName) {
    return (
      <span>
        <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 rounded px-1 mr-1">Walk-in</span>
        {m.recipientName}
        {m.recipientPhone && <span className="block text-gray-400">{m.recipientPhone}</span>}
      </span>
    );
  }
  return <span className="text-gray-300">—</span>;
};

// How a delivery (or one of its lines) was entered (13 Oct 2026): read from
// the invoice, typed by hand, or both. One badge for Deliveries and the Audit.
const METHOD_TONE = { invoice: "success", manual: "neutral", mixed: "info", opening: "warning" };
const METHOD_LABEL = { invoice: "From invoice", manual: "Manual", mixed: "Invoice + manual", opening: "Opening stock" };
export const ReceiveMethodBadge = ({ method }) => (method && METHOD_LABEL[method] ? (
  <StatusBadge shape="tag" size="xs" bordered={false} tone={METHOD_TONE[method]}>{METHOD_LABEL[method]}</StatusBadge>
) : null);
export const receiveMethodText = (method) => METHOD_LABEL[method] || "";

// Per-tab Stocks permissions (13 Oct 2026): can(PERMISSIONS.X) for the signed-in
// user. Hiding a control is UX — every route is gated server-side.
export const useStockCan = () => {
  const { currentUser } = useUserContext();
  return (permission) => hasPermission(currentUser, permission);
};

// "pen" → "pens", "box" → "boxes" — one rule for every stock screen.
export const unitPlural = (unit = "unit") => `${unit}${/(x|s|ch|sh)$/.test(unit) ? "es" : "s"}`;

// Input styling — same as ClinicalCatalog's inputCls (border-2, focus:primary).
export const inputCls =
  "w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary";

// Headline stat tile — stock's name for the shared StatCard (11 Oct 2026).
export const StatCard = ({ label, value, sub, tone = "blue" }) => {
  const gradients = {
    blue:  "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    amber: "from-amber-500 to-amber-600",
    red:   "from-red-500 to-red-600",
    cyan:  "from-cyan-500 to-cyan-600",
    purple:"from-purple-500 to-purple-600",
  };
  // The app's one number tile (shared StatCard), in the stock tones.
  return <SharedStatCard title={label} value={value} sub={sub} gradient={gradients[tone] || gradients.blue} />;
};

// Lifecycle status badge (active / retired / expired …).
export const StatusPill = ({ value }) => (
  <StatusBadge shape="tag" size="xs" bordered={false} tone={STOCK_STATUS_TONES[value] || "info"}>
    {value}
  </StatusBadge>
);

// Movement-type badge, shared by history and reports.
export const MovementBadge = ({ type }) => (
  <StatusBadge shape="tag" size="xs" bordered={false} tone={STOCK_MOVEMENT_TONES[type] || "neutral"}>
    {STOCK_MOVEMENT_LABELS[type] || type}
  </StatusBadge>
);

// Type → label map, still exported for the movement-type filter dropdown.
export const MOVEMENT_LABELS = STOCK_MOVEMENT_LABELS;

// ---------------------------------------------------------------------
// BatchScanBox — scan (or type) an STK- shelf label; resolves through the
// shared barcode endpoint and hands the { batch, item, levels } payload to
// the parent. Includes the same hands-free keyboard-wedge burst capture as
// reception (a fast keystroke burst ending in Enter while no input is
// focused counts as a scan).
// ---------------------------------------------------------------------
const SCAN_MAX_MS = 500;
const MIN_LEN = 3;

export const BatchScanBox = ({ onResolved, disabled = false }) => {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  // Keep the cursor in the box so a USB scanner can fire one label after another
  // without the staff clicking back in each time. Re-focus whenever it becomes
  // enabled (patient just attached) and after every resolved scan.
  const focusInput = useCallback(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  useEffect(() => { focusInput(); }, [focusInput]);

  const resolve = useCallback(async (raw) => {
    const code = String(raw || "").trim().toUpperCase();
    if (!code || busy || disabled) return;
    setBusy(true);
    try {
      const res = await barcodeService.resolveScan(code);
      if (res.success && res.data?.type === "stock") {
        setValue("");
        onResolved(res.data);
      } else {
        notify("error", "Not a stock label — expected an STK- batch code");
      }
    } catch (err) {
      notify("error", err?.message || "Label not recognised");
    } finally {
      setBusy(false);
      // Return focus so the next label scans straight in
      inputRef.current?.focus();
    }
  }, [busy, disabled, onResolved]);

  // Hands-free wedge (mirrors ScanCapture's behaviour).
  useEffect(() => {
    let buffer = "";
    let startedAt = 0;
    const isEditable = (el) =>
      !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

    const onKeyDown = (e) => {
      if (isEditable(document.activeElement)) return;
      const now = Date.now();
      if (now - startedAt > SCAN_MAX_MS) {
        buffer = "";
        startedAt = now;
      }
      if (e.key === "Enter") {
        if (buffer.length >= MIN_LEN && now - startedAt <= SCAN_MAX_MS) resolve(buffer);
        buffer = "";
        return;
      }
      if (e.key.length === 1) buffer += e.key;
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resolve]);

  return (
    <div className="border-2 border-dashed border-primary bg-blue-50 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-3">
        <ScanLine className="w-6 h-6 text-primary flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              resolve(value);
            }
          }}
          placeholder="Scan a shelf label or type its code (e.g. STK-000123)"
          disabled={disabled}
          className="flex-1 px-3 py-2 border-2 border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:border-primary"
        />
        {busy && <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />}
      </div>
      <p className="text-xs text-blue-700 mt-2">
        A USB scanner types the code and submits automatically — the form pre-fills from the batch.
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------
// FefoOverrideModal — shown when the backend answers 409 with a
// fefoSuggestion: an earlier-expiring batch of the same item is at this
// location. The user may switch to the suggested batch (the right thing) or
// proceed with a logged override reason (the report reads these).
// ---------------------------------------------------------------------
export const FefoOverrideModal = ({ suggestion, onUseSuggested, onOverride, onClose }) => {
  const [reason, setReason] = useState("");
  if (!suggestion) return null;
  return (
    <Modal isOpen onClose={onClose} title="Earlier expiry available (FEFO)">
      <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-sm text-amber-800 mb-4 flex gap-2">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <div>
          An earlier-expiring batch of this item is at this location:{" "}
          <b>{suggestion.labelCode || `#${suggestion.stockBatchId}`}</b>
          {suggestion.batchNo && <> (batch {suggestion.batchNo})</>}
          , expiry <b>{suggestion.expiryDate}</b>, {suggestion.available} unit(s) available.
          First-Expiry-First-Out keeps stock from expiring on the shelf.
        </div>
      </div>
      <Field label="Override reason (logged)">
        <input
          className={inputCls}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. suggested batch physically missing from shelf"
        />
      </Field>
      <div className="flex gap-3 mt-4">
        <Button variant="primary" className="flex-1" onClick={() => onUseSuggested(suggestion)}>
          Use suggested batch
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          disabled={!reason.trim()}
          onClick={() => onOverride(reason.trim())}
        >
          Override anyway
        </Button>
      </div>
    </Modal>
  );
};

// PatientAttach — scan a patient card or type a UHID to attach the patient a
// dispense/use went to. Resolves through the shared barcode endpoint (which is
// merge-aware). value is { uhid, name } | null. Used by the Dispense tab and
// Record Use so bad-batch recalls can trace who received a batch.
export const PatientAttach = ({ value, onChange, label = "Attach patient (optional)", hint }) => {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const resolve = async (raw) => {
    const c = String(raw || "").trim();
    if (!c || busy) return;
    setBusy(true);
    try {
      const res = await barcodeService.resolveScan(c);
      if (res.success && res.data?.type === "patient") {
        onChange({ uhid: res.data.uhid, name: res.data.name });
        setCode("");
      } else {
        notify("error", "Not a patient code — scan a patient card or type a UHID");
      }
    } catch (err) {
      notify("error", err?.message || "Patient not found");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Field label={label} hint={hint}>
      {value ? (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <span className="text-sm">
            <b>{value.name}</b> <span className="font-mono text-xs text-gray-500">{value.uhid}</span>
          </span>
          <button type="button" className="text-xs text-primary font-semibold" onClick={() => onChange(null)}>
            change
          </button>
        </div>
      ) : (
        <div className="relative">
          <ScanLine className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
          <input
            className={`${inputCls} pl-8`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); resolve(code); } }}
            placeholder="Scan patient card or type a UHID (e.g. CDC042)"
          />
          {busy && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
        </div>
      )}
    </Field>
  );
};

// Compact "who · when" attribution line used on rows and history views —
// the clinic-wide standing rule: every action shows who did it and when.
export const ByLine = ({ user, at }) => {
  if (!user && !at) return null;
  const name = user ? `${user.firstName} ${user.lastName}` : null;
  const time = at ? new Date(at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : null;
  return (
    <span className="text-xs text-gray-500">
      {name}{name && time ? " · " : ""}{time}
    </span>
  );
};
