
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { MapPin, Search, AlertCircle } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { loadGoogleMapsScript } from '@/utils/googleMapsConfig';
import { ApiKeyInput } from './google-maps/api-key-input';
import { AddressSuggestions } from './google-maps/address-suggestions';
import { MapContainer } from './google-maps/map-container';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';

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
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const { 
    initializeMap, 
    searchAddresses, 
    getPlaceDetails, 
    reverseGeocode,
    cleanup 
  } = useGoogleMaps();

  // Load Google Maps script with retry logic
  useEffect(() => {
    const loadMaps = async () => {
      console.log('GoogleMapsLightbox: Starting to load Google Maps script...');
      setIsLoadingMaps(true);
      setMapError(null);
      
      try {
        await loadGoogleMapsScript();
        console.log('GoogleMapsLightbox: Google Maps script loaded successfully');
        setIsLoadingMaps(false);
        setMapError(null);
        setShowApiKeyInput(false);
      } catch (error: any) {
        console.error('GoogleMapsLightbox: Failed to load Google Maps script:', error);
        setMapError(error.message);
        setShowApiKeyInput(true);
        setIsLoadingMaps(false);
      }
    };

    if (isOpen) {
      // Check if Google Maps is already available
      if (window.google && window.google.maps) {
        console.log('GoogleMapsLightbox: Google Maps already available');
        setIsLoadingMaps(false);
        setMapError(null);
        setShowApiKeyInput(false);
      } else {
        loadMaps();
      }
    }
  }, [isOpen, retryCount]);

  // Update search query when initialAddress changes
  useEffect(() => {
    if (initialAddress && initialAddress !== searchQuery) {
      setSearchQuery(initialAddress);
    }
  }, [initialAddress]);

  // Search for addresses
  useEffect(() => {
    if (debouncedSearchQuery && debouncedSearchQuery.length > 2) {
      handleAddressSearch(debouncedSearchQuery);
    } else {
      setSuggestions([]);
    }
  }, [debouncedSearchQuery]);

  const handleAddressSearch = async (query: string) => {
    if (!window.google || !window.google.maps) {
      console.warn('GoogleMapsLightbox: Google Maps not available for search');
      return;
    }

    setIsSearching(true);
    try {
      console.log('GoogleMapsLightbox: Searching for addresses:', query);
      const predictions = await searchAddresses(query);
      setSuggestions(predictions);
    } catch (error) {
      console.error('GoogleMapsLightbox: Error searching addresses:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSuggestionSelect = async (suggestion: any) => {
    try {
      console.log('GoogleMapsLightbox: Getting place details for:', suggestion.place_id);
      const addressData = await getPlaceDetails(suggestion.place_id);
      if (addressData) {
        const fullAddressData: AddressData = {
          fullAddress: addressData.fullAddress,
          street: addressData.street,
          city: addressData.city,
          state: addressData.state,
          postcode: addressData.postcode,
          country: addressData.country,
          lat: addressData.lat,
          lng: addressData.lng,
          name: addressData.name
        };

        setSelectedAddress(fullAddressData);
        setSearchQuery(fullAddressData.fullAddress);
        setSuggestions([]);
        console.log('GoogleMapsLightbox: Address selected:', fullAddressData);
      }
    } catch (error) {
      console.error('GoogleMapsLightbox: Error getting place details:', error);
    }
  };

  const handleMapReady = (mapElement: HTMLDivElement) => {
    try {
      console.log('GoogleMapsLightbox: Initializing map...');
      const map = initializeMap(mapElement, initialAddress);
      
      // Add click listener for reverse geocoding
      map.addListener('click', async (event: any) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        console.log('GoogleMapsLightbox: Map clicked at:', lat, lng);
        const addressData = await reverseGeocode(lat, lng);
        if (addressData) {
          setSelectedAddress(addressData);
          setSearchQuery(addressData.fullAddress);
        }
      });

      setMapInitialized(true);
      console.log('GoogleMapsLightbox: Map initialized successfully');
    } catch (error) {
      console.error('GoogleMapsLightbox: Error initializing map:', error);
      setMapError('Failed to initialize map. Please try again.');
    }
  };

  const handleApiKeySubmit = () => {
    setRetryCount(prev => prev + 1);
  };

  const handleRetryMap = () => {
    setRetryCount(prev => prev + 1);
    setMapError(null);
    setMapInitialized(false);
  };

  const handleConfirmSelection = () => {
    if (selectedAddress) {
      console.log('GoogleMapsLightbox: Confirming address selection:', selectedAddress);
      onAddressSelect(selectedAddress);
      onClose();
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSuggestions([]);
    setSelectedAddress(null);
    setMapInitialized(false);
    cleanup();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0">
          {/* API Key Input */}
          {showApiKeyInput && (
            <div className="flex-shrink-0">
              <ApiKeyInput onApiKeySubmit={handleApiKeySubmit} />
            </div>
          )}

          {/* Search Input */}
          <div className="relative flex-shrink-0">
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
            <AddressSuggestions 
              suggestions={suggestions}
              onSuggestionSelect={handleSuggestionSelect}
            />
          </div>

          {/* Map Container */}
          <div className="flex-1 min-h-[300px]">
            {mapError ? (
              <div className="h-96 bg-red-50 rounded-lg flex items-center justify-center">
                <div className="text-center max-w-md p-4">
                  <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-red-600 mb-2 font-medium">Map Loading Error</p>
                  <p className="text-sm text-red-500 mb-4">{mapError}</p>
                  <Button onClick={handleRetryMap} variant="outline" size="sm">
                    Retry Loading Map
                  </Button>
                </div>
              </div>
            ) : (
              <MapContainer
                isLoading={isLoadingMaps}
                error={null}
                onMapReady={handleMapReady}
              />
            )}
          </div>

          {/* Selected Address Display */}
          {selectedAddress && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex-shrink-0">
              <h4 className="font-medium text-green-900 mb-2">Selected Address:</h4>
              <p className="text-sm text-green-700">{selectedAddress.fullAddress}</p>
              {selectedAddress.lat && selectedAddress.lng && (
                <p className="text-xs text-green-600 mt-1">
                  Coordinates: {selectedAddress.lat.toFixed(6)}, {selectedAddress.lng.toFixed(6)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex gap-2 pt-4 border-t flex-shrink-0">
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
      </DialogContent>
    </Dialog>
  );
}
