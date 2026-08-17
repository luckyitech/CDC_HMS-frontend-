import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import Card from "../shared/Card";
import Button from "../shared/Button";
import Input from "../shared/Input";
import VitalsGrid from "../shared/VitalsGrid";
import { getBpColor, getTemperatureColor, getO2Color, getRbsColor, getHba1cColor, getKetonesColor } from "../../utils/clinicalColors";
import patientService from "../../services/patientService";
import { usePatientContext } from "../../contexts/PatientContext";
import { useQueueContext } from "../../contexts/QueueContext";
import api from "../../services/api";

// "Last: <value> (<date>)" line shown under vitals and calculated values
const LastVisitNote = ({ value, className = "" }) =>
  value ? <p className={`text-xs text-gray-400 mb-2 ${className}`}>Last: {value}</p> : null;

const buildLastReadings = (history) => {
  const readings = {};
  history.forEach((record) => {
    Object.entries(record).forEach(([key, value]) => {
      if (key === "recordedAt" || value === null || value === undefined) return;
      if (!readings[key]) readings[key] = { value, recordedAt: record.recordedAt };
    });
  });
  return readings;
};

const lastRatioReading = (readings) => {
  if (!readings) return null;
  if (readings.waistHeightRatio) return readings.waistHeightRatio;
  const waist = parseFloat(readings.waistCircumference?.value);
  const height = parseFloat(readings.height?.value);
  if (!Number.isFinite(waist) || !Number.isFinite(height) || height <= 0) return null;
  return { value: (waist / height).toFixed(2), recordedAt: readings.waistCircumference.recordedAt };
};

const formatLastReading = (reading, unit = "") => {
  if (!reading) return null;
  const date = reading.recordedAt
    ? ` (${new Date(reading.recordedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })})`
    : "";
  return `${reading.value}${unit ? ` ${unit}` : ""}${date}`;
};

const VitalField = ({ label, field, vitals, setVitals, placeholder, lastValue, type = "number", step, statusFn }) => {
  const value = vitals[field];
  const status = value && statusFn ? statusFn(value) : null;
  const handleChange = (e) => {
    const v = e.target.value;
    if (type === "text" || v === "" || parseFloat(v) >= 0) setVitals({ ...vitals, [field]: v });
  };
  return (
    <div>
      <Input label={label} type={type} min={type === "number" ? "0" : undefined} step={step} value={value} onChange={handleChange} placeholder={placeholder} />
      {status && <p className={`text-xs font-semibold -mt-4 mb-2 ${status.text}`}>{status.label}</p>}
      <LastVisitNote value={lastValue} className={status ? "" : "-mt-2"} />
    </div>
  );
};

const getWaistRatioStatus = (ratio) => {
  const r = parseFloat(ratio);
  if (r < 0.5) return { text: "Healthy", color: "text-green-700" };
  if (r < 0.6) return { text: "Increased Risk", color: "text-yellow-700" };
  return { text: "High Risk", color: "text-red-700" };
};

const EMPTY_VITALS = {
  bloodPressure: "", heartRate: "", temperature: "", weight: "", height: "",
  oxygenSaturation: "", rbs: "", hba1c: "", ketones: "", waistCircumference: "",
};

/**
 * TriagePanel — vitals only. Recording the patient's vitals is the one job of
 * triage; deciding what happens next (send to doctor, record use, send to
 * billing) is decoupled into the Nursing tab's Actions menu. Saving vitals here
 * is what unlocks the other nursing tools (they read this visit's vitals).
 *
 * Props:
 *   patient    resolved patient object
 *   queueItem  the patient's active queue entry. Opening the vitals entry form
 *              for an 'Awaiting Triage' patient moves it to 'In Triage' — that
 *              transition is where the server stamps triageStartTime/triagedBy.
 *              Saving vitals is what stamps triageEndTime (server side).
 *   onSaved    called after vitals are saved, so the host refetches the patient
 */
