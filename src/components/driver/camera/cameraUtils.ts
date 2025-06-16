
export const tryDifferentConstraints = async (facingMode: 'user' | 'environment') => {
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
    // Fallback 2: Basic constraints with facing mode
    {
      video: { facingMode: facingMode }
    },
    // Fallback 3: No facing mode constraint
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

export const checkVideoReady = (video: HTMLVideoElement) => {
  console.log('Checking video ready state:', {
    readyState: video.readyState,
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
    paused: video.paused,
    ended: video.ended
  });

  // Check if video has loaded and has dimensions
  const hasValidDimensions = video.videoWidth > 0 && video.videoHeight > 0;
  const isPlaying = !video.paused && !video.ended && video.readyState >= 2;
  
  return hasValidDimensions && (isPlaying || video.readyState >= 3);
};

export const getCameraErrorMessage = (err: any) => {
  if (err.name === 'NotAllowedError') {
    return 'Camera permission denied. Please allow camera access and try again.';
  } else if (err.name === 'NotFoundError') {
    return 'No camera found on this device.';
  } else if (err.name === 'NotSupportedError') {
    return 'Camera not supported on this browser.';
  } else if (err.name === 'OverconstrainedError') {
    return 'Camera constraints not supported. Trying different settings...';
  } else {
    return `Camera error: ${err.message}`;
  }
};
