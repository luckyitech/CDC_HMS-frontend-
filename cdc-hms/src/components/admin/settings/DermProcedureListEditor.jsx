import { useEffect, useState } from 'react';
import { dermService } from '../../../services/dermService';
import settingsService from '../../../services/settingsService';
import { notify } from '../../../utils/notify';

/**
 * The Dermatology procedure list (Phase 3, H8) — the names doctors choose
 * from when they record a procedure on a skin finding. Kept here by the
 * administrator; every change is logged. A procedure already recorded keeps
 * the name it was saved with even if it later leaves this list.
 * Shown inside System Settings → Specialist modules while Dermatology is on.
 */
const DermProcedureListEditor = () => {
  const [names, setNames] = useState(null);
  const [saved, setSaved] = useState([]);
  const [defaults, setDefaults] = useState([]);
  const [adding, setAdding] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    dermService.procedureList()
      .then((res) => { if (!alive) return; setNames(res.data.procedures); setSaved(res.data.procedures); setDefaults(res.data.defaults || []); })
      .catch((err) => { if (alive) { setNames([]); notify('error', err?.message || 'Could not load the procedure list'); } });
    return () => { alive = false; };
  }, []);

  if (names === null) return <p className="text-sm text-gray-500">Loading the procedure list…</p>;

  const dirty = JSON.stringify(names) !== JSON.stringify(saved);
  const add = () => {
    const n = adding.trim().replace(/\s+/g, ' ');
    if (!n) return;
    if (names.some((x) => x.toLowerCase() === n.toLowerCase())) { notify('error', `"${n}" is already on the list`); return; }
    setNames([...names, n]);
    setAdding('');
  };
  const save = async () => {
    setBusy(true);
    try {
      const res = await settingsService.setDermProcedures(names);
      setNames(res.data.procedures); setSaved(res.data.procedures);
      notify('success', 'Procedure list saved');
    } catch (err) {
      if (!err?.isPermissionDenied) notify('error', err?.message || 'Could not save the list');
    } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div>
        <p className="text-sm font-semibold text-gray-800">Dermatology procedures</p>
        <p className="text-xs text-gray-500">The list doctors choose from when recording a procedure on a skin finding. Recorded, not billed.</p>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {names.map((n) => (
          <li key={n} className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white py-0.5 pl-3 pr-1 text-sm">
            {n}
            <button type="button" aria-label={`Remove ${n}`} onClick={() => setNames(names.filter((x) => x !== n))}
              className="rounded-full px-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600">×</button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <input
          aria-label="New procedure"
          value={adding}
          maxLength={120}
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Add a procedure"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button type="button" onClick={add} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm">Add</button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={save} disabled={!dirty || busy || names.length === 0}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save list'}</button>
        {dirty && <button type="button" onClick={() => setNames(saved)} className="text-xs text-gray-500 underline">Undo changes</button>}
        {defaults.length > 0 && <button type="button" onClick={() => setNames(defaults)} className="ml-auto text-xs text-gray-500 underline">Reset to the starter list</button>}
      </div>
    </div>
  );
};

export default DermProcedureListEditor;
