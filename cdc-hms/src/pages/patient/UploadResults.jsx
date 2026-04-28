import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Upload, FileText, Eye, Download, Search, Filter, Clock, CheckCircle, FlaskConical, ScanLine, Stethoscope, Heart, Droplets, Brain, ClipboardList, FolderOpen } from 'lucide-react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import UploadDocumentModal from '../../components/shared/UploadDocumentModal';
import { usePatientContext } from '../../contexts/PatientContext';
import { useUserContext } from '../../contexts/UserContext';
import documentService from '../../services/documentService';

const UploadResults = () => {
  const { currentUser } = useUserContext();
  const {
    DOCUMENT_CATEGORIES,
    getMedicalDocuments,
  } = usePatientContext();

  const patientUHID = currentUser?.uhid;

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categoryIconMap = {
    'Lab Report - External':        { icon: FlaskConical,  color: 'text-purple-600 bg-purple-50' },
    'Imaging Report':               { icon: ScanLine,      color: 'text-blue-600 bg-blue-50' },
    'Endocrinology Report':         { icon: Stethoscope,   color: 'text-green-600 bg-green-50' },
    'Cardiology Report':            { icon: Heart,         color: 'text-red-600 bg-red-50' },
    'Nephrology Report':            { icon: Droplets,      color: 'text-cyan-600 bg-cyan-50' },
    'Ophthalmology Report':         { icon: Eye,           color: 'text-indigo-600 bg-indigo-50' },
    'Neuropathy Screening Test':    { icon: Brain,         color: 'text-orange-600 bg-orange-50' },
    'Specialist Consultation Report': { icon: ClipboardList, color: 'text-teal-600 bg-teal-50' },
    'Patient File':                 { icon: FolderOpen,    color: 'text-amber-600 bg-amber-50' },
    'Other Medical Document':       { icon: FileText,      color: 'text-gray-600 bg-gray-50' },
  };

  const loadDocuments = useCallback(async () => {
    if (!patientUHID) return;
    try {
      const docs = await getMedicalDocuments(patientUHID);
      const HIDDEN = ['Patient File', 'Specialist Consultation Report'];
      const filtered = Array.isArray(docs) ? docs.filter(d => !HIDDEN.includes(d.documentCategory)) : [];
      setDocuments(filtered);
    } catch (err) {
      console.error('Error loading documents:', err);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientUHID]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUploadSuccess = async () => {
    toast.success('Document uploaded successfully! Your doctor will review it soon.');
    await loadDocuments();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'Reviewed': return {
        bg: 'bg-green-100 text-green-700 border-green-300',
        icon: <CheckCircle className="w-3.5 h-3.5" />,
      };
      case 'Pending Review': return {
        bg: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        icon: <Clock className="w-3.5 h-3.5" />,
      };
      case 'Archived': return {
        bg: 'bg-gray-100 text-gray-700 border-gray-300',
        icon: <FileText className="w-3.5 h-3.5" />,
      };
      default: return {
        bg: 'bg-gray-100 text-gray-700 border-gray-300',
        icon: <FileText className="w-3.5 h-3.5" />,
      };
    }
  };

  const handleView = async (doc) => {
    if (!doc.fileUrl) return;
    try {
      const filename = doc.fileUrl.split('/').pop();
      const blob = await documentService.getFile(filename);
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (err) {
      toast.error('Failed to open file');
    }
  };

  const handleDownload = async (doc) => {
    if (!doc.fileUrl) return;
    try {
      const filename = doc.fileUrl.split('/').pop();
      const blob = await documentService.getFile(filename);
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.fileName;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      toast.error('Failed to download file');
    }
  };

  // Filter documents
  let filteredDocuments = documents;
  if (selectedCategory !== 'all') {
    filteredDocuments = filteredDocuments.filter(d => d.documentCategory === selectedCategory);
  }
  if (searchQuery) {
    filteredDocuments = filteredDocuments.filter(doc =>
      doc.testType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.labName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.fileName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const reviewedCount = documents.filter(d => d.status === 'Reviewed').length;
  const pendingCount = documents.filter(d => d.status === 'Pending Review').length;

  return (
    <div className="pb-6">
      {/* Header — sticky so Upload button stays visible while scrolling */}
      <div className="sticky top-0 z-10 bg-gray-50 pt-1 pb-4 -mx-4 px-4 sm:-mx-8 sm:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">My Documents</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded
          </p>
        </div>
        <Button
          onClick={() => setShowUploadModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 sm:py-2 text-base sm:text-sm"
        >
          <Upload className="w-5 h-5 sm:w-4 sm:h-4" />
          Upload Document
        </Button>
      </div>

      {/* Stats - Compact on mobile */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-5">
        <div className="bg-blue-50 p-3 sm:p-4 rounded-xl text-center">
          <p className="text-[10px] sm:text-xs text-gray-600 uppercase font-semibold">Total</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-700 mt-0.5">{documents.length}</p>
        </div>
        <div className="bg-green-50 p-3 sm:p-4 rounded-xl text-center">
          <p className="text-[10px] sm:text-xs text-gray-600 uppercase font-semibold">Reviewed</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-700 mt-0.5">{reviewedCount}</p>
        </div>
        <div className="bg-yellow-50 p-3 sm:p-4 rounded-xl text-center">
          <p className="text-[10px] sm:text-xs text-gray-600 uppercase font-semibold">Pending</p>
          <p className="text-2xl sm:text-3xl font-bold text-yellow-700 mt-0.5">{pendingCount}</p>
        </div>
        <div className="bg-purple-50 p-3 sm:p-4 rounded-xl text-center">
          <p className="text-[10px] sm:text-xs text-gray-600 uppercase font-semibold">This Month</p>
          <p className="text-2xl sm:text-3xl font-bold text-purple-700 mt-0.5">
            {documents.filter(d => {
              const docDate = new Date(d.uploadedAt);
              const now = new Date();
              return docDate.getMonth() === now.getMonth() &&
                     docDate.getFullYear() === now.getFullYear();
            }).length}
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      {documents.length > 0 && (
        <div className="mb-5 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-10 pr-4 py-3 sm:py-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-primary text-sm"
            />
          </div>
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-10 pr-4 py-3 sm:py-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-primary text-sm appearance-none bg-white"
            >
              <option value="all">All Categories</option>
              {DOCUMENT_CATEGORIES.filter(cat => !['Patient File', 'Specialist Consultation Report'].includes(cat)).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Documents List */}
      {loading ? (
        <Card>
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500 text-sm">Loading your documents...</p>
          </div>
        </Card>
      ) : filteredDocuments.length === 0 ? (
        <Card>
          <div className="text-center py-10 px-4">
            <FileText className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 text-gray-400" />
            <p className="text-lg sm:text-xl font-bold text-gray-800 mb-2">
              {documents.length === 0 ? 'No Documents Yet' : 'No Documents Found'}
            </p>
            <p className="text-gray-600 text-sm mb-6">
              {documents.length === 0
                ? 'Upload your first lab result or medical document to get started.'
                : 'No documents match your current filters.'}
            </p>
            {documents.length === 0 && (
              <Button
                onClick={() => setShowUploadModal(true)}
                className="w-full sm:w-auto py-3 sm:py-2"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload First Document
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDocuments.map((doc) => {
            const statusConfig = getStatusConfig(doc.status);
            const catConfig = categoryIconMap[doc.documentCategory] || categoryIconMap['Other Medical Document'];
            const CatIcon = catConfig.icon;
            return (
              <div
                key={doc.id}
                className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-md transition"
              >
                {/* Top row: icon, title, status */}
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${catConfig.color}`}>
                    <CatIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-gray-800 text-sm sm:text-base truncate">
                        {doc.testType || doc.fileName}
                      </p>
                      <span
                        className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border ${statusConfig.bg}`}
                      >
                        {statusConfig.icon}
                        <span className="hidden sm:inline">{doc.status}</span>
                        <span className="sm:hidden">
                          {doc.status === 'Pending Review' ? 'Pending' : doc.status}
                        </span>
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{doc.documentCategory}</p>
                  </div>
                </div>

                {/* Details grid */}
                <div className="mt-3 ml-9 sm:ml-11 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-500">Test Date</span>
                    <p className="font-medium text-gray-800">{formatDate(doc.testDate)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Uploaded</span>
                    <p className="font-medium text-gray-800">{formatDate(doc.uploadedAt)}</p>
                  </div>
                  {doc.labName && (
                    <div>
                      <span className="text-gray-500">Lab</span>
                      <p className="font-medium text-gray-800 truncate">{doc.labName}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">File</span>
                    <p className="font-medium text-gray-800 truncate">{doc.fileName}</p>
                  </div>
                  {doc.reviewedBy && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Reviewed by</span>
                      <p className="font-medium text-green-700">
                        {doc.reviewedBy} on {formatDate(doc.reviewDate)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {doc.notes && (
                  <div className="mt-2 ml-9 sm:ml-11 p-2 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                    <p className="text-xs text-gray-700"><strong>Notes:</strong> {doc.notes}</p>
                  </div>
                )}

                {/* Action buttons - full width on mobile */}
                <div className="mt-3 ml-9 sm:ml-11 flex gap-2">
                  <button
                    onClick={() => handleView(doc)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-1.5 border-2 border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition"
                  >
                    <Eye className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    View
                  </button>
                  <button
                    onClick={() => handleDownload(doc)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-1.5 border-2 border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition"
                  >
                    <Download className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    Download
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Guidelines */}
      <div className="mt-5 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <h3 className="font-semibold text-gray-800 text-sm mb-3">Upload Guidelines</h3>
        <ul className="space-y-2 text-xs sm:text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5 flex-shrink-0">&#10003;</span>
            <span><strong>Formats:</strong> PDF, JPG, JPEG, PNG</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5 flex-shrink-0">&#10003;</span>
            <span><strong>Max Size:</strong> 10MB per file</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5 flex-shrink-0">&#10003;</span>
            <span><strong>Privacy:</strong> Only your healthcare team can access your documents</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5 flex-shrink-0">&#10003;</span>
            <span><strong>Review:</strong> Your doctor will review within 1-2 business days</span>
          </li>
        </ul>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadDocumentModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          patient={{ uhid: patientUHID }}
          currentUser={currentUser}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
};

export default UploadResults;
