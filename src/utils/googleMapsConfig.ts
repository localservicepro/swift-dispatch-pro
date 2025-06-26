
// Configuration for Google Maps API key
export const getGoogleMapsApiKey = () => {
  // Try environment variables first (for production/staging)
  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 
                 import.meta.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  
  if (envKey && envKey.trim() && envKey !== 'YOUR_ACTUAL_GOOGLE_MAPS_API_KEY_HERE') {
    console.log('Using environment variable API key');
    return envKey;
  }
  
  // Check localStorage for temporarily stored key
  const tempKey = localStorage.getItem('temp_google_maps_api_key');
  if (tempKey && tempKey.trim()) {
    console.log('Using temporary localStorage API key');
    return tempKey;
  }
  
  // IMPORTANT: Replace this with your actual Google Maps API key
  // Get your key from: https://console.cloud.google.com/apis/credentials
  const DEVELOPMENT_API_KEY = 'YOUR_ACTUAL_GOOGLE_MAPS_API_KEY_HERE'; // Replace with your actual API key
  
  if (DEVELOPMENT_API_KEY && DEVELOPMENT_API_KEY !== 'YOUR_ACTUAL_GOOGLE_MAPS_API_KEY_HERE') {
    console.log('Using development API key');
    return DEVELOPMENT_API_KEY;
  }
  
  console.warn('No valid Google Maps API key found');
  return null;
};

export const loadGoogleMapsScript = () => {
  return new Promise<void>((resolve, reject) => {
    const apiKey = getGoogleMapsApiKey();
    
    console.log('Google Maps API Key status:', apiKey ? 'Available' : 'Missing');
    
    if (!apiKey) {
      console.error('Google Maps API key is not configured properly');
      reject(new Error('Google Maps API key not configured. Please enter your API key or update the code with your actual key.'));
      return;
    }

    if (window.google && window.google.maps) {
      console.log('Google Maps already loaded');
      resolve();
      return;
    }

    console.log('Loading Google Maps script with API key...');
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    
    window.initGoogleMaps = () => {
      console.log('Google Maps API loaded successfully');
      resolve();
    };
    
    script.onerror = (error) => {
      console.error('Failed to load Google Maps API:', error);
      reject(new Error('Failed to load Google Maps. Please check your API key and ensure the Maps JavaScript API, Places API, and Geocoding API are enabled in Google Cloud Console.'));
    };
    
    document.head.appendChild(script);
  });
};

declare global {
  interface Window {
    google?: any;
    initGoogleMaps?: () => void;
  }
}
