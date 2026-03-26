import { useState, useEffect } from 'react';
import { Upload, FileText, Filter, SortAsc, SortDesc, Search } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import DocumentCard from './DocumentCard';
import UploadDocumentModal from './UploadDocumentModal';
import { usePatientContext } from '../../contexts/PatientContext';
import { useUserContext } from '../../contexts/UserContext';
import { showNotification } from '../../utils/documentHelpers';
import documentService from '../../services/documentService';

const MedicalDocumentsTab = ({ patient }) => {
  const { currentUser } = useUserContext();
  const {
    DOCUMENT_CATEGORIES,
    getMedicalDocuments,
    updateDocumentStatus,
    sortDocumentsByDate,
    filterDocumentsByCategory
  } = usePatientContext();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');

  // State for documents loaded async
  const [allDocuments, setAllDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load documents on mount
  useEffect(() => {
    let isMounted = true;
    const loadDocuments = async () => {
      setIsLoading(true);
      try {
        const docs = await getMedicalDocuments(patient.uhid);
        if (isMounted) {
          setAllDocuments(Array.isArray(docs) ? docs : []);
        }
      } catch (err) {
        console.error('Error loading documents:', err);
        if (isMounted) setAllDocuments([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadDocuments();
    return () => { isMounted = false; };
  }, [patient.uhid, getMedicalDocuments]);

  // Apply filters and sorting
  let filteredDocuments = filterDocumentsByCategory(allDocuments, selectedCategory);
  filteredDocuments = sortDocumentsByDate(filteredDocuments, sortOrder);

  // Apply search
  if (searchQuery) {
    filteredDocuments = filteredDocuments.filter(doc =>
      doc.testType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.labName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.fileName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Refresh documents list
  const refreshDocuments = async () => {
    try {
      const docs = await getMedicalDocuments(patient.uhid);
      setAllDocuments(Array.isArray(docs) ? docs : []);
    } catch (err) {
      console.error('Error refreshing documents:', err);
    }
  };

  const handleUploadSuccess = async () => {
    showNotification('✅ Document uploaded successfully!');
    await refreshDocuments();
  };

  const handleArchive = async (documentId, fileName) => {
    if (!window.confirm(`Archive "${fileName}"? It will be hidden from all views but not permanently deleted.`)) return;
    const result = await updateDocumentStatus(documentId, 'Archived');
    if (result.success) {
      showNotification('Document archived');
      await refreshDocuments();
    } else {
      showNotification('Failed to archive document');
    }
  };

  const handleMarkAsReviewed = async (documentId) => {
    const result = await updateDocumentStatus(documentId, 'Reviewed');
    if (result.success) {
      showNotification('✅ Document marked as reviewed');
      await refreshDocuments();
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
      showNotification('Failed to download file');
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
      showNotification('Failed to open file');
    }
  };

  const isStaff = ['staff', 'doctor'].includes(currentUser?.role?.toLowerCase());
  const isAdmin = currentUser?.role === 'admin';

  // Show loading state
  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading medical documents...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Upload Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Medical Documents</h3>
          <p className="text-sm text-gray-600 mt-1">
            {allDocuments.length} document{allDocuments.length !== 1 ? 's' : ''} uploaded
          </p>
        </div>
        <Button
          onClick={() => setShowUploadModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <p className="text-xs text-gray-600 uppercase font-semibold">Total</p>
          <p className="text-3xl font-bold text-blue-700 mt-1">{allDocuments.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <p className="text-xs text-gray-600 uppercase font-semibold">Reviewed</p>
          <p className="text-3xl font-bold text-green-700 mt-1">
            {allDocuments.filter(d => d.status === 'Reviewed').length}
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <p className="text-xs text-gray-600 uppercase font-semibold">Pending</p>
          <p className="text-3xl font-bold text-yellow-700 mt-1">
            {allDocuments.filter(d => d.status === 'Pending Review').length}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <p className="text-xs text-gray-600 uppercase font-semibold">This Month</p>
          <p className="text-3xl font-bold text-purple-700 mt-1">
            {allDocuments.filter(d => {
              const docDate = new Date(d.uploadedAt);
              const now = new Date();
              return docDate.getMonth() === now.getMonth() && 
                     docDate.getFullYear() === now.getFullYear();
            }).length}
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="all">All Categories</option>
              {DOCUMENT_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              {sortOrder === 'desc' ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
              Sort by Date
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search test type, lab name..."
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </Card>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-xl font-bold text-gray-800 mb-2">
              No Documents Found
            </p>
            <p className="text-gray-600 mb-6">
              {allDocuments.length === 0 
                ? 'No medical documents have been uploaded yet.'
                : 'No documents match your current filters.'}
            </p>
            {allDocuments.length === 0 && (
              <Button onClick={() => setShowUploadModal(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload First Document
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              isStaff={isStaff}
              isAdmin={isAdmin}
              onView={() => handleView(doc)}
              onDownload={() => handleDownload(doc)}
              onMarkReviewed={() => handleMarkAsReviewed(doc.id)}
              onArchive={() => handleArchive(doc.id, doc.fileName)}
            />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadDocumentModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          patient={patient}
          currentUser={currentUser}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
};

export default MedicalDocumentsTab;