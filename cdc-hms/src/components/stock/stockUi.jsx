import { useState, useEffect, useCallback } from "react";
import { ScanLine, Loader2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import barcodeService from "../../services/barcodeService";
import Button from "../shared/Button";
import Modal from "../shared/Modal";

// Small shared pieces for the stock tabs — one implementation each for the
// field row, headline card, status pill, the scan-a-batch box and the FEFO
// override modal, so every tab stays uniform.

export const Field = ({ label, children, hint }) => (
  <div className="mb-4">
    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
      {label}
    </label>
    {children}
    {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
  </div>
);

export const inputCls =
  "w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-primary";

export const StatCard = ({ label, value, sub, tone = "blue" }) => {
  const tones = {
    blue: "border-l-4 border-l-blue-500",
    red: "border-l-4 border-l-red-500",
    amber: "border-l-4 border-l-amber-500",
    green: "border-l-4 border-l-green-500",
  };
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 ${tones[tone]}`}>
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-extrabold text-gray-800 my-1">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
};

export const StatusPill = ({ value }) => {
  const styles = {
    active: "bg-green-100 text-green-700",
    retired: "bg-gray-100 text-gray-500",
    depleted: "bg-gray-100 text-gray-500",
    expired: "bg-red-100 text-red-700",
    recalled: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${styles[value] || "bg-blue-100 text-blue-700"}`}>
      {value}
    </span>
  );
};

// Movement type → display tone, shared by history and dashboards.
export const MOVEMENT_LABELS = {
  intake: { label: "Intake", cls: "bg-green-100 text-green-700" },
  dispense: { label: "Dispense", cls: "bg-blue-100 text-blue-700" },
  use: { label: "Use", cls: "bg-blue-100 text-blue-700" },
  transfer: { label: "Transfer", cls: "bg-amber-100 text-amber-700" },
  adjustment: { label: "Adjustment", cls: "bg-purple-100 text-purple-700" },
  expiry_writeoff: { label: "Expiry write-off", cls: "bg-red-100 text-red-700" },
  damage_writeoff: { label: "Damage write-off", cls: "bg-red-100 text-red-700" },
  return: { label: "Return", cls: "bg-green-100 text-green-700" },
  reversal: { label: "Reversal", cls: "bg-gray-200 text-gray-700" },
};

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
        toast.error("Not a stock label — expected an STK- batch code");
      }
    } catch (err) {
      toast.error(err?.message || "Label not recognised");
    } finally {
      setBusy(false);
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
          type="text"
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
