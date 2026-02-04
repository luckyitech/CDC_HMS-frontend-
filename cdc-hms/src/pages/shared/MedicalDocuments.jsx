import { useState, useMemo, useEffect } from 'react';
import { Search, Filter, FileText, SortAsc, SortDesc, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../../components/shared/Card';
import DocumentCard from '../../components/shared/DocumentCard';
import { usePatientContext } from '../../contexts/PatientContext';
import { useUserContext } from '../../contexts/UserContext';
import { showNotification } from '../../utils/documentHelpers';

const ITEMS_PER_PAGE = 6;

const MedicalDocuments = () => {
  const { patients, DOCUMENT_CATEGORIES, updateDocumentStatus, deleteMedicalDocument } = usePatientContext();
  const { currentUser } = useUserContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Flatten all documents across all patients
  const allDocuments = useMemo(() => {
    const docs = [];
    patients.forEach(patient => {
      (patient.medicalDocuments || []).forEach(doc => {
        docs.push({
          ...doc,
          patientName: patient.name,
          patientUHID: patient.uhid,
        });
      });
    });
    return docs;
  }, [patients]);

  // Apply filters and sorting
  const filteredDocuments = useMemo(() => {
    let docs = [...allDocuments];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter(doc =>
        doc.patientName.toLowerCase().includes(q) ||
        doc.patientUHID.toLowerCase().includes(q) ||
        doc.testType.toLowerCase().includes(q) ||
        doc.fileName.toLowerCase().includes(q) ||
        (doc.labName && doc.labName.toLowerCase().includes(q))
      );
    }

    if (selectedCategory !== 'all') {
      docs = docs.filter(doc => doc.documentCategory === selectedCategory);
    }

    if (selectedStatus !== 'all') {
      docs = docs.filter(doc => doc.status === selectedStatus);
    }

    if (dateFrom) {
      docs = docs.filter(doc => doc.testDate >= dateFrom);
    }
    if (dateTo) {
      docs = docs.filter(doc => doc.testDate <= dateTo);
    }

    docs.sort((a, b) => {
      const dateA = new Date(a.testDate);
      const dateB = new Date(b.testDate);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return docs;
  }, [allDocuments, searchQuery, selectedCategory, selectedStatus, dateFrom, dateTo, sortOrder]);

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

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all' || dateFrom || dateTo;

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setDateFrom('');
    setDateTo('');
  };

  const isStaff = currentUser?.role === 'Staff' || currentUser?.role === 'Doctor';

  const handleView = (doc) => {
    showNotification(`👁️ Opening ${doc.fileName}...`, true);
  };

  const handleDownload = (doc) => {
    showNotification(`📥 Downloading ${doc.fileName}...`, true);
  };

  const handleMarkAsReviewed = (doc) => {
    const result = updateDocumentStatus(doc.patientUHID, doc.id, 'Reviewed', currentUser?.name);
    if (result.success) {
      showNotification('✅ Document marked as reviewed');
    }
  };

  const handleDelete = (doc) => {
    if (window.confirm(`Are you sure you want to delete "${doc.fileName}"?`)) {
      const result = deleteMedicalDocument(doc.patientUHID, doc.id);
      if (result.success) {
        showNotification('✅ Document deleted successfully');
      }
    }
  };

  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Medical Documents</h2>
          <p className="text-gray-600 mt-1">All patient documents across the hospital</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
          <p className="text-xs text-gray-600 uppercase font-semibold">Patients</p>
          <p className="text-3xl font-bold text-purple-700 mt-1">
            {patients.filter(p => (p.medicalDocuments || []).length > 0).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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
              placeholder="Patient, UHID, test type..."
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          {/* Category */}
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

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="all">All Statuses</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Pending Review">Pending Review</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          {/* Date To */}
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

          {/* Sort */}
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
              {allDocuments.length === 0
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
              isStaff={isStaff}
              onView={() => handleView(doc)}
              onDownload={() => handleDownload(doc)}
              onMarkReviewed={() => handleMarkAsReviewed(doc)}
              onDelete={() => handleDelete(doc)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border-2 border-gray-300 hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>

          {getPageNumbers().map((page, idx) => (
            page === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-gray-500">...</span>
            ) : (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-10 h-10 rounded-lg font-semibold text-sm transition ${
                  currentPage === page
                    ? 'bg-primary text-white border-2 border-primary'
                    : 'border-2 border-gray-300 text-gray-700 hover:border-primary hover:bg-blue-50'
                }`}
              >
                {page}
              </button>
            )
          ))}

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border-2 border-gray-300 hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      )}
    </div>
  );
};

export default MedicalDocuments;
