import { useState, useEffect } from "react";
import { notify } from "../../utils/notify";
import { Plus, Minus, X, Package, AlertTriangle, ShoppingCart } from "lucide-react";
import stockService from "../../services/stockService";
import Button from "../shared/Button";
import Modal from "../shared/Modal";
import StockHelp from "./StockHelp";
import SwitcherTabs from "../shared/SwitcherTabs";
import PatientSearchInput from "../shared/PatientSearchInput";
import barcodeService from "../../services/barcodeService";
import { BatchScanBox, Field, inputCls } from "./stockUi";

// 13 Oct 2026 (Emu): the patient is found with the clinic's normal search —
// card scan, name, UHID, phone, email or ID number — and supplies can go to a
// WALK-IN (not registered: name and phone both required). A walk-in dispense
// has no patient file; it shows as "Walk-in" in Movements and in Reports →
// Walk-ins, and counts in consumption like any dispense.
//
// Dispense — a scan-to-cart flow. The patient is attached first (mandatory),
// then each scanned shelf label adds a line to the list; scanning the same
// batch again bumps its quantity. Quantities and per-batch locations are
// adjustable, lines removable — so the staff can see exactly what's going out
// before committing. Confirm dispenses the whole list to the patient in ONE
// transaction (checkout-dispense): all-or-nothing, expired batches blocked,
// stock never goes negative. FEFO is advisory per line (staff holds the box).
const StockDispenseTab = ({ onLockChange }) => {
  // Who it goes to: { kind: "patient", uhid, name, … } or { kind: "walkin", name, phone }.
  const [recipient, setRecipient] = useState(null);
  const [mode, setMode] = useState("patient");
  const [walkIn, setWalkIn] = useState({ name: "", phone: "" });
  const [lines, setLines] = useState([]);   // see shape in addScan
  const [saving, setSaving] = useState(false);
  // A scanned high-alert item waits here for an explicit confirm before it
  // enters the cart — the second check the design asks for on these drugs.
  const [pendingHighAlert, setPendingHighAlert] = useState(null);

  // A dispense is "in progress" once a patient is attached. While it is, the
  // parent locks the other tabs — the staff must complete or cancel first, so a
  // half-scanned trolley is never abandoned by wandering off to another tab.
  useEffect(() => {
    onLockChange?.(!!recipient);
    return () => onLockChange?.(false);
  }, [recipient, onLockChange]);

  // Clear everything and release the tab lock.
  const cancel = () => {
    setLines([]);
    setRecipient(null);
    setWalkIn({ name: "", phone: "" });
  };

  // A scanned card (or a typed UHID + Enter) picks the patient straight away.
  const onSearchEnter = async (term) => {
    if (!/^CDC\d+$/i.test(term)) return false;
    try {
      const res = await barcodeService.resolveScan(term.toUpperCase());
      if (res.success && res.data?.type === "patient") {
        setRecipient({ kind: "patient", uhid: res.data.uhid, name: res.data.name });
        return true;
      }
    } catch { /* fall back to the search results */ }
    return false;
  };
  const chooseWalkIn = () => {
    if (walkIn.name.trim().length < 2) return notify("error", "Enter the walk-in's name");
    if (walkIn.phone.replace(/\D/g, "").length < 7) return notify("error", "Enter the walk-in's phone number");
    setRecipient({ kind: "walkin", name: walkIn.name.trim(), phone: walkIn.phone.trim() });
  };

  const availableAt = (line) =>
    line.levels.find((l) => String(l.locationId) === String(line.locationId))?.quantity ?? 0;

  const totalItems = lines.reduce((n, l) => n + Number(l.quantity || 0), 0);

  // FEFO nudge: flag a line when it isn't the earliest-expiring batch of that
  // item at its chosen location. Best-effort — never blocks.
  const evaluateFefo = async (stockBatchId, stockItemId, locationId) => {
    if (!locationId) return;
    try {
      const res = await stockService.getFefoSuggestion(stockItemId, locationId);
      const s = res.success ? res.data.suggestion : null;
      const warn = s && s.stockBatchId !== stockBatchId ? s : null;
      setLines((prev) => prev.map((l) => l.stockBatchId === stockBatchId ? { ...l, fefoWarn: warn } : l));
    } catch {
      /* nudge is advisory */
    }
  };

  // If a scanned batch was ever returned, say so — informational for a
  // re-dispensable return, a hard warning if any of it is quarantined (the
  // server also blocks dispensing a quarantined batch).
  const warnIfReturned = async (batchId) => {
    try {
      const res = await stockService.getBatchReturnInfo(batchId);
      if (res.success && res.data?.returned) {
        notify(
          res.data.inQuarantine ? "error" : "info",
          `${res.data.inQuarantine ? "Quarantined return" : "Previously returned"}` +
            (res.data.reason ? ` — ${res.data.reason}` : ""),
        );
      }
    } catch {
      /* advisory only */
    }
  };

  // A scanned STK- shelf label enters here. High-alert items pause for a
  // confirm the first time they are added; bumping an already-confirmed line
  // just adds one more without re-prompting.
  const onScan = (data) => {
    warnIfReturned(data.batch.id);
    const alreadyInCart = lines.some((l) => l.stockBatchId === data.batch.id);
    if (data.item?.isHighAlert && !alreadyInCart) {
      setPendingHighAlert(data);
      return;
    }
    addScan(data);
  };

  const addScan = (data) => {
    const held = (data.levels || []).filter((l) => l.quantity > 0);
    if (held.length === 0) {
      notify("error", `No stock of ${data.item.name} is held anywhere`);
      return;
    }
    // Work the target location out BEFORE touching state.
    //
    // This used to be assigned inside the setLines updater and read straight
    // after, which is a race with React's scheduling: an updater is only
    // guaranteed to run during render, so the variable was usually still
    // undefined by the time evaluateFefo() saw it — and evaluateFefo returns
    // early on a falsy location. The FEFO nudge therefore fired only when React
    // happened to compute the state eagerly, and silently did nothing the rest
    // of the time. A safety warning that works intermittently is worse than one
    // that doesn't exist, because staff learn to trust it.
    const existing = lines.find((s) => s.stockBatchId === data.batch.id);
    const targetLocation = existing ? existing.locationId : held[0].locationId;

    setLines((prev) => {
      const idx = prev.findIndex((s) => s.stockBatchId === data.batch.id);
      if (idx !== -1) {
        return prev.map((s, i) => i === idx ? { ...s, quantity: s.quantity + 1 } : s);
      }
      return [...prev, {
        stockBatchId: data.batch.id,
        stockItemId:  data.item.id,
        name:         data.item.name,
        unit:         data.item.unit,
        labelCode:    data.batch.labelCode,
        expiryDate:   data.batch.expiryDate,
        isHighAlert:  data.item.isHighAlert,
        levels:       held,
        locationId:   targetLocation,
        quantity:     1,
        fefoWarn:     null,
      }];
    });
    evaluateFefo(data.batch.id, data.item.id, targetLocation);
  };

  const setLine = (idx, patch) => setLines((prev) => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!recipient) return notify("error", "Choose who this is dispensed to — a patient or a walk-in");
    if (lines.length === 0) return notify("error", "Scan at least one item");
    for (const l of lines) {
      if (!l.locationId) return notify("error", `Choose where "${l.name}" comes from`);
      if (Number(l.quantity) < 1) return notify("error", `"${l.name}" needs a quantity of at least 1`);
      // The cart happily counts past what the shelf holds — every scan of the
      // same label adds one, and the +/- buttons have no ceiling. The server
      // then refuses the WHOLE transaction, so one over-counted line threw away
      // a trolley of correctly scanned ones with a single unhelpful message.
      // Name the offending line here instead.
      const held = availableAt(l);
      if (Number(l.quantity) > held) {
        return notify(
          "error",
          `Only ${held} ${l.unit}(s) of "${l.name}" are held there — reduce the quantity or pick another batch`
        );
      }
    }
    setSaving(true);
    try {
      const res = await stockService.checkoutDispense(
        recipient.kind === "patient" ? recipient.uhid : null,
        lines.map((l) => ({ stockBatchId: l.stockBatchId, locationId: Number(l.locationId), quantity: Number(l.quantity) })),
        null,
        recipient.kind === "walkin" ? { name: recipient.name, phone: recipient.phone } : null,
      );
      if (res.success) {
        notify("success", `Dispensed ${totalItems} item(s) to ${recipient.kind === "walkin" ? `walk-in ${recipient.name}` : recipient.name}`);
        cancel();
      } else {
        notify("error", res.message || "Dispense failed");
      }
    } catch (err) {
      notify("error", err?.message || "Dispense failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Left — who it goes to: a registered patient, or a walk-in */}
      <div className="lg:col-span-1">
        {recipient ? (
          <Field label={recipient.kind === "walkin" ? "Walk-in (not registered)" : "Patient"}>
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <span className="text-sm">
                <b>{recipient.name}</b>{" "}
                <span className="font-mono text-xs text-gray-500">
                  {recipient.kind === "walkin" ? (recipient.phone || "no phone") : recipient.uhid}
                </span>
              </span>
              <button type="button" className="text-xs text-primary font-semibold" onClick={() => setRecipient(null)}
                disabled={lines.length > 0} title={lines.length > 0 ? "Cancel the cart to change who it goes to" : undefined}>
                change
              </button>
            </div>
          </Field>
        ) : (
          <>
            <SwitcherTabs size="sm" className="mb-3" ariaLabel="Dispense to" idPrefix="dispense-to"
              tabs={[{ id: "patient", label: "Registered patient" }, { id: "walkin", label: "Walk-in" }]}
              active={mode} onChange={setMode} />
            {mode === "patient" ? (
              <Field label="Patient" hint="scan the card, or search by name, UHID, phone, email or ID number">
                <PatientSearchInput
                  autoFocus
                  placeholder="Scan a card, or search by name, UHID, phone…"
                  onSelect={(p) => setRecipient({ kind: "patient", uhid: p.uhid, name: p.name || `${p.firstName || ""} ${p.lastName || ""}`.trim() })}
                  onEnter={onSearchEnter}
                />
              </Field>
            ) : (
              <>
                <Field label="Name (required)">
                  <input className={inputCls} value={walkIn.name} autoFocus
                    onChange={(e) => setWalkIn((w) => ({ ...w, name: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && chooseWalkIn()} placeholder="Who is collecting the supplies" />
                </Field>
                <Field label="Phone (required)" hint="lets the clinic reach them if a batch is ever recalled">
                  <input className={inputCls} value={walkIn.phone} inputMode="tel"
                    onChange={(e) => setWalkIn((w) => ({ ...w, phone: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && chooseWalkIn()} placeholder="e.g. 0722 000 000" />
                </Field>
                <Button className="w-full mb-4" onClick={chooseWalkIn}>Dispense to this walk-in</Button>
              </>
            )}
          </>
        )}

        <p className="text-sm text-gray-500">
          {recipient
            ? "Now scan each shelf label being taken into the cart on the right. Complete the dispense or cancel it before leaving this tab."
            : "Choose who it goes to first — a registered patient, or a walk-in who is not registered at the clinic. Then scan each shelf label into the cart on the right."}
        </p>
      </div>

      {/* Right — the cart: scan box on top, then the dispensing list */}
      <div className="ui-surface lg:col-span-2 p-5">
        {/* Scan straight into the cart */}
        <BatchScanBox onResolved={onScan} disabled={!recipient} />

        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          Dispensing list{totalItems > 0 ? ` (${totalItems})` : ""}
          <StockHelp tab="dispense" />
        </h4>

        {lines.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-8 text-center">
            Nothing scanned yet. Scanned items appear here.
          </p>
        ) : (
          <div className="space-y-2">
            {lines.map((s, idx) => (
              <div key={s.stockBatchId} className="flex flex-wrap items-center gap-3 p-2.5 rounded-lg border border-gray-200">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {s.name}
                    {s.isHighAlert && <span className="ml-2 text-[11px] font-bold text-red-600">HIGH ALERT</span>}
                  </p>
                  <p className="text-xs text-gray-400 font-mono">
                    {s.labelCode}{s.expiryDate && ` · exp ${s.expiryDate}`}
                  </p>
                  {s.levels.length > 1 ? (
                    <select
                      value={s.locationId}
                      onChange={(e) => { setLine(idx, { locationId: e.target.value }); evaluateFefo(s.stockBatchId, s.stockItemId, Number(e.target.value)); }}
                      className="mt-1 text-xs border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-primary"
                    >
                      {s.levels.map((l) => (
                        <option key={l.locationId} value={l.locationId}>{l.locationName} ({l.quantity} held)</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-gray-400">from {s.levels[0]?.locationName} ({availableAt(s)} held)</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button type="button" aria-label="Decrease"
                    onClick={() => setLine(idx, { quantity: Math.max(1, Number(s.quantity) - 1) })}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 ui-hover">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input type="number" min="1" value={s.quantity}
                    onChange={(e) => setLine(idx, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    className="w-12 text-center text-sm font-semibold border border-gray-300 rounded-lg py-1 focus:outline-none focus:border-primary" />
                  <button type="button" aria-label="Increase"
                    onClick={() => setLine(idx, { quantity: Number(s.quantity) + 1 })}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 ui-hover">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" aria-label="Remove" onClick={() => removeLine(idx)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {s.fefoWarn && (
                  <div className="w-full basis-full flex items-start gap-1.5 mt-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>
                      An earlier-expiring batch is here: <span className="font-mono">{s.fefoWarn.labelCode}</span>
                      {s.fefoWarn.expiryDate && ` (exp ${s.fefoWarn.expiryDate})`} — use it first if you can.
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-4">
          {(recipient || lines.length > 0) && (
            <Button variant="outline" className="flex-shrink-0" onClick={cancel} disabled={saving}>
              Cancel
            </Button>
          )}
          <Button className="flex-1" disabled={saving || lines.length === 0 || !recipient} onClick={submit}>
            <Package className="w-4 h-4" />
            {recipient ? `Confirm & dispense to ${recipient.name}` : "Choose a patient or walk-in to dispense"}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Nothing leaves stock until you confirm. Everything is dispensed at once, recorded against the patient (or the walk-in). Cancel clears the cart and unlocks the tabs.
        </p>
      </div>

      {/* High-alert confirmation — an explicit second check before the drug
          enters the cart */}
      {pendingHighAlert && (
        <Modal isOpen onClose={() => setPendingHighAlert(null)} title="High-alert medication">
          <div className="flex gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 mb-4">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <b>{pendingHighAlert.item.name}</b> is flagged high-alert. Confirm you are dispensing it
              {recipient ? <> to <b>{recipient.name}</b></> : null}.
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => { addScan(pendingHighAlert); setPendingHighAlert(null); }}
            >
              Confirm &amp; add
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setPendingHighAlert(null)}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StockDispenseTab;
