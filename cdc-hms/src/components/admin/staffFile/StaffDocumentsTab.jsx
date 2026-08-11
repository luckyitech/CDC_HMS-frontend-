import { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, Eye, Archive, RotateCcw, AlertTriangle, X } from 'lucide-react';
import Card from '../../shared/Card';
import Button from '../../shared/Button';
import staffFileService from '../../../services/staffFileService';
import toast from 'react-hot-toast';

const CATEGORIES = ['Practising Licence', 'Qualification', 'Training', 'Identification', 'HR', 'Other'];

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Amber if the expiry is within 60 days, red if already past.
const expiryTone = (expiryDate) => {
  if (!expiryDate) return null;
  const days = (new Date(expiryDate) - new Date()) / 86_400_000;
  if (days < 0) return { label: 'Expired', cls: 'bg-red-100 text-red-700' };
  if (days < 60) return { label: 'Expiring soon', cls: 'bg-amber-100 text-amber-700' };
  return null;
};

const UploadModal = ({ staffUserId, onClose, onUploaded }) => {
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('Practising Licence');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Please choose a file.');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('staffUserId', staffUserId);
    fd.append('documentCategory', category);
    if (expiryDate) fd.append('expiryDate', expiryDate);
    if (notes) fd.append('notes', notes);

    setSaving(true);
    try {
      await staffFileService.uploadDocument(fd);
      toast.success('Document uploaded.');
      onUploaded();
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Upload failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Upload staff document</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">File (PDF, JPG, PNG · max 25MB)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Expiry date <span className="text-gray-400">(optional)</span></label>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Notes <span className="text-gray-400">(optional)</span></label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saving}>{saving ? 'Uploading…' : 'Upload'}</Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const StaffDocumentsTab = ({ staff }) => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await staffFileService.listDocuments(staff.id, showArchived);
      setDocs(res?.data?.documents || []);
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [staff.id, showArchived]);

  useEffect(() => { load(); }, [load]);

  const archive = async (doc) => {
    const reason = window.prompt('Reason for archiving this document? (optional)') ?? null;
    try {
      await staffFileService.archiveDocument(doc.id, reason);
      toast.success('Document archived.');
      load();
    } catch (err) {
      toast.error(err?.message || 'Failed to archive.');
    }
  };

  const restore = async (doc) => {
    try {
      await staffFileService.restoreDocument(doc.id);
      toast.success('Document restored.');
      load();
    } catch (err) {
      toast.error(err?.message || 'Failed to restore.');
    }
  };

  const view = async (doc) => {
    try {
      await staffFileService.viewDocument(doc.fileUrl);
    } catch (err) {
      toast.error(err?.message || 'Failed to open file.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Staff Documents</h3>
          <p className="text-sm text-gray-500">Certificates, licences &amp; HR files</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className={`text-sm px-3 py-2 rounded-lg border ${showArchived ? 'bg-gray-100 border-gray-300 text-gray-700' : 'border-gray-200 text-gray-500 hover:bg-blue-50'}`}
          >
            {showArchived ? 'Viewing archived' : 'Show archived'}
          </button>
          {!showArchived && (
            <Button onClick={() => setShowUpload(true)} className="flex items-center gap-1.5">
              <Upload className="w-4 h-4" /> Upload document
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading documents…</div>
      ) : docs.length === 0 ? (
        <Card shadow={false} className="border border-dashed border-gray-200 text-center py-12">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">{showArchived ? 'No archived documents.' : 'No documents yet.'}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => {
            const tone = expiryTone(doc.expiryDate);
            return (
              <div key={doc.id} className="flex items-center justify-between gap-3 border border-gray-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{doc.fileName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {doc.documentCategory} · uploaded {fmtDate(doc.uploadedAt)}
                      {doc.expiryDate ? ` · expires ${fmtDate(doc.expiryDate)}` : ' · no expiry'}
                      {doc.fileSize ? ` · ${doc.fileSize}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {tone && (
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${tone.cls}`}>
                      <AlertTriangle className="w-3 h-3" /> {tone.label}
                    </span>
                  )}
                  <button onClick={() => view(doc)} title="View" className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                    <Eye className="w-4 h-4" />
                  </button>
                  {showArchived ? (
                    <button onClick={() => restore(doc)} title="Restore" className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={() => archive(doc)} title="Archive" className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showUpload && (
        <UploadModal staffUserId={staff.id} onClose={() => setShowUpload(false)} onUploaded={load} />
      )}
    </div>
  );
};

export default StaffDocumentsTab;
