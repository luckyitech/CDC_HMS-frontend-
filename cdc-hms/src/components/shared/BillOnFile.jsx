import { useCallback, useEffect, useState } from "react";
import { X, Loader2, Plus, Minus, AlertTriangle } from "lucide-react";
import { notify } from "../../utils/notify";
import queueService from "../../services/queueService";

// What is already on this visit's bill, and who put each line there
// (12 Oct 2026, Emu): the nurse's HbA1c shows at the doctor's and at the
// cashier's, with "Nurse Mary · triage 09:40". Shared by every stage's billing
// step. Lines can be taken off (canRemove) — kept in the bill's history with
// who and when.
//
// Tests (HbA1c, RBS, Ketones — 13 Oct 2026) count attempts: "HbA1c × 2", with
// + for a repeat (an error reading, a faulty or confirmatory test) and − which
// asks whether that attempt was done (not done → its supplies go back to stock).
// Each attempt takes its supplies from stock; one that could not shows a note.
//
// Props: queueId, canRemove, refreshKey, onChanged(bill), stage

const STAGE = { triage: "triage", consultation: "consultation", injection: "injection", radiology: "radiology", billing: "billing", other: "" };
const ROLE = { nurse: "Nurse", doctor: "Dr.", staff: "", admin: "", lab: "" };
const time = (d) => (d ? new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "");

