import { useState, Fragment } from "react";
import { notify } from "../../utils/notify";
import { Plus, Pencil, Snowflake, AlertTriangle, ScanLine, ChevronDown, ChevronRight } from "lucide-react";
import { useStockContext } from "../../contexts/StockContext";
import stockService from "../../services/stockService";
import Button from "../shared/Button";
import Modal from "../shared/Modal";
import SwitcherTabs from "../shared/SwitcherTabs";
import { Field, inputCls, StatusPill } from "./stockUi";

// Items, Locations and Suppliers share one tab: three sub-lists over the same
// cached reference data, one add/edit modal pattern. Retire = status update,
// never delete (server enforces the same).

const CATEGORIES = ["medication", "consumable", "fluid", "dressing", "sharps", "diagnostic", "other"];
const UNITS = ["piece", "vial", "bottle", "box", "pack", "ampoule", "sachet", "strip"];
const LOCATION_KINDS = ["store", "doctor_room", "procedure_room", "triage", "fridge", "office"];

const EMPTY_ITEM = {
  name: "", category: "consumable", unit: "piece", packSize: 1, gtin: "",
  requiresColdChain: false, isHighAlert: false, reorderLevel: 0, reorderQuantity: "",
};
const EMPTY_LOCATION = { name: "", kind: "store", isColdChain: false, isDispensing: true };
const EMPTY_SUPPLIER = { name: "", contactPhone: "", contactEmail: "" };

const Toggle = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 text-sm text-gray-700 mb-2 cursor-pointer">
    <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4" />
    {label}
  </label>
);

