import { useState, useMemo, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { POPOVER_Z } from "../../constants/layers";
import { notify } from "../../utils/notify";
import { useStockContext } from "../../contexts/StockContext";
import stockService from "../../services/stockService";
import Button from "../shared/Button";
import { inputCls } from "./stockUi";
import StockItemFields, { EMPTY_ITEM } from "./StockItemFields";

// Picking an item from the catalogue — ONE search box and ONE "add it as a
// new item" form, shared by Receive → From an invoice and Stocktake → Add
// counted stock (15 Oct 2026). Search by name or by scanning the box barcode;
// ↑ ↓ Enter pick from the list; Escape cancels. The list is portalled to
// <body> on POPOVER_Z (like SelectMenu) so a table's scroll box cannot clip it
// — it did, in the count table (Emu, 15 Oct).

/**
 * items, onPick(item), onCancel?, autoFocus?, placeholder?, onAddNew?(typedText)
 * — with onAddNew the list ends with "+ Add '…' as a new item".
 */
export const ItemPicker = ({ items, onPick, onCancel, autoFocus = true, placeholder = "Search the catalogue by name, or scan the box…", onAddNew = null, inputRef = null }) => {
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const own = useRef(null);
  const ref = inputRef || own;
  const [pos, setPos] = useState(null);
  const open = Boolean(q.trim());
  useLayoutEffect(() => {
    if (!open) { setPos(null); return undefined; }
    const place = () => {
      const r = ref.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 4, left: r.left, width: r.width, maxHeight: Math.max(120, Math.min(256, window.innerHeight - r.bottom - 12)) });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => { window.removeEventListener("scroll", place, true); window.removeEventListener("resize", place); };
  }, [open, ref]);
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return items.filter((i) => i.status !== "retired" && (i.name.toLowerCase().includes(s) || (i.gtin && i.gtin === q.trim()))).slice(0, 8);
  }, [items, q]);
  const pick = (i) => { setQ(""); setHi(0); onPick(i); };
  const onKey = (e) => {
    if (e.key === "Escape") { setQ(""); onCancel?.(); return; }
    if (!q.trim()) return;
    const n = matches.length + (onAddNew ? 1 : 0);
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => (h + 1) % Math.max(1, n)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => (h - 1 + Math.max(1, n)) % Math.max(1, n)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      // A scanned GTIN matches exactly one item — take it straight away.
      if (hi < matches.length) pick(matches[hi]);
      else if (onAddNew) { onAddNew(q.trim()); setQ(""); setHi(0); }
    }
  };
  return (
    <div className="relative">
      <input ref={ref} autoFocus={autoFocus} className={inputCls} value={q} onChange={(e) => { setQ(e.target.value); setHi(0); }} placeholder={placeholder} onKeyDown={onKey} />
      {open && pos && (matches.length > 0 || onAddNew) && createPortal(
        <div className="fixed bg-white border border-gray-200 rounded-lg shadow-lg overflow-y-auto" role="listbox"
          style={{ zIndex: POPOVER_Z, top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
          onMouseDown={(e) => e.preventDefault() /* keep the input's focus */}>
          {matches.map((i, idx) => (
            <button key={i.id} type="button" className={`w-full text-left px-3 py-2 text-sm ${idx === hi ? "bg-blue-50 font-semibold" : "ui-hover"}`} onMouseEnter={() => setHi(idx)} onClick={() => pick(i)}>
              {i.name} <span className="text-xs text-gray-400">({i.category})</span>
            </button>
          ))}
          {onAddNew && (
            <button type="button" className={`w-full text-left px-3 py-2 text-sm font-semibold text-primary border-t border-gray-100 ${hi === matches.length ? "bg-blue-50" : "ui-hover"}`} onMouseEnter={() => setHi(matches.length)} onClick={() => { onAddNew(q.trim()); setQ(""); setHi(0); }}>
              + Add "{q.trim()}" as a new item
            </button>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
};

const guessName = (text) => String(text || "").toLowerCase().replace(/\b\d+'?s\b/g, "").replace(/\s+/g, " ").trim()
  .replace(/(^|\s)\S/g, (c) => c.toUpperCase());

/**
 * The Items form, pre-filled from what was typed or read. Open to everyone who
 * can receive or count stock (the server logs it like any catalogue add).
 * seed: { sourceText, unit?, packSize? }; title / note: the panel's wording.
 */
export const NewItemPanel = ({ seed, onAdded, onCancel, title = "New item — check and complete", note = "Saved to Items." }) => {
  const { fetchItems } = useStockContext();
  const [form, setForm] = useState({
    ...EMPTY_ITEM,
    name: guessName(seed.sourceText),
    unit: seed.unit && seed.unit.length <= 20 ? seed.unit.toLowerCase() : EMPTY_ITEM.unit,
    packSize: seed.packSize || 1,
  });
  const [saving, setSaving] = useState(false);
  const set = (f, v) => setForm((p) => ({ ...p, [f]: v }));
  const save = async () => {
    if (!form.name.trim()) return notify("error", "Give the item a name");
    setSaving(true);
    try {
      const res = await stockService.createItemWhileReceiving({ ...form, packSize: Number(form.packSize) || 1, reorderLevel: Number(form.reorderLevel) || 0, reorderQuantity: form.reorderQuantity === "" ? null : Number(form.reorderQuantity) });
      if (res.success) { await fetchItems(); onAdded(res.data); } else notify("error", res.message || "Could not add the item");
    } catch (err) { notify("error", err?.message || "Could not add the item"); } finally { setSaving(false); }
  };
  return (
    <div className="bg-white border border-blue-200 rounded-lg p-4 mt-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-gray-500">{note}</p>
      </div>
      <StockItemFields form={form} set={set} isNew={false} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" className="!px-4 !py-2 text-sm" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button className="!px-4 !py-2 text-sm" onClick={save} disabled={saving}>{saving ? "Adding…" : "Add item & use it"}</Button>
      </div>
    </div>
  );
};
