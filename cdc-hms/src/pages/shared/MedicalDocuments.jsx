import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Filter, FileText, SortAsc, SortDesc } from 'lucide-react';
import Card from '../../components/shared/Card';
import PageHeader from '../../components/shared/PageHeader';
import DocumentCard from '../../components/shared/DocumentCard';
import DocumentActionModal from '../../components/shared/DocumentActionModal';
import Pagination from '../../components/shared/Pagination';
import { usePatientContext } from '../../contexts/PatientContext';
import { useUserContext } from '../../contexts/UserContext';
import { showNotification } from '../../utils/documentHelpers';
import documentService from '../../services/documentService';

const ITEMS_PER_PAGE = 20;

const MedicalDocuments = () => {
  const { DOCUMENT_CATEGORIES, updateDocumentStatus } = usePatientContext();
  const { currentUser } = useUserContext();

  const [allDocuments, setAllDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // 'ArchivedFiles' shows the admin archive — wrongly uploaded files hidden
  // from every view (fetched separately with ?archived=true).
  const showingArchived = selectedStatus === 'ArchivedFiles';

  const loadDocuments = useCallback(async (archived = false) => {
    setLoading(true);
    try {
      const response = await documentService.getAll(archived ? { archived: true } : undefined);
      if (response.success) {
        setAllDocuments(response.data.documents || response.data || []);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments(showingArchived);
  }, [loadDocuments, showingArchived]);

  // Apply filters and sorting (exclude status-Archived from default view)
  const filteredDocuments = useMemo(() => {
    // 'all' includes documents hidden from the patient (status 'Archived') —
    // doctors and staff see them in patient profiles, so they belong here too
    // and the admin must be able to find them to archive them.
    let docs = [...allDocuments];
    if (!showingArchived && selectedStatus !== 'all') {
      docs = docs.filter(doc => doc.status === selectedStatus);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter(doc =>
        (doc.patientName || '').toLowerCase().includes(q) ||
        (doc.uhid || '').toLowerCase().includes(q) ||
        (doc.testType || '').toLowerCase().includes(q) ||
        (doc.fileName || '').toLowerCase().includes(q) ||
        (doc.labName || '').toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== 'all') {
      docs = docs.filter(doc => doc.documentCategory === selectedCategory);
    }

    if (dateFrom) docs = docs.filter(doc => doc.testDate >= dateFrom);
    if (dateTo) docs = docs.filter(doc => doc.testDate <= dateTo);

    docs.sort((a, b) => {
      const dateA = new Date(a.testDate);
      const dateB = new Date(b.testDate);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return docs;
  }, [allDocuments, searchQuery, selectedCategory, selectedStatus, showingArchived, dateFrom, dateTo, sortOrder]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedStatus, dateFrom, dateTo, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const visibleDocuments = allDocuments;
  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all' || dateFrom || dateTo;

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setDateFrom('');
    setDateTo('');
  };

  const isDoctor = currentUser?.role?.toLowerCase() === 'doctor';
  const isAdmin = currentUser?.role === 'admin';

  // Pending document action awaiting confirmation: { type: keyof DOCUMENT_ACTIONS, doc }
  const [pendingAction, setPendingAction] = useState(null);

  const performers = {
    hide: async (doc) => {
      const result = await updateDocumentStatus(doc.id, 'Archived');
      if (result.success) {
        setAllDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, status: 'Archived' } : d));
        showNotification('Document hidden from patient');
      } else {
        showNotification('Failed to hide document');
      }
    },
    archive: async (doc, reason) => {
      try {
        const response = await documentService.archive(doc.id, reason || undefined);
        if (response.success) {
          setAllDocuments(prev => prev.filter(d => d.id !== doc.id));
          showNotification('Document archived');
        } else {
          showNotification(response.message || 'Failed to archive document');
        }
      } catch {
        showNotification('Failed to archive document');
      }
    },
    restore: async (doc) => {
      try {
        const response = await documentService.restore(doc.id);
        if (response.success) {
          setAllDocuments(prev => prev.filter(d => d.id !== doc.id));
          showNotification('Document restored');
        } else {
          showNotification(response.message || 'Failed to restore document');
        }
      } catch {
        showNotification('Failed to restore document');
      }
    },
  };

  const runPendingAction = async (reason) => {
    const { type, doc } = pendingAction;
    setPendingAction(null);
    await performers[type](doc, reason);
  };

  const handleView = async (doc) => {
    if (!doc.fileUrl) return;
    try {
      const filename = doc.fileUrl.split('/').pop();
      const blob = await documentService.getFile(filename);
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch {
      showNotification('Failed to open file');
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
    } catch {
      showNotification('Failed to download file');
    }
  };

  const handleMarkAsReviewed = async (doc) => {
    const result = await updateDocumentStatus(doc.id, 'Reviewed');
    if (result.success) {
      setAllDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, status: 'Reviewed' } : d));
      showNotification('Document marked as reviewed');
    }
  };


  if (loading) {
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
    <div>
      <PageHeader
        title="Medical Documents"
        subtitle="All patient documents across the hospital"
      />

      {/* Archived files banner */}
      {showingArchived && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800 font-semibold">
            Viewing archived files — these are hidden from all views (doctors, staff and patients) but are never deleted. Use Restore to bring a file back.
          </p>
        </div>
      )}

      {/* Statistics */}
      {!showingArchived && (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <p className="text-xs text-gray-600 uppercase font-semibold">Total</p>
          <p className="text-3xl font-bold text-blue-700 mt-1">{visibleDocuments.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <p className="text-xs text-gray-600 uppercase font-semibold">Reviewed</p>
          <p className="text-3xl font-bold text-green-700 mt-1">
            {visibleDocuments.filter(d => d.status === 'Reviewed').length}
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <p className="text-xs text-gray-600 uppercase font-semibold">Pending</p>
          <p className="text-3xl font-bold text-yellow-700 mt-1">
            {visibleDocuments.filter(d => d.status === 'Pending Review').length}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <p className="text-xs text-gray-600 uppercase font-semibold">Patients</p>
          <p className="text-3xl font-bold text-purple-700 mt-1">
            {new Set(visibleDocuments.map(d => d.uhid).filter(Boolean)).size}
          </p>
        </div>
      </div>
      )}

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Patient, UHID, test type..."
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

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

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="all">All Documents</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Pending Review">Pending Review</option>
              {isAdmin && <option value="Archived">Hidden from Patient</option>}
              {isAdmin && <option value="ArchivedFiles">Archived Files</option>}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Date To</label>
            <input
              type="date"
              value={dateTo}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

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
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-primary hover:underline font-semibold"
          >
            Clear all filters
          </button>
        )}
      </Card>

      {/* Result count */}
      <div className="flex items-center justify-between my-4">
        <p className="text-sm text-gray-600">
          Showing <span className="font-semibold">{filteredDocuments.length}</span> document{filteredDocuments.length !== 1 ? 's' : ''}
          {hasActiveFilters && <span className="text-primary"> (filtered)</span>}
        </p>
        {totalPages > 1 && (
          <p className="text-sm text-gray-600">Page {currentPage} of {totalPages}</p>
        )}
      </div>

      {/* Documents List */}
      {paginatedDocuments.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-xl font-bold text-gray-800 mb-2">No Documents Found</p>
            <p className="text-gray-600">
              {visibleDocuments.length === 0
                ? 'No medical documents have been uploaded yet.'
                : 'No documents match your current filters.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {paginatedDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              showPatientBadge={true}
              isDoctor={isDoctor}
              isAdmin={isAdmin}
              onView={() => handleView(doc)}
              onDownload={() => handleDownload(doc)}
              onMarkReviewed={() => handleMarkAsReviewed(doc)}
              onArchive={() => setPendingAction({ type: 'hide', doc })}
              onArchiveFile={() => setPendingAction({ type: 'archive', doc })}
              onRestore={() => setPendingAction({ type: 'restore', doc })}
            />
          ))}
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Action confirmation popup */}
      <DocumentActionModal
        pendingAction={pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={runPendingAction}
      />
    </div>
  );
};

export default MedicalDocuments;
