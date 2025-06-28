import React, { useState, useRef, useEffect } from 'react';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';
import { Badge } from './badge';
import { MapPin, Search, CheckCircle, AlertCircle, Map, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import { GoogleMapsLightbox } from './google-maps-lightbox';
import { loadGoogleMapsScript } from '@/utils/googleMapsConfig';

interface AddressData {
  fullAddress: string;
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  lat?: number;
  lng?: number;
  name?: string;
}

interface EnhancedAddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (addressData: AddressData) => void;
  onValidationChange?: (isValid: boolean) => void;
  placeholder?: string;
  label?: string;
  id?: string;
  required?: boolean;
  className?: string;
  showMapButton?: boolean;
  showValidation?: boolean;
}

interface PlacePrediction {
  description: string;
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export function EnhancedAddressInput({
  value,
  onChange,
  onAddressSelect,
  onValidationChange,
  placeholder = "Start typing an address...",
  label,
  id,
  required = false,
  className,
  showMapButton = true,
  showValidation = true
}: EnhancedAddressInputProps) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [showMapLightbox, setShowMapLightbox] = useState(false);
  const [sessionToken] = useState(() => Math.random().toString(36).substring(7));
  const [hasSearched, setHasSearched] = useState(false);
  const [searchAttempts, setSearchAttempts] = useState(0);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const debouncedValue = useDebounce(value, 500);

