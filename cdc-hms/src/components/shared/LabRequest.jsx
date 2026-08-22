import { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { FlaskConical, Search, X, Trash2, Printer, Pencil, RefreshCw, Package as PackageIcon } from "lucide-react";
import labService from "../../services/labService";
import labPackageService from "../../services/labPackageService";
import catalogService from "../../services/catalogService";
import api from "../../services/api";
import { useUserContext } from "../../contexts/UserContext";
import LabRequestPrint from "./LabRequestPrint";

/**
 * LabRequest — the shared laboratory request form, mounted in BOTH the doctor's
 * consultation (Orders → Laboratory) and the nursing tab (Lab requests). One
 * component, both roles: attribution comes from the logged-in user, and a nurse
 * must name the doctor the labs are for.
 *
 * A request is a save-and-print (no lab-portal routing yet): saving creates the
 * rows and opens the print preview. While a request is still Pending it can be
 * edited in place; once the lab starts on it, it locks and the clinician cancels
 * & reissues instead. Nothing is ever hard-deleted.
 *
 * Tests and packages come from the admin clinic catalogue. Prices are shown to
 * the clinician (with a running total) but never printed on the requisition.
 */

const PRIORITIES = ["Routine", "Urgent", "STAT"];

const STATUS_PILL = {
  Pending:            "bg-amber-50 text-amber-700 border-amber-200",
  "Sample Collected": "bg-blue-50 text-blue-700 border-blue-200",
  "In Progress":      "bg-blue-50 text-blue-700 border-blue-200",
  Completed:          "bg-green-50 text-green-700 border-green-200",
  Cancelled:          "bg-red-50 text-red-700 border-red-200",
};

const money = (n) => (n == null ? null : `KES ${Number(n).toLocaleString()}`);
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

const LabRequest = ({ patient, onDirtyChange = () => {} }) => {
  const uhid = patient?.uhid;
  const { currentUser } = useUserContext();
  const isDoctor = currentUser?.role === "doctor";
  const canCancel = isDoctor || currentUser?.role === "nurse" || currentUser?.role === "admin";

  // Catalogue + packages + doctor list
  const [tests, setTests] = useState([]);        // labTest catalogue items
  const [packages, setPackages] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [requests, setRequests] = useState([]);  // this patient's lab-test rows
  const [loading, setLoading] = useState(true);

  // Draft request being built
  const [selected, setSelected] = useState([]);  // items: {key,kind,...}
  const [priority, setPriority] = useState("Routine");
  const [notes, setNotes] = useState("");
  const [onBehalfOfDoctorId, setOnBehalfOfDoctorId] = useState("");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit / reissue state
  const [editingReq, setEditingReq] = useState(null);          // requisitionNumber being edited in place
  const [supersedesReq, setSupersedesReq] = useState(null);    // requisition this new one replaces
  const [printReq, setPrintReq] = useState(null);              // request currently in the print preview

  // ── loads ──────────────────────────────────────────────────────────────────
  const loadRequests = useCallback(async () => {
    if (!uhid) return;
    try {
      const res = await labService.getByPatient(uhid);
      if (res.success) setRequests(res.data?.labTests || res.data || []);
    } catch { /* keep prior */ }
  }, [uhid]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [tRes, pRes] = await Promise.all([
        catalogService.listAll("labTest").catch(() => ({ success: false })),
        labPackageService.list().catch(() => ({ success: false })),
      ]);
      if (!cancelled) {
        if (tRes.success) setTests(tRes.data?.items || []);
        if (pRes.success) setPackages(pRes.data?.packages || []);
      }
      await loadRequests();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [uhid, isDoctor, loadRequests]);

  // Doctor list is only needed for the nurse's "on behalf of" gate.
  useEffect(() => {
    if (isDoctor) return;
    api.get("/users/doctors")
      .then((res) => { if (res.success) setDoctors(Array.isArray(res.data) ? res.data : []); })
      .catch(() => {});
  }, [isDoctor]);

  // Dirty signal for the consultation's unsaved dot
  useEffect(() => {
    onDirtyChange(selected.length > 0 || !!notes.trim());
  }, [selected, notes, onDirtyChange]);

  // ── selection helpers ────────────────────────────────────────────────────────
  const commonTests = useMemo(() => tests.filter((t) => t.isCommon), [tests]);
  const commonPackages = useMemo(() => packages.filter((p) => p.isCommon), [packages]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const testHits = tests
      .filter((t) => t.name.toLowerCase().includes(q))
      .map((t) => ({ kind: "test", item: t }));
    const pkgHits = packages
      .filter((p) => p.name.toLowerCase().includes(q))
      .map((p) => ({ kind: "package", item: p }));
    return [...pkgHits, ...testHits].slice(0, 12);
  }, [query, tests, packages]);

  const hasKey = (key) => selected.some((s) => s.key === key);

  const addTest = (t) => {
    const key = `t:${t.name}`;
    if (hasKey(key)) return;
    setSelected((prev) => [...prev, {
      key, kind: "test", testType: t.name, sampleType: t.detail || null,
      price: t.price != null ? Number(t.price) : null,
    }]);
  };

  const addPackage = (p) => {
    const key = `p:${p.id}`;
    if (hasKey(key)) return;
    setSelected((prev) => [...prev, {
      key, kind: "package", packageId: p.id, name: p.name,
      price: p.price != null ? Number(p.price) : null,
      packageRate: p.priceMode === "fixed" ? Number(p.price) : null,
      tests: (p.tests || []).map((m) => ({ testType: m.name, sampleType: m.sampleType || null, price: m.price != null ? Number(m.price) : null })),
    }]);
  };

  const toggleTestCard = (t) => {
    const key = `t:${t.name}`;
    if (hasKey(key)) setSelected((prev) => prev.filter((s) => s.key !== key));
    else addTest(t);
  };

  const removeItem = (key) => setSelected((prev) => prev.filter((s) => s.key !== key));

  const total = useMemo(
    () => selected.reduce((sum, s) => sum + (s.price || 0), 0),
    [selected]
  );
  const testCount = useMemo(
    () => selected.reduce((n, s) => n + (s.kind === "package" ? (s.tests?.length || 0) : 1), 0),
    [selected]
  );

  const resetForm = () => {
    setSelected([]);
    setPriority("Routine");
    setNotes("");
    setOnBehalfOfDoctorId("");
    setEditingReq(null);
    setSupersedesReq(null);
    setQuery("");
  };

  // Flatten the selection into the API's flat tests[] (packages expand to rows,
  // each tagged with the package name + special rate).
  const buildTestsPayload = () => {
    const rows = [];
    for (const s of selected) {
      if (s.kind === "test") {
        rows.push({ testType: s.testType, sampleType: s.sampleType, price: s.price, packageName: null, packageRate: null });
      } else {
        for (const m of s.tests) {
          rows.push({ testType: m.testType, sampleType: m.sampleType, price: m.price, packageName: s.name, packageRate: s.packageRate });
        }
      }
    }
    return rows;
  };

  // Test names in the current draft (packages expanded to their members).
  const draftTestNames = () => {
    const names = new Set();
    for (const s of selected) {
      if (s.kind === "package") s.tests.forEach((m) => names.add(m.testType));
      else names.add(s.testType);
    }
    return names;
  };

  const save = async () => {
    if (selected.length === 0) { toast.error("Add at least one test"); return; }
    if (!isDoctor && !onBehalfOfDoctorId) { toast.error("Select the doctor you are requesting on behalf of"); return; }

    // Duplicate guard — warn if any test is already on a still-active request for
    // this patient (Pending / Sample Collected / In Progress). Editing the same
    // requisition is exempt (those are the same tests). The clinician can proceed.
    if (!editingReq) {
      const wanted = draftTestNames();
      const ACTIVE = ["Pending", "Sample Collected", "In Progress"];
      const dupes = [...new Set(
        requests.filter((r) => ACTIVE.includes(r.status) && wanted.has(r.testType)).map((r) => r.testType)
      )];
      if (dupes.length > 0) {
        const ok = window.confirm(
          `Already requested and still active for this patient:\n\n• ${dupes.join("\n• ")}\n\nRequest ${dupes.length === 1 ? "it" : "them"} again anyway?`
        );
        if (!ok) return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        uhid,
        priority,
        notes: notes.trim() || null,
        onBehalfOfDoctorId: isDoctor ? null : Number(onBehalfOfDoctorId),
        tests: buildTestsPayload(),
      };

      let res;
      if (editingReq) {
        res = await labService.updateRequest(editingReq, payload);
      } else {
        res = await labService.createRequest({ ...payload, supersedesRequisition: supersedesReq || null });
      }

      if (!res.success) { toast.error(res.message || "Could not save the request"); setSaving(false); return; }

      const rows = res.data?.labTests || [];
      toast.success(editingReq ? "Request updated" : "Lab request saved");
      await loadRequests();
      resetForm();
      // Open the print preview for what was just saved.
      if (rows.length) setPrintReq(groupToPrint(rows));
    } catch (e) {
      toast.error(e?.message || "Could not save the request");
    }
    setSaving(false);
  };

  // ── existing requests (grouped by requisition) ───────────────────────────────
  const groups = useMemo(() => {
    const map = new Map();
    for (const t of requests) {
      const key = t.requisitionNumber || `single:${t.id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    const arr = [...map.entries()].map(([reqNo, rows]) => {
      const first = rows[0];
      const allPending = rows.every((r) => r.status === "Pending");
      const allCancelled = rows.every((r) => r.status === "Cancelled");
      const anyOpen = rows.some((r) => ["Pending", "Sample Collected"].includes(r.status));
      const anyDone = rows.some((r) => ["In Progress", "Completed"].includes(r.status));
      return { reqNo, rows, first, allPending, allCancelled, anyOpen, anyDone };
    });
    // Newest first
    return arr.sort((a, b) =>
      String(b.first?.orderedDate || "").localeCompare(String(a.first?.orderedDate || "")) ||
      (b.first?.id || 0) - (a.first?.id || 0)
    );
  }, [requests]);

  // A cancelled requisition's replacement (the new req whose rows supersede it).
  const replacementFor = useCallback(
    (reqNo) => requests.find((r) => r.supersedesRequisition === reqNo)?.requisitionNumber || null,
    [requests]
  );

  const groupToPrint = (rows) => {
    const first = rows[0] || {};
    return {
      requisitionNumber: first.requisitionNumber,
      orderedDate: first.orderedDate,
      orderedTime: first.orderedTime,
      priority: first.priority,
      notes: first.notes,
      requestedBy: first.orderedBy,
      onBehalfOfDoctor: first.onBehalfOfDoctor,
      tests: rows.map((r) => ({ testType: r.testType, sampleType: r.sampleType })),
    };
  };

  // Load a requisition's rows back into the form. `mode`:
  //   'edit'    — edit in place (updates the same requisition; Pending only)
  //   'reissue' — start a NEW request that supersedes this one
  const loadIntoForm = (group, mode) => {
    const rows = group.rows.filter((r) => r.status !== "Cancelled");
    setSelected(rows.map((r) => ({
      key: `t:${r.testType}`, kind: "test", testType: r.testType,
      sampleType: r.sampleType, price: r.price != null ? Number(r.price) : null,
    })));
    setPriority(group.first?.priority || "Routine");
    setNotes(group.first?.notes || "");
    setOnBehalfOfDoctorId(group.first?.onBehalfOfDoctorId ? String(group.first.onBehalfOfDoctorId) : "");
    setEditingReq(mode === "edit" ? group.reqNo : null);
    setSupersedesReq(mode === "reissue" ? group.reqNo : null);
    setPrintReq(null);
    if (typeof window !== "undefined") window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  const cancel = async (group) => {
    if (!window.confirm(`Cancel ${group.reqNo}? The record is kept, marked Cancelled.`)) return;
    try {
      const res = await labService.cancelRequest(group.reqNo, { uhid });
      if (res.success) { toast.success("Request cancelled"); await loadRequests(); }
      else toast.error(res.message || "Could not cancel");
    } catch (e) { toast.error(e?.message || "Could not cancel"); }
  };

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        {/* LEFT — pick tests */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-gray-800">
              {editingReq ? `Editing ${editingReq}` : supersedesReq ? `Reissuing (replaces ${supersedesReq})` : "New lab request"}
            </h3>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all catalogue tests…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-primary"
            />
            {searchResults.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {searchResults.map(({ kind, item }) => (
                  <button
                    key={`${kind}:${item.id}`}
                    onClick={() => { kind === "package" ? addPackage(item) : addTest(item); setQuery(""); }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {kind === "package" && <PackageIcon className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />}
                      <span className="font-medium text-gray-800 truncate">{item.name}</span>
                      <span className="text-xs text-gray-400">{kind === "package" ? `${item.tests?.length || 0} tests` : (item.detail || "")}</span>
                    </span>
                    {item.price != null && <span className="text-xs font-semibold text-gray-600">{money(item.price)}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Packages */}
          {commonPackages.length > 0 && (
            <>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mt-4 mb-2">Packages</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {commonPackages.map((p) => {
                  const on = hasKey(`p:${p.id}`);
                  return (
                    <button
                      key={p.id}
                      onClick={() => (on ? removeItem(`p:${p.id}`) : addPackage(p))}
                      className={`flex items-start justify-between gap-2 p-3 rounded-lg border-2 text-left transition ${
                        on ? "bg-violet-50 border-violet-400" : "bg-white border-gray-200 hover:border-violet-300"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 font-semibold text-sm text-violet-700">
                          <PackageIcon className="w-3.5 h-3.5" /> {p.name}
                        </span>
                        <span className="block text-xs text-gray-500">{p.tests?.length || 0} tests · {p.priceMode === "fixed" ? "special rate" : "sum of tests"}</span>
                      </span>
                      {p.price != null && <span className="text-xs font-bold text-violet-700 whitespace-nowrap">{money(p.price)}</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Common tests */}
          <div className="flex items-center justify-between mt-4 mb-2">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Common tests</p>
            <span className="text-[11px] text-gray-400">others via search</span>
          </div>
          {loading ? (
            <p className="text-sm text-gray-400">Loading catalogue…</p>
          ) : commonTests.length === 0 ? (
            <p className="text-sm text-gray-500">No common tests set. Use search, or ask an admin to flag common tests in the Clinical Catalog.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {commonTests.map((t) => {
                const on = hasKey(`t:${t.name}`);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTestCard(t)}
                    className={`flex items-start justify-between gap-2 p-3 rounded-lg border-2 text-left transition ${
                      on ? "bg-blue-50 border-primary" : "bg-white border-gray-200 hover:border-primary"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold text-sm text-gray-800">{t.name}</span>
                      <span className="block text-xs text-gray-500">{t.detail || "—"}</span>
                    </span>
                    {t.price != null && <span className="text-xs font-bold text-gray-600 whitespace-nowrap">{money(t.price)}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT — this request */}
        <div className="border-2 border-primary/60 rounded-xl bg-blue-50/50 p-4 lg:sticky lg:top-3">
          <h4 className="flex items-center justify-between text-sm font-bold text-blue-900 mb-2">
            This request
            <span className="bg-primary text-white rounded-full text-xs px-2 py-0.5">{testCount}</span>
          </h4>

          {selected.length === 0 ? (
            <p className="text-xs text-gray-500 text-center border border-dashed border-blue-200 rounded-lg bg-white py-4">
              No tests yet — tick a card or search.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {selected.map((s, i) => (
                <li key={s.key} className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-sm ${s.kind === "package" ? "bg-violet-50 border-violet-200" : "bg-white border-blue-200"}`}>
                  <span className={`flex-none w-5 h-5 rounded-md text-white text-[11px] font-bold flex items-center justify-center ${s.kind === "package" ? "bg-violet-500" : "bg-primary"}`}>{i + 1}</span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center justify-between gap-2">
                      <span className={`font-semibold ${s.kind === "package" ? "text-violet-700" : "text-gray-800"} truncate`}>
                        {s.kind === "package" ? `📦 ${s.name}` : s.testType}
                      </span>
                      <span className="flex items-center gap-2 flex-none">
                        {s.price != null && <span className="text-xs font-semibold text-gray-600">{Number(s.price).toLocaleString()}</span>}
                        <button onClick={() => removeItem(s.key)} className="text-gray-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                      </span>
                    </span>
                    {s.kind === "package"
                      ? <span className="block text-[11px] text-gray-500 mt-0.5">{s.tests.map((m) => m.testType).join(" · ")}</span>
                      : s.sampleType && <span className="block text-[11px] text-gray-500">{s.sampleType}</span>}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {selected.length > 0 && (
            <div className="flex items-center justify-between font-bold text-sm text-blue-900 bg-white border border-blue-200 rounded-lg px-3 py-2 mt-2">
              <span>Total <span className="font-normal text-gray-500">· {testCount} tests</span></span>
              <span>{money(total)}</span>
            </div>
          )}

          <div className="border-t border-blue-200 my-3" />

          {/* Priority */}
          <p className="text-xs font-bold text-gray-700 mb-1.5">Priority</p>
          <div className="grid grid-cols-3 gap-1.5">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`text-xs font-semibold py-2 rounded-lg border transition ${
                  priority === p
                    ? (p === "STAT" ? "bg-red-50 border-red-500 text-red-700" : p === "Urgent" ? "bg-red-50 border-red-400 text-red-600" : "bg-gray-100 border-gray-400 text-gray-700")
                    : "bg-white border-gray-200 text-gray-500 hover:border-gray-400"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Nurse: on behalf of doctor (required) */}
          {!isDoctor && (
            <>
              <p className="text-xs font-bold text-gray-700 mt-3 mb-1.5">On behalf of <span className="text-red-500">*</span></p>
              <select
                value={onBehalfOfDoctorId}
                onChange={(e) => setOnBehalfOfDoctorId(e.target.value)}
                className="w-full px-3 py-2 text-sm border-2 border-primary/60 rounded-lg bg-white focus:outline-none focus:border-primary font-semibold text-primary"
              >
                <option value="">Select a doctor…</option>
                {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">Required — prints on the requisition and shows in the kardex.</p>
            </>
          )}

          {/* Special instructions */}
          <p className="text-xs font-bold text-gray-700 mt-3 mb-1.5">Special instructions <span className="font-normal text-gray-400">(optional)</span></p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. fasting since 10pm; handle urgently"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-primary resize-none"
          />

          <button
            onClick={save}
            disabled={saving || selected.length === 0}
            className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white font-bold text-sm py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : editingReq ? "💾 Update & print" : "💾 Save & print"}{selected.length > 0 ? ` (${testCount})` : ""}
          </button>
          {(editingReq || supersedesReq) && (
            <button onClick={resetForm} className="w-full mt-1.5 text-xs text-gray-500 hover:text-gray-700 py-1">
              Cancel editing
            </button>
          )}
          <p className="text-[11px] text-gray-500 mt-2 text-center">Saves the request and opens the print preview.</p>
        </div>
      </div>

      {/* Existing requests */}
      <div className="mt-6">
        <h4 className="text-sm font-bold text-gray-700 mb-1">This patient's lab requests</h4>
        <p className="text-xs text-gray-500 mb-3">
          Editable while Pending. Once the lab starts on it, cancel &amp; reissue — the old one stays, marked Cancelled.
        </p>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-gray-500">No lab requests yet.</p>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => {
              const replacedBy = g.allCancelled ? replacementFor(g.reqNo) : null;
              return (
                <div key={g.reqNo} className={`border rounded-xl overflow-hidden ${g.allCancelled ? "border-red-200 opacity-80" : "border-gray-200"}`}>
                  <div className={`flex items-center justify-between gap-2 px-4 py-2.5 ${g.allCancelled ? "bg-red-50" : "bg-gray-50"} border-b border-gray-100`}>
                    <div className="text-xs text-gray-500 min-w-0">
                      <span className="font-bold text-gray-800">{g.reqNo}</span>
                      {g.first?.orderedDate && <span> · {fmtDate(g.first.orderedDate)}{g.first.orderedTime ? `, ${g.first.orderedTime}` : ""}</span>}
                      <span className={g.first?.orderedByRole === "doctor" ? "text-primary" : "text-violet-600"}>
                        {" "}· {g.first?.orderedBy}
                      </span>
                      {g.first?.onBehalfOfDoctor && <span> · on behalf of {g.first.onBehalfOfDoctor}</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${g.first?.priority === "STAT" || g.first?.priority === "Urgent" ? "bg-red-50 text-red-600 border-red-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>{g.first?.priority}</span>
                      {!g.allCancelled && (
                        <button onClick={() => setPrintReq(groupToPrint(g.rows))} className="text-primary hover:opacity-80" title="Print"><Printer className="w-4 h-4" /></button>
                      )}
                      {g.allPending && (
                        <button onClick={() => loadIntoForm(g, "edit")} className="text-primary hover:opacity-80" title="Edit"><Pencil className="w-4 h-4" /></button>
                      )}
                      {!g.allPending && !g.allCancelled && g.anyOpen && (
                        <button onClick={() => loadIntoForm(g, "reissue")} className="text-gray-500 hover:text-primary" title="Cancel & reissue"><RefreshCw className="w-4 h-4" /></button>
                      )}
                      {canCancel && g.anyOpen && (
                        <button onClick={() => cancel(g)} className="text-gray-400 hover:text-red-500" title="Cancel request"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                  <div>
                    {g.rows.map((r) => (
                      <div key={r.id} className="flex items-center justify-between px-4 py-2 border-b border-gray-50 last:border-0 text-sm">
                        <span className={`${r.status === "Cancelled" ? "line-through text-gray-400" : "text-gray-800 font-medium"}`}>
                          {r.testType}
                          {r.packageName && <span className="ml-2 text-[11px] text-violet-500">📦 {r.packageName}</span>}
                        </span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUS_PILL[r.status] || "bg-gray-50 text-gray-500 border-gray-200"}`}>{r.status}</span>
                      </div>
                    ))}
                    {g.allCancelled && (() => {
                      const cx = g.rows.find((r) => r.cancelledBy);
                      return (
                        <div className="px-4 py-2 text-[11px] text-gray-500 bg-red-50">
                          {cx?.cancelledBy
                            ? <>Cancelled by <span className="font-semibold">{cx.cancelledBy}</span>{cx.cancelledByRole && cx.cancelledByRole !== "doctor" ? " (Nurse)" : ""}{cx.cancelledAt ? ` · ${fmtDate(cx.cancelledAt)}` : ""}</>
                            : "Cancelled"}
                          {replacedBy && <> · replaced by <span className="font-semibold text-primary">{replacedBy}</span></>}
                          {" · record kept for the audit trail"}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Print preview (opens on save; also from a request's Print button) */}
      {printReq && (
        <LabRequestPrint
          request={printReq}
          patient={{ name: patient?.name, uhid: patient?.uhid, age: patient?.age, gender: patient?.gender }}
          onClose={() => setPrintReq(null)}
          onBackToEdit={() => {
            const g = groups.find((x) => x.reqNo === printReq.requisitionNumber);
            setPrintReq(null);
            if (g && g.allPending) loadIntoForm(g, "edit");
          }}
        />
      )}
    </div>
  );
};

export default LabRequest;
