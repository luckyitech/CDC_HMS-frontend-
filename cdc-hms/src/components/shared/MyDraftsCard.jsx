import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenLine, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import draftService from '../../services/draftService';
import { useUserContext } from '../../contexts/UserContext';
import { draftLabel } from '../../constants/draftForms';
import { draftTime, daysLeft } from '../../utils/draftFormat';
import ConfirmActionModal from './ConfirmActionModal';

// Where each portal opens a patient file.
const PROFILE_BASE = { doctor: '/doctor', staff: '/staff', admin: '/admin', nurse: '/nurse' };

/**
 * "My drafts" — every unsaved draft of mine across all patients, newest first.
 * Shown on the dashboard only when there is at least one. Only ever mine (the
 * server scopes the list). Deleted after 14 days untouched; the last two days
 * are flagged.
 */
const MyDraftsCard = () => {
  const navigate = useNavigate();
  const { currentUser } = useUserContext();
  const [drafts, setDrafts] = useState([]);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(null); // the draft about to be discarded

  const load = useCallback(async () => {
    try {
      const res = await draftService.listMine();
      setDrafts(Array.isArray(res?.data) ? res.data : []);
    } catch { setDrafts([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!drafts.length) return null;

  const base = PROFILE_BASE[currentUser?.role] || '/doctor';
  const go = (d) => {
    const ctx = String(d.contextKey || '');
    if (ctx.startsWith('adm-')) navigate(`/inpatient/admission/${ctx.slice(4)}`);
    else if (d.patient?.uhid) navigate(`${base}/patient-profile/${d.patient.uhid}`);
  };
  const discard = async (d) => {
    setConfirming(null);
    try { await draftService.removeById(d.id); } catch { /* list reloads */ }
    load();
  };

  return (
    <section className="mb-6 bg-white border-2 border-orange-300 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex flex-wrap items-center gap-3 px-4 py-3 bg-orange-50 text-left"
        aria-expanded={open}
      >
        <PenLine className="w-5 h-5 text-orange-700" aria-hidden="true" />
        <span className="font-bold text-orange-900">My drafts</span>
        <span className="px-2 py-0.5 rounded-full bg-orange-600 text-white text-xs font-bold">{drafts.length}</span>
        <span className="text-sm text-orange-800">not yet in any record · only you see these · deleted after 14 days</span>
        <span className="ml-auto text-orange-700">{open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
      </button>
      {open && (
        <ul className="divide-y divide-gray-100">
          {drafts.map((d) => {
            const left = daysLeft(d.updatedAt);
            return (
              <li key={d.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${left !== null && left <= 2 ? 'bg-amber-50' : ''}`}>
                <button type="button" onClick={() => go(d)} className="flex-1 min-w-[14rem] text-left">
                  <span className="block font-semibold text-gray-800">{d.patient?.name || 'Patient'} · {d.patient?.uhid}</span>
                  <span className="block text-sm text-gray-600">{d.label || draftLabel(d.formKey)}</span>
                </button>
                {left !== null && left <= 2 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                    Deleted in {left} day{left === 1 ? '' : 's'}
                  </span>
                )}
                <span className="text-sm text-gray-500">{draftTime(d.updatedAt)}</span>
                <button type="button" onClick={() => go(d)} className="text-sm font-semibold text-primary hover:underline">Open ›</button>
                <button type="button" onClick={() => setConfirming(d)} aria-label={`Discard ${d.label || 'draft'}`} className="p-2 rounded-lg text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmActionModal
        isOpen={!!confirming}
        onClose={() => setConfirming(null)}
        onConfirm={() => discard(confirming)}
        title="Discard this draft?"
        message={confirming ? `Your unsaved ${confirming.label || draftLabel(confirming.formKey)} for ${confirming.patient?.name || 'this patient'} will be deleted. It was never part of the record.` : ''}
        confirmLabel="Discard draft"
        confirmVariant="danger"
      />
    </section>
  );
};

export default MyDraftsCard;
