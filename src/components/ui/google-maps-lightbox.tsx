
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { MapPin, Search, X } from 'lucide-react';
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
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const autocompleteServiceRef = useRef<any>(null);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Load Google Maps script
  useEffect(() => {
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NODE_ENV === 'development' ? 'YOUR_GOOGLE_MAPS_API_KEY_FOR_CLIENT' : 'YOUR_GOOGLE_MAPS_API_KEY_FOR_CLIENT'}&libraries=places&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      
      window.initGoogleMaps = () => {
        setIsLoadingMaps(false);
      };
      
      script.onerror = () => {
        setMapError('Failed to load Google Maps. Please check your API key configuration.');
        setIsLoadingMaps(false);
      };
      
      document.head.appendChild(script);
    } else {
      setIsLoadingMaps(false);
    }
  }, []);

  // Initialize map when dialog opens
  useEffect(() => {
    if (isOpen && !isLoadingMaps && window.google && mapRef.current && !mapInstanceRef.current) {
      try {
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
          reverseGeocode(lat, lng);
        });

      } catch (error) {
        console.error('Error initializing map:', error);
        setMapError('Failed to initialize map. Please try again.');
      }
    }
  }, [isOpen, isLoadingMaps]);

  // Search for addresses using our edge function
  useEffect(() => {
    if (debouncedSearchQuery && debouncedSearchQuery.length > 2) {
      searchAddresses(debouncedSearchQuery);
    } else {
      setSuggestions([]);
    }
  }, [debouncedSearchQuery]);

  const searchAddresses = async (query: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('google-places', {
        body: { input: query }
      });

      if (error) throw error;

      if (data.predictions) {
        setSuggestions(data.predictions);
      }
    } catch (error) {
      console.error('Error searching addresses:', error);
    }
  };

  const selectSuggestion = async (suggestion: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('google-places-details', {
        body: { placeId: suggestion.place_id }
      });

      if (error) throw error;

      if (data.parsedAddress) {
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

  const reverseGeocode = async (lat: number, lng: number) => {
    if (!window.google) return;

    const geocoder = new window.google.maps.Geocoder();
    
    try {
      const response = await new Promise((resolve, reject) => {
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
          if (status === 'OK') resolve(results);
          else reject(new Error(`Geocoding failed: ${status}`));
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
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search for an address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            
            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
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
                <div className="text-center">
                  <X className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-red-600">{mapError}</p>
                </div>
              </div>
            ) : (
              <div ref={mapRef} className="h-96 w-full rounded-lg" />
            )}
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
              disabled={!selectedAddress}
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
