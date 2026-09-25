import { AlertTriangle, X, ArrowRight, UserPlus, Phone, Calendar, IdCard, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Shown when registration returns 409 POSSIBLE_DUPLICATE. Lists the existing
// file(s) the new entry looks like, so staff can OPEN the existing file instead
// of minting a duplicate — or, if it genuinely is a different person (e.g. a
// family sharing one phone number), create anyway.
//
// Props:
//   candidates  — [{ uhid, name, dateOfBirth, phone, registeredBy, score, tier, reasons[] }]
//   onCreateAnyway — called when staff confirm this is a new person (caller resubmits with force:true)
//   onClose     — dismiss without creating
//   onOpenExisting — optional; defaults to navigating to the patient file
const tierLabel = { certain: 'Almost certainly the same person', probable: 'Possible match' };
const tierCls = {
  certain:  'bg-red-50 border-red-200',
  probable: 'bg-amber-50 border-amber-200',
};

const fmtDob = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return String(d).slice(0, 10); }
};

const DuplicateWarningModal = ({ candidates = [], onCreateAnyway, onClose, onOpenExisting }) => {
  const navigate = useNavigate();

  const openFile = (candidate) => {
    if (onOpenExisting) return onOpenExisting(candidate);
    navigate(`/staff/patients?search=${encodeURIComponent(candidate.uhid)}`);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-6">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Possible existing file</h2>
              <p className="text-sm text-gray-500">
                {candidates.length === 1
                  ? 'A patient file already looks like this one.'
                  : `${candidates.length} patient files already look like this one.`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {/* Candidates */}
        <div className="p-6 space-y-3 max-h-[50vh] overflow-y-auto">
          {candidates.map((c) => (
            <button
              key={c.uhid}
              onClick={() => openFile(c)}
              className={`w-full text-left border rounded-lg p-3 hover:shadow-sm transition ${tierCls[c.tier] || 'bg-gray-50 border-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">{c.name}</span>
                <span className="text-xs font-medium text-gray-500">{c.uhid}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {fmtDob(c.dateOfBirth)}</span>
                {c.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>}
                {c.registeredBy && <span className="inline-flex items-center gap-1"><IdCard className="w-3 h-3" /> {c.registeredBy}</span>}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700">
                  {c.tier === 'certain' && <ShieldCheck className="w-3 h-3 text-red-500" />}
                  {tierLabel[c.tier] || 'Match'}
                  {c.reasons?.length ? ` · ${c.reasons.join(', ')}` : ''}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  Open file <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-gray-500">
            If this is a different person (e.g. a family sharing one phone), you can still create a new file.
          </p>
          <div className="flex gap-2 shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">
              Cancel
            </button>
            <button
              onClick={onCreateAnyway}
              className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" /> Create new anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DuplicateWarningModal;
