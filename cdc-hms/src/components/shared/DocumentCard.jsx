import { Eye, Download, FileText, EyeOff, Archive, RotateCcw } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { formatDate, getStatusBadge, getCategoryIcon } from '../../utils/documentHelpers';

const DocumentCard = ({ doc, showPatientBadge = false, isDoctor, isAdmin, hasViewed = false, onView, onDownload, onMarkReviewed, onArchive, onArchiveFile, onRestore }) => {
  return (
    <Card className="hover:shadow-lg transition">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Document Icon */}
        <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-lg flex-shrink-0">
          <span className="text-3xl">{getCategoryIcon(doc.documentCategory)}</span>
        </div>

        {/* Document Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h4 className="font-bold text-gray-800 text-lg truncate">{doc.testType}</h4>
            {doc.status === 'Reviewed' && (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(doc.status)}`}>
                Reviewed
              </span>
            )}
            {doc.status === 'Pending Review' && !isDoctor && (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(doc.status)}`}>
                Pending Review
              </span>
            )}
            {doc.status === 'Archived' && (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(doc.status)}`}>
                Hidden from Patient
              </span>
            )}
            {doc.isArchived && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-red-50 border-red-200 text-red-700">
                Archived
              </span>
            )}
          </div>

          {showPatientBadge && (
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-semibold">
                {doc.patientName}
              </span>
              <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-full text-xs font-medium">
                {doc.uhid}
              </span>
            </div>
          )}

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
              <p className="font-semibold text-gray-800">{doc.labName || '-'}</p>
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
              <p className="font-semibold text-gray-800">{formatDate(doc.uploadedAt)}</p>
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

          {doc.isArchived && (
            <div className="mt-3 p-2 bg-red-50 rounded border-l-4 border-red-400">
              <p className="text-sm text-gray-700">
                <strong>Archived</strong> by {doc.archivedBy} on {formatDate(doc.archivedAt)}
                {doc.archiveReason && <> — {doc.archiveReason}</>}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 lg:w-auto w-full">
          <Button
            variant="outline"
            className="w-full lg:w-auto text-sm flex items-center justify-center gap-2"
            onClick={onView}
          >
            <Eye className="w-4 h-4" />
            View
          </Button>
          <Button
            variant="outline"
            className="w-full lg:w-auto text-sm flex items-center justify-center gap-2"
            onClick={onDownload}
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
          {isDoctor && doc.status === 'Pending Review' && !hasViewed && (
            <Button
              variant="outline"
              disabled
              className="w-full lg:w-auto text-sm flex items-center justify-center gap-2 opacity-40 cursor-not-allowed"
            >
              <FileText className="w-4 h-4" />
              View file first
            </Button>
          )}
          {isDoctor && doc.status === 'Pending Review' && hasViewed && (
            <Button
              variant="primary"
              className="w-full lg:w-auto text-sm flex items-center justify-center gap-2"
              onClick={onMarkReviewed}
            >
              <FileText className="w-4 h-4" />
              Mark Reviewed
            </Button>
          )}
          {isAdmin && !doc.isArchived && doc.status !== 'Archived' && (
            <Button
              variant="outline"
              className="w-full lg:w-auto text-sm flex items-center justify-center gap-2"
              onClick={onArchive}
            >
              <EyeOff className="w-4 h-4" />
              Hide from Patient
            </Button>
          )}
          {(isAdmin || isDoctor) && !doc.isArchived && onArchiveFile && (
            <Button
              variant="danger"
              className="w-full lg:w-auto text-sm flex items-center justify-center gap-2"
              onClick={onArchiveFile}
            >
              <Archive className="w-4 h-4" />
              Archive File
            </Button>
          )}
          {isAdmin && doc.isArchived && onRestore && (
            <Button
              variant="primary"
              className="w-full lg:w-auto text-sm flex items-center justify-center gap-2"
              onClick={onRestore}
            >
              <RotateCcw className="w-4 h-4" />
              Restore
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default DocumentCard;
