import PrintLetterhead from '../../shared/PrintLetterhead';
import ThyroidReportBody from './ThyroidReportBody';

/**
 * Full-page preview shown before committing a thyroid US report. The clinician
 * reviews the report exactly as it will be saved to the medical record, then
 * signs. Signing freezes a snapshot and locks the report. When there are
 * outstanding items, an explicit discretion tick is required to enable signing.
 */
export default function ThyroidSignPreview({ report, nodules = [], patient, errors = [], signDespite, onToggleDespite, signing, onSign, onClose }) {
  const blocked = errors.length > 0 && !signDespite;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col">
        <div className="bg-white border-b-2 border-gray-200 p-4 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Preview &amp; sign</h3>
            <p className="text-xs text-gray-500">Review the report as it will be saved to the medical record. Signing freezes this snapshot and locks the report.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-2xl leading-none px-2" aria-label="Close">×</button>
        </div>

        <div className="overflow-y-auto p-6 bg-gray-100">
          <div className="bg-white shadow mx-auto max-w-3xl p-8">
            <PrintLetterhead show />
            <ThyroidReportBody report={report} nodules={nodules} patient={patient} />
          </div>
        </div>

        <div className="border-t-2 border-gray-200 p-4 flex items-center gap-3 flex-wrap shrink-0 bg-white">
          {errors.length > 0 ? (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={signDespite} onChange={(e) => onToggleDespite(e.target.checked)} />
              Sign despite {errors.length} outstanding item{errors.length > 1 ? 's' : ''} (my discretion)
            </label>
          ) : (
            <span className="text-sm text-emerald-600 font-medium">✓ Ready to sign</span>
          )}
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold text-sm">Cancel</button>
            <button onClick={onSign} disabled={signing || blocked}
              className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm">
              {signing ? 'Signing…' : 'Sign & save to medical records'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
