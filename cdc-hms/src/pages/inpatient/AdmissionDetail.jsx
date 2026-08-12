import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useUserContext } from "../../contexts/UserContext";
import inpatientService from "../../services/inpatientService";
import { DRUG_SCHEDULES, DRUG_ROUNDS } from "../../constants/drugSchedules";

const TABS = ["Observations", "Medications", "Notes", "Fluids", "Radiology", "Billing", "Discharge"];
const box = "border border-gray-200 rounded-lg p-3 text-sm";
const inp = "w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-primary";
const btn = "px-3 py-1.5 rounded text-sm bg-primary text-white hover:opacity-90 disabled:opacity-50";

const escalationColor = (e) =>
  ({ High: "bg-red-100 text-red-800", Medium: "bg-amber-100 text-amber-800", Low: "bg-yellow-50 text-yellow-700", None: "bg-green-50 text-green-700" }[e] || "");

export default function AdmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useUserContext();
  const role = currentUser?.role;
  const isDoctor = role === "doctor" || role === "admin";
  const isNurse = role === "nurse";

  const [adm, setAdm] = useState(null);
  const [tab, setTab] = useState("Observations");

  const loadAdm = useCallback(async () => {
    try {
      const res = await inpatientService.getAdmission(id);
      setAdm(res.data);
    } catch (e) { toast.error(e.message || "Failed to load admission"); }
  }, [id]);

  useEffect(() => { loadAdm(); }, [loadAdm]);

  const doDischarge = async () => {
    if (!window.confirm("Discharge this patient? A signed discharge summary is required.")) return;
    try {
      await inpatientService.discharge(id, {});
      toast.success("Patient discharged");
      navigate("/inpatient/board");
    } catch (e) { toast.error(e.message || "Discharge failed"); }
  };

  const doTransfer = async () => {
    const bedId = window.prompt("Enter target Bed ID (from an Available bed on the board):");
    if (!bedId) return;
    try {
      await inpatientService.transfer(id, { bedId: Number(bedId), reason: "Ward transfer" });
      toast.success("Patient transferred");
      loadAdm();
    } catch (e) { toast.error(e.message || "Transfer failed"); }
  };

  if (!adm) return <div className="p-6 text-gray-500">Loading admission…</div>;

  const p = adm.Patient || {};
  const losHours = Math.round((Date.now() - new Date(adm.admissionDateTime)) / 36e5);

  return (
    <div className="p-4 sm:p-6">
      <button onClick={() => navigate("/inpatient/board")} className="text-sm text-primary hover:underline mb-3">← Ward Board</button>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{p.firstName} {p.lastName}</h1>
            <p className="text-sm text-gray-500">{p.uhid} · {adm.status}</p>
            <p className="text-sm text-gray-600 mt-1">
              {adm.Ward?.name} · Bed {adm.Bed?.label} · {adm.admissionType}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Admitted {new Date(adm.admissionDateTime).toLocaleString()} · LOS ~{losHours}h ·
              Attending {adm.attendingDoctor ? `Dr. ${adm.attendingDoctor.firstName} ${adm.attendingDoctor.lastName}` : "—"}
            </p>
            {adm.provisionalDiagnosis && <p className="text-sm text-gray-700 mt-1">Dx: {adm.provisionalDiagnosis}</p>}
          </div>
          <div className="flex gap-2">
            {(isDoctor || isNurse) && adm.status === "Admitted" &&
              <button onClick={doTransfer} className="px-3 py-1.5 rounded text-sm border border-gray-300 hover:bg-blue-50">Transfer</button>}
            {(isDoctor || role === "staff") && adm.status === "Admitted" &&
              <button onClick={doDischarge} className="px-3 py-1.5 rounded text-sm bg-red-600 text-white hover:opacity-90">Discharge</button>}
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm whitespace-nowrap ${tab === t ? "border-b-2 border-primary text-primary font-medium" : "text-gray-500"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Observations" && <ObservationsTab admissionId={id} canWrite={isDoctor || isNurse} />}
      {tab === "Medications" && <MedicationsTab admissionId={id} isDoctor={isDoctor} isNurse={isNurse} />}
      {tab === "Notes" && <NotesTab admissionId={id} isDoctor={isDoctor} />}
      {tab === "Fluids" && <FluidsTab admissionId={id} canWrite={isDoctor || isNurse} />}
      {tab === "Radiology" && <RadiologyTab admissionId={id} isDoctor={isDoctor} canReport={role === "lab" || role === "admin"} />}
      {tab === "Billing" && <BillingTab admissionId={id} canWrite={role === "staff" || role === "admin"} />}
      {tab === "Discharge" && <DischargeTab admissionId={id} isDoctor={isDoctor} onSigned={loadAdm} />}
    </div>
  );
}

