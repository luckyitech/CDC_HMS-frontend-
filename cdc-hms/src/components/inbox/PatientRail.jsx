import { useState } from 'react';
import { CalendarPlus, AlertTriangle, BellPlus, Pin, PinOff, Link2, Unlink, FlaskConical, X } from 'lucide-react';
import PatientSearchInput from '../shared/PatientSearchInput';
import { windowLabel, suggestTopics } from './inboxHelpers';

// The context rail beside a thread: who the far end is, and the actions on the
// thread. A patient thread that is not yet linked offers the auto-suggested
// candidates and a search to link (merge-aware server side). A lab/organisation
// thread shows the organisation instead.
const PatientRail = ({ conversation, candidates = [], lastInboundText, onLink, onUnlink, onSetContactType, onSetTopic, onPin, onUnpin, onBook, onEscalate, onReminder, canWrite }) => {
  const [linking, setLinking] = useState(false);
  const c = conversation;
  const isPatient = c.contactType === 'patient';
  const topicSuggestions = suggestTopics(lastInboundText);

  return (
    <div className="flex h-full flex-col overflow-y-auto border-l bg-gray-50 p-3 text-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{windowLabel(c)}</div>

      {/* Contact card */}
      <div className="mt-2 rounded-lg border bg-white p-3">
        {isPatient && c.patient ? (
          <>
            <div className="font-semibold text-gray-800">{c.patient.firstName} {c.patient.lastName}</div>
            <div className="text-xs text-gray-500">{c.patient.uhid} · {c.displayNumber}</div>
            {c.patient.whatsappOptIn === false && <div className="mt-1 text-[11px] text-amber-600">Not opted in to WhatsApp</div>}
            {canWrite && <button type="button" onClick={onUnlink} className="mt-2 inline-flex items-center gap-1 text-xs text-red-500 hover:underline"><Unlink size={12} /> Unlink</button>}
          </>
        ) : isPatient ? (
          <>
            <div className="font-semibold text-gray-800">{c.profileName || c.displayNumber}</div>
            <div className="text-xs text-gray-500">{c.displayNumber} · not linked</div>
            {candidates.length > 0 && (
              <div className="mt-2">
                <div className="text-[11px] text-gray-500">Possible matches:</div>
                {candidates.map((p) => (
                  <button key={p.id} type="button" disabled={!canWrite} onClick={() => onLink(p.uhid, true)} className="mt-1 flex w-full items-center justify-between rounded border px-2 py-1 text-xs hover:bg-emerald-50">
                    <span>{p.firstName} {p.lastName} · {p.uhid}</span><Link2 size={12} />
                  </button>
                ))}
              </div>
            )}
            {canWrite && (
              linking ? (
                <div className="mt-2">
                  <PatientSearchInput onSelect={(p) => { onLink(p.uhid, true); setLinking(false); }} placeholder="Search patient to link…" />
                  <button type="button" onClick={() => setLinking(false)} className="mt-1 text-[11px] text-gray-400">Cancel</button>
                </div>
              ) : (
                <button type="button" onClick={() => setLinking(true)} className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"><Link2 size={12} /> Link to a patient</button>
              )
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-1 font-semibold text-purple-700"><FlaskConical size={15} /> {c.organisation?.name || 'Lab / Organisation'}</div>
            <div className="text-xs text-gray-500">{c.displayNumber}</div>
          </>
        )}
        {canWrite && (
          <div className="mt-2 flex gap-2">
            <select value={c.contactType} onChange={(e) => onSetContactType({ contactType: e.target.value })} className="rounded border-gray-300 text-[11px]">
              <option value="patient">Patient</option>
              <option value="lab">Lab</option>
              <option value="organisation">Organisation</option>
            </select>
          </div>
        )}
      </div>

      {/* Topic */}
      <div className="mt-3">
        <div className="text-xs font-semibold text-gray-500">Topic</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {c.topic && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{c.topic} {canWrite && <button type="button" onClick={() => onSetTopic('')} className="ml-0.5"><X size={10} className="inline" /></button>}</span>}
          {canWrite && !c.topic && topicSuggestions.map((t) => (
            <button key={t} type="button" onClick={() => onSetTopic(t)} className="rounded-full border border-dashed border-blue-300 px-2 py-0.5 text-xs text-blue-500 hover:bg-blue-50">+ {t}</button>
          ))}
        </div>
      </div>

      {/* Actions */}
      {canWrite && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {isPatient && c.patient && <button type="button" onClick={onBook} className="inline-flex items-center justify-center gap-1 rounded-lg border bg-white px-2 py-2 text-xs hover:bg-gray-50"><CalendarPlus size={14} /> Book</button>}
          <button type="button" onClick={onEscalate} className="inline-flex items-center justify-center gap-1 rounded-lg border bg-white px-2 py-2 text-xs hover:bg-gray-50"><AlertTriangle size={14} /> Escalate</button>
          <button type="button" onClick={onReminder} className="inline-flex items-center justify-center gap-1 rounded-lg border bg-white px-2 py-2 text-xs hover:bg-gray-50"><BellPlus size={14} /> Remind</button>
          <button type="button" onClick={c.pinned ? onUnpin : onPin} className="inline-flex items-center justify-center gap-1 rounded-lg border bg-white px-2 py-2 text-xs hover:bg-gray-50">{c.pinned ? <><PinOff size={14} /> Unpin</> : <><Pin size={14} /> Pin</>}</button>
        </div>
      )}
    </div>
  );
};

export default PatientRail;
