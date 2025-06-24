
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { MapPin, Search } from 'lucide-react';
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
  
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const { 
    initializeMap, 
    searchAddresses, 
    getPlaceDetails, 
    reverseGeocode,
    cleanup 
  } = useGoogleMaps();

  // Load Google Maps script
  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => {
        setIsLoadingMaps(false);
        setMapError(null);
        setShowApiKeyInput(false);
      })
      .catch((error) => {
        setMapError(error.message);
        setShowApiKeyInput(true);
        setIsLoadingMaps(false);
      });
  }, []);

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
    setIsSearching(true);
    try {
      const predictions = await searchAddresses(query);
      setSuggestions(predictions);
    } catch (error) {
      console.error('Error searching addresses:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSuggestionSelect = async (suggestion: any) => {
    try {
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
      }
    } catch (error) {
      console.error('Error getting place details:', error);
    }
  };

  const handleMapReady = (mapElement: HTMLDivElement) => {
    const map = initializeMap(mapElement, initialAddress);
    
    // Add click listener for reverse geocoding
    map.addListener('click', async (event: any) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      const addressData = await reverseGeocode(lat, lng);
      if (addressData) {
        setSelectedAddress(addressData);
        setSearchQuery(addressData.fullAddress);
      }
    });
  };

  const handleApiKeySubmit = () => {
    window.location.reload();
  };

  const handleConfirmSelection = () => {
    if (selectedAddress) {
      console.log('Confirming address selection:', selectedAddress);
      onAddressSelect(selectedAddress);
      onClose();
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSuggestions([]);
    setSelectedAddress(null);
    cleanup();
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
          {/* API Key Input */}
          {showApiKeyInput && (
            <ApiKeyInput onApiKeySubmit={handleApiKeySubmit} />
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
            <AddressSuggestions 
              suggestions={suggestions}
              onSuggestionSelect={handleSuggestionSelect}
            />
          </div>

          {/* Map Container */}
          <MapContainer
            isLoading={isLoadingMaps}
            error={mapError}
            onMapReady={handleMapReady}
          />

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