const TriagePanel = ({ patient, queueItem, onSaved = () => {} }) => {
  const { updatePatientVitals } = usePatientContext();
  const { updateQueueStatus } = useQueueContext();

  const [vitals, setVitals] = useState(EMPTY_VITALS);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [allergies, setAllergies] = useState("");
  const [lastReadings, setLastReadings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [entryMode, setEntryMode] = useState(false); // "Log second triage" opens a fresh form

  const uhid = patient?.uhid;
  const queueItemId = queueItem?.id;

  useEffect(() => {
    if (!uhid) return;
    let live = true;
    (async () => {
      let readings = {};
      try {
        const res = await patientService.getVitalsHistory(uhid);
        if (res.success && Array.isArray(res.data)) readings = buildLastReadings(res.data);
      } catch { /* hints stay empty */ }
      if (!live) return;
      setLastReadings(readings);

      const lastHeight = parseFloat(readings.height?.value);
      const previousHeight = Number.isFinite(lastHeight) ? String(lastHeight) : "";

      const draft = uhid ? localStorage.getItem(`triage_draft_${uhid}`) : null;
      if (draft) {
        try {
          const d = JSON.parse(draft);
          setVitals({ ...EMPTY_VITALS, ...d.vitals, height: d.vitals?.height || previousHeight });
          setChiefComplaint(d.chiefComplaint || queueItem?.reason || "");
          setAllergies(d.allergies || "");
          return;
        } catch { /* fall through to fresh */ }
      }
      setVitals({ ...EMPTY_VITALS, height: previousHeight });
      setChiefComplaint(queueItem?.reason || "");
      setAllergies("");
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uhid, queueItemId]);

  // Draft autosave
  useEffect(() => {
    if (!uhid) return;
    localStorage.setItem(`triage_draft_${uhid}`, JSON.stringify({ vitals, chiefComplaint, allergies, timestamp: new Date().toISOString() }));
  }, [vitals, chiefComplaint, allergies, uhid]);

  // Once triaged today, the recorded vitals stay on screen for the rest of the day
  // instead of a blank form. A repeat is deliberate: "Log second triage" opens a
  // fresh form and each save writes a new vitals row, so both readings are kept.
  const recAt = patient?.vitals?.recordedAt;
  const triagedToday = !!recAt && new Date(recAt).toDateString() === new Date().toDateString();
  const entryFormOpen = !!patient && (!triagedToday || entryMode);

  // Triage starts when the nurse opens the vitals form: move an 'Awaiting Triage'
  // row to 'In Triage', where the server stamps triageStartTime + triagedBy (from
  // the JWT). Only that status — 'Pending Injection' is left alone so injection
  // visits stay countable, and anything past triage is not ours to touch. Once
  // per queue row: the ref stops a second PUT before the status has come back
  // (StrictMode's double effect in dev, or a re-render racing the response).
  const queueStatus = queueItem?.status;
  const triageStartedFor = useRef(null);
  useEffect(() => {
    if (!entryFormOpen || !queueItemId || queueStatus !== "Awaiting Triage") return;
    if (triageStartedFor.current === queueItemId) return;
    triageStartedFor.current = queueItemId;
    updateQueueStatus(queueItemId, "In Triage");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryFormOpen, queueItemId, queueStatus]);

  const bmi = (vitals.weight && vitals.height)
    ? (parseFloat(vitals.weight) / ((parseFloat(vitals.height) / 100) ** 2)).toFixed(1) : "";
  const waistHeightRatio = (vitals.waistCircumference && vitals.height)
    ? (parseFloat(vitals.waistCircumference) / parseFloat(vitals.height)).toFixed(2) : "";

  const last = (field, unit) => formatLastReading(lastReadings?.[field], unit);
  const lastRatio = lastRatioReading(lastReadings);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!vitals.bloodPressure.trim()) { toast.error("Please enter blood pressure"); return; }
    if (!vitals.heartRate) { toast.error("Please enter heart rate"); return; }
    if (!vitals.temperature) { toast.error("Please enter temperature"); return; }

    setSaving(true);
    const triageData = {
      bp: vitals.bloodPressure,
      heartRate: parseInt(vitals.heartRate),
      temperature: parseFloat(vitals.temperature),
      weight: parseFloat(vitals.weight),
      height: parseFloat(vitals.height),
      oxygenSaturation: vitals.oxygenSaturation ? parseInt(vitals.oxygenSaturation) : null,
      waistCircumference: vitals.waistCircumference ? parseFloat(vitals.waistCircumference) : null,
      rbs: vitals.rbs ? parseFloat(vitals.rbs) : null,
      hba1c: vitals.hba1c ? parseFloat(vitals.hba1c) : null,
      ketones: vitals.ketones ? parseFloat(vitals.ketones) : null,
      chiefComplaint,
    };
    const result = await updatePatientVitals(uhid, triageData);
    if (allergies.trim()) {
      try { await api.put(`/patients/${uhid}`, { allergies: allergies.trim() }); } catch { /* non-fatal */ }
    }
    setSaving(false);

    if (result?.success !== false) {
      toast.success(`Vitals saved for ${patient.name}`);
      localStorage.removeItem(`triage_draft_${uhid}`);
      setEntryMode(false);
      onSaved();
    } else {
      toast.error(result?.message || "Failed to save vitals");
    }
  };

  if (!patient) return null;

  if (!entryFormOpen) {
    const startSecondTriage = () => {
      setVitals({ ...EMPTY_VITALS, height: String(patient.vitals?.height || "").replace(/[^\d.]/g, "") });
      setChiefComplaint("");
      setAllergies("");
      setEntryMode(true);
    };
    return (
      <Card title="Triage — vitals">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              Recorded today
              {recAt ? ` at ${new Date(recAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}
              {patient.vitals?.recordedBy ? ` by ${patient.vitals.recordedBy}` : ""}.
            </p>
            <Button variant="outline" onClick={startSecondTriage}>Log second triage</Button>
          </div>
          <VitalsGrid vitals={patient.vitals} patient={patient} />
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSave}
      onKeyDown={(e) => { if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") e.preventDefault(); }}>
      <Card title="Triage — vitals">
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-800 mb-4">Vital Signs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <VitalField label="Blood Pressure *" field="bloodPressure" type="text" placeholder="120/80 mmHg" statusFn={getBpColor} lastValue={last("bp")} vitals={vitals} setVitals={setVitals} />
              <VitalField label="Heart Rate *" field="heartRate" placeholder="bpm" lastValue={last("heartRate")} vitals={vitals} setVitals={setVitals} />
              <VitalField label="Temperature *" field="temperature" step="0.1" placeholder="°C" statusFn={getTemperatureColor} lastValue={last("temperature")} vitals={vitals} setVitals={setVitals} />
              <VitalField label="Oxygen Saturation" field="oxygenSaturation" placeholder="%" statusFn={getO2Color} lastValue={last("oxygenSaturation")} vitals={vitals} setVitals={setVitals} />
              <VitalField label="Weight" field="weight" step="0.1" placeholder="kg" lastValue={last("weight")} vitals={vitals} setVitals={setVitals} />
              <VitalField label="Height" field="height" placeholder="cm" lastValue={last("height")} vitals={vitals} setVitals={setVitals} />

              {(bmi || lastReadings?.bmi) && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">BMI (Calculated)</label>
                  {bmi ? (
                    <div className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg">
                      <span className="text-lg font-bold text-gray-800">{bmi} kg/m²</span>
                    </div>
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-sm text-gray-400 italic">Enter weight &amp; height</div>
                  )}
                  <LastVisitNote value={last("bmi", "kg/m²")} className="mt-1" />
                </div>
              )}

              <VitalField label="Waist Circumference" field="waistCircumference" step="0.1" placeholder="cm" lastValue={last("waistCircumference")} vitals={vitals} setVitals={setVitals} />

              {(waistHeightRatio || lastRatio) && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Waist-to-Height Ratio</label>
                  {waistHeightRatio ? (
                    <div className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg">
                      <span className={`text-lg font-bold ${getWaistRatioStatus(waistHeightRatio).color}`}>{waistHeightRatio}</span>
                      <span className="text-xs text-gray-600 ml-2">({getWaistRatioStatus(waistHeightRatio).text})</span>
                    </div>
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-sm text-gray-400 italic">Enter waist &amp; height</div>
                  )}
                  <LastVisitNote value={formatLastReading(lastRatio)} className="mt-1" />
                </div>
              )}

              <VitalField label="RBS (Random Blood Sugar)" field="rbs" step="0.1" placeholder="mmol/L" statusFn={getRbsColor} lastValue={last("rbs")} vitals={vitals} setVitals={setVitals} />
              <VitalField label="HbA1c" field="hba1c" step="0.1" placeholder="%" statusFn={getHba1cColor} lastValue={last("hba1c")} vitals={vitals} setVitals={setVitals} />
              <VitalField label="Ketones" field="ketones" step="0.1" placeholder="mmol/L" statusFn={getKetonesColor} lastValue={last("ketones")} vitals={vitals} setVitals={setVitals} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for visit</label>
            <textarea value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} placeholder="Patient's main reason for visit..." rows="2"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Known Allergies</label>
            <textarea value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Medications, food, environmental — or 'None'" rows="2"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary" />
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                {saving ? "Saving…" : entryMode ? "Save second triage" : "Save vitals"}
              </Button>
              {entryMode && (
                <Button type="button" variant="outline" onClick={() => setEntryMode(false)}>Cancel</Button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Saving unlocks the nursing tools. Use the Actions menu to send to doctor or billing.
            </p>
          </div>
        </div>
      </Card>
    </form>
  );
};

export default TriagePanel;
