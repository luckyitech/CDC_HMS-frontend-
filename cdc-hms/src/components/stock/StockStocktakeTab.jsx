import { useState } from "react";
import toast from "react-hot-toast";
import { ClipboardCheck } from "lucide-react";
import { useStockContext } from "../../contexts/StockContext";
import stockService from "../../services/stockService";
import Button from "../shared/Button";
import { Field, inputCls } from "./stockUi";

// Stocktake — per location, so counts happen room by room without freezing
// the clinic. The screen lists what the system expects per batch; enter what
// you actually count; variances become adjustment movements (reason recorded)
// in ONE confirmed submission.
const StockStocktakeTab = () => {
  const { locations } = useStockContext();
  const [locationId, setLocationId] = useState("");
  const [rows, setRows] = useState(null);    // [{ level fields…, counted }]
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!locationId) return toast.error("Choose a location");
    setBusy(true);
    try {
      const res = await stockService.getLevels({ locationId });
      if (res.success) {
        setRows(res.data.map((l) => ({
          stockBatchId: l.stockBatchId,
          itemName: l.batch?.item?.name,
          unit: l.batch?.item?.unit,
          labelCode: l.batch?.labelCode,
          batchNo: l.batch?.batchNo,
          expiryDate: l.batch?.expiryDate,
          expected: l.quantity,
          counted: String(l.quantity),   // pre-filled: only variances need typing
        })));
      }
    } catch (err) {
      toast.error(err?.message || "Could not load expected quantities");
    } finally {
      setBusy(false);
    }
  };

  const variances = rows?.filter((r) => Number(r.counted) !== r.expected).length || 0;

  const submit = async () => {
    setBusy(true);
    try {
      const res = await stockService.submitStocktake({
        locationId: Number(locationId),
        counts: rows.map((r) => ({ stockBatchId: r.stockBatchId, countedQty: Number(r.counted) })),
        note: note.trim() || undefined,
      });
      if (res.success) {
        toast.success(res.data?.message || "Stocktake recorded");
        setRows(null);
        setNote("");
      } else {
        toast.error(res.message || "Stocktake failed");
      }
    } catch (err) {
      toast.error(err?.message || "Stocktake failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-end gap-3 mb-5">
        <div className="flex-1 max-w-xs">
          <Field label="Location to count">
            <select className={inputCls} value={locationId}
                    onChange={(e) => { setLocationId(e.target.value); setRows(null); }}>
              <option value="">— choose —</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="mb-4">
          <Button disabled={busy || !locationId} onClick={start}>
            <ClipboardCheck className="w-4 h-4" /> Start count
          </Button>
        </div>
      </div>

      {rows && (
        rows.length === 0 ? (
          <p className="text-sm text-gray-500">The system expects nothing at this location.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="px-2 py-2">Item</th>
                  <th className="px-2 py-2">Batch</th>
                  <th className="px-2 py-2 text-center">Expected</th>
                  <th className="px-2 py-2 w-28">Counted</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const changed = Number(r.counted) !== r.expected;
                  return (
                    <tr key={r.stockBatchId} className={`border-t border-gray-100 ${changed ? "bg-amber-50" : ""}`}>
                      <td className="px-2 py-1.5 font-medium">{r.itemName}</td>
                      <td className="px-2 py-1.5 font-mono text-xs">
                        {r.labelCode}{r.expiryDate && <span className="text-gray-400"> exp {r.expiryDate}</span>}
                      </td>
                      <td className="px-2 py-1.5 text-center">{r.expected}</td>
                      <td className="px-2 py-1.5">
                        <input type="number" min="0" className={`${inputCls} !py-1`}
                          value={r.counted}
                          onChange={(e) => setRows((p) => p.map((x, i) => i === idx ? { ...x, counted: e.target.value } : x))} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <Field label="Note (recorded on every variance)" hint="e.g. monthly count, or who counted with you">
              <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>

            <Button className="w-full" disabled={busy} onClick={submit}>
              Submit count{variances > 0 ? ` — ${variances} variance(s) will be adjusted` : " — everything matches"}
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Matching rows write nothing. Variances become adjustment entries in the ledger,
              attributed to you, all-or-nothing.
            </p>
          </div>
        )
      )}
    </div>
  );
};

export default StockStocktakeTab;