  // Load Google Maps script on component mount
  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => {
        console.log('Google Maps script loaded successfully');
        setGoogleMapsLoaded(true);
      })
      .catch((error) => {
        console.error('Failed to load Google Maps:', error);
        setGoogleMapsLoaded(false);
      });
  }, []);

  // Fetch predictions when user types
  useEffect(() => {
    if (debouncedValue && debouncedValue.length > 2 && isUserTyping) {
      fetchPredictions(debouncedValue);
    } else if (!isUserTyping) {
      // Reset validation state when component loads with existing data
      setPredictions([]);
      setShowDropdown(false);
      setValidationStatus('idle');
      setHasSearched(false);
      setSearchAttempts(0);
      setIsUsingFallback(false);
    } else {
      setPredictions([]);
      setShowDropdown(false);
      setValidationStatus('idle');
      setHasSearched(false);
      setSearchAttempts(0);
      setIsUsingFallback(false);
    }
  }, [debouncedValue, isUserTyping]);

  const fetchPredictions = async (input: string) => {
    setIsLoading(true);
    setValidationStatus('validating');
    setHasSearched(true);
    setSearchAttempts(prev => prev + 1);
    
    try {
      console.log('Fetching predictions for:', input);
      
      // Try edge function first
      const { data, error } = await supabase.functions.invoke('google-places', {
        body: { input, sessionToken }
      });

      if (error || data?.error || data?.fallback) {
        console.log('Edge function failed, trying client-side fallback:', error || data?.error);
        await tryClientSideFallback(input);
        return;
      }

      console.log('Edge function predictions response:', data);

      if (data.predictions && data.predictions.length > 0) {
        setPredictions(data.predictions);
        setShowDropdown(true);
        setSelectedIndex(-1);
        setValidationStatus('idle');
        setIsUsingFallback(false);
        onValidationChange?.(true);
      } else {
        console.log('No predictions from edge function, trying client-side fallback');
        await tryClientSideFallback(input);
      }
    } catch (error) {
      console.error('Error fetching address predictions:', error);
      await tryClientSideFallback(input);
    } finally {
      setIsLoading(false);
    }
  };

  const tryClientSideFallback = async (input: string) => {
    if (!googleMapsLoaded || !window.google?.maps?.places?.AutocompleteService) {
      console.error('Google Maps not available for client-side fallback');
      handleSearchFailure();
      return;
    }

    try {
      console.log('Using client-side Google Places API');
      setIsUsingFallback(true);
      
      const service = new window.google.maps.places.AutocompleteService();
      const response = await new Promise((resolve, reject) => {
        service.getPlacePredictions(
          {
            input,
            types: ['address'],
            componentRestrictions: { country: 'au' }
          },
          (predictions: any, status: any) => {
            if (status === 'OK') resolve(predictions || []);
            else reject(new Error(`Places search failed: ${status}`));
          }
        );
      });

      const clientPredictions = response as any[];
      console.log('Client-side predictions:', clientPredictions.length);
      
      if (clientPredictions.length > 0) {
        setPredictions(clientPredictions);
        setShowDropdown(true);
        setSelectedIndex(-1);
        setValidationStatus('idle');
        onValidationChange?.(true);
      } else {
        handleSearchFailure();
      }
    } catch (error) {
      console.error('Client-side places search failed:', error);
      handleSearchFailure();
    }
  };

  const handleSearchFailure = () => {
    setPredictions([]);
    setShowDropdown(false);
    setValidationStatus('idle');
    onValidationChange?.(false);
    
    // Remove the automatic map opening - users can manually click the map button if needed
    console.log('Search failed - use map button to select address manually');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsUserTyping(true);
    
    if (newValue.length <= 2) {
      setShowDropdown(false);
      setPredictions([]);
      setValidationStatus('idle');
      setHasSearched(false);
      setSearchAttempts(0);
      setIsUsingFallback(false);
    }
  };

  const handleInputFocus = () => {
    setIsUserTyping(true);
  };

  const handlePredictionSelect = async (prediction: PlacePrediction) => {
    onChange(prediction.description);
    setShowDropdown(false);
    setPredictions([]);
    setValidationStatus('validating');
    
    // Get detailed address information
    try {
      console.log('Getting details for prediction:', prediction);
      
      // Try edge function first
      const { data, error } = await supabase.functions.invoke('google-places-details', {
        body: { placeId: prediction.place_id, sessionToken }
      });

      if (error || data?.error || data?.fallback) {
        console.log('Edge function details failed, trying client-side:', error || data?.error);
        await tryClientSideDetails(prediction.place_id);
        return;
      }

      console.log('Place details response:', data);

      if (data.parsedAddress && onAddressSelect) {
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
        
        onAddressSelect(addressData);
        setValidationStatus('valid');
        onValidationChange?.(true);
      }
    } catch (error) {
      console.error('Error getting address details:', error);
      await tryClientSideDetails(prediction.place_id);
    }
  };

  const tryClientSideDetails = async (placeId: string) => {
    if (!googleMapsLoaded || !window.google?.maps?.places?.PlacesService) {
      console.error('Google Places PlacesService not available');
      setValidationStatus('invalid');
      onValidationChange?.(false);
      return;
    }

    try {
      const service = new window.google.maps.places.PlacesService(
        document.createElement('div')
      );
      
      const response = await new Promise((resolve, reject) => {
        service.getDetails(
          {
            placeId,
            fields: ['formatted_address', 'address_components', 'geometry', 'name']
          },
          (place: any, status: any) => {
            if (status === 'OK') resolve(place);
            else reject(new Error(`Place details failed: ${status}`));
          }
        );
      });

      const place = response as any;
      if (place && onAddressSelect) {
        const addressComponents = place.address_components || [];
        const geometry = place.geometry || {};
        
        const parsedAddress: AddressData = {
          fullAddress: place.formatted_address,
          name: place.name || '',
          street: '',
          city: '',
          state: '',
          postcode: '',
          country: '',
          lat: geometry.location?.lat() || null,
          lng: geometry.location?.lng() || null,
        };

        // Parse address components
        addressComponents.forEach((component: any) => {
          const types = component.types || [];
          
          if (types.includes('street_number') || types.includes('route')) {
            parsedAddress.street += (parsedAddress.street ? ' ' : '') + component.long_name;
          } else if (types.includes('locality') || types.includes('administrative_area_level_2')) {
            parsedAddress.city = component.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            parsedAddress.state = component.short_name;
          } else if (types.includes('postal_code')) {
            parsedAddress.postcode = component.long_name;
          } else if (types.includes('country')) {
            parsedAddress.country = component.long_name;
          }
        });

        onAddressSelect(parsedAddress);
        setValidationStatus('valid');
        onValidationChange?.(true);
      }
    } catch (error) {
      console.error('Client-side place details failed:', error);
      setValidationStatus('invalid');
      onValidationChange?.(false);
    }
  };

  const handleMapAddressSelect = (addressData: AddressData) => {
    console.log('Address selected from map:', addressData);
    onChange(addressData.fullAddress);
    onAddressSelect?.(addressData);
    setValidationStatus('valid');
    onValidationChange?.(true);
    setShowMapLightbox(false);
    setIsUserTyping(false); // Reset typing flag after map selection
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < predictions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && predictions[selectedIndex]) {
          handlePredictionSelect(predictions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Delay hiding dropdown to allow for click selection
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setShowDropdown(false);
      }
    }, 150);
  };

  const handleMapButtonClick = () => {
    setShowMapLightbox(true);
  };

  const getValidationIcon = () => {
    if (!showValidation) return null;
    
    switch (validationStatus) {
      case 'validating':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900" />;
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'invalid':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getValidationStatus = () => {
    if (!showValidation) return null;
    
    return (
      <div className="flex items-center gap-2 mt-1">
        {isUsingFallback && (
          <Badge variant="outline" className="text-orange-700 bg-orange-50">
            <WifiOff className="w-3 h-3 mr-1" />
            Using backup search
          </Badge>
        )}
        {!isUsingFallback && predictions.length > 0 && (
          <Badge variant="outline" className="text-green-700 bg-green-50">
            <Wifi className="w-3 h-3 mr-1" />
            Server search active
          </Badge>
        )}
        {validationStatus === 'valid' && (
          <Badge variant="secondary" className="text-green-700 bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Valid Address
          </Badge>
        )}
        {validationStatus === 'invalid' && (
          <Badge variant="destructive" className="text-red-700 bg-red-100">
            <AlertCircle className="w-3 h-3 mr-1" />
            Address Not Found
          </Badge>
        )}
        {hasSearched && predictions.length === 0 && !isLoading && validationStatus === 'idle' && value.length > 2 && searchAttempts > 0 && isUserTyping && (
          <Badge variant="outline" className="text-blue-700 bg-blue-50">
            <Map className="w-3 h-3 mr-1" />
            No results found - try using the map button to select your address
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      {label && <Label htmlFor={id}>{label}</Label>}
      
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            ref={inputRef}
            id={id}
            value={value}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            required={required}
            className={`pl-10 pr-10 ${className || ''}`}
            autoComplete="off"
          />
          
          <div className="absolute right-3 top-3">
            {getValidationIcon()}
          </div>
        </div>
        
        {showMapButton && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleMapButtonClick}
            title="Select on map"
          >
            <Map className="w-4 h-4" />
          </Button>
        )}
      </div>

      {getValidationStatus()}

      {/* Predictions Dropdown */}
      {showDropdown && predictions.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {predictions.map((prediction, index) => (
            <div
              key={prediction.place_id}
              className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                index === selectedIndex ? 'bg-gray-100' : ''
              }`}
              onClick={() => handlePredictionSelect(prediction)}
            >
              <div className="font-medium text-sm">
                {prediction.structured_formatting.main_text}
              </div>
              <div className="text-xs text-gray-600">
                {prediction.structured_formatting.secondary_text}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Map Lightbox */}
      <GoogleMapsLightbox
        isOpen={showMapLightbox}
        onClose={() => setShowMapLightbox(false)}
        onAddressSelect={handleMapAddressSelect}
        initialAddress={value}
        title="Select Address on Map"
      />
    </div>
  );
}
