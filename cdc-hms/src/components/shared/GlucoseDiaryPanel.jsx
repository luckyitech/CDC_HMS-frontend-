import { useState } from 'react';
import { Utensils, Activity, Syringe, Pill, AlertCircle, StickyNote, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from './Button';
import { diaryService } from '../../services/diaryService';

// GlucoseDiaryPanel — the patient diary inside the Glucose Management Centre.
//
// The Accu-Chek Instant sends no meal marker, so the diary is the only way a
// reading gets meal context: logging a meal here makes the server tag nearby
// meter readings pre-/post-meal (utils/glucoseMatching.js). Activity, insulin,
// oral-medication, symptom and note entries are shown alongside on the chart
// and here in the list — useful for titration and for spotting what moved a
// number — but are never written onto a reading.
//
// It does not fetch: the summary endpoint already returns the window's diary
// (`events`), and after any add/delete this calls `onChanged` so the whole
// centre reloads (re-matched readings and all). One source of truth.
//
// Props:
//   uhid       patient UHID (own record for a patient; the file's for a clinician)
//   events     [{ id, eventType, at:'YYYY-MM-DD HH:mm:ss', label, detail }]
//   onChanged  () => void — reload the centre after a change
//   canEdit    allow add / delete (default true)
//   isPatient  gentler, first-person copy
//   unit       'mmol' | 'mgdl' (unused for entry; kept for future carb→dose hints)

const TYPES = [
  { id: 'meal',     label: 'Meal',     Icon: Utensils,    color: '#0891b2' },
  { id: 'activity', label: 'Activity', Icon: Activity,     color: '#16a34a' },
  { id: 'insulin',  label: 'Insulin',  Icon: Syringe,      color: '#7c3aed' },
  { id: 'oral_med', label: 'Oral med', Icon: Pill,         color: '#d97706' },
  { id: 'symptom',  label: 'Symptom',  Icon: AlertCircle,  color: '#dc2626' },
  { id: 'note',     label: 'Note',     Icon: StickyNote,   color: '#6b7280' },
];
const TYPE = Object.fromEntries(TYPES.map((t) => [t.id, t]));
const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const pad = (n) => String(n).padStart(2, '0');
const nowInput = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const inputToNaive = (v) => (v ? `${v.replace('T', ' ')}:00` : null);
const fmtTime = (naive) => { const t = naive.split(' ')[1] || ''; return t.slice(0, 5); };
const dayHeading = (naive) => {
  const [y, m, d] = naive.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};
const detailBits = (ev) => {
  const d = ev.detail || {};
  return [
    d.carbs != null ? `${d.carbs} g carbs` : null,
    d.minutes != null ? `${d.minutes} min` : null,
    d.units != null ? `${d.units} units` : null,
    d.drug || null,
    d.severity || null,
  ].filter(Boolean).join(' · ');
};

const GlucoseDiaryPanel = ({ uhid, events = [], onChanged = () => {}, canEdit = true, isPatient = false }) => {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('meal');
  const [label, setLabel] = useState('');
  const [when, setWhen] = useState(nowInput());
  const [carbs, setCarbs] = useState('');
  const [minutes, setMinutes] = useState('');
  const [units, setUnits] = useState('');
  const [severity, setSeverity] = useState('mild');
  const [saving, setSaving] = useState(false);

  const reset = () => { setType('meal'); setLabel(''); setWhen(nowInput()); setCarbs(''); setMinutes(''); setUnits(''); setSeverity('mild'); };

  const buildDetail = () => {
    const d = {};
    if (type === 'meal' && carbs !== '') d.carbs = Number(carbs);
    if (type === 'activity' && minutes !== '') d.minutes = Number(minutes);
    if (type === 'insulin') { if (units !== '') d.units = Number(units); if (label.trim()) d.drug = label.trim(); }
    if (type === 'oral_med' && label.trim()) d.drug = label.trim();
    if (type === 'symptom') d.severity = severity;
    return Object.keys(d).length ? d : null;
  };

  const save = async () => {
    const occurredAt = inputToNaive(when);
    if (!occurredAt) { toast.error('Pick a date and time'); return; }
    // Meals need a label so the pre-/post-meal tag reads well; notes/symptoms too.
    if ((type === 'note' || type === 'symptom' || type === 'meal') && !label.trim()) {
      toast.error(type === 'meal' ? 'Which meal?' : 'Add a short description'); return;
    }
    setSaving(true);
    try {
      await diaryService.create(uhid, { eventType: type, occurredAt, label: label.trim() || null, detail: buildDetail() });
      toast.success('Added to the diary');
      reset(); setOpen(false); onChanged();
    } catch (e) { toast.error(e?.message || 'Could not save the entry'); }
    finally { setSaving(false); }
  };

  const remove = async (ev) => {
    try { await diaryService.remove(uhid, ev.id); toast.success('Removed'); onChanged(); }
    catch (e) { toast.error(e?.message || 'Could not remove'); }
  };

  // group by day, newest first (events arrive newest-first from the summary)
  const byDay = [];
  const seen = new Map();
  for (const ev of events) {
    const day = ev.at.slice(0, 10);
    if (!seen.has(day)) { seen.set(day, []); byDay.push([day, seen.get(day)]); }
    seen.get(day).push(ev);
  }

  const needsLabel = type === 'meal' || type === 'note' || type === 'symptom' || type === 'oral_med' || type === 'activity' || type === 'insulin';
  const labelPlaceholder = {
    meal: 'Which meal?', activity: 'e.g. Walk, Gym', insulin: 'Insulin name (optional)',
    oral_med: 'Medication name', symptom: 'e.g. Shaky, sweaty', note: 'What happened?',
  }[type];

  return (
    <div className="space-y-3">
      {canEdit && (
        <div>
          {!open ? (
            <Button variant="outline" onClick={() => { reset(); setOpen(true); }} className="!px-4 !py-2 text-sm"><Plus className="w-4 h-4" /> Add to diary</Button>
          ) : (
            <div className="p-3 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">{isPatient ? 'New diary entry' : 'Add a diary entry'}</p>
                <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map((tp) => (
                  <button key={tp.id} type="button" onClick={() => setType(tp.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-semibold ${type === tp.id ? 'text-white border-transparent' : 'bg-white border-gray-300 text-gray-700'}`}
                    style={type === tp.id ? { background: tp.color } : undefined}>
                    <tp.Icon className="w-3.5 h-3.5" /> {tp.label}
                  </button>
                ))}
              </div>
              {type === 'meal' && (
                <div className="flex flex-wrap gap-1.5">
                  {MEALS.map((mn) => (
                    <button key={mn} type="button" onClick={() => setLabel(mn)} className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${label === mn ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300 text-gray-600'}`}>{mn}</button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {needsLabel && (
                  <label className="block"><span className="text-xs font-semibold text-gray-600">{type === 'meal' ? 'Meal' : type === 'note' ? 'Note' : 'Description'}</span>
                    <input className="mt-1 w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm" placeholder={labelPlaceholder} value={label} onChange={(e) => setLabel(e.target.value)} /></label>
                )}
                <label className="block"><span className="text-xs font-semibold text-gray-600">When</span>
                  <input type="datetime-local" className="mt-1 w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm" value={when} onChange={(e) => setWhen(e.target.value)} /></label>
                {type === 'meal' && (
                  <label className="block"><span className="text-xs font-semibold text-gray-600">Carbs (g, optional)</span>
                    <input type="number" min="0" className="mt-1 w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm" value={carbs} onChange={(e) => setCarbs(e.target.value)} /></label>
                )}
                {type === 'activity' && (
                  <label className="block"><span className="text-xs font-semibold text-gray-600">Minutes (optional)</span>
                    <input type="number" min="0" className="mt-1 w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></label>
                )}
                {type === 'insulin' && (
                  <label className="block"><span className="text-xs font-semibold text-gray-600">Units (optional)</span>
                    <input type="number" min="0" step="0.5" className="mt-1 w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm" value={units} onChange={(e) => setUnits(e.target.value)} /></label>
                )}
                {type === 'symptom' && (
                  <label className="block"><span className="text-xs font-semibold text-gray-600">Severity</span>
                    <select className="mt-1 w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                      <option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option>
                    </select></label>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={save} disabled={saving} className="!px-4 !py-2 text-sm">{saving ? 'Saving…' : 'Save entry'}</Button>
                <Button variant="outline" onClick={() => setOpen(false)} className="!px-4 !py-2 text-sm">Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {events.length === 0 ? (
        <div className="py-6 text-center text-sm text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          {isPatient ? 'No diary entries yet. Log your meals, activity and doses so your readings can be tagged around them.' : 'No diary entries in this window.'}
        </div>
      ) : (
        <div className="space-y-3">
          {byDay.map(([day, list]) => (
            <div key={day}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{dayHeading(list[0].at)}</p>
              <div className="space-y-1">
                {list.map((ev) => {
                  const meta = TYPE[ev.eventType] || TYPE.note;
                  const bits = detailBits(ev);
                  return (
                    <div key={ev.id} className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-100 bg-white">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0" style={{ background: `${meta.color}1a`, color: meta.color }}><meta.Icon className="w-4 h-4" /></span>
                      <span className="text-xs text-gray-500 w-12 flex-shrink-0 tabular-nums">{fmtTime(ev.at)}</span>
                      <span className="text-sm text-gray-800 flex-1 min-w-0 truncate"><span className="font-semibold">{ev.label || meta.label}</span>{bits && <span className="text-gray-500"> · {bits}</span>}</span>
                      {canEdit && <button type="button" onClick={() => remove(ev)} className="text-gray-300 hover:text-red-500 flex-shrink-0" title="Remove"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GlucoseDiaryPanel;
