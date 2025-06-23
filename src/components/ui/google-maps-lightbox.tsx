import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { MapPin, Search, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

interface AddressData {
  fullAddress: string;
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  lat: number;
  lng: number;
  name?: string;
}

interface GoogleMapsLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  onAddressSelect: (address: AddressData) => void;
  initialAddress?: string;
  title?: string;
}

declare global {
  interface Window {
    google?: any;
    initGoogleMaps?: () => void;
  }
}

// Configuration for Google Maps API key
const getGoogleMapsApiKey = () => {
  // Try environment variables first (for production/staging)
  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 
                 import.meta.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  
  if (envKey && envKey !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    return envKey;
  }
  
  // Check localStorage for temporarily stored key
  const tempKey = localStorage.getItem('temp_google_maps_api_key');
  if (tempKey) {
    return tempKey;
  }
  
  // Replace this with your actual Google Maps API key
  const DEVELOPMENT_API_KEY = 'AIzaSyDX8nQv8fZ5zQv8fZ5zQv8fZ5zQv8fZ5zQ'; // Replace with your actual key
  
  return DEVELOPMENT_API_KEY;
};

export function GoogleMapsLightbox({
  isOpen,
  onClose,
  onAddressSelect,
  initialAddress = '',
  title = 'Select Address'
}: GoogleMapsLightboxProps) {
  const [searchQuery, setSearchQuery] = useState(initialAddress);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null);
  const [isLoadingMaps, setIsLoadingMaps] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const autocompleteServiceRef = useRef<any>(null);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = getGoogleMapsApiKey();
    
    console.log('Google Maps API Key check:', apiKey ? 'Key found' : 'No key found');
    
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE' || apiKey === 'AIzaSyDX8nQv8fZ5zQv8fZ5zQv8fZ5zQv8fZ5zQ') {
      setMapError('Google Maps API key not configured. Please enter your API key below.');
      setShowApiKeyInput(true);
      setIsLoadingMaps(false);
      return;
    }

    if (!window.google) {
      console.log('Loading Google Maps script...');
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      
      window.initGoogleMaps = () => {
        console.log('Google Maps API loaded successfully');
        setIsLoadingMaps(false);
        setMapError(null);
      };
      
      script.onerror = (error) => {
        console.error('Failed to load Google Maps API:', error);
        setMapError('Failed to load Google Maps. Please check your API key and internet connection.');
        setShowApiKeyInput(true);
        setIsLoadingMaps(false);
      };
      
      document.head.appendChild(script);
    } else {
      console.log('Google Maps already loaded');
      setIsLoadingMaps(false);
    }
  }, []);

  // Initialize map when dialog opens
  useEffect(() => {
    if (isOpen && !isLoadingMaps && window.google && mapRef.current && !mapInstanceRef.current) {
      try {
        console.log('Initializing Google Maps...');
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: -33.8688, lng: 151.2093 }, // Default to Sydney
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        mapInstanceRef.current = map;
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();

        // Add click listener to map
        map.addListener('click', (event: any) => {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          console.log('Map clicked at:', lat, lng);
          reverseGeocode(lat, lng);
        });

        // If there's an initial address, try to geocode it
        if (initialAddress) {
          geocodeAddress(initialAddress);
        }

        console.log('Google Maps initialized successfully');
      } catch (error) {
        console.error('Error initializing map:', error);
        setMapError('Failed to initialize map. Please try again.');
      }
    }
  }, [isOpen, isLoadingMaps, initialAddress]);

  // Update search query when initialAddress changes
  useEffect(() => {
    if (initialAddress && initialAddress !== searchQuery) {
      setSearchQuery(initialAddress);
    }
  }, [initialAddress]);

  // Search for addresses using our edge function
  useEffect(() => {
    if (debouncedSearchQuery && debouncedSearchQuery.length > 2) {
      searchAddresses(debouncedSearchQuery);
    } else {
      setSuggestions([]);
    }
  }, [debouncedSearchQuery]);

  const handleApiKeySubmit = () => {
    if (apiKeyInput.trim()) {
      console.log('Setting temporary API key');
      localStorage.setItem('temp_google_maps_api_key', apiKeyInput.trim());
      window.location.reload();
    }
  };

  const searchAddresses = async (query: string) => {
    setIsSearching(true);
    try {
      console.log('Searching for addresses via edge function:', query);
      const { data, error } = await supabase.functions.invoke('google-places', {
        body: { input: query }
      });

      if (error) {
        console.error('Address search error:', error);
        throw error;
      }

      console.log('Address search response:', data);
      if (data?.predictions && Array.isArray(data.predictions)) {
        setSuggestions(data.predictions);
      } else {
        console.log('No predictions found in response');
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error searching addresses:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSuggestion = async (suggestion: any) => {
    try {
      console.log('Selecting suggestion:', suggestion);
      const { data, error } = await supabase.functions.invoke('google-places-details', {
        body: { placeId: suggestion.place_id }
      });

      if (error) {
        console.error('Place details error:', error);
        throw error;
      }

      console.log('Place details response:', data);
      if (data?.parsedAddress) {
        const addressData: AddressData = {
          fullAddress: data.parsedAddress.fullAddress,
          street: data.parsedAddress.street,
          city: data.parsedAddress.city,
          state: data.parsedAddress.state,
          postcode: data.parsedAddress.postcode,
          country: data.parsedAddress.country,
          lat: data.parsedAddress.lat,
          lng: data.parsedAddress.lng,
          name: data.parsedAddress.name
        };

        setSelectedAddress(addressData);
        updateMapLocation(addressData.lat, addressData.lng);
        setSearchQuery(addressData.fullAddress);
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error getting place details:', error);
    }
  };

  const geocodeAddress = async (address: string) => {
    if (!window.google) return;

    const geocoder = new window.google.maps.Geocoder();
    
    try {
      console.log('Geocoding address:', address);
      const response = await new Promise((resolve, reject) => {
        geocoder.geocode({ address }, (results: any, status: any) => {
          if (status === 'OK') resolve(results);
          else reject(new Error(`Geocoding failed: ${status}`));
        });
      });

      const result = (response as any)[0];
      if (result) {
        const lat = result.geometry.location.lat();
        const lng = result.geometry.location.lng();
        updateMapLocation(lat, lng);
        reverseGeocode(lat, lng);
      }
    } catch (error) {
      console.error('Geocoding failed:', error);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    if (!window.google) return;

    const geocoder = new window.google.maps.Geocoder();
    
    try {
      console.log('Reverse geocoding:', lat, lng);
      const response = await new Promise((resolve, reject) => {
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
          if (status === 'OK') resolve(results);
          else reject(new Error(`Reverse geocoding failed: ${status}`));
        });
      });

      const result = (response as any)[0];
      if (result) {
        const addressData: AddressData = {
          fullAddress: result.formatted_address,
          street: '',
          city: '',
          state: '',
          postcode: '',
          country: '',
          lat,
          lng
        };

        // Parse address components
        result.address_components.forEach((component: any) => {
          const types = component.types;
          
          if (types.includes('street_number') || types.includes('route')) {
            addressData.street += (addressData.street ? ' ' : '') + component.long_name;
          } else if (types.includes('locality') || types.includes('administrative_area_level_2')) {
            addressData.city = component.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            addressData.state = component.short_name;
          } else if (types.includes('postal_code')) {
            addressData.postcode = component.long_name;
          } else if (types.includes('country')) {
            addressData.country = component.long_name;
          }
        });

        setSelectedAddress(addressData);
        setSearchQuery(addressData.fullAddress);
        updateMapLocation(lat, lng);
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
    }
  };

  const updateMapLocation = (lat: number, lng: number) => {
    if (!mapInstanceRef.current || !window.google) return;

    const position = { lat, lng };
    
    // Update map center
    mapInstanceRef.current.setCenter(position);
    mapInstanceRef.current.setZoom(16);

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    // Add new marker
    markerRef.current = new window.google.maps.Marker({
      position,
      map: mapInstanceRef.current,
      draggable: true,
      title: 'Selected Location'
    });

    // Add drag listener to marker
    markerRef.current.addListener('dragend', (event: any) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      reverseGeocode(lat, lng);
    });
  };

  const handleConfirmSelection = () => {
    if (selectedAddress) {
      onAddressSelect(selectedAddress);
      onClose();
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSuggestions([]);
    setSelectedAddress(null);
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* API Key Input (shown when key is missing) */}
          {showApiKeyInput && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">Google Maps API Key Required</h4>
              <p className="text-sm text-yellow-700 mb-3">
                Please enter your Google Maps API key to use the map functionality.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter your Google Maps API key..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleApiKeySubmit} disabled={!apiKeyInput.trim()}>
                  Set Key
                </Button>
              </div>
              <p className="text-xs text-yellow-600 mt-2">
                Get your API key from the Google Cloud Console and enable Maps JavaScript API, Places API, and Geocoding API.
              </p>
            </div>
          )}

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search for an address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              disabled={showApiKeyInput}
            />
            
            {isSearching && (
              <div className="absolute right-3 top-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900" />
              </div>
            )}
            
            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && !showApiKeyInput && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.place_id}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                    onClick={() => selectSuggestion(suggestion)}
                  >
                    <div className="font-medium text-sm">
                      {suggestion.structured_formatting.main_text}
                    </div>
                    <div className="text-xs text-gray-600">
                      {suggestion.structured_formatting.secondary_text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Map Container */}
          <div className="relative">
            {isLoadingMaps ? (
              <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading map...</p>
                </div>
              </div>
            ) : mapError ? (
              <div className="h-96 bg-red-50 rounded-lg flex items-center justify-center">
                <div className="text-center max-w-md p-4">
                  <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-red-600 mb-2">{mapError}</p>
                  {showApiKeyInput && (
                    <p className="text-sm text-red-500">
                      Please enter your Google Maps API key above to continue.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div ref={mapRef} className="h-96 w-full rounded-lg" />
            )}
          </div>

          {/* Instructions */}
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <p className="font-medium mb-1">How to use:</p>
            <ul className="space-y-1 text-xs">
              <li>• Search for an address in the search box above</li>
              <li>• Click on the map to select a location</li>
              <li>• Drag the marker to fine-tune the position</li>
              <li>• Click "Confirm Selection" when you're ready</li>
            </ul>
          </div>

          {/* Selected Address Display */}
          {selectedAddress && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Selected Address:</h4>
              <p className="text-sm text-green-700">{selectedAddress.fullAddress}</p>
              {selectedAddress.lat && selectedAddress.lng && (
                <p className="text-xs text-green-600 mt-1">
                  Coordinates: {selectedAddress.lat.toFixed(6)}, {selectedAddress.lng.toFixed(6)}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmSelection}
              disabled={!selectedAddress || showApiKeyInput}
              className="flex-1"
            >
              Confirm Selection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
