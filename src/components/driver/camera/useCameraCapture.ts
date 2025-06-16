
import { useState, useRef, useEffect } from "react";
import { tryDifferentConstraints, checkVideoReady, getCameraErrorMessage } from "./cameraUtils";

export function useCameraCapture(facingMode: 'user' | 'environment') {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [streamStatus, setStreamStatus] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const readyCheckInterval = useRef<NodeJS.Timeout | null>(null);

  const startReadyPolling = () => {
    if (readyCheckInterval.current) {
      clearInterval(readyCheckInterval.current);
    }

    let attempts = 0;
    const maxAttempts = 20; // 10 seconds total

    readyCheckInterval.current = setInterval(() => {
      attempts++;
      
      if (videoRef.current && checkVideoReady(videoRef.current)) {
        console.log('Camera ready after', attempts * 500, 'ms');
        setVideoReady(true);
        setIsLoading(false);
        setStreamStatus('Camera ready for photo');
        clearInterval(readyCheckInterval.current!);
      } else if (attempts >= maxAttempts) {
        console.log('Camera ready check timeout');
        setError('Camera loading timeout. Please try the manual enable button.');
        setIsLoading(false);
        clearInterval(readyCheckInterval.current!);
      }
    }, 500);
  };

  const startCamera = async () => {
    setIsLoading(true);
    setError(null);
    setVideoReady(false);
    setStreamStatus('Requesting camera access...');
    
    // Clear any existing interval
    if (readyCheckInterval.current) {
      clearInterval(readyCheckInterval.current);
    }
    
    try {
      console.log('Starting camera with facing mode:', facingMode);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }

      const mediaStream = await tryDifferentConstraints(facingMode);
      console.log('Camera stream obtained:', mediaStream);
      
      setStream(mediaStream);
      setHasPermission(true);
      setStreamStatus('Preparing camera for photo...');

      if (videoRef.current) {
        const video = videoRef.current;
        
        // Set up video element
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.srcObject = mediaStream;
        
        console.log('Stream assigned to video element');
        setStreamStatus('Loading camera...');
        
        // Start polling for ready state
        startReadyPolling();
        
        // Also try to play the video
        try {
          await video.play();
          console.log('Video play() successful');
        } catch (playError) {
          console.log('Video play() failed, but continuing:', playError);
          // Don't fail here, polling will still check for ready state
        }
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      
      const errorMessage = getCameraErrorMessage(err);
      setError(errorMessage);
      
      if (err.name === 'OverconstrainedError') {
        // Auto-retry with different facing mode will be handled by parent component
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
    
    if (readyCheckInterval.current) {
      clearInterval(readyCheckInterval.current);
    }
  };

  const forceEnableCamera = () => {
    console.log('Force enabling camera');
    setVideoReady(true);
    setIsLoading(false);
    setError(null);
    setStreamStatus('Camera force-enabled');
  };

  const capturePhoto = () => {
    if (!videoRef.current) {
      console.error('Video not ready for capture');
      return null;
    }

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      console.error('Cannot get canvas context');
      return null;
    }

    console.log('Capturing photo, video dimensions:', video.videoWidth, 'x', video.videoHeight);

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to data URL
    const dataURL = canvas.toDataURL('image/jpeg', 0.9);
    console.log('Photo captured successfully');
    
    return { dataURL, canvas };
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (readyCheckInterval.current) {
        clearInterval(readyCheckInterval.current);
      }
    };
  }, [facingMode]);

  return {
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
  };
}
