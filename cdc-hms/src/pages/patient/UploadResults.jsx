import { useState } from 'react';
import toast from 'react-hot-toast';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';

const UploadResults = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadData, setUploadData] = useState({
    documentType: '',
    testDate: '',
    description: '',
    labName: '',
  });

  // Mock uploaded documents
  const [uploadedDocuments] = useState([
    {
      id: 1,
      name: 'HbA1c_Test_Nov2024.pdf',
      type: 'Lab Result',
      date: '2024-11-15',
      size: '245 KB',
      uploadedOn: '2024-11-16',
      status: 'Reviewed',
    },
    {
      id: 2,
      name: 'Lipid_Profile_Oct2024.pdf',
      type: 'Lab Result',
      date: '2024-10-10',
      size: '198 KB',
      uploadedOn: '2024-10-12',
      status: 'Reviewed',
    },
    {
      id: 3,
      name: 'X-Ray_Chest_Sep2024.jpg',
      type: 'Imaging',
      date: '2024-09-20',
      size: '1.2 MB',
      uploadedOn: '2024-09-21',
      status: 'Pending Review',
    },
  ]);

  const documentTypes = [
    { value: 'lab-result', label: 'Lab Result', icon: '🔬' },
    { value: 'prescription', label: 'Prescription', icon: '💊' },
    { value: 'imaging', label: 'Imaging (X-Ray, MRI, CT)', icon: '📷' },
    { value: 'medical-report', label: 'Medical Report', icon: '📋' },
    { value: 'other', label: 'Other Document', icon: '📄' },
  ];

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload PDF, JPG, or PNG files only', {
          duration: 3000,
          position: 'top-right',
          icon: '❌',
          style: {
            background: '#EF4444',
            color: '#FFFFFF',
            fontWeight: 'bold',
            padding: '16px',
          },
        });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB', {
          duration: 3000,
          position: 'top-right',
          icon: '❌',
          style: {
            background: '#EF4444',
            color: '#FFFFFF',
            fontWeight: 'bold',
            padding: '16px',
          },
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload', {
        duration: 3000,
        position: 'top-right',
        icon: '❌',
        style: {
          background: '#EF4444',
          color: '#FFFFFF',
          fontWeight: 'bold',
          padding: '16px',
        },
      });
      return;
    }

    if (!uploadData.documentType) {
      toast.error('Please select document type', {
        duration: 3000,
        position: 'top-right',
        icon: '❌',
        style: {
          background: '#EF4444',
          color: '#FFFFFF',
          fontWeight: 'bold',
          padding: '16px',
        },
      });
      return;
    }

    if (!uploadData.testDate) {
      toast.error('Please select test/document date', {
        duration: 3000,
        position: 'top-right',
        icon: '❌',
        style: {
          background: '#EF4444',
          color: '#FFFFFF',
          fontWeight: 'bold',
          padding: '16px',
        },
      });
      return;
    }

    // Simulate upload
    toast.success(`File "${selectedFile.name}" uploaded successfully! Your doctor will review it soon.`, {
      duration: 4000,
      position: 'top-right',
      icon: '✅',
      style: {
        background: '#10B981',
        color: '#FFFFFF',
        fontWeight: 'bold',
        padding: '16px',
      },
    });
    
    // Reset form
    setSelectedFile(null);
    setUploadData({
      documentType: '',
      testDate: '',
      description: '',
      labName: '',
    });
    document.getElementById('file-input').value = '';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Reviewed': return 'bg-green-100 text-green-700 border-green-300';
      case 'Pending Review': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div>
      <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-6">Upload Lab Results</h2>

      {/* Upload Form */}
      <Card title="📤 Upload New Document">
        <div className="space-y-6">
          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select File (PDF, JPG, PNG - Max 10MB)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition">
              <input
                id="file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label htmlFor="file-input" className="cursor-pointer">
                <div className="flex flex-col items-center">
                  <span className="text-6xl mb-4">📁</span>
                  <p className="text-lg font-semibold text-gray-700 mb-2">
                    Click to select file or drag and drop
                  </p>
                  <p className="text-sm text-gray-500">
                    Supported formats: PDF, JPG, PNG (Max size: 10MB)
                  </p>
                </div>
              </label>
            </div>

            {/* Selected File Preview */}
            {selectedFile && (
              <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">📄</span>
                    <div>
                      <p className="font-bold text-gray-800">{selectedFile.name}</p>
                      <p className="text-sm text-gray-600">
                        Size: {formatFileSize(selectedFile.size)} • Type: {selectedFile.type}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      document.getElementById('file-input').value = '';
                    }}
                    className="text-red-600 hover:text-red-800 font-semibold"
                  >
                    ✕ Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Document Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Document Type *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {documentTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setUploadData({ ...uploadData, documentType: type.value })}
                  className={`p-4 border-2 rounded-lg text-left transition hover:shadow-md ${
                    uploadData.documentType === type.value
                      ? 'border-primary bg-blue-50'
                      : 'border-gray-200 hover:border-primary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{type.icon}</span>
                    <p className="font-semibold text-gray-800 text-sm">{type.label}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Test/Document Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Test/Document Date *
              </label>
              <input
                type="date"
                value={uploadData.testDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setUploadData({ ...uploadData, testDate: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Lab/Hospital Name (Optional)
              </label>
              <input
                type="text"
                value={uploadData.labName}
                onChange={(e) => setUploadData({ ...uploadData, labName: e.target.value })}
                placeholder="e.g., Quest Diagnostics"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description/Notes (Optional)
            </label>
            <textarea
              value={uploadData.description}
              onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
              placeholder="Add any notes or context about this document..."
              rows="4"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          {/* Important Note */}
          <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
            <p className="text-sm text-gray-700">
              <strong>⚠️ Important:</strong> Uploaded documents will be reviewed by your doctor. 
              Please ensure all personal information is visible and the document is clear and readable.
            </p>
          </div>

          {/* Upload Button */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedFile(null);
                setUploadData({
                  documentType: '',
                  testDate: '',
                  description: '',
                  labName: '',
                });
                document.getElementById('file-input').value = '';
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload}>
              📤 Upload Document
            </Button>
          </div>
        </div>
      </Card>

      {/* Uploaded Documents History */}
      <Card title="📂 My Uploaded Documents" className="mt-6">
        <div className="space-y-4">
          {uploadedDocuments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-6xl mb-4">📭</p>
              <p className="text-gray-500">No documents uploaded yet</p>
            </div>
          ) : (
            uploadedDocuments.map((doc) => (
              <div
                key={doc.id}
                className="p-4 sm:p-6 border-2 border-gray-200 rounded-lg hover:shadow-md transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <span className="text-4xl">
                      {doc.name.endsWith('.pdf') ? '📄' : '🖼️'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-lg truncate">{doc.name}</p>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="font-semibold">Type:</span> {doc.type}
                        </p>
                        <p>
                          <span className="font-semibold">Test Date:</span>{' '}
                          {new Date(doc.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                        <p>
                          <span className="font-semibold">Uploaded:</span>{' '}
                          {new Date(doc.uploadedOn).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                        <p>
                          <span className="font-semibold">Size:</span> {doc.size}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:items-end">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                        doc.status
                      )}`}
                    >
                      {doc.status}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" className="text-xs py-1 px-3">
                        View
                      </Button>
                      <Button variant="outline" className="text-xs py-1 px-3">
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        className="text-xs py-1 px-3 text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Help & Guidelines */}
      <Card title="💡 Upload Guidelines" className="mt-6">
        <ul className="space-y-3 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">✓</span>
            <span>
              <strong>Supported Formats:</strong> PDF, JPG, JPEG, PNG
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">✓</span>
            <span>
              <strong>File Size:</strong> Maximum 10MB per file
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">✓</span>
            <span>
              <strong>Quality:</strong> Ensure documents are clear and readable
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">✓</span>
            <span>
              <strong>Privacy:</strong> All uploaded documents are securely stored and only accessible to your healthcare team
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">✓</span>
            <span>
              <strong>Review Time:</strong> Your doctor will typically review uploaded documents within 1-2 business days
            </span>
          </li>
        </ul>
      </Card>
    </div>
  );
};

export default UploadResults;