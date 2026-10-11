import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, RotateCcw } from 'lucide-react';
import Modal from '../shared/Modal';
import { arrangeTools, prefsFromTools, EMPTY_TOOL_PREFS } from '../../constants/consultationTools';

/**
 * ConsultationLayoutModal — "Customise my consultation" (10 Oct 2026, plan
 * M1–M9; replaces D16's "Choose my tools"). Each doctor chooses which modules
 * of Today's Consultation they see, in what order, and which open expanded.
 * Saved to their account, so it follows them to any computer.
 *
 * Works on a copy: nothing changes on the screen until "Save my layout".
 * Orders can move but never hide (M3). "Reset to clinic default" puts back
 * the default order and openings (M7/M8).
 *
 * Props: isOpen, onClose, tools (arrangeTools(prefs, modules)), prefs,
 *        modules (clinic switches), onSave(nextPrefs) → Promise
 */
const ConsultationLayoutModal = ({ isOpen, onClose, tools, prefs, modules, onSave }) => {
  const [rows, setRows] = useState(tools);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (isOpen) setRows(tools); }, [isOpen, tools]);

  const move = (i, dir) => setRows((r) => {
    const j = i + dir;
    if (j < 0 || j >= r.length) return r;
    const next = [...r];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const patch = (id, change) => setRows((r) => r.map((t) => (t.id === id ? { ...t, ...change } : t)));
  const reset = () => setRows(arrangeTools(EMPTY_TOOL_PREFS, modules));

  const save = async () => {
    setSaving(true);
    try { await onSave(prefsFromTools(rows, prefs)); onClose(); } finally { setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customise my consultation" size="lg">
      <p className="m-0 mb-3 text-sm text-gray-600">
        Choose what you see, in what order, and what opens by itself. Saved to your account — it follows you to any computer.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="ui-thead">
            <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500">
              <th className="py-1.5 pr-2 font-semibold">Order</th>
              <th className="py-1.5 pr-2 font-semibold">Module</th>
              <th className="py-1.5 pr-2 font-semibold">Show</th>
              <th className="py-1.5 font-semibold">Opens expanded</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t, i) => (
              <tr key={t.id} className={`border-t border-gray-200 ${t.hidden ? 'bg-gray-50' : ''}`}>
                <td className="py-2 pr-2">
                  <span className="inline-flex gap-1">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${t.label} up`} className="rounded border border-gray-300 p-1.5 hover:bg-gray-50 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={`Move ${t.label} down`} className="rounded border border-gray-300 p-1.5 hover:bg-gray-50 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                  </span>
                </td>
                <td className="py-2 pr-2">
                  <span className={`block font-semibold ${t.hidden ? 'text-gray-500' : 'text-gray-800'}`}>{t.label}</span>
                  <span className="block text-xs text-gray-500">{t.note}</span>
                </td>
                <td className="py-2 pr-2">
                  {t.neverHidden
                    ? <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600">Always</span>
                    : (
                      <label className="inline-flex items-center gap-1.5">
                        <input type="checkbox" checked={!t.hidden} onChange={(e) => patch(t.id, { hidden: !e.target.checked, ...(e.target.checked ? {} : { alwaysOpen: false }) })}
                          className="h-4 w-4 accent-primary" aria-label={`Show ${t.label}`} />
                        Show
                      </label>
                    )}
                </td>
                <td className="py-2">
                  <label className={`inline-flex items-center gap-1.5 ${t.hidden ? 'opacity-50' : ''}`}>
                    <input type="checkbox" checked={!!t.alwaysOpen && !t.hidden} disabled={t.hidden} onChange={(e) => patch(t.id, { alwaysOpen: e.target.checked })}
                      className="h-4 w-4 accent-primary" aria-label={`${t.label} opens expanded`} />
                    Expanded
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="m-0 mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
        Specialist modules (Skin record, Histology) appear only where the clinic has switched them on. A hidden module still shows on a visit
        when it already has today's entry or an unsaved draft. Completing a consultation needs an active diagnosis in Diagnosis &amp; differentials.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <RotateCcw className="h-4 w-4" /> Reset to clinic default
        </button>
        <button type="button" onClick={onClose} className="ml-auto rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {saving ? 'Saving…' : 'Save my layout'}
        </button>
      </div>
    </Modal>
  );
};

export default ConsultationLayoutModal;
