
// Configuration for Google Maps API key
export const getGoogleMapsApiKey = () => {
  // Try environment variables first (for production/staging)
  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 
                 import.meta.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  
  if (envKey && envKey.trim() && envKey !== 'YOUR_ACTUAL_GOOGLE_MAPS_API_KEY_HERE') {
    console.log('googleMapsConfig: Using environment variable API key');
    return envKey;
  }
  
  // Check localStorage for temporarily stored key
  const tempKey = localStorage.getItem('temp_google_maps_api_key');
  if (tempKey && tempKey.trim()) {
    console.log('googleMapsConfig: Using temporary localStorage API key');
    return tempKey;
  }
  
  // IMPORTANT: Replace this with your actual Google Maps API key
  // Get your key from: https://console.cloud.google.com/apis/credentials
  const DEVELOPMENT_API_KEY = 'AIzaSyAY8Q84_WVfXmRkLgSeveoaJnlj03M9fyE';
  
  if (DEVELOPMENT_API_KEY) {
    console.log('googleMapsConfig: Using development API key');
    return DEVELOPMENT_API_KEY;
  }
  
  console.warn('googleMapsConfig: No valid Google Maps API key found');
  return null;
};

export const loadGoogleMapsScript = () => {
  return new Promise<void>((resolve, reject) => {
    console.log('googleMapsConfig: Starting Google Maps script loading process');
    
    // Check if Google Maps is already available
    if (window.google && window.google.maps && window.google.maps.places) {
      console.log('googleMapsConfig: Google Maps already loaded and available');
      resolve();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('googleMapsConfig: Google Maps script already exists, waiting for load...');
      
      // Wait for the existing script to load
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          console.log('googleMapsConfig: Existing Google Maps script loaded successfully');
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.google || !window.google.maps) {
          console.error('googleMapsConfig: Timeout waiting for existing Google Maps script');
          reject(new Error('Timeout waiting for Google Maps to load'));
        }
      }, 10000);
      
      return;
    }

    const apiKey = getGoogleMapsApiKey();
    
    console.log('googleMapsConfig: Google Maps API Key status:', apiKey ? 'Available' : 'Missing');
    
    if (!apiKey) {
      console.error('googleMapsConfig: Google Maps API key is not configured properly');
      reject(new Error('Google Maps API key not configured. Please enter your API key or update the code with your actual key.'));
      return;
    }

    console.log('googleMapsConfig: Creating new Google Maps script element...');
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    
    // Create a unique callback name to avoid conflicts
    const callbackName = `initGoogleMaps_${Date.now()}`;
    
    window[callbackName as any] = () => {
      console.log('googleMapsConfig: Google Maps API loaded successfully via callback');
      delete window[callbackName as any]; // Clean up
      resolve();
    };
    
    // Update the script source with the unique callback
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
    
    script.onerror = (error) => {
      console.error('googleMapsConfig: Failed to load Google Maps API script:', error);
      delete window[callbackName as any]; // Clean up
      reject(new Error('Failed to load Google Maps. Please check your API key and ensure the Maps JavaScript API, Places API, and Geocoding API are enabled in Google Cloud Console.'));
    };
    
    // Add timeout for script loading
    const timeoutId = setTimeout(() => {
      console.error('googleMapsConfig: Timeout loading Google Maps script');
      delete window[callbackName as any]; // Clean up
      reject(new Error('Timeout loading Google Maps. Please check your internet connection and API key.'));
    }, 15000); // 15 second timeout

    // Clear timeout when script loads successfully
    window[callbackName as any] = () => {
      clearTimeout(timeoutId);
      console.log('googleMapsConfig: Google Maps API loaded successfully via callback');
      delete window[callbackName as any]; // Clean up
      resolve();
    };
    
    console.log('googleMapsConfig: Appending Google Maps script to document head');
    document.head.appendChild(script);
  });
};
