import { useState, useEffect, useMemo, Fragment } from "react";
import { Plus, Search, AlertTriangle } from "lucide-react";
import { useBillingContext } from "../../contexts/BillingContext";
import Button from "../shared/Button";
import StatusBadge from "../shared/StatusBadge";
import { inputCls } from "../shared/formUi";
import { isUnpriced } from "../../utils/money";
import { Money, UnpricedBadge, TableScroll, Th, Td, EmptyRow } from "./billingUi";
import ServiceEditModal from "./ServiceEditModal";

// The price list — what the clinic sells and what it costs.
//
// The first screen the clinic has to use: 21 services arrive seeded from the
// labels doctors already tick, 19 of them unpriced. An unpriced service blocks
// a bill being ISSUED, never a patient being discharged, so the banner is a
// prompt rather than an alarm.

const PriceListTab = () => {
  const { services, options, currency, loadServices, loading } = useBillingContext();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [showRetired, setShowRetired] = useState(false);
  const [editing, setEditing] = useState(null); // service object, or {} for a new one

  // Always fetch retired rows too and filter client-side: the list is ~20 rows,
  // so a round trip per toggle would be slower than the filter.
  useEffect(() => { loadServices({ includeRetired: "true" }); }, [loadServices]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return services.filter((s) => {
      if (!showRetired && s.status !== "active") return false;
      if (category && s.category !== category) return false;
      if (term && !s.name.toLowerCase().includes(term) && !(s.code || "").toLowerCase().includes(term)) return false;
      return true;
    });
  }, [services, search, category, showRetired]);

  // Grouped for display, in the order the server's category list defines —
  // so the grouping matches the dropdown and neither has its own opinion.
  const grouped = useMemo(() => {
    const order = options.serviceCategories.map((c) => c.value);
    const labels = Object.fromEntries(options.serviceCategories.map((c) => [c.value, c.label]));
    const buckets = new Map();
    visible.forEach((s) => {
      if (!buckets.has(s.category)) buckets.set(s.category, []);
      buckets.get(s.category).push(s);
    });
    return [...buckets.entries()]
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
      .map(([value, rows]) => ({
        value,
        label: labels[value] || value,
        rows: rows.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [visible, options.serviceCategories]);

  const unpricedCount = services.filter((s) => s.status === "active" && isUnpriced(s.unitPriceMinor)).length;

  return (
    <div>
      {unpricedCount > 0 && (
        <div className="flex gap-3 items-start p-4 mb-5 rounded-xl bg-amber-50 border border-amber-300 text-amber-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">
            <span className="font-bold">
              {unpricedCount} of {services.filter((s) => s.status === "active").length} services have no price yet.
            </span>{" "}
            A bill containing one can’t be issued until you set it — reception can still discharge the patient.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Search services…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select className={`${inputCls} w-auto`} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {options.serviceCategories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={showRetired}
              onChange={(e) => setShowRetired(e.target.checked)}
            />
            Show retired
          </label>

          <Button onClick={() => setEditing({})} className="text-sm py-2">
            <Plus className="w-4 h-4" /> Add service
          </Button>
        </div>

        <TableScroll>
          <table className="w-full">
            <thead className="border-b-2 border-gray-200">
              <tr>
                <Th>Service</Th>
                <Th>VAT</Th>
                <Th right>Price ({currency})</Th>
                <Th right />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {grouped.length === 0 && (
                <EmptyRow colSpan={4}>
                  {loading ? "Loading the price list…" : "No services match that search."}
                </EmptyRow>
              )}

              {grouped.map((group) => (
                <Fragment key={group.value}>
                  <tr>
                    <td colSpan={4} className="px-3 pt-5 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wide">
                      {group.label}
                    </td>
                  </tr>
                  {group.rows.map((s) => (
                    <tr key={s.id} className={`hover:bg-gray-50 ${s.status !== "active" ? "opacity-55" : ""}`}>
                      <Td>
                        <span className="font-semibold text-gray-800">{s.name}</span>
                        {s.code && <span className="ml-2 text-xs text-gray-400 font-mono">{s.code}</span>}
                        {s.status !== "active" && (
                          <StatusBadge shape="tag" size="xs" tone="neutral" className="ml-2">retired</StatusBadge>
                        )}
                        {s.stockItem && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            billed when {s.stockItem.name} is scanned
                          </div>
                        )}
                      </Td>
                      <Td>
                        <span className="text-sm text-gray-600">
                          {options.vatClasses.find((v) => v.value === s.vatClass)?.label || s.vatClass}
                        </span>
                      </Td>
                      <Td right>
                        {isUnpriced(s.unitPriceMinor)
                          ? <UnpricedBadge />
                          : <Money minor={s.unitPriceMinor} bold />}
                      </Td>
                      <Td right>
                        <Button
                          variant="outline"
                          className="text-xs py-1 px-3"
                          onClick={() => setEditing(s)}
                        >
                          {isUnpriced(s.unitPriceMinor) ? "Set price" : "Edit"}
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </div>

      {editing && <ServiceEditModal service={editing} onClose={() => setEditing(null)} />}
    </div>
  );
};

export default PriceListTab;
