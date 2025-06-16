
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, X, Check, SwitchCamera } from "lucide-react";

interface CameraCaptureProps {
  onPhotoCapture: (file: File) => void;
  onCancel: () => void;
}

export function CameraCapture({ onPhotoCapture, onCancel }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isLoading, setIsLoading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    setIsLoading(true);
    setError(null);
    setVideoReady(false);
    
    try {
      console.log('Starting camera with facing mode:', facingMode);
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      console.log('Requesting camera with constraints:', constraints);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera stream obtained:', mediaStream);
      
      setStream(mediaStream);
      setHasPermission(true);

      // Wait for video element to be ready before assigning stream
      if (videoRef.current) {
        const video = videoRef.current;
        
        // Add event listeners before setting srcObject
        video.onloadedmetadata = () => {
          console.log('Video metadata loaded');
          video.play()
            .then(() => {
              console.log('Video playing successfully');
              setVideoReady(true);
              setIsLoading(false);
            })
            .catch((playError) => {
              console.error('Video play error:', playError);
              setError('Unable to start video playback');
              setIsLoading(false);
            });
        };

        video.oncanplay = () => {
          console.log('Video can play');
        };

        video.onerror = (e) => {
          console.error('Video error:', e);
          setError('Video playback error');
          setIsLoading(false);
        };

        // Set the stream
        video.srcObject = mediaStream;
        console.log('Stream assigned to video element');
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'NotSupportedError') {
        setError('Camera not supported on this browser.');
      } else {
        setError('Unable to access camera. Please try again.');
      }
      
      setHasPermission(false);
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    console.log('Stopping camera');
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Camera track stopped');
      });
      setStream(null);
    }
    setVideoReady(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !videoReady) {
      console.error('Video or canvas not ready for capture');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      console.error('Cannot get canvas context');
      return;
    }

    console.log('Capturing photo, video dimensions:', video.videoWidth, 'x', video.videoHeight);

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to data URL
    const dataURL = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPhoto(dataURL);
    console.log('Photo captured successfully');
  };

  const confirmPhoto = async () => {
    if (!capturedPhoto || !canvasRef.current) return;

    // Convert canvas to blob
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onPhotoCapture(file);
      }
    }, 'image/jpeg', 0.9);
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
          <p>Starting camera...</p>
        </div>
      </div>
    );
  }

  if (error || hasPermission === false) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full text-center">
          <div className="text-red-600 mb-4">
            <Camera className="w-12 h-12 mx-auto mb-2" />
            <p className="font-medium">{error}</p>
          </div>
          <div className="space-y-2">
            <Button onClick={startCamera} className="w-full">
              Try Again
            </Button>
            <Button onClick={handleCancel} variant="outline" className="w-full">
              Cancel
            </Button>
          </div>
        </div>
      </div>
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
        <h2 className="text-lg font-medium">Take Photo</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={switchCamera}
          className="text-white hover:bg-white/20"
        >
          <SwitchCamera className="w-6 h-6" />
        </Button>
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
              style={{ backgroundColor: '#000' }}
            />
            {!videoReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p className="text-sm">Loading camera...</p>
                </div>
              </div>
            )}
          </div>
        )}
        
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="p-6 bg-black/80">
        {capturedPhoto ? (
          <div className="flex gap-4">
            <Button
              onClick={retakePhoto}
              variant="outline"
              className="flex-1 bg-white/20 text-white border-white/30 hover:bg-white/30"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake
            </Button>
            <Button
              onClick={confirmPhoto}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-2" />
              Use Photo
            </Button>
          </div>
        ) : (
          <div className="flex justify-center">
            <Button
              onClick={capturePhoto}
              size="lg"
              className="w-20 h-20 rounded-full bg-white hover:bg-gray-100 text-black"
              disabled={!videoReady}
            >
              <Camera className="w-8 h-8" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
