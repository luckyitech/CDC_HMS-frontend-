import { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { Plus, X, Trash2, Syringe } from "lucide-react";
import Button from "./Button";
import glp1Service from "../../services/glp1Service";
import { useUserContext } from "../../contexts/UserContext";
import { numericVital, bpVital } from "../../utils/vitalsValues";

/**
 * Glp1Kardex — the GLP-1 / GIP agonist monitoring log.
 *
 * A running, additive record any doctor or nurse can add to, built the same way
 * as the nursing Kardex: each saved entry is a new row, stamped with who wrote it
 * and when. There is no dose ladder, no planned review-week grid and no course
 * lifecycle to manage — the record is simply what happened, visit by visit.
 *
 * Behind the scenes an entry is a Glp1Review under a bare Glp1Therapy course,
 * which is created silently the first time an agent is used (glp1Service.ensureCourse).
 * Removing an entry is a soft delete — the row stays in the record as removed —
 * and is limited to doctors and admins; a nurse corrects a mistake by adding a
 * new entry.
 */

const SEVERITIES = ["none", "mild", "moderate", "severe"];
const nextSeverity = (s) => SEVERITIES[(SEVERITIES.indexOf(s || "none") + 1) % SEVERITIES.length];

const SEV_CHIP = {
  mild:     "bg-amber-100 text-amber-800 border-amber-300",
  moderate: "bg-orange-100 text-orange-800 border-orange-300",
  severe:   "bg-red-100 text-red-800 border-red-300",
};
const SEV_TAG = {
  mild:     "bg-amber-50 text-amber-800 border-amber-200",
  moderate: "bg-orange-50 text-orange-800 border-orange-200",
  severe:   "bg-red-50 text-red-700 border-red-200",
};

const fmtDate = (d) =>
  d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";

const todayISO = () => new Date().toISOString().slice(0, 10);

// Whole weeks between a course start and a date — mirrors the server so the "Wk N"
// on a row and the header agree.
const weeksBetween = (start, end = new Date()) => {
  if (!start) return null;
  const s = new Date(`${String(start).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(s.getTime())) return null;
  const days = Math.round((new Date(end).setHours(0, 0, 0, 0) - s.setHours(0, 0, 0, 0)) / 86400000);
  return days < 0 ? null : Math.floor(days / 7);
};

const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

const Glp1Kardex = ({ patient, onDirtyChange }) => {
  const uhid = patient?.uhid;
  const vitals = patient?.vitals || null;
  const { currentUser } = useUserContext();
  const canRemove = currentUser?.role === "doctor" || currentUser?.role === "admin";

  const [medications, setMedications] = useState([]);
  const [symptoms, setSymptoms]       = useState([]);
  const [therapies, setTherapies]     = useState([]);
  const [entries, setEntries]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [adding, setAdding]           = useState(false);

  // --- load -----------------------------------------------------------------
  const loadEntries = useCallback(async () => {
    if (!uhid) return;
    const [tRes, rRes] = await Promise.all([
      glp1Service.getTherapies(uhid).catch(() => ({ success: false })),
      glp1Service.getReviews({ uhid }).catch(() => ({ success: false })),
    ]);
    if (tRes.success) setTherapies(tRes.data?.therapies || []);
    if (rRes.success) setEntries(rRes.data?.reviews || []);
  }, [uhid]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [mRes, sRes] = await Promise.all([
        glp1Service.getMedications().catch(() => ({ success: false })),
        glp1Service.getSymptoms().catch(() => ({ success: false })),
      ]);
      if (!cancelled) {
        if (mRes.success) setMedications(mRes.data?.medications || []);
        if (sRes.success) setSymptoms(sRes.data?.symptoms || []);
        await loadEntries();
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [uhid, loadEntries]);

  // agent name + start date per therapy id
  const therapyById = useMemo(() => {
    const m = new Map();
    therapies.forEach((t) => m.set(t.id, t));
    return m;
  }, [therapies]);

  // newest at the bottom — a log reads top-to-bottom in time
  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) =>
      (a.reviewDate || "").localeCompare(b.reviewDate || "") || (a.id - b.id)),
    [entries]
  );

  // --- progressive summary --------------------------------------------------
  const summary = useMemo(() => {
    const live = therapies.find((t) => ["Active", "Paused"].includes(t.status));
    const agentT = live || therapies[0] || null;
    const withWeight = sortedEntries.filter((e) => e.weight != null);
    const firstW = withWeight[0]?.weight;
    const lastW  = withWeight[withWeight.length - 1]?.weight;
    const weightDelta = firstW != null && lastW != null ? Number(lastW) - Number(firstW) : null;
    const lastDose = [...sortedEntries].reverse().find((e) => e.doseAtReview != null)?.doseAtReview;
    const lastHba1c = [...sortedEntries].reverse().find((e) => e.hba1c != null)?.hba1c;
    return {
      agent: agentT?.medication?.genericName || null,
      startDate: agentT?.startDate || null,
      week: agentT ? weeksBetween(agentT.startDate) : null,
      lastDose,
      weightDelta,
      lastHba1c,
    };
  }, [therapies, sortedEntries]);

  const removeEntry = async (entry) => {
    const reason = window.prompt("Remove this entry from the record? It stays as removed. Reason:");
    if (reason == null) return;
    if (!reason.trim()) { toast.error("A reason is required to remove an entry"); return; }
    try {
      const res = await glp1Service.removeReview(entry.id, reason.trim());
      if (res.success) { setEntries((prev) => prev.filter((e) => e.id !== entry.id)); toast.success("Entry removed"); }
      else toast.error(res.message || "Could not remove the entry");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not remove the entry");
    }
  };

  const openAdd = () => { setAdding(true); onDirtyChange?.(true); };
  const closeAdd = () => { setAdding(false); onDirtyChange?.(false); };

  const onSaved = async () => { await loadEntries(); closeAdd(); };

  // --- render ---------------------------------------------------------------
  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  if (!medications.length) {
    return (
      <p className="text-sm text-gray-500">
        No GLP-1 agents in the clinic catalogue yet. An administrator can add a medication
        tagged “GLP-1” or “GIP” on the Clinical Catalog page, and it will appear here.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Syringe className="w-5 h-5" /> GLP-1 monitoring
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">A running log — any doctor or nurse can add an entry.</p>
        </div>
        <Button onClick={openAdd} className="text-sm">
          <Plus className="w-4 h-4 mr-1" /> Add entry
        </Button>
      </div>

      {/* progressive summary */}
      {summary.agent && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
          {[
            ["Current agent", summary.agent],
            ["Latest dose", summary.lastDose != null ? `${summary.lastDose} mg` : "—"],
            ["On therapy", summary.week != null ? `Wk ${summary.week}` : "—"],
            ["Weight change", summary.weightDelta == null ? "—"
              : `${summary.weightDelta <= 0 ? "▼" : "▲"} ${Math.abs(summary.weightDelta).toFixed(1)} kg`],
            ["Latest HbA1c", summary.lastHba1c != null ? `${summary.lastHba1c} %` : "—"],
          ].map(([k, v], i) => (
            <div key={k} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide">{k}</p>
              <p className={`text-sm font-semibold mt-0.5 ${i === 3 && summary.weightDelta != null && summary.weightDelta <= 0 ? "text-green-600" : "text-gray-800"}`}>{v}</p>
            </div>
          ))}
        </div>
      )}

      {sortedEntries.length === 0 ? (
        <p className="text-sm text-gray-500">No entries yet. Add the first one when the patient is started or reviewed.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["When / by", "Agent · dose", "Weight (BMI)", "BP · HR", "FBS · HbA1c", "Adherence", "Side effects", "Note", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10.5px] font-bold text-gray-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedEntries.map((e) => {
                const t = therapyById.get(e.therapyId);
                const agent = t?.medication?.genericName || "—";
                return (
                  <tr key={e.id} className="align-top">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-gray-700">{fmtDate(e.reviewDate)}</div>
                      <div className="text-[11px] text-gray-400">{fmtTime(e.createdAt)} · Wk {e.weekNumber}</div>
                      {e.clinicianName && (
                        <div className="mt-0.5">
                          <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            e.clinicianRole === "doctor"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-violet-50 text-violet-700 border-violet-200"}`}>
                            {e.clinicianName}
                          </span>
                        </div>
                      )}
                      {e.amendedByName && (
                        <div className="text-[10px] text-gray-400 italic mt-0.5">amended · {e.amendmentReason}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-gray-800">{e.doseAtReview != null ? `${e.doseAtReview} mg` : "—"}</span>
                      <span className="block text-[11px] text-gray-500">{agent}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {e.weight != null ? `${e.weight} kg` : "—"}
                      {e.bmi != null && <span className="text-gray-400"> ({e.bmi})</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {e.bp || "—"}{e.heartRate != null ? ` · ${e.heartRate}` : ""}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {e.fpg != null ? e.fpg : "—"}{e.hba1c != null ? ` · ${e.hba1c}%` : ""}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{e.adherence || "—"}</td>
                    <td className="px-4 py-3">
                      {(e.sideEffects || []).filter((se) => se.severity && se.severity !== "none").length === 0 ? "—" :
                        (e.sideEffects || []).filter((se) => se.severity && se.severity !== "none").map((se) => (
                          <span key={se.id} className={`inline-block mr-1 mb-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${SEV_TAG[se.severity] || ""}`}>
                            {se.symptom} · {se.severity}
                          </span>
                        ))}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[240px] whitespace-pre-wrap">{e.actionPlan || "—"}</td>
                    <td className="px-2 py-3">
                      {canRemove && (
                        <button onClick={() => removeEntry(e)} className="text-gray-300 hover:text-red-500" aria-label="Remove entry">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {sortedEntries.length > 0 && (
        <p className="text-[11px] text-gray-400 mt-2">
          Newest at the bottom. Each row is stamped with who wrote it. Removing keeps the row as “removed”;
          {canRemove ? " a correction is a new entry." : " to correct an entry, add a new one."}
        </p>
      )}

      {adding && (
        <AddEntryModal
          patient={patient}
          vitals={vitals}
          medications={medications}
          symptoms={symptoms}
          defaultAgent={summary.agent}
          onAddSymptom={async (name) => {
            try {
              const res = await glp1Service.createSymptom(name);
              if (res.success) { setSymptoms((prev) => [...prev.filter((s) => s.id !== res.data.id), res.data]); return { success: true, symptom: res.data }; }
              return { success: false, message: res.message };
            } catch (e) { return { success: false, message: e?.response?.data?.message || "Could not add symptom" }; }
          }}
          onClose={closeAdd}
          onSaved={onSaved}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Add entry — one modal, every field optional except the agent. A nurse logging
// an injection fills a line or two; a doctor doing a full review fills more.
// ---------------------------------------------------------------------------
const Field = ({ label, unit, ...props }) => (
  <div>
    <label className="block text-[11px] text-gray-500 mb-1">{label}{unit && <span className="text-gray-400"> ({unit})</span>}</label>
    <input {...props} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-primary" />
  </div>
);

const AddEntryModal = ({ patient, vitals, medications, symptoms, defaultAgent, onAddSymptom, onClose, onSaved }) => {
  const height = numericVital(vitals?.height);

  const [form, setForm] = useState(() => ({
    medicationName: defaultAgent || medications[0]?.genericName || "",
    reviewDate: todayISO(),
    doseAtReview: "",
    adherence: "",
    weight: numericVital(vitals?.weight),
    bmi: numericVital(vitals?.bmi),
    waistCircumference: numericVital(vitals?.waistCircumference),
    bp: bpVital(vitals?.bp),
    heartRate: numericVital(vitals?.heartRate),
    fpg: "",
    hba1c: numericVital(vitals?.hba1c),
    actionPlan: "",
  }));
  const [gradings, setGradings] = useState({});   // { symptomId: severity }
  const [newSymptom, setNewSymptom] = useState("");
  const [addingSymptom, setAddingSymptom] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => {
    const value = e.target.value;
    const next = { ...form, [key]: value };
    if (key === "weight" && height) {
      const w = parseFloat(value);
      const m = height / 100;
      next.bmi = Number.isFinite(w) && w > 0 ? (w / (m * m)).toFixed(1) : "";
    }
    setForm(next);
  };

  const cycle = (symptomId) =>
    setGradings((prev) => ({ ...prev, [symptomId]: nextSeverity(prev[symptomId]) }));

  const addSymptomList = async () => {
    const names = newSymptom.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    if (!names.length) return;
    setAddingSymptom(true);
    let added = 0;
    for (const name of names) {
      const r = await onAddSymptom(name);
      if (r.success) added++;
    }
    if (added) { toast.success(added === 1 ? "Symptom added" : `${added} symptoms added`); setNewSymptom(""); }
    setAddingSymptom(false);
  };

  const save = async () => {
    if (!form.medicationName) { toast.error("Choose an agent"); return; }
    setSaving(true);
    try {
      const course = await glp1Service.ensureCourse({
        uhid: patient?.uhid,
        medicationName: form.medicationName,
        medicationBrand: medications.find((m) => m.genericName === form.medicationName)?.brandName || undefined,
      });
      if (!course.success) { toast.error(course.message || "Could not open the course"); setSaving(false); return; }

      const sideEffects = Object.entries(gradings)
        .filter(([, sev]) => sev && sev !== "none")
        .map(([symptomId, severity]) => ({ symptomId: Number(symptomId), severity }));

      const res = await glp1Service.createReview({
        therapyId: course.data.id,
        reviewDate: form.reviewDate,
        weight: num(form.weight),
        bmi: num(form.bmi),
        waistCircumference: num(form.waistCircumference),
        bp: form.bp || null,
        heartRate: num(form.heartRate),
        fpg: num(form.fpg),
        hba1c: num(form.hba1c),
        doseAtReview: num(form.doseAtReview),
        adherence: form.adherence || null,
        actionPlan: form.actionPlan || null,
        sideEffects,
      });

      if (res.success) { toast.success("Entry added"); onSaved(); }
      else toast.error(res.message || "Could not save the entry");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not save the entry");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !saving && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[88vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><Syringe className="w-5 h-5" /> Add GLP-1 entry</h3>
          <button onClick={onClose} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 p-5 space-y-5">
          <p className="text-xs text-gray-500">Date, time and your name are stamped on save. Fill only what applies.</p>

          {/* agent + dose */}
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Agent &amp; dose</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Agent</label>
                <select value={form.medicationName} onChange={set("medicationName")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-primary">
                  {medications.map((m) => <option key={m.id} value={m.genericName}>{m.genericName}</option>)}
                </select>
              </div>
              <Field label="Dose given" unit="mg" type="number" step="0.25" value={form.doseAtReview} onChange={set("doseAtReview")} />
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Adherence</label>
                <select value={form.adherence} onChange={set("adherence")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-primary">
                  <option value="">—</option>
                  <option>Good</option>
                  <option>Missed doses</option>
                  <option>Stopped</option>
                </select>
              </div>
              <Field label="Visit date" type="date" value={form.reviewDate} onChange={set("reviewDate")} />
            </div>
          </div>

          {/* measurements */}
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">
              Measurements <span className="font-normal normal-case text-gray-400">— prefilled from today’s triage where available</span>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Weight" unit="kg" type="number" step="0.1" value={form.weight} onChange={set("weight")} />
              <Field label={height ? "BMI (auto)" : "BMI"} type="number" step="0.1" value={form.bmi} onChange={set("bmi")} />
              <Field label="Waist" unit="cm" type="number" step="0.1" value={form.waistCircumference} onChange={set("waistCircumference")} />
              <Field label="BP" unit="mmHg" type="text" placeholder="128/80" value={form.bp} onChange={set("bp")} />
              <Field label="Heart rate" unit="bpm" type="number" value={form.heartRate} onChange={set("heartRate")} />
              <Field label="FBS" unit="mmol/L" type="number" step="0.1" value={form.fpg} onChange={set("fpg")} />
              <Field label="HbA1c" unit="%" type="number" step="0.1" value={form.hba1c} onChange={set("hba1c")} />
            </div>
          </div>

          {/* side effects */}
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Side effects this visit</p>
            <div className="flex flex-wrap gap-2">
              {symptoms.map((s) => {
                const sev = gradings[s.id] || "none";
                return (
                  <button key={s.id} type="button" onClick={() => cycle(s.id)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      sev !== "none" ? SEV_CHIP[sev] : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                    {s.name}{sev !== "none" ? ` · ${sev}` : ""}
                  </button>
                );
              })}
              {!addingSymptom && (
                <button type="button" onClick={() => setAddingSymptom(true)}
                  className="px-3 py-1.5 rounded-full text-xs border border-dashed border-gray-300 text-primary hover:bg-blue-50">
                  <Plus className="w-3 h-3 inline -mt-0.5" /> Add symptom
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">Tap a symptom to cycle none → mild → moderate → severe.</p>
            {addingSymptom && (
              <div className="mt-2">
                <textarea rows={2} value={newSymptom} onChange={(e) => setNewSymptom(e.target.value)} autoFocus
                  placeholder="New symptoms — one per line or comma separated. Joins the clinic-wide list."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <div className="flex items-center gap-3 mt-1.5">
                  <button type="button" onClick={addSymptomList} className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:opacity-90">Add to list</button>
                  <button type="button" onClick={() => { setAddingSymptom(false); setNewSymptom(""); }} className="text-sm text-gray-400 hover:underline">Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* note */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Note</label>
            <textarea rows={2} value={form.actionPlan} onChange={set("actionPlan")}
              placeholder="Injection given / titration plan / safety notes / next review…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save entry"}</Button>
        </div>
      </div>
    </div>
  );
};

export default Glp1Kardex;
