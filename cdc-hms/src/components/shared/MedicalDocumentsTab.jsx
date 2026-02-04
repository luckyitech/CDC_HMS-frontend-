import { useState } from 'react';
import { Upload, FileText, Download, Trash2, Eye, Filter, SortAsc, SortDesc, Search } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import UploadDocumentModal from './UploadDocumentModal';
import { usePatientContext } from '../../contexts/PatientContext';
import { useUserContext } from '../../contexts/UserContext';

const MedicalDocumentsTab = ({ patient }) => {
  const { currentUser } = useUserContext();
  const {
    DOCUMENT_CATEGORIES,
    getMedicalDocuments,
    updateDocumentStatus,
    deleteMedicalDocument,
    sortDocumentsByDate,
    filterDocumentsByCategory
  } = usePatientContext();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');

  const allDocuments = getMedicalDocuments(patient.uhid);
  
  // Apply filters and sorting
  let filteredDocuments = filterDocumentsByCategory(allDocuments, selectedCategory);
  filteredDocuments = sortDocumentsByDate(filteredDocuments, sortOrder);
  
  // Apply search
  if (searchQuery) {
    filteredDocuments = filteredDocuments.filter(doc =>
      doc.testType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.labName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const handleUploadSuccess = () => {
    // Show success notification
    const notificationDiv = document.createElement('div');
    notificationDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50';
    notificationDiv.innerHTML = '<p class="font-bold">✅ Document uploaded successfully!</p>';
    document.body.appendChild(notificationDiv);
    setTimeout(() => notificationDiv.remove(), 3000);
  };

  const handleMarkAsReviewed = (documentId) => {
    const result = updateDocumentStatus(
      patient.uhid,
      documentId,
      'Reviewed',
      currentUser?.name
    );
    if (result.success) {
      const notificationDiv = document.createElement('div');
      notificationDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50';
      notificationDiv.innerHTML = '<p class="font-bold">✅ Document marked as reviewed</p>';
      document.body.appendChild(notificationDiv);
      setTimeout(() => notificationDiv.remove(), 3000);
    }
  };

  const handleDelete = (documentId, fileName) => {
    if (window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
      const result = deleteMedicalDocument(patient.uhid, documentId);
      if (result.success) {
        const notificationDiv = document.createElement('div');
        notificationDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50';
        notificationDiv.innerHTML = '<p class="font-bold">✅ Document deleted successfully</p>';
        document.body.appendChild(notificationDiv);
        setTimeout(() => notificationDiv.remove(), 3000);
      }
    }
  };

  const handleDownload = (doc) => {
    // Mock download - in real app would download actual file
    const notificationDiv = document.createElement('div');
    notificationDiv.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-4 rounded-lg shadow-lg z-50';
    notificationDiv.innerHTML = `<p class="font-bold">📥 Downloading ${doc.fileName}...</p>`;
    document.body.appendChild(notificationDiv);
    setTimeout(() => notificationDiv.remove(), 3000);
  };

  const handleView = (doc) => {
    // Mock view - in real app would open PDF viewer
    const notificationDiv = document.createElement('div');
    notificationDiv.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-4 rounded-lg shadow-lg z-50';
    notificationDiv.innerHTML = `<p class="font-bold">👁️ Opening ${doc.fileName}...</p>`;
    document.body.appendChild(notificationDiv);
    setTimeout(() => notificationDiv.remove(), 3000);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const colors = {
      'Reviewed': 'bg-green-100 text-green-700 border-green-300',
      'Pending Review': 'bg-yellow-100 text-yellow-700 border-yellow-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Lab Report - External': '🔬',
      'Imaging Report': '🏥',
      'Endocrinology Report': '⚕️',
      'Cardiology Report': '❤️',
      'Nephrology Report': '🩺',
      'Ophthalmology Report': '👁️',
      'Neuropathy Screening Test': '🧠',
      'Specialist Consultation Report': '👨‍⚕️',
      'Other Medical Document': '📄'
    };
    return icons[category] || '📄';
  };

  const isStaff = currentUser?.role === 'Staff' || currentUser?.role === 'Doctor';

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
              const docDate = new Date(d.uploadDate);
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
            <Card key={doc.id} className="hover:shadow-lg transition">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Document Icon */}
                <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-lg flex-shrink-0">
                  <span className="text-3xl">{getCategoryIcon(doc.documentCategory)}</span>
                </div>

                {/* Document Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h4 className="font-bold text-gray-800 text-lg truncate">{doc.testType}</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(doc.status)}`}>
                      {doc.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">File Name</p>
                      <p className="font-semibold text-gray-800 truncate">{doc.fileName}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Category</p>
                      <p className="font-semibold text-gray-800">{doc.documentCategory}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Lab/Facility</p>
                      <p className="font-semibold text-gray-800">{doc.labName}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Test Date</p>
                      <p className="font-semibold text-gray-800">{formatDate(doc.testDate)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Uploaded By</p>
                      <p className="font-semibold text-gray-800">
                        {doc.uploadedBy} ({doc.uploadedByRole})
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Upload Date</p>
                      <p className="font-semibold text-gray-800">{formatDate(doc.uploadDate)}</p>
                    </div>
                  </div>

                  {doc.notes && (
                    <div className="mt-3 p-2 bg-yellow-50 rounded border-l-4 border-yellow-500">
                      <p className="text-sm text-gray-700">
                        <strong>Notes:</strong> {doc.notes}
                      </p>
                    </div>
                  )}

                  {doc.reviewedBy && (
                    <div className="mt-2 text-xs text-gray-500">
                      Reviewed by {doc.reviewedBy} on {formatDate(doc.reviewDate)}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 lg:w-auto w-full">
                  <Button
                    variant="outline"
                    className="w-full lg:w-auto text-sm flex items-center justify-center gap-2"
                    onClick={() => handleView(doc)}
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full lg:w-auto text-sm flex items-center justify-center gap-2"
                    onClick={() => handleDownload(doc)}
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                  {isStaff && doc.status === 'Pending Review' && (
                    <Button
                      variant="primary"
                      className="w-full lg:w-auto text-sm flex items-center justify-center gap-2"
                      onClick={() => handleMarkAsReviewed(doc.id)}
                    >
                      <FileText className="w-4 h-4" />
                      Mark Reviewed
                    </Button>
                  )}
                  {isStaff && (
                    <Button
                      variant="outline"
                      className="w-full lg:w-auto text-sm text-red-600 border-red-300 hover:bg-red-50 flex items-center justify-center gap-2"
                      onClick={() => handleDelete(doc.id, doc.fileName)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </Card>
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