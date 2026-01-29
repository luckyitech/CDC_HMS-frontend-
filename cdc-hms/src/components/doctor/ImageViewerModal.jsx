import Modal from "../shared/Modal";
import { Tag, FileText, Clock, UserCircle, Camera } from "lucide-react";

const ImageViewerModal = ({ image, onClose }) => {
  if (!image) return null;

  return (
    <Modal
      isOpen={true}
      title={
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Clinical Image
        </div>
      }
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* Image Display */}
        <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center">
          <img
            src={image.file}
            alt={image.caption || "Clinical image"}
            className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
          />
        </div>

        {/* Image Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
              <Tag className="w-4 h-4" />
              Body Area:
            </span>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              {image.bodyArea}
            </span>
          </div>

          {image.caption && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <FileText className="w-4 h-4" />
                Caption:
              </p>
              <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg">
                {image.caption}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>{new Date(image.timestamp).toLocaleString()}</span>
          </div>

          {image.doctorName && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <UserCircle className="w-4 h-4" />
              <span>{image.doctorName}</span>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ImageViewerModal;
