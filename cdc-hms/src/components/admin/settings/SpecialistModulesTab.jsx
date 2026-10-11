import { useEffect, useState } from 'react';
import Card from '../../shared/Card';
import Spinner from '../../shared/Spinner';
import Toggle from '../../shared/Toggle';
import settingsService from '../../../services/settingsService';
import { refreshClinicModules } from '../../../hooks/useClinicModules';
import { notify } from '../../../utils/notify';
import DermProcedureListEditor from './DermProcedureListEditor';

/**
 * System Settings → Specialist modules (7 Oct 2026). Each module (Dermatology,
 * Histology / cytology) ships with the HMS but stays off until switched on here. While off,
 * nothing of it shows anywhere and its API answers "not found". Switching off
 * never deletes what was recorded. Every change is logged in the Activity Log.
 */
const SpecialistModulesTab = () => {
  const [state, setState] = useState(null);   // { modules, list }
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    let alive = true;
    settingsService.getModules()
      .then((res) => { if (alive) setState(res.data); })
      .catch((err) => { if (alive) { setState({ modules: {}, list: [] }); notify('error', err?.message || 'Could not load modules'); } });
    return () => { alive = false; };
  }, []);

  const flip = async (key, on) => {
    setBusy(key);
    try {
      const res = await settingsService.setModules({ [key]: on });
      setState(res.data);
      await refreshClinicModules();
      notify('success', `${res.data.list.find((m) => m.key === key)?.label || key} switched ${on ? 'on' : 'off'}`);
    } catch (err) {
      if (!err?.isPermissionDenied) notify('error', err?.message || 'Could not change the module');
    } finally {
      setBusy(null);
    }
  };

  if (!state) return <div className="py-10 flex justify-center"><Spinner /></div>;

  return (
    <Card>
      <h2 className="text-lg font-semibold text-gray-800">Specialist modules</h2>
      <p className="mt-1 mb-4 max-w-2xl text-sm text-gray-600">
        Extra clinical modules for clinics that need them. A module that is off does not appear anywhere in
        the system. Switching one off later keeps everything already recorded; switching it back on brings it back.
      </p>
      <div className="divide-y divide-gray-100 border-t border-gray-100">
        {state.list.map((m) => {
          const on = !!state.modules[m.key];
          return (
            <div key={m.key} className="flex items-center gap-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-800">{m.label}</p>
                <p className="text-sm text-gray-500">{m.description}</p>
                <p className={`mt-0.5 text-xs ${on ? 'text-green-700' : 'text-gray-500'}`}>{on ? 'On for this clinic' : 'Off'}</p>
              </div>
              <Toggle checked={on} disabled={busy === m.key} onChange={(v) => flip(m.key, v)} label={m.label} />
            </div>
          );
        })}
      </div>
      {state.modules.dermatology && <div className="mt-4"><DermProcedureListEditor /></div>}
      <p className="mt-3 text-xs text-gray-500">Every change is recorded in the Activity Log with who made it.</p>
    </Card>
  );
};

export default SpecialistModulesTab;
