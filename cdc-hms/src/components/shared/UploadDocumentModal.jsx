import { useState } from 'react';
import { Upload, X, FileText, Calendar, Building2, ClipboardList } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import { usePatientContext } from '../../contexts/PatientContext';

const PDF_ONLY_CATEGORIES = ['Patient File'];

const UploadDocumentModal = ({ isOpen, onClose, patient, onSuccess }) => {
  const { DOCUMENT_CATEGORIES, uploadMedicalDocument } = usePatientContext();

  const [formData, setFormData] = useState({
    fileName: '',
    documentCategory: '',
    testType: '',
    labName: '',
    testDate: '',
    notes: '',
    fileSize: '',
    fileUrl: ''
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);

  const isPdfOnly = PDF_ONLY_CATEGORIES.includes(formData.documentCategory);
  const acceptAttr = isPdfOnly ? '.pdf' : '.pdf,.jpg,.jpeg,.png';
  const fileHint = isPdfOnly ? 'PDF only (Max 10MB)' : 'PDF, JPG, PNG (Max 10MB)';

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (isPdfOnly && file.type !== 'application/pdf') {
      setErrors({ ...errors, file: 'Patient File category only accepts PDF files' });
      e.target.value = '';
      return;
    }

    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setErrors({ ...errors, file: 'Only PDF, JPG, and PNG files are allowed' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrors({ ...errors, file: 'File size must be less than 10MB' });
      return;
    }

    setSelectedFile(file);
    setFormData({ ...formData, fileName: file.name, fileSize: formatFileSize(file.size), fileUrl: `/uploads/${file.name}` });
    setErrors({ ...errors, file: null });
  };

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    const newIsPdfOnly = PDF_ONLY_CATEGORIES.includes(newCategory);

    // Clear file if switching to a PDF-only category and current file isn't PDF
    if (newIsPdfOnly && selectedFile && selectedFile.type !== 'application/pdf') {
      setSelectedFile(null);
      setFormData({ ...formData, documentCategory: newCategory, fileName: '', fileSize: '', fileUrl: '' });
      setErrors({ ...errors, documentCategory: null, file: 'Please select a PDF file for this category' });
      return;
    }

    setFormData({ ...formData, documentCategory: newCategory });
    setErrors({ ...errors, documentCategory: null });
  };

  const validate = () => {
    const newErrors = {};
    if (!selectedFile) newErrors.file = 'Please select a file';
    if (!formData.documentCategory) newErrors.documentCategory = 'Please select document category';
    if (!formData.testType) newErrors.testType = 'Please enter test/report type';
    if (!formData.testDate) newErrors.testDate = 'Please select test date';
    if (isPdfOnly && selectedFile && selectedFile.type !== 'application/pdf') {
      newErrors.file = 'Patient File category only accepts PDF files';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setUploading(true);
    try {
      const result = await uploadMedicalDocument(patient.uhid, formData, selectedFile);
      if (result.success) {
        onSuccess?.();
        handleClose();
      } else {
        setErrors({ file: result.message || 'Failed to upload document' });
      }
    } catch (err) {
      setErrors({ file: err.message || 'Upload failed. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFormData({ fileName: '', documentCategory: '', testType: '', labName: '', testDate: '', notes: '', fileSize: '', fileUrl: '' });
    setSelectedFile(null);
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Medical Document">
      <div className="space-y-6">

        {/* Document Category — first so PDF-only hint shows before file pick */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Document Category *
          </label>
          <select
            value={formData.documentCategory}
            onChange={handleCategoryChange}
            className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-primary ${
              errors.documentCategory ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select category...</option>
            {DOCUMENT_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {errors.documentCategory && (
            <p className="text-red-600 text-xs mt-1">{errors.documentCategory}</p>
          )}
          {isPdfOnly && (
            <p className="text-amber-700 text-xs mt-1 font-medium">
              Patient File documents must be uploaded as PDF.
            </p>
          )}
        </div>

        {/* File Upload Area */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Select Document File *
          </label>
          <div className={`border-2 border-dashed rounded-lg p-6 text-center transition ${
            errors.file ? 'border-red-300 bg-red-50' : isPdfOnly ? 'border-amber-300 hover:border-amber-500' : 'border-gray-300 hover:border-primary'
          }`}>
            <input
              type="file"
              id="file-upload"
              accept={acceptAttr}
              onChange={handleFileSelect}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className={`w-12 h-12 mx-auto mb-3 ${isPdfOnly ? 'text-amber-400' : 'text-gray-400'}`} />
              <p className="text-sm font-semibold text-gray-700 mb-1">
                Click to select file
              </p>
              <p className="text-xs text-gray-500">{fileHint}</p>
            </label>
          </div>
          {errors.file && (
            <p className="text-red-600 text-xs mt-1">{errors.file}</p>
          )}

          {/* Selected File Preview */}
          {selectedFile && (
            <div className="mt-3 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-gray-600">{formData.fileSize}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setFormData({ ...formData, fileName: '', fileSize: '', fileUrl: '' });
                  }}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Document Title */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <ClipboardList className="w-4 h-4" />
            Document Title *
          </label>
          <Input
            value={formData.testType}
            onChange={(e) => setFormData({ ...formData, testType: e.target.value })}
            placeholder={isPdfOnly ? 'e.g., Referral Letter, Discharge Summary' : 'e.g., HbA1c Report, MRI Scan, Cardiology Review'}
            error={errors.testType}
          />
        </div>

        {/* Document Date and Source */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="w-4 h-4" />
              Document Date *
            </label>
            <Input
              type="date"
              value={formData.testDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setFormData({ ...formData, testDate: e.target.value })}
              error={errors.testDate}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Building2 className="w-4 h-4" />
              Issued By / Facility
            </label>
            <Input
              value={formData.labName}
              onChange={(e) => setFormData({ ...formData, labName: e.target.value })}
              placeholder="e.g., Aga Khan Hospital, PathCare"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add any relevant notes about this document..."
            rows="3"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
          />
        </div>

        {/* Info Alert */}
        <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
          <p className="text-sm text-gray-700">
            <strong>Note:</strong> Documents uploaded by patients will be marked as "Pending Review"
            until reviewed by a doctor. Documents uploaded by doctors/staff are automatically marked as "Reviewed".
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={uploading}>
            {uploading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UploadDocumentModal;
