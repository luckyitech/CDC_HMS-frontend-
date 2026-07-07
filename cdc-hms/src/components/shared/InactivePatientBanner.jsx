import { AlertCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserContext } from '../../contexts/UserContext';

/**
 * Shown on a deactivated (merged) patient profile.
 * - Warns staff/doctors that this record is inactive.
 * - Links to the canonical (kept) patient's profile.
 * - Provides admins a one-click reactivate button.
 *
 * Props:
 *   patient      — patient object (must include `mergedIntoUhid`, `uhid`)
 *   profileBase  — URL prefix for the profile route, e.g. "/staff/patients" or "/doctor/patients"
 *   onReactivate — called when the admin clicks Reactivate (async)
 *   reactivating — boolean loading state for the Reactivate button
 */
const InactivePatientBanner = ({ patient, profileBase, onReactivate, reactivating }) => {
  const navigate = useNavigate();
  const { currentUser } = useUserContext();

  if (!patient?.mergedIntoUhid) return null;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-800 text-sm">Inactive Profile — Merged Record</p>
          <p className="text-xs text-red-700 mt-0.5">
            This patient was merged into another record. New entries are blocked. Historical data is read-only.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => navigate(`${profileBase}/${patient.mergedIntoUhid}`)}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-red-300 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-50 transition-colors whitespace-nowrap"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          View Active Profile
        </button>

        {currentUser?.role === 'admin' && onReactivate && (
          <button
            onClick={onReactivate}
            disabled={reactivating}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {reactivating ? 'Reactivating…' : 'Reactivate'}
          </button>
        )}
      </div>
    </div>
  );
};

export default InactivePatientBanner;
