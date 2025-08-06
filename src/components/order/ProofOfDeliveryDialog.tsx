
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeliveryPhotos } from "@/hooks/useDeliveryPhotos";
import { 
  Camera, 
  User, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  ImageOff
} from "lucide-react";

interface ProofOfDeliveryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
}

export function ProofOfDeliveryDialog({
  isOpen,
  onClose,
  orderId,
  orderNumber
}: ProofOfDeliveryDialogProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const { data: photos, isLoading, error } = useDeliveryPhotos(orderId);

  const handlePrevious = () => {
    setCurrentPhotoIndex((prev) => 
      prev === 0 ? (photos?.length || 1) - 1 : prev - 1
    );
  };

  const handleNext = () => {
    setCurrentPhotoIndex((prev) => 
      prev === (photos?.length || 1) - 1 ? 0 : prev + 1
    );
  };

  const currentPhoto = photos?.[currentPhotoIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Proof of Delivery - {orderNumber}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 p-4">
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-80 w-full rounded-lg" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ImageOff className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-600">Failed to load delivery photos</p>
            </div>
          )}

          {!isLoading && !error && (!photos || photos.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Camera className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-600">No proof of delivery photos available</p>
              <p className="text-sm text-gray-500 mt-2">
                Photos are uploaded by drivers when marking deliveries as completed
              </p>
            </div>
          )}

          {!isLoading && !error && photos && photos.length > 0 && currentPhoto && (
            <div className="space-y-4">
              {/* Photo Navigation */}
              {photos.length > 1 && (
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <Badge variant="secondary">
                    {currentPhotoIndex + 1} of {photos.length}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    className="flex items-center gap-2"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Photo Display */}
              <div className="relative bg-gray-50 rounded-lg overflow-hidden">
                <img
                  src={currentPhoto.photo_url}
                  alt={`Proof of delivery photo ${currentPhotoIndex + 1}`}
                  className="w-full h-auto max-h-96 object-contain mx-auto"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      // Create error message element safely without innerHTML
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'flex flex-col items-center justify-center py-12';
                      
                      const iconDiv = document.createElement('div');
                      iconDiv.className = 'w-12 h-12 text-gray-400 mb-4';
                      iconDiv.textContent = '⚠️';
                      
                      const messageP = document.createElement('p');
                      messageP.className = 'text-gray-600';
                      messageP.textContent = 'Failed to load image';
                      
                      errorDiv.appendChild(iconDiv);
                      errorDiv.appendChild(messageP);
                      parent.appendChild(errorDiv);
                    }
                  }}
                />
              </div>

              {/* Photo Metadata */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>Uploaded by: {currentPhoto.profiles?.full_name || 'Unknown Driver'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Upload time: {new Date(currentPhoto.uploaded_at).toLocaleString()}
                  </span>
                </div>
                {currentPhoto.photo_type && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Camera className="w-4 h-4" />
                    <span>Type: {currentPhoto.photo_type.replace('_', ' ')}</span>
                  </div>
                )}
              </div>

              {/* Thumbnails for multiple photos */}
              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                        index === currentPhotoIndex 
                          ? 'border-blue-500' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={photo.photo_url}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