/** "Nurse Mary Wanjiru · triage 09:40" — or "from the triage result" for a vital. */
export const whoAdded = (line) => {
  if (!line || line.legacy) return "added earlier";
  const who = line.addedByName ? `${ROLE[line.addedByRole] ? `${ROLE[line.addedByRole]} ` : ""}${line.addedByName}` : "";
  const where = line.source === "vital" ? "from the triage result" : STAGE[line.stage] || "";
  return [who, [where, time(line.addedAt)].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
};

/** Load a visit's bill (lines with attribution). */
export const useVisitBill = (queueId, refreshKey = 0) => {
  const [bill, setBill] = useState(null);
  const load = useCallback(() => {
    if (!queueId) { setBill({ lines: [], removed: [] }); return; }
    queueService.getCharges(queueId).then((r) => setBill(r.data || { lines: [], removed: [] })).catch(() => setBill({ lines: [], removed: [] }));
  }, [queueId]);
  useEffect(() => { load(); }, [load, refreshKey]);
  return [bill, load, setBill];
};

const BillOnFile = ({ queueId, canRemove = false, refreshKey = 0, onChanged, pending = [], stage }) => {
  const [bill, , setBill] = useVisitBill(queueId, refreshKey);
  // Tell the host what is on the bill whenever it loads or changes.
  useEffect(() => { if (bill) onChanged?.(bill); }, [bill]); // eslint-disable-line react-hooks/exhaustive-deps
  const [confirm, setConfirm] = useState(null);   // line being removed
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const remove = async (done) => {
    setBusy(true);
    try {
      const res = await queueService.removeCharge(queueId, {
        kind: confirm.kind, name: confirm.name, reason: reason.trim() || undefined,
        done: confirm.test ? done : undefined,
      });
      setBill(res.data);
      notify("success", confirm.test
        ? `One ${confirm.name} taken off${done === false ? " — its supplies are back in stock" : ""}`
        : `${confirm.name} taken off the bill`);
      setConfirm(null); setReason("");
    } catch (err) { notify("error", err?.message || "Could not take it off the bill"); }
    finally { setBusy(false); }
  };
  const repeat = async (line) => {
    setBusy(true);
    try {
      const res = await queueService.addTestAttempt(queueId, line.name, stage);
      setBill(res.data);
      const last = (res.data.lines || []).find((l) => l.name === line.name)?.attempts?.slice(-1)[0];
      notify(last?.stockStatus === "not_taken" ? "error" : "success",
        last?.stockStatus === "not_taken" ? `${line.name} repeat added — not taken from stock: ${last.stockNote}` : `${line.name} repeat added`);
    } catch (err) { notify("error", err?.message || "Could not add the repeat"); }
    finally { setBusy(false); }
  };

  if (!bill) return <p className="text-xs text-gray-400 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading the bill…</p>;
  const lines = bill.lines || [];
  const fresh = pending.filter((p) => !lines.some((l) => l.name === p));

  return (
    <div className="space-y-1.5">
      {lines.length + fresh.length === 0 && <p className="text-xs text-gray-400">Nothing on the bill yet.</p>}
      {lines.map((l) => (
        <div key={`${l.kind}-${l.name}`} className="flex items-start gap-2 rounded-lg bg-white border border-gray-200 px-2.5 py-1.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-800">
              {l.name}
              {l.quantity > 1 && <span className="ml-1 font-bold text-primary">× {l.quantity}</span>}
              {l.kind === "procedure" && <span className="ml-1.5 text-[10px] uppercase tracking-wide text-gray-400">procedure</span>}
            </p>
            {l.test && l.attempts?.length > 1
              ? l.attempts.map((a, i) => (
                  <p key={a.id} className="text-[11px] text-gray-500">{i + 1}. {whoAdded({ ...l, ...a })}</p>
                ))
              : <p className="text-[11px] text-gray-500">{whoAdded(l)}</p>}
            {l.test && l.attempts?.some((a) => a.stockStatus === "not_taken") && (
              <p className="text-[11px] text-amber-700 inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Not taken from stock — {l.attempts.find((a) => a.stockStatus === "not_taken").stockNote}
              </p>
            )}
            {confirm?.name === l.name && confirm?.kind === l.kind && (
              confirm.test ? (
                <div className="mt-1.5 space-y-1.5">
                  <p className="text-xs font-semibold text-gray-700">Was this {l.name} done?</p>
                  <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" aria-label="Reason for removing"
                    className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs" />
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => remove(false)} disabled={busy} className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50">
                      Not done — put the supplies back
                    </button>
                    <button type="button" onClick={() => remove(true)} disabled={busy} className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50">
                      Done — only take it off the bill
                    </button>
                    <button type="button" onClick={() => { setConfirm(null); setReason(""); }} className="text-xs font-semibold text-gray-500 hover:underline">Keep</button>
                  </div>
                </div>
              ) : (
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" aria-label="Reason for removing"
                    className="flex-1 min-w-[8rem] px-2 py-1 border border-gray-300 rounded-md text-xs" />
                  <button type="button" onClick={() => remove()} disabled={busy} className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50">Take off the bill</button>
                  <button type="button" onClick={() => { setConfirm(null); setReason(""); }} className="text-xs font-semibold text-gray-500 hover:underline">Keep</button>
                </div>
              )
            )}
          </div>
          {canRemove && !confirm && l.test && (
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" aria-label={`One ${l.name} fewer`} title="One fewer" onClick={() => setConfirm(l)} disabled={busy}
                className="w-6 h-6 rounded-md border border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600 flex items-center justify-center">
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-5 text-center text-sm font-semibold">{l.quantity || 1}</span>
              <button type="button" aria-label={`Repeat ${l.name}`} title="Repeat — another attempt" onClick={() => repeat(l)} disabled={busy}
                className="w-6 h-6 rounded-md border border-gray-300 text-gray-600 hover:border-primary hover:text-primary flex items-center justify-center">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {canRemove && !confirm && !l.test && (
            <button type="button" aria-label={`Take ${l.name} off the bill`} onClick={() => setConfirm(l)} className="text-gray-400 hover:text-red-600 p-0.5">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
      {fresh.map((p) => (
        <div key={`p-${p}`} className="rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1.5">
          <p className="text-sm font-medium text-primary">{p}</p>
          <p className="text-[11px] text-blue-700">adding now</p>
        </div>
      ))}
    </div>
  );
};

export default BillOnFile;
