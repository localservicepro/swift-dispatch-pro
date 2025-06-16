import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, X, Check, SwitchCamera, RefreshCw } from "lucide-react";

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
  const [streamStatus, setStreamStatus] = useState<string>('');
  const [videoTracks, setVideoTracks] = useState<MediaStreamTrack[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const checkStreamHealth = (mediaStream: MediaStream) => {
    const tracks = mediaStream.getVideoTracks();
    console.log('Video tracks:', tracks);
    console.log('Stream active:', mediaStream.active);
    
    if (tracks.length === 0) {
      throw new Error('No video tracks found in stream');
    }
    
    const activeTrack = tracks[0];
    console.log('Track state:', activeTrack.readyState);
    console.log('Track enabled:', activeTrack.enabled);
    console.log('Track settings:', activeTrack.getSettings());
    
    if (activeTrack.readyState === 'ended') {
      throw new Error('Video track has ended');
    }
    
    setVideoTracks(tracks);
    setStreamStatus(`Stream: ${mediaStream.active ? 'Active' : 'Inactive'}, Track: ${activeTrack.readyState}`);
    
    return true;
  };

  const tryDifferentConstraints = async () => {
    const constraintSets = [
      // Primary constraints
      {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      },
      // Fallback 1: Lower resolution
      {
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      },
      // Fallback 2: Basic constraints
      {
        video: {
          facingMode: facingMode
        }
      },
      // Fallback 3: No facing mode
      {
        video: true
      }
    ];

    for (let i = 0; i < constraintSets.length; i++) {
      try {
        console.log(`Trying constraint set ${i + 1}:`, constraintSets[i]);
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraintSets[i]);
        console.log(`Success with constraint set ${i + 1}`);
        return mediaStream;
      } catch (err) {
        console.log(`Constraint set ${i + 1} failed:`, err);
        if (i === constraintSets.length - 1) {
          throw err;
        }
      }
    }
  };

  const startCamera = async () => {
    setIsLoading(true);
    setError(null);
    setVideoReady(false);
    setStreamStatus('Initializing...');
    
    try {
      console.log('Starting camera with facing mode:', facingMode);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }

      setStreamStatus('Requesting camera access...');
      const mediaStream = await tryDifferentConstraints();
      
      console.log('Camera stream obtained:', mediaStream);
      checkStreamHealth(mediaStream);
      
      setStream(mediaStream);
      setHasPermission(true);
      setStreamStatus('Setting up video...');

      if (videoRef.current) {
        const video = videoRef.current;
        
        // Clear any existing handlers
        video.onloadedmetadata = null;
        video.oncanplay = null;
        video.onerror = null;
        
        // Force video properties
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        
        let timeoutId: NodeJS.Timeout;
        
        const handleMetadataLoaded = () => {
          console.log('Video metadata loaded');
          console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
          setStreamStatus(`Video loaded: ${video.videoWidth}x${video.videoHeight}`);
          
          if (video.videoWidth === 0 || video.videoHeight === 0) {
            console.error('Video has no dimensions');
            setError('Video stream has no dimensions. Please try again.');
            return;
          }
          
          video.play()
            .then(() => {
              console.log('Video playing successfully');
              setVideoReady(true);
              setIsLoading(false);
              setStreamStatus('Camera ready');
              clearTimeout(timeoutId);
            })
            .catch((playError) => {
              console.error('Video play error:', playError);
              setError('Unable to start video playback');
              setIsLoading(false);
            });
        };

        const handleCanPlay = () => {
          console.log('Video can play');
          setStreamStatus('Video ready to play');
        };

        const handleError = (e: any) => {
          console.error('Video error:', e);
          setError('Video playback error. Please refresh and try again.');
          setIsLoading(false);
          clearTimeout(timeoutId);
        };

        // Set up event listeners
        video.onloadedmetadata = handleMetadataLoaded;
        video.oncanplay = handleCanPlay;
        video.onerror = handleError;

        // Set timeout for video loading
        timeoutId = setTimeout(() => {
          console.log('Video loading timeout');
          setError('Camera loading timeout. Please refresh and try again.');
          setIsLoading(false);
        }, 10000);

        // Assign stream
        video.srcObject = mediaStream;
        console.log('Stream assigned to video element');
        setStreamStatus('Stream assigned, waiting for video...');
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'NotSupportedError') {
        setError('Camera not supported on this browser.');
      } else if (err.name === 'OverconstrainedError') {
        setError('Camera constraints not supported. Trying basic camera...');
        // Auto-retry with basic constraints
        setTimeout(() => {
          setFacingMode('user');
        }, 2000);
      } else {
        setError(`Camera error: ${err.message}`);
      }
      
      setHasPermission(false);
      setIsLoading(false);
      setStreamStatus('Failed');
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
    setStreamStatus('Stopped');
    setVideoTracks([]);
  };

  const refreshCamera = () => {
    stopCamera();
    setTimeout(() => {
      startCamera();
    }, 500);
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
          {streamStatus && <p className="text-sm mt-2 text-gray-300">{streamStatus}</p>}
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
            {streamStatus && <p className="text-sm mt-2 text-gray-600">Status: {streamStatus}</p>}
          </div>
          <div className="space-y-2">
            <Button onClick={refreshCamera} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Camera
            </Button>
            <Button onClick={startCamera} variant="outline" className="w-full">
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
            {!videoReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p className="text-sm">Loading camera...</p>
                  {streamStatus && <p className="text-xs mt-1 text-gray-300">{streamStatus}</p>}
                </div>
              </div>
            )}
            
            {/* Debug info */}
            {videoTracks.length > 0 && (
              <div className="absolute top-4 left-4 bg-black/50 text-white text-xs p-2 rounded">
                <div>Tracks: {videoTracks.length}</div>
                <div>Ready: {videoReady ? 'Yes' : 'No'}</div>
                {videoRef.current && (
                  <div>Size: {videoRef.current.videoWidth}x{videoRef.current.videoHeight}</div>
                )}
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
