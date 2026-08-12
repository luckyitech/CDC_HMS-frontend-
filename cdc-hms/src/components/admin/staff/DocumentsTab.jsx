import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Loader, Upload, FileText, Download, Trash2, Lock, Eye, ArchiveRestore } from 'lucide-react';
import staffService from '../../../services/staffService';
import { formatDate } from './staffFormat';

const CATEGORIES = [
  'Employment Contract', 'National ID', 'Practising Licence',
  'Academic Certificate', 'CV', 'Training Certificate',
  'Sick Note', 'Appraisal', 'Disciplinary', 'Other',
];

// Categories that should not be visible to the staff member by default. The
// admin can still change it, but the default matters more than the option —
// nobody remembers to set it on every upload.
const ADMIN_ONLY_BY_DEFAULT = new Set(['Employment Contract', 'Appraisal', 'Disciplinary']);

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx';

// Categories that typically lapse — the expiry field is offered for these and
// hidden for the rest, so a CV upload isn't asking for an expiry date.
const EXPIRING_CATEGORIES = new Set([
  'Practising Licence', 'Training Certificate', 'National ID', 'Employment Contract',
]);

const DocumentsTab = ({ staff, isAdmin }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory]   = useState('Other');
  const [expiryDate, setExpiryDate] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const fileInput = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await staffService.getDocuments(staff.employeeId, showArchived);
      setDocuments(res.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [staff.employeeId, showArchived]);

  useEffect(() => { load(); }, [load]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await staffService.uploadDocument(staff.employeeId, file, {
        category,
        expiryDate: expiryDate || undefined,
        visibility: ADMIN_ONLY_BY_DEFAULT.has(category) ? 'Admin only' : 'Staff',
      });
      toast.success('Document uploaded');
      setExpiryDate('');
      load();
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      // Cleared so re-uploading the same file fires a change event again.
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const download = async (doc) => {
    try {
      // The file streams through an authenticated route rather than a public
      // URL, so it arrives as a blob and has to be handed to the browser here.
      const blob = await staffService.downloadDocument(staff.employeeId, doc.id);
      const url  = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || 'Failed to download');
    }
  };

  const toggleVisibility = async (doc) => {
    const next = doc.visibility === 'Staff' ? 'Admin only' : 'Staff';
    try {
      await staffService.updateDocument(staff.employeeId, doc.id, { visibility: next });
      toast.success(next === 'Staff' ? `${staff.name} can now see this` : 'Now admin only');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to update visibility');
    }
  };

  const archive = async (doc) => {
    if (!window.confirm(`Archive "${doc.fileName}"? It will be hidden but not deleted.`)) return;
    // Asked for, not required — "superseded by the 2027 licence" and "uploaded
    // to the wrong person" need different follow-up.
    const reason = window.prompt('Reason (optional)') || null;
    try {
      await staffService.archiveDocument(staff.employeeId, doc.id, reason);
      toast.success('Document archived');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to archive');
    }
  };

  const restore = async (doc) => {
    try {
      await staffService.restoreDocument(staff.employeeId, doc.id);
      toast.success('Document restored');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to restore');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-800">
            {showArchived ? 'Archived files' : 'Files'}
          </h3>
          {isAdmin && (
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="text-xs text-gray-500 hover:text-blue-700 underline"
            >
              {showArchived ? 'Show active' : 'Show archived'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Only offered for categories that actually lapse. */}
          {EXPIRING_CATEGORIES.has(category) && (
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              title="Expiry date (optional)"
              className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs"
            />
          )}

          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            onChange={handleFile}
            className="hidden"
            id="staff-doc-upload"
          />
          <label
            htmlFor="staff-doc-upload"
            className={`flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer ${
              uploading ? 'opacity-60 pointer-events-none' : ''
            }`}
          >
            {uploading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? 'Uploading…' : 'Upload'}
          </label>
        </div>
      </div>

      {documents.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">
          {showArchived
            ? 'Nothing archived.'
            : 'No documents yet. PDF, image and Word files up to 25MB.'}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 py-3">
              <FileText className="w-5 h-5 text-gray-300 flex-shrink-0" />

              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{doc.fileName}</p>
                <p className="text-xs text-gray-400">
                  {doc.category} · {doc.fileSize} · {formatDate(doc.uploadedAt)}
                  {doc.uploadedBy && ` · ${doc.uploadedBy}`}
                  {doc.expiryDate && ` · expires ${formatDate(doc.expiryDate)}`}
                </p>
                {doc.archiveReason && (
                  <p className="text-xs text-gray-400 italic">Archived: {doc.archiveReason}</p>
                )}
              </div>

              {/* Expiry is the thing worth seeing at a glance — a lapsed
                  practising licence matters more than who uploaded it. */}
              {doc.expiringSoon && (
                <span className={`px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap ${
                  doc.expired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {doc.expired ? 'Expired' : `${doc.expiresInDays}d left`}
                </span>
              )}

              {isAdmin && !showArchived && (
                <button
                  onClick={() => toggleVisibility(doc)}
                  title={doc.visibility === 'Staff'
                    ? `${staff.name} can see this — click to restrict`
                    : 'Admin only — click to share with them'}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] whitespace-nowrap ${
                    doc.visibility === 'Staff'
                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {doc.visibility === 'Staff' ? <Eye className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {doc.visibility === 'Staff' ? 'Visible to staff' : 'Admin only'}
                </button>
              )}

              <button
                onClick={() => download(doc)}
                className="p-1.5 text-gray-400 hover:text-blue-700"
                aria-label={`Download ${doc.fileName}`}
              >
                <Download className="w-4 h-4" />
              </button>

              {isAdmin && (
                showArchived ? (
                  <button
                    onClick={() => restore(doc)}
                    className="p-1.5 text-gray-400 hover:text-blue-700"
                    aria-label={`Restore ${doc.fileName}`}
                  >
                    <ArchiveRestore className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => archive(doc)}
                    className="p-1.5 text-gray-400 hover:text-red-600"
                    aria-label={`Archive ${doc.fileName}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DocumentsTab;
