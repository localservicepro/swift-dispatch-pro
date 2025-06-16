
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, SwitchCamera, RefreshCw } from "lucide-react";
import { useCameraCapture } from "./camera/useCameraCapture";
import { CameraControls } from "./camera/CameraControls";
import { CameraStatus } from "./camera/CameraStatus";
import { CameraErrorScreen } from "./camera/CameraErrorScreen";

interface CameraCaptureProps {
  onPhotoCapture: (file: File) => void;
  onCancel: () => void;
}

export function CameraCapture({ onPhotoCapture, onCancel }: CameraCaptureProps) {
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    stream,
    hasPermission,
    error,
    isLoading,
    videoReady,
    streamStatus,
    videoRef,
    startCamera,
    stopCamera,
    forceEnableCamera,
    capturePhoto
  } = useCameraCapture(facingMode);

  const refreshCamera = () => {
    stopCamera();
    setTimeout(() => {
      startCamera();
    }, 500);
  };

  const handleCapturePhoto = () => {
    const result = capturePhoto();
    if (result) {
      setCapturedPhoto(result.dataURL);
    }
  };

  const confirmPhoto = async () => {
    if (!capturedPhoto) return;

    // Create a canvas from the captured photo and convert to blob
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
          onPhotoCapture(file);
        }
      }, 'image/jpeg', 0.9);
    };
    img.src = capturedPhoto;
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Preparing camera for photo...</p>
          {streamStatus && <p className="text-sm mt-2 text-gray-300">{streamStatus}</p>}
        </div>
      </div>
    );
  }

  if (error || hasPermission === false) {
    return (
      <CameraErrorScreen
        error={error}
        streamStatus={streamStatus}
        stream={stream}
        onForceEnable={forceEnableCamera}
        onRefresh={refreshCamera}
        onRetry={startCamera}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          className="text-white hover:bg-white/20"
        >
          <X className="w-6 h-6" />
        </Button>
        <div className="text-center">
          <h2 className="text-lg font-medium">Take Photo</h2>
          {streamStatus && <p className="text-xs text-gray-300">{streamStatus}</p>}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshCamera}
            className="text-white hover:bg-white/20"
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={switchCamera}
            className="text-white hover:bg-white/20"
          >
            <SwitchCamera className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden">
        {capturedPhoto ? (
          <img 
            src={capturedPhoto} 
            alt="Captured photo" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ 
                backgroundColor: '#000',
                minHeight: '100%',
                minWidth: '100%'
              }}
            />
            <CameraStatus
              videoReady={videoReady}
              streamStatus={streamStatus}
              stream={stream}
              onForceEnable={forceEnableCamera}
            />
          </div>
        )}
        
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <CameraControls
        capturedPhoto={capturedPhoto}
        videoReady={videoReady}
        onCapture={handleCapturePhoto}
        onRetake={retakePhoto}
        onConfirm={confirmPhoto}
      />
    </div>
  );
}
