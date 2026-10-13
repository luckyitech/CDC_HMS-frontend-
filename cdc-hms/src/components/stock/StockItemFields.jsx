import { ScanLine } from "lucide-react";
import { Field, inputCls } from "./stockUi";

// The fields of a stock item — ONE form, used by Items → Add / Edit and by
// Receive → From an invoice → "Add as a new item" (13 Oct 2026). Keep the
// item's shape here; the two screens only differ in where the form sits.

export const CATEGORIES = ["medication", "consumable", "fluid", "dressing", "sharps", "diagnostic", "other"];
export const UNITS = ["piece", "vial", "bottle", "box", "pack", "ampoule", "sachet", "strip", "tablet", "pen", "needle", "cartridge"];

export const EMPTY_ITEM = {
  name: "", category: "consumable", unit: "piece", packSize: 1, gtin: "",
  requiresColdChain: false, isHighAlert: false, reorderLevel: 0, reorderQuantity: "",
};

export const Toggle = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 text-sm text-gray-700 mb-2 cursor-pointer">
    <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4" />
    {label}
  </label>
);

/**
 * form / set — the item's values and a (field, value) setter.
 * isNew — a new item auto-focuses the GTIN box (scan the box first).
 * nameLocked — the HbA1c / RBS / ketone items are found by name, so it stays fixed.
 */
const StockItemFields = ({ form, set, isNew = false, nameLocked = false }) => (
  <>
    {nameLocked ? (
      <Field label="Name">
        <p className="text-sm text-gray-800">{form.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">Used by its test on the charge sheet, which finds it by this name — so the name stays fixed.</p>
      </Field>
    ) : (
      <Field label="Name">
        <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} />
      </Field>
    )}
    <div className="grid grid-cols-2 gap-4">
      <Field label="Category">
        <select className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Counting unit">
        <select className={inputCls} value={form.unit} onChange={(e) => set("unit", e.target.value)}>
          {(UNITS.includes(form.unit) ? UNITS : [form.unit, ...UNITS]).map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </Field>
      <Field label="Pack size" hint="units per supplier pack">
        <input type="number" min="1" className={inputCls} value={form.packSize} onChange={(e) => set("packSize", e.target.value)} />
      </Field>
      <Field label="GTIN (manufacturer barcode)" hint="optional — click here and scan the box, or type it. Used at intake to find the item by scanning the box.">
        <div className="relative">
          <ScanLine className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
          <input
            className={`${inputCls} pl-8`}
            // Scan-first flow: a new item auto-focuses here so you can
            // scan the retail box straight away to identify the product.
            autoFocus={isNew}
            value={form.gtin || ""}
            // A USB scanner types the code as keystrokes; strip any
            // whitespace/newline it may append. GTINs never contain spaces.
            onChange={(e) => set("gtin", e.target.value.replace(/\s/g, ""))}
            // The scanner usually sends Enter after the code — swallow it
            // so it can't do anything unexpected (Save is a button).
            onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
            placeholder="Scan or type the box barcode"
          />
        </div>
      </Field>
      <Field label="Reorder level" hint="0 = no reorder alert">
        <input type="number" min="0" className={inputCls} value={form.reorderLevel} onChange={(e) => set("reorderLevel", e.target.value)} />
      </Field>
      <Field label="Reorder quantity" hint="suggested order size">
        <input type="number" min="0" className={inputCls} value={form.reorderQuantity ?? ""} onChange={(e) => set("reorderQuantity", e.target.value)} />
      </Field>
    </div>
    <Toggle label="Requires cold chain (fridge locations only)" checked={form.requiresColdChain} onChange={(v) => set("requiresColdChain", v)} />
    <Toggle label="High-alert medication (warning banner on dispense)" checked={form.isHighAlert} onChange={(v) => set("isHighAlert", v)} />
  </>
);

export default StockItemFields;
