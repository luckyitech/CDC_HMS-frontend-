import { useState, useEffect } from "react";
import { notify } from "../../utils/notify";
import { useBillingContext } from "../../contexts/BillingContext";
import { useUserContext } from "../../contexts/UserContext";
import stockService from "../../services/stockService";
import Modal from "../shared/Modal";
import Button from "../shared/Button";
import { Field, inputCls } from "../shared/formUi";
import { toAmountInput, isAmountLike } from "../../utils/money";

// Add or edit one price list entry.
//
// Split out of PriceListTab so neither file has to hold both a list and a form.
// The category and VAT class options come from the SERVER's billing config —
// there is no hardcoded list here, so adding either on the backend makes it
// appear in this form with no change to the frontend.

const EMPTY = {
  name: "", code: "", category: "other", vatClass: "exempt",
  unitPrice: "", stockItemId: "",
};

// The modal is mounted only while a service is being edited and unmounted on
// close, so the form is seeded ONCE from the row rather than synced by an
// effect — no cascading render, and no risk of a half-typed edit being
// overwritten by a background refresh of the price list.
const formFrom = (service) => (service?.id
  ? {
      name: service.name || "",
      code: service.code || "",
      category: service.category || "other",
      vatClass: service.vatClass || "exempt",
      // Empty string means "not priced" — distinct from "0.00".
      unitPrice: toAmountInput(service.unitPriceMinor),
      stockItemId: service.stockItemId ? String(service.stockItemId) : "",
    }
  : EMPTY);

const ServiceEditModal = ({ service, onClose }) => {
  const { options, currency, saveService, retireService } = useBillingContext();
  const { currentUser } = useUserContext();
  const [form, setForm] = useState(() => formFrom(service));
  const [saving, setSaving] = useState(false);
  const [stockItems, setStockItems] = useState(null); // null = not loaded / unavailable

  const isNew = !service?.id;

  // The stock link is what lets a scanned batch at the checkout desk find a
  // price. Loading the item list needs stock access, which not every billing
  // user has — so it degrades to a hint rather than an error.
  useEffect(() => {
    if (!currentUser?.canManageStock) return;
    let cancelled = false;
    stockService.getItems()
      .then((res) => { if (!cancelled && res?.success) setStockItems(res.data || []); })
      .catch(() => { /* no stock access — the field simply doesn't render */ });
    return () => { cancelled = true; };
  }, [currentUser]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const submit = async () => {
    if (!form.name.trim()) return notify("error", "Give the service a name");
    // Checked here only so the desk hears immediately; the server is the
    // authority and rejects anything this misses.
    if (form.unitPrice !== "" && !isAmountLike(form.unitPrice)) {
      return notify("error", "Price must be an amount like 2500 or 2500.50");
    }

    setSaving(true);
    const res = await saveService(service?.id || null, {
      name: form.name.trim(),
      code: form.code.trim() || null,
      category: form.category,
      vatClass: form.vatClass,
      // null clears the price back to "not yet priced".
      unitPrice: form.unitPrice === "" ? null : form.unitPrice,
      stockItemId: form.stockItemId === "" ? null : Number(form.stockItemId),
    });
    setSaving(false);

    if (res.success) {
      notify("success", isNew ? `${form.name.trim()} added` : "Saved");
      onClose();
    }
  };

  const retire = async () => {
    setSaving(true);
    const res = await retireService(service.id);
    setSaving(false);
    if (res.success) {
      notify("success", res.data?.message || "Retired");
      onClose();
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={isNew ? "Add service" : "Edit service"} size="lg">
      <Field label="Name">
        <input
          className={inputCls}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Consultation Fee"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <Field label="Code" hint="Optional short code for receipts">
          <input
            className={inputCls}
            value={form.code}
            onChange={(e) => set("code", e.target.value)}
            placeholder="CONS"
          />
        </Field>

        <Field label="Category">
          <select className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)}>
            {options.serviceCategories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </Field>

        <Field
          label={`Price (${currency})`}
          hint="Leave empty for “not priced yet”. A genuinely free service is 0."
        >
          <input
            className={inputCls}
            value={form.unitPrice}
            onChange={(e) => set("unitPrice", e.target.value)}
            placeholder="2500.00"
            inputMode="decimal"
          />
        </Field>

        <Field label="VAT class" hint="Most medical services in Kenya are exempt — confirm with your accountant.">
          <select className={inputCls} value={form.vatClass} onChange={(e) => set("vatClass", e.target.value)}>
            {options.vatClasses.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </Field>
      </div>

      {stockItems ? (
        <Field
          label="Linked stock item"
          hint="Set this for supplies, so a batch scanned at the checkout desk finds this price."
        >
          <select className={inputCls} value={form.stockItemId} onChange={(e) => set("stockItemId", e.target.value)}>
            <option value="">— none —</option>
            {stockItems.map((i) => (
              <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
            ))}
          </select>
        </Field>
      ) : (
        <p className="text-xs text-gray-500 mb-4">
          Linking this service to a stock item needs stock access — ask an administrator
          if this is a supply that should be priced when scanned at checkout.
        </p>
      )}

      <div className="flex gap-3 pt-2">
        {!isNew && service.status === "active" && (
          <Button variant="outline" onClick={retire} disabled={saving} className="text-sm py-2">
            Retire
          </Button>
        )}
        <div className="flex-1" />
        <Button variant="outline" onClick={onClose} disabled={saving} className="text-sm py-2">
          Cancel
        </Button>
        <Button onClick={submit} disabled={saving} className="text-sm py-2">
          {saving ? "Saving…" : isNew ? "Add service" : "Save"}
        </Button>
      </div>
    </Modal>
  );
};

export default ServiceEditModal;