/* ---------------- Observations (NEWS2) ---------------- */
function ObservationsTab({ admissionId, canWrite }) {
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({});
  const load = useCallback(async () => {
    const res = await inpatientService.listObs(admissionId); setRows(res.data || []);
  }, [admissionId]);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    try {
      const payload = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === "" ? undefined : Number(v)]));
      await inpatientService.createObs({ admissionId: Number(admissionId), ...payload, onOxygen: !!f.onOxygen, consciousness: f.consciousness || undefined });
      toast.success("Observation recorded"); setF({}); load();
    } catch (e) { toast.error(e.message || "Failed"); }
  };

  const num = (key, ph) => (
    <input className={inp} placeholder={ph} value={f[key] ?? ""} onChange={(e) => setF({ ...f, [key]: e.target.value })} />
  );

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className={box}>
          <p className="font-medium mb-2">Record observation</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {num("respRate", "Resp rate")}{num("spo2", "SpO₂ %")}{num("systolicBP", "Systolic")}{num("diastolicBP", "Diastolic")}
            {num("heartRate", "Heart rate")}{num("temperature", "Temp °C")}{num("rbs", "RBS")}{num("painScore", "Pain 0-10")}
            <select className={inp} value={f.consciousness || ""} onChange={(e) => setF({ ...f, consciousness: e.target.value })}>
              <option value="">Consciousness</option>{["A", "C", "V", "P", "U"].map((x) => <option key={x}>{x}</option>)}
            </select>
            <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={!!f.onOxygen} onChange={(e) => setF({ ...f, onOxygen: e.target.checked })} /> On O₂</label>
          </div>
          <button onClick={submit} className={`${btn} mt-2`}>Save & score NEWS2</button>
        </div>
      )}
      <div className="space-y-2">
        {rows.map((o) => (
          <div key={o.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-2 text-sm">
            <span className="text-gray-600">{new Date(o.recordedAt).toLocaleString()}</span>
            <span>RR {o.respRate ?? "-"} · SpO₂ {o.spo2 ?? "-"} · BP {o.systolicBP ?? "-"}/{o.diastolicBP ?? "-"} · HR {o.heartRate ?? "-"} · T {o.temperature ?? "-"}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${escalationColor(o.escalation)}`}>NEWS {o.newsScore} · {o.escalation}</span>
          </div>
        ))}
        {rows.length === 0 && <p className="text-gray-400 text-sm">No observations yet.</p>}
      </div>
    </div>
  );
}

/* ---------------- Medications (MAR) ---------------- */
function MedicationsTab({ admissionId, isDoctor, isNurse }) {
  const [orders, setOrders] = useState([]);
  const [due, setDue] = useState([]);
  const [round, setRound] = useState(DRUG_ROUNDS[0]);
  const [o, setO] = useState({ drugName: "", dose: "", route: "PO", scheduleCode: "OD" });

  const loadOrders = useCallback(async () => { const r = await inpatientService.listOrders(admissionId); setOrders(r.data || []); }, [admissionId]);
  const loadDue = useCallback(async () => {
    const r = await inpatientService.dueList({ admissionId, round, date: new Date().toISOString().slice(0, 10) });
    setDue(r.data || []);
  }, [admissionId, round]);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => { loadDue(); }, [loadDue]);

  const addOrder = async () => {
    try {
      await inpatientService.createOrder({ admissionId: Number(admissionId), ...o, isPRN: o.scheduleCode === "PRN" });
      toast.success("Order added"); setO({ drugName: "", dose: "", route: "PO", scheduleCode: "OD" }); loadOrders(); loadDue();
    } catch (e) { toast.error(e.message || "Failed"); }
  };

  const sign = async (item, status) => {
    let reason;
    if (status !== "Given") { reason = window.prompt(`Reason (${status}):`); if (!reason) return; }
    try {
      await inpatientService.administer({ orderId: item.orderId, scheduledDate: item.scheduledDate, roundLabel: item.round, status, reason });
      toast.success("Recorded"); loadDue();
    } catch (e) { toast.error(e.message || "Failed"); }
  };

  return (
    <div className="space-y-5">
      {isDoctor && (
        <div className={box}>
          <p className="font-medium mb-2">New medication order</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <input className={inp} placeholder="Drug" value={o.drugName} onChange={(e) => setO({ ...o, drugName: e.target.value })} />
            <input className={inp} placeholder="Dose e.g. 500 mg" value={o.dose} onChange={(e) => setO({ ...o, dose: e.target.value })} />
            <select className={inp} value={o.route} onChange={(e) => setO({ ...o, route: e.target.value })}>{["PO", "IV", "IM", "SC", "PR", "INH", "TOP", "Other"].map((x) => <option key={x}>{x}</option>)}</select>
            <select className={inp} value={o.scheduleCode} onChange={(e) => setO({ ...o, scheduleCode: e.target.value })}>
              {DRUG_SCHEDULES.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
          </div>
          <button onClick={addOrder} className={`${btn} mt-2`}>Add order</button>
        </div>
      )}

      <div>
        <p className="font-medium mb-2">Drug chart</p>
        <div className="space-y-1">
          {orders.map((ord) => (
            <div key={ord.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-2 text-sm">
              <span>{ord.drugName} {ord.dose} · {ord.route} · {ord.frequencyLabel || ord.scheduleCode}</span>
              <span className={`text-xs ${ord.status === "Active" ? "text-green-700" : "text-gray-400"}`}>{ord.status}</span>
            </div>
          ))}
          {orders.length === 0 && <p className="text-gray-400 text-sm">No orders yet.</p>}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <p className="font-medium">Drug round</p>
          <select className="border border-gray-300 rounded px-2 py-1 text-sm" value={round} onChange={(e) => setRound(e.target.value)}>
            {DRUG_ROUNDS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          {due.map((d) => (
            <div key={`${d.orderId}-${d.round}`} className="flex items-center justify-between border border-gray-200 rounded-lg p-2 text-sm">
              <span>{d.drugName} {d.dose} · {d.round}</span>
              <span className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded ${d.status === "Given" ? "bg-green-100 text-green-700" : d.status === "Due" ? "bg-gray-100 text-gray-600" : "bg-amber-100 text-amber-700"}`}>{d.status}</span>
                {isNurse && d.status === "Due" && (
                  <>
                    <button onClick={() => sign(d, "Given")} className="text-xs text-green-700 underline">Given</button>
                    <button onClick={() => sign(d, "Held")} className="text-xs text-amber-700 underline">Held</button>
                    <button onClick={() => sign(d, "Refused")} className="text-xs text-red-700 underline">Refused</button>
                  </>
                )}
              </span>
            </div>
          ))}
          {due.length === 0 && <p className="text-gray-400 text-sm">Nothing due at this round.</p>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Ward-round notes ---------------- */
function NotesTab({ admissionId, isDoctor }) {
  const [notes, setNotes] = useState([]);
  const [n, setN] = useState({ subjective: "", objective: "", assessment: "", plan: "" });
  const load = useCallback(async () => { const r = await inpatientService.listNotes(admissionId); setNotes(r.data || []); }, [admissionId]);
  useEffect(() => { load(); }, [load]);
  const add = async () => {
    try { await inpatientService.createNote({ admissionId: Number(admissionId), ...n }); toast.success("Note added"); setN({ subjective: "", objective: "", assessment: "", plan: "" }); load(); }
    catch (e) { toast.error(e.message || "Failed"); }
  };
  return (
    <div className="space-y-4">
      {isDoctor && (
        <div className={box}>
          <p className="font-medium mb-2">Ward-round note (SOAP)</p>
          {["subjective", "objective", "assessment", "plan"].map((k) => (
            <textarea key={k} className={`${inp} mb-2`} rows={2} placeholder={k[0].toUpperCase() + k.slice(1)} value={n[k]} onChange={(e) => setN({ ...n, [k]: e.target.value })} />
          ))}
          <button onClick={add} className={btn}>Save note</button>
        </div>
      )}
      <div className="space-y-2">
        {notes.map((note) => (
          <div key={note.id} className="border border-gray-200 rounded-lg p-3 text-sm">
            <p className="text-xs text-gray-500 mb-1">{new Date(note.roundDateTime).toLocaleString()} · Dr. {note.doctor?.firstName} {note.doctor?.lastName}{note.status === "amended" ? " · amended" : ""}</p>
            {note.subjective && <p><b>S:</b> {note.subjective}</p>}
            {note.objective && <p><b>O:</b> {note.objective}</p>}
            {note.assessment && <p><b>A:</b> {note.assessment}</p>}
            {note.plan && <p><b>P:</b> {note.plan}</p>}
          </div>
        ))}
        {notes.length === 0 && <p className="text-gray-400 text-sm">No notes yet.</p>}
      </div>
    </div>
  );
}

/* ---------------- Fluids ---------------- */
function FluidsTab({ admissionId, canWrite }) {
  const [data, setData] = useState({ entries: [], totals: { intake: 0, output: 0, balance: 0 } });
  const [f, setF] = useState({ direction: "Intake", type: "", volumeMl: "" });
  const load = useCallback(async () => { const r = await inpatientService.listFluid(admissionId); setData(r.data || { entries: [], totals: {} }); }, [admissionId]);
  useEffect(() => { load(); }, [load]);
  const add = async () => {
    try { await inpatientService.createFluid({ admissionId: Number(admissionId), ...f, volumeMl: Number(f.volumeMl) }); toast.success("Recorded"); setF({ direction: "Intake", type: "", volumeMl: "" }); load(); }
    catch (e) { toast.error(e.message || "Failed"); }
  };
  return (
    <div className="space-y-4">
      <div className={box}>
        <p>Intake <b>{data.totals.intake}</b> ml · Output <b>{data.totals.output}</b> ml · Balance <b>{data.totals.balance}</b> ml</p>
      </div>
      {canWrite && (
        <div className={box}>
          <div className="grid grid-cols-3 gap-2">
            <select className={inp} value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value })}><option>Intake</option><option>Output</option></select>
            <input className={inp} placeholder="Type e.g. IV / Urine" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} />
            <input className={inp} placeholder="Volume ml" value={f.volumeMl} onChange={(e) => setF({ ...f, volumeMl: e.target.value })} />
          </div>
          <button onClick={add} className={`${btn} mt-2`}>Add entry</button>
        </div>
      )}
      <div className="space-y-1">
        {data.entries.map((e) => (
          <div key={e.id} className="flex justify-between border border-gray-200 rounded-lg p-2 text-sm">
            <span>{new Date(e.recordedAt).toLocaleString()}</span><span>{e.direction} · {e.type} · {e.volumeMl} ml</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Billing ---------------- */
function BillingTab({ admissionId, canWrite }) {
  const [acct, setAcct] = useState({ charges: [], total: 0, byCategory: {} });
  const [c, setC] = useState({ category: "Procedure", description: "", quantity: 1, unitAmount: 0 });
  const load = useCallback(async () => { const r = await inpatientService.getAccount(admissionId); setAcct(r.data || { charges: [], total: 0 }); }, [admissionId]);
  useEffect(() => { load(); }, [load]);
  const add = async () => {
    try { await inpatientService.addCharge({ admissionId: Number(admissionId), ...c, quantity: Number(c.quantity), unitAmount: Number(c.unitAmount) }); toast.success("Charge added"); load(); }
    catch (e) { toast.error(e.message || "Failed"); }
  };
  const accrue = async () => { try { await inpatientService.accrueBedDays({ admissionId: Number(admissionId) }); toast.success("Bed-days accrued"); load(); } catch (e) { toast.error(e.message); } };
  return (
    <div className="space-y-4">
      <div className={box}><p>Running total: <b>{acct.total}</b></p></div>
      {canWrite && (
        <div className={box}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select className={inp} value={c.category} onChange={(e) => setC({ ...c, category: e.target.value })}>{["Procedure", "Drug", "Lab", "Radiology", "Consumable", "Other"].map((x) => <option key={x}>{x}</option>)}</select>
            <input className={inp} placeholder="Description" value={c.description} onChange={(e) => setC({ ...c, description: e.target.value })} />
            <input className={inp} placeholder="Qty" value={c.quantity} onChange={(e) => setC({ ...c, quantity: e.target.value })} />
            <input className={inp} placeholder="Unit amount" value={c.unitAmount} onChange={(e) => setC({ ...c, unitAmount: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={add} className={btn}>Add charge</button>
            <button onClick={accrue} className="px-3 py-1.5 rounded text-sm border border-gray-300 hover:bg-blue-50">Accrue bed-days</button>
          </div>
        </div>
      )}
      <div className="space-y-1">
        {acct.charges.map((ch) => (
          <div key={ch.id} className="flex justify-between border border-gray-200 rounded-lg p-2 text-sm">
            <span>{ch.chargeDate} · {ch.category} · {ch.description}</span><span>{ch.quantity} × {ch.unitAmount} = {ch.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Radiology ---------------- */
function RadiologyTab({ admissionId, isDoctor, canReport }) {
  const [orders, setOrders] = useState([]);
  const [o, setO] = useState({ modality: "XRay", region: "", clinicalDetails: "", priority: "Routine" });
  const load = useCallback(async () => { const r = await inpatientService.listRadiology({ admissionId }); setOrders(r.data || []); }, [admissionId]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!o.region.trim()) return toast.error("Region is required");
    try { await inpatientService.createRadiology({ admissionId: Number(admissionId), ...o }); toast.success("Imaging ordered"); setO({ modality: "XRay", region: "", clinicalDetails: "", priority: "Routine" }); load(); }
    catch (e) { toast.error(e.message || "Failed"); }
  };
  const fileReport = async (id) => {
    const reportText = window.prompt("Report findings:"); if (!reportText) return;
    try { await inpatientService.reportRadiology(id, { reportText, status: "Reported" }); toast.success("Report filed"); load(); }
    catch (e) { toast.error(e.message || "Failed"); }
  };

  return (
    <div className="space-y-4">
      {isDoctor && (
        <div className={box}>
          <p className="font-medium mb-2">Order imaging</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select className={inp} value={o.modality} onChange={(e) => setO({ ...o, modality: e.target.value })}>{["XRay", "CT", "MRI", "Ultrasound", "Mammogram", "Other"].map((x) => <option key={x}>{x}</option>)}</select>
            <input className={inp} placeholder="Region e.g. Chest" value={o.region} onChange={(e) => setO({ ...o, region: e.target.value })} />
            <select className={inp} value={o.priority} onChange={(e) => setO({ ...o, priority: e.target.value })}><option>Routine</option><option>Urgent</option></select>
            <input className={inp} placeholder="Clinical details" value={o.clinicalDetails} onChange={(e) => setO({ ...o, clinicalDetails: e.target.value })} />
          </div>
          <button onClick={add} className={`${btn} mt-2`}>Order</button>
        </div>
      )}
      <div className="space-y-2">
        {orders.map((r) => (
          <div key={r.id} className="border border-gray-200 rounded-lg p-2 text-sm">
            <div className="flex items-center justify-between">
              <span>{r.modality} · {r.region} · <span className="text-gray-500">{r.priority}</span></span>
              <span className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded ${r.status === "Reported" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{r.status}</span>
                {canReport && r.status !== "Reported" && <button onClick={() => fileReport(r.id)} className="text-xs underline">File report</button>}
              </span>
            </div>
            {r.clinicalDetails && <p className="text-xs text-gray-500 mt-1">Indication: {r.clinicalDetails}</p>}
            {r.reportText && <p className="text-sm mt-1"><b>Report:</b> {r.reportText}</p>}
          </div>
        ))}
        {orders.length === 0 && <p className="text-gray-400 text-sm">No imaging ordered.</p>}
      </div>
    </div>
  );
}

/* ---------------- Discharge summary ---------------- */
function DischargeTab({ admissionId, isDoctor, onSigned }) {
  const [summary, setSummary] = useState(null);
  const [draft, setDraft] = useState(null);
  const load = useCallback(async () => { const r = await inpatientService.getSummary(admissionId); setSummary(r.data); if (r.data) setDraft(r.data); }, [admissionId]);
  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    try { const r = await inpatientService.generateSummary(admissionId); setDraft({ ...r.data, admissionId: Number(admissionId) }); toast.success("Draft generated from notes"); }
    catch (e) { toast.error(e.message || "Failed"); }
  };
  const save = async () => {
    try { const r = await inpatientService.saveSummary({ admissionId: Number(admissionId), ...draft }); setSummary(r.data); setDraft(r.data); toast.success("Draft saved"); }
    catch (e) { toast.error(e.message || "Failed"); }
  };
  const sign = async () => {
    if (!summary?.id) { toast.error("Save the draft first"); return; }
    try { await inpatientService.updateSummary(summary.id, { ...draft, sign: true }); toast.success("Signed — discharge is now enabled"); load(); onSigned?.(); }
    catch (e) { toast.error(e.message || "Failed"); }
  };

  const printSummary = () => {
    const s = draft || summary; if (!s) return;
    const w = window.open("", "_blank", "width=800,height=900");
    const meds = Array.isArray(s.dischargeMeds) ? s.dischargeMeds.map((m) => `${m.drug || ""} ${m.dose || ""} ${m.route || ""} ${m.schedule || ""}`).join("<br>") : "";
    w.document.write(`<html><head><title>Discharge Summary</title>
      <style>body{font-family:Arial,sans-serif;padding:32px;color:#111;line-height:1.5}h1{font-size:20px}h2{font-size:14px;margin:16px 0 4px;color:#1e40af}p{margin:2px 0;font-size:13px}</style></head><body>
      <h1>Discharge Summary</h1>
      <h2>Final diagnoses</h2><p>${s.finalDiagnoses || "-"}</p>
      <h2>Procedures</h2><p>${s.proceduresDone || "-"}</p>
      <h2>Hospital course</h2><p>${(s.hospitalCourse || "-").replace(/\n/g, "<br>")}</p>
      <h2>Discharge medications (TTOs)</h2><p>${meds || "-"}</p>
      <h2>Follow-up plan</h2><p>${s.followUpPlan || "-"}</p>
      <h2>Discharge type</h2><p>${s.dischargeType || "-"}</p>
      <hr><p style="font-size:11px;color:#666">Computer-generated discharge summary — CDC HMS V3</p>
      </body></html>`);
    w.document.close(); w.focus(); w.print();
  };

  if (!isDoctor) return <p className="text-gray-500 text-sm">Discharge summary is authored by the doctor.</p>;

  return (
    <div className="space-y-3">
      {summary?.status === "signed" && (
        <div className="flex items-center justify-between bg-green-50 border border-green-300 text-green-800 rounded-lg p-2 text-sm">
          <span>Signed by Dr. {summary.signedByUser?.firstName} {summary.signedByUser?.lastName} — discharge enabled.</span>
          <button onClick={printSummary} className="underline">Print</button>
        </div>
      )}
      {!draft && <button onClick={generate} className={btn}>Generate draft from notes</button>}
      {draft && (
        <div className="space-y-2">
          {[["finalDiagnoses", "Final diagnoses"], ["hospitalCourse", "Hospital course"], ["proceduresDone", "Procedures"], ["followUpPlan", "Follow-up plan"]].map(([k, label]) => (
            <div key={k}>
              <label className="text-xs text-gray-500">{label}</label>
              <textarea className={inp} rows={k === "hospitalCourse" ? 4 : 2} value={draft[k] || ""} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} disabled={summary?.status === "signed"} />
            </div>
          ))}
          <div className="flex gap-2">
            <select className={inp + " max-w-xs"} value={draft.dischargeType || "Routine"} onChange={(e) => setDraft({ ...draft, dischargeType: e.target.value })} disabled={summary?.status === "signed"}>
              {["Routine", "AgainstAdvice", "Referred", "Deceased", "Absconded"].map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          {summary?.status !== "signed" && (
            <div className="flex gap-2">
              <button onClick={save} className="px-3 py-1.5 rounded text-sm border border-gray-300 hover:bg-blue-50">Save draft</button>
              <button onClick={sign} className={btn}>Sign</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
