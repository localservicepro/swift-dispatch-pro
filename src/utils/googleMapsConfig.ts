
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
  
  // SECURITY: Never hardcode API keys in production
  // All API keys should be stored in environment variables or Supabase secrets
  console.log('googleMapsConfig: No development key configured - using environment variables only');
  
  console.warn('googleMapsConfig: No valid Google Maps API key found');
  return null;
};

export const loadGoogleMapsScript = () => {
  return new Promise<void>((resolve, reject) => {
    console.log('googleMapsConfig: Starting Google Maps script loading process');
    
    // Check if Google Maps is already available with all required services
    if (window.google && 
        window.google.maps && 
        window.google.maps.places && 
        window.google.maps.places.AutocompleteService &&
        window.google.maps.places.PlacesService &&
        window.google.maps.Geocoder) {
      console.log('googleMapsConfig: Google Maps already fully loaded and available');
      resolve();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('googleMapsConfig: Google Maps script already exists, waiting for load...');
      
      // Wait for the existing script to load with better checking
      const checkInterval = setInterval(() => {
        if (window.google && 
            window.google.maps && 
            window.google.maps.places &&
            window.google.maps.places.AutocompleteService &&
            window.google.maps.places.PlacesService &&
            window.google.maps.Geocoder) {
          console.log('googleMapsConfig: Existing Google Maps script loaded successfully');
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout after 15 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.google || !window.google.maps || !window.google.maps.places) {
          console.error('googleMapsConfig: Timeout waiting for existing Google Maps script');
          reject(new Error('Timeout waiting for Google Maps to load. The script may be blocked or the API key may be invalid.'));
        }
      }, 15000);
      
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
    script.async = true;
    script.defer = true;
    
    // Create a unique callback name to avoid conflicts
    const callbackName = `initGoogleMaps_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add timeout for script loading
    const timeoutId = setTimeout(() => {
      console.error('googleMapsConfig: Timeout loading Google Maps script');
      // Clean up the callback
      if ((window as any)[callbackName]) {
        delete (window as any)[callbackName];
      }
      reject(new Error('Timeout loading Google Maps. Please check your internet connection and API key.'));
    }, 20000); // 20 second timeout

    // Set up the callback function properly
    (window as any)[callbackName] = () => {
      clearTimeout(timeoutId);
      console.log('googleMapsConfig: Google Maps API loaded successfully via callback');
      
      // Verify all required services are available
      if (window.google && 
          window.google.maps && 
          window.google.maps.places &&
          window.google.maps.places.AutocompleteService &&
          window.google.maps.places.PlacesService &&
          window.google.maps.Geocoder) {
        console.log('googleMapsConfig: All Google Maps services confirmed available');
        // Clean up the callback
        delete (window as any)[callbackName];
        resolve();
      } else {
        console.error('googleMapsConfig: Google Maps loaded but required services not available');
        // Clean up the callback
        delete (window as any)[callbackName];
        reject(new Error('Google Maps loaded but required services (Places API, Geocoding API) are not available. Please check your API key permissions.'));
      }
    };
    
    // Update the script source with the unique callback
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
    
    script.onerror = (error) => {
      clearTimeout(timeoutId);
      console.error('googleMapsConfig: Failed to load Google Maps API script:', error);
      // Clean up the callback
      if ((window as any)[callbackName]) {
        delete (window as any)[callbackName];
      }
      reject(new Error('Failed to load Google Maps. Please check your API key and ensure the Maps JavaScript API, Places API, and Geocoding API are enabled in Google Cloud Console.'));
    };
    
    console.log('googleMapsConfig: Appending Google Maps script to document head');
    document.head.appendChild(script);
  });
};
