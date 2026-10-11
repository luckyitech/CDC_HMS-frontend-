import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Microscope } from 'lucide-react';
import { histologyService } from '../../services/histologyService';
import useClinicModules from '../../hooks/useClinicModules';
import SwitcherTabs from '../shared/SwitcherTabs';

/**
 * "Histology / cytology awaited" (Phase 4, 7 Oct 2026; H7, V7) — results not
 * yet typed, on the Doctor Dashboard. Only while the clinic has the module on
 * and something is waiting. Opens on Mine (requests I made); Whole clinic
 * shows everyone's. Overdue (over 21 days) first. A row opens the patient
 * file, where the result is entered (Diagnostics → Histology / cytology).
 */
const HistologyAwaitedCard = () => {
  const navigate = useNavigate();
  const { modules } = useClinicModules();
  const [scope, setScope] = useState('mine');
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await histologyService.worklist({ mine: scope === 'mine' });
      setData(res?.data || null);
    } catch { setData(null); }
  }, [scope]);
  useEffect(() => { if (modules.histology) load(); }, [modules.histology, load]);

  // Hidden when the module is off, or nothing at all is waiting (even clinic-wide
  // — Mine with nothing but the clinic with some still shows, so the switch works).
  const [clinicCount, setClinicCount] = useState(0);
  useEffect(() => {
    if (!modules.histology) return;
    histologyService.worklist().then((res) => setClinicCount(res?.data?.counts?.awaiting || 0)).catch(() => setClinicCount(0));
  }, [modules.histology]);
  if (!modules.histology || !data || clinicCount === 0) return null;

  const items = data.items || [];
  const overdue = data.counts?.overdue || 0;

  return (
    <section className="mb-6 overflow-hidden rounded-xl border-2 border-amber-300 bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-3 bg-amber-50 px-4 py-3 text-left">
        <Microscope className="h-5 w-5 text-amber-700" aria-hidden="true" />
        <span className="font-bold text-amber-900">Histology / cytology awaited</span>
        <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs font-bold text-white">{items.length}</span>
        {overdue > 0 && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">{overdue} overdue</span>}
        <span className="text-sm text-amber-800">{scope === 'mine' ? 'requested by you' : 'whole clinic'} · overdue after {data.overdueDays} days</span>
        <span className="ml-auto text-amber-700">{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
      </button>
      {open && (
        <div className="px-4 py-3">
          <SwitcherTabs
            className="mb-3"
            active={scope}
            onChange={setScope}
            tabs={[{ id: 'mine', label: 'Mine' }, { id: 'all', label: 'Whole clinic' }]}
          />
          {items.length === 0 ? (
            <p className="py-2 text-sm text-gray-500">Nothing of yours is waiting. Switch to Whole clinic to see the rest.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((i) => (
                <li key={i.id}>
                  <button type="button" onClick={() => i.patient?.uhid && navigate(`/doctor/patient-profile/${i.patient.uhid}`)}
                    className={`flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-1 py-2.5 text-left hover:bg-gray-50 ${i.overdue ? 'bg-red-50/50' : ''}`}>
                    <span className="min-w-[13rem] flex-1">
                      <span className="block font-semibold text-gray-800">{i.patient?.name || 'Patient'} · {i.patient?.uhid}</span>
                      <span className="block text-sm text-gray-600">{i.specimenNumber} · {i.kind === 'cytology' ? 'Cytology' : 'Histology'} · {i.specimenLabel} · {i.site}</span>
                      <span className="block text-xs text-gray-500">Requested {i.visitDate}{scope === 'all' && i.requestedByName ? ` by ${i.requestedByName}` : ''}{i.sendTo ? ` · sent to ${i.sendTo}` : ''}</span>
                    </span>
                    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${i.overdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                      {i.overdue ? `Overdue · ${i.daysWaiting} days` : `${i.daysWaiting} day${i.daysWaiting === 1 ? '' : 's'}`}
                    </span>
                    <span className="text-sm font-semibold text-primary">Open ›</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};

export default HistologyAwaitedCard;