const StockItemsTab = () => {
  const { items, locations, suppliers, saveReference } = useStockContext();
  const [view, setView] = useState("items");           // items | locations | suppliers
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);        // { kind, id, form }
  const [saving, setSaving] = useState(false);
  // Per-item location breakdown: which item's row is expanded, and the cached
  // per-location quantities keyed by item id.
  const [expandedItem, setExpandedItem] = useState(null);
  const [itemLevels, setItemLevels] = useState({});    // itemId → [{ name, qty }] | 'loading'

  const toggleItemLevels = async (item) => {
    if (expandedItem === item.id) { setExpandedItem(null); return; }
    setExpandedItem(item.id);
    if (itemLevels[item.id]) return;                   // already loaded
    setItemLevels((p) => ({ ...p, [item.id]: "loading" }));
    try {
      const res = await stockService.getLevels({ itemId: item.id });
      const byLoc = {};
      (res.success ? res.data : []).forEach((l) => {
        const name = l.location?.name || "—";
        byLoc[name] = (byLoc[name] || 0) + l.quantity;
      });
      const rows = Object.entries(byLoc)
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setItemLevels((p) => ({ ...p, [item.id]: rows }));
    } catch {
      setItemLevels((p) => ({ ...p, [item.id]: [] }));
    }
  };

  const open = (kind, row = null) => {
    const empty = kind === "item" ? EMPTY_ITEM : kind === "location" ? EMPTY_LOCATION : EMPTY_SUPPLIER;
    setEditing({
      kind,
      id: row?.id || null,
      form: row ? Object.fromEntries(Object.keys(empty).map((k) => [k, row[k] ?? empty[k]])) : { ...empty },
      status: row?.status || "active",
    });
  };

  const set = (field, value) =>
    setEditing((prev) => ({ ...prev, form: { ...prev.form, [field]: value } }));

  const save = async (statusOverride = null) => {
    setSaving(true);
    const payload = { ...editing.form };
    if (payload.reorderQuantity === "") payload.reorderQuantity = null;
    if (statusOverride) payload.status = statusOverride;
    const res = await saveReference(editing.kind, editing.id, payload);
    setSaving(false);
    if (res.success) {
      notify("success", statusOverride === "retired" ? "Retired" : "Saved");
      setEditing(null);
    } else {
      notify("error", res.message || "Save failed");
    }
  };

  const filtered = (rows) =>
    rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  const subTabs = [
    { id: "items", label: "Items", count: items.length },
    { id: "locations", label: "Locations", count: locations.length },
    { id: "suppliers", label: "Suppliers", count: suppliers.length },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SwitcherTabs active={view} onChange={setView} tabs={subTabs} />
        <div className="flex gap-2">
          <input
            className={`${inputCls} w-56`}
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button onClick={() => open(view === "items" ? "item" : view === "locations" ? "location" : "supplier")}>
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
              <th className="px-3 py-2">Name</th>
              {view === "items" && (<>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2">In stock</th>
                <th className="px-3 py-2">Reorder at</th>
                <th className="px-3 py-2">Flags</th>
              </>)}
              {view === "locations" && (<>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">Cold chain</th>
                <th className="px-3 py-2">Dispensing</th>
              </>)}
              {view === "suppliers" && (<>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Email</th>
              </>)}
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {view === "items" && filtered(items).map((i) => (
              <Fragment key={i.id}>
              <tr className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium">
                  {i.name}
                  {i.catalogItem && <span className="block text-xs text-gray-500">catalogue: {i.catalogItem.name}</span>}
                </td>
                <td className="px-3 py-2">{i.category}</td>
                <td className="px-3 py-2">{i.unit}</td>
                <td className="px-3 py-2">
                  {/* Click to see where this stock physically sits, across every location */}
                  <button
                    type="button"
                    onClick={() => toggleItemLevels(i)}
                    className={`inline-flex items-center gap-1 font-bold hover:underline ${i.reorderLevel > 0 && i.totalQuantity <= i.reorderLevel ? "text-red-600" : "text-gray-800"}`}
                    title="Show where this item is stocked"
                  >
                    {expandedItem === i.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    {i.totalQuantity}
                  </button>
                </td>
                <td className="px-3 py-2">{i.reorderLevel || "—"}</td>
                <td className="px-3 py-2">
                  <span className="flex gap-1">
                    {i.requiresColdChain && <Snowflake className="w-4 h-4 text-blue-500" title="Cold chain" />}
                    {i.isHighAlert && <AlertTriangle className="w-4 h-4 text-red-500" title="High alert" />}
                  </span>
                </td>
                <td className="px-3 py-2"><StatusPill value={i.status} /></td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => open("item", i)} className="text-primary hover:text-blue-800" title="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                </td>
              </tr>
              {expandedItem === i.id && (
                <tr className="bg-gray-50">
                  <td colSpan={7} className="px-3 py-2">
                    {itemLevels[i.id] === "loading" ? (
                      <span className="text-xs text-gray-400">Loading locations…</span>
                    ) : (itemLevels[i.id]?.length ? (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-gray-500 mr-1">Held at:</span>
                        {itemLevels[i.id].map((row) => (
                          <span key={row.name} className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1">
                            {row.name} <span className="font-bold text-gray-800">{row.qty}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Not held anywhere right now.</span>
                    ))}
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
            {view === "locations" && filtered(locations).map((l) => (
              <tr key={l.id} className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium">{l.name}</td>
                <td className="px-3 py-2">{l.kind.replace("_", " ")}</td>
                <td className="px-3 py-2">{l.isColdChain ? "Yes" : "—"}</td>
                <td className="px-3 py-2">{l.isDispensing ? "Yes" : "—"}</td>
                <td className="px-3 py-2"><StatusPill value={l.status} /></td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => open("location", l)} className="text-primary hover:text-blue-800" title="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {view === "suppliers" && filtered(suppliers).map((s) => (
              <tr key={s.id} className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium">{s.name}</td>
                <td className="px-3 py-2">{s.contactPhone || "—"}</td>
                <td className="px-3 py-2">{s.contactEmail || "—"}</td>
                <td className="px-3 py-2"><StatusPill value={s.status} /></td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => open("supplier", s)} className="text-primary hover:text-blue-800" title="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal isOpen onClose={() => setEditing(null)} title={`${editing.id ? "Edit" : "Add"} ${editing.kind}`} size="lg">
          <Field label="Name">
            <input className={inputCls} value={editing.form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>

          {editing.kind === "item" && (<>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category">
                <select className={inputCls} value={editing.form.category} onChange={(e) => set("category", e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Counting unit">
                <select className={inputCls} value={editing.form.unit} onChange={(e) => set("unit", e.target.value)}>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
              <Field label="Pack size" hint="units per supplier pack">
                <input type="number" min="1" className={inputCls} value={editing.form.packSize} onChange={(e) => set("packSize", e.target.value)} />
              </Field>
              <Field label="GTIN (manufacturer barcode)" hint="optional — click here and scan the box, or type it. Used at intake to find the item by scanning the box.">
                <div className="relative">
                  <ScanLine className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
                  <input
                    className={`${inputCls} pl-8`}
                    // Scan-first flow: a new item auto-focuses here so you can
                    // scan the retail box straight away to identify the product.
                    autoFocus={!editing.id}
                    value={editing.form.gtin || ""}
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
                <input type="number" min="0" className={inputCls} value={editing.form.reorderLevel} onChange={(e) => set("reorderLevel", e.target.value)} />
              </Field>
              <Field label="Reorder quantity" hint="suggested order size">
                <input type="number" min="0" className={inputCls} value={editing.form.reorderQuantity ?? ""} onChange={(e) => set("reorderQuantity", e.target.value)} />
              </Field>
            </div>
            <Toggle label="Requires cold chain (fridge locations only)" checked={editing.form.requiresColdChain} onChange={(v) => set("requiresColdChain", v)} />
            <Toggle label="High-alert medication (warning banner on dispense)" checked={editing.form.isHighAlert} onChange={(v) => set("isHighAlert", v)} />
          </>)}

          {editing.kind === "location" && (<>
            <Field label="Kind">
              <select className={inputCls} value={editing.form.kind} onChange={(e) => set("kind", e.target.value)}>
                {LOCATION_KINDS.map((k) => <option key={k} value={k}>{k.replace("_", " ")}</option>)}
              </select>
            </Field>
            <Toggle label="Cold-chain location (fridge)" checked={editing.form.isColdChain} onChange={(v) => set("isColdChain", v)} />
            <Toggle label="Dispensing allowed from here" checked={editing.form.isDispensing} onChange={(v) => set("isDispensing", v)} />
          </>)}

          {editing.kind === "supplier" && (<>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Contact phone">
                <input className={inputCls} value={editing.form.contactPhone || ""} onChange={(e) => set("contactPhone", e.target.value)} />
              </Field>
              <Field label="Contact email">
                <input className={inputCls} value={editing.form.contactEmail || ""} onChange={(e) => set("contactEmail", e.target.value)} />
              </Field>
            </div>
          </>)}

          <div className="flex gap-3 mt-4">
            <Button className="flex-1" disabled={saving || !editing.form.name.trim()} onClick={() => save()}>
              {editing.id ? "Save changes" : "Add"}
            </Button>
            {editing.id && editing.status === "active" && (
              <Button variant="danger" disabled={saving} onClick={() => save("retired")}>
                Retire
              </Button>
            )}
            {editing.id && editing.status === "retired" && (
              <Button variant="outline" disabled={saving} onClick={() => save("active")}>
                Reactivate
              </Button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StockItemsTab;
