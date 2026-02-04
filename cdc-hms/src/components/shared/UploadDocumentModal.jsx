import { useState } from 'react';
import { Upload, X, FileText, Calendar, Building2, ClipboardList } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import { usePatientContext } from '../../contexts/PatientContext';

const UploadDocumentModal = ({ isOpen, onClose, patient, currentUser, onSuccess }) => {
  const { DOCUMENT_CATEGORIES, uploadMedicalDocument } = usePatientContext();

  const [formData, setFormData] = useState({
    fileName: '',
    documentCategory: '',
    testType: '',
    labName: '',
    testDate: '',
    notes: '',
    fileSize: '',
    fileUrl: '' // Mock - in real app would be actual upload
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [errors, setErrors] = useState({});

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        setErrors({ ...errors, file: 'Only PDF, JPG, and PNG files are allowed' });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrors({ ...errors, file: 'File size must be less than 10MB' });
        return;
      }

      setSelectedFile(file);
      setFormData({
        ...formData,
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        fileUrl: `/uploads/${file.name}` // Mock URL
      });
      setErrors({ ...errors, file: null });
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const validate = () => {
    const newErrors = {};
    if (!selectedFile) newErrors.file = 'Please select a file';
    if (!formData.documentCategory) newErrors.documentCategory = 'Please select document category';
    if (!formData.testType) newErrors.testType = 'Please enter test/report type';
    if (!formData.testDate) newErrors.testDate = 'Please select test date';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const result = uploadMedicalDocument(patient.uhid, formData, currentUser);
    
    if (result.success) {
      onSuccess?.();
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData({
      fileName: '',
      documentCategory: '',
      testType: '',
      labName: '',
      testDate: '',
      notes: '',
      fileSize: '',
      fileUrl: ''
    });
    setSelectedFile(null);
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Medical Document">
      <div className="space-y-6">
        {/* File Upload Area */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Select Document File *
          </label>
          <div className={`border-2 border-dashed rounded-lg p-6 text-center transition ${
            errors.file ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-primary'
          }`}>
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm font-semibold text-gray-700 mb-1">
                Click to select file
              </p>
              <p className="text-xs text-gray-500">
                PDF, JPG, PNG (Max 10MB)
              </p>
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
                    <p className="text-xs text-gray-600">
                      {formData.fileSize}
                    </p>
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

        {/* Document Category */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Document Category *
          </label>
          <select
            value={formData.documentCategory}
            onChange={(e) => setFormData({ ...formData, documentCategory: e.target.value })}
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
        </div>

        {/* Test Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Test/Report Type *
          </label>
          <Input
            value={formData.testType}
            onChange={(e) => setFormData({ ...formData, testType: e.target.value })}
            placeholder="e.g., Cortisol Random, Thyroid Ultrasound, HbA1c"
            error={errors.testType}
          />
        </div>

        {/* Test Date and Lab Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Test Date *
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
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Lab/Facility Name
            </label>
            <Input
              value={formData.labName}
              onChange={(e) => setFormData({ ...formData, labName: e.target.value })}
              placeholder="e.g., PathCare, Aga Khan Hospital"
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
            <strong>ℹ️ Note:</strong> Documents uploaded by patients will be marked as "Pending Review" 
            until reviewed by a doctor. Documents uploaded by doctors/staff are automatically marked as "Reviewed".
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UploadDocumentModal;