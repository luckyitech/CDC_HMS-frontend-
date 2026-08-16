import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Plus, X, Trash2, FileText } from "lucide-react";
import Button from "../shared/Button";
import nursingNoteService from "../../services/nursingNoteService";

const fmtDate = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

const DAR_FIELDS = [
  ["data", "Data", "Assessment / observation — what you saw or were told"],
  ["action", "Action", "What you did — the nursing intervention"],
  ["response", "Response", "How the patient responded"],
];

/**
 * NursingKardex — the DAR-format nursing notes (Data, Action, Response). A running,
 * additive table: each saved note is a new row, date/time stamped automatically.
 * "Add note" opens a modal for one DAR entry.
 */
const NursingKardex = ({ patient }) => {
  const uhid = patient?.uhid;
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ data: "", action: "", response: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!uhid) return;
    setLoading(true);
    try {
      const res = await nursingNoteService.getByPatient(uhid);
      if (res.success) setNotes(res.data?.nursingNotes || []);
    } catch { /* empty state stands */ }
    setLoading(false);
  }, [uhid]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (![form.data, form.action, form.response].some((f) => f.trim())) {
      toast.error("Enter at least one of Data, Action or Response");
      return;
    }
    setSaving(true);
    try {
      const res = await nursingNoteService.create({ uhid, ...form });
      if (res.success) {
        setNotes((prev) => [...prev, res.data]);
        setForm({ data: "", action: "", response: "" });
        setAdding(false);
        toast.success("Note added");
      } else {
        toast.error(res.message || "Failed to add note");
      }
    } catch (e) {
      toast.error(e?.message || "Failed to add note");
    }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this note? It stays in the record as removed.")) return;
    try {
      const res = await nursingNoteService.remove(id);
      if (res.success) setNotes((prev) => prev.filter((n) => n.id !== id));
      else toast.error(res.message || "Failed to remove");
    } catch {
      toast.error("Failed to remove");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <FileText className="w-5 h-5" /> Nursing notes (Kardex)
        </h3>
        <Button onClick={() => setAdding(true)} className="text-sm">
          <Plus className="w-4 h-4 mr-1" /> Add note
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-gray-500">No nursing notes yet. Add the first DAR entry.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-600 uppercase whitespace-nowrap">Date / Time</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-600 uppercase">Data</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-600 uppercase">Action</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-600 uppercase">Response</th>
                <th className="px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {notes.map((n) => (
                <tr key={n.id} className="align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                    <div className="font-medium text-gray-700">{fmtDate(n.date)}</div>
                    <div className="text-xs">{n.time}</div>
                    {n.authorName && (
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {n.authorName}{(n.authorRole === "staff" || n.authorRole === "nurse") ? " (Nurse)" : ""}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-pre-wrap">{n.data || "—"}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-pre-wrap">{n.action || "—"}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-pre-wrap">{n.response || "—"}</td>
                  <td className="px-2 py-3">
                    <button onClick={() => remove(n.id)} className="text-gray-300 hover:text-red-500" aria-label="Remove note">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !saving && setAdding(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><FileText className="w-5 h-5" /> New nursing note</h3>
              <button onClick={() => setAdding(false)} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0 p-5 space-y-4">
              <p className="text-xs text-gray-500">Date and time are stamped automatically when you save.</p>
              {DAR_FIELDS.map(([key, label, hint]) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
                  <textarea
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={hint}
                    rows="3"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t flex-shrink-0">
              <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Add note"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NursingKardex;
