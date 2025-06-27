import React, { useState, useRef, useEffect } from 'react';
import { Input } from './input';
import { Label } from './label';
import { Badge } from './badge';
import { Search, CheckCircle, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

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
  showValidation = true
}: EnhancedAddressInputProps) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [sessionToken] = useState(() => Math.random().toString(36).substring(7));
  const [hasSearched, setHasSearched] = useState(false);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [isValidAddress, setIsValidAddress] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const debouncedValue = useDebounce(value, 500);

  // Fetch predictions when user types
  useEffect(() => {
    if (debouncedValue && debouncedValue.length > 2) {
      fetchPredictions(debouncedValue);
    } else {
      setPredictions([]);
      setShowDropdown(false);
      setValidationStatus('idle');
      setHasSearched(false);
      setIsUsingFallback(false);
      setIsValidAddress(false);
    }
  }, [debouncedValue]);

  // Update validation callback
  useEffect(() => {
    // Consider address valid if it's been selected from predictions or if it's a reasonable length
    const isValid = isValidAddress || (value.length > 10 && value.includes(','));
    onValidationChange?.(isValid);
  }, [isValidAddress, value, onValidationChange]);

  const fetchPredictions = async (input: string) => {
    setIsLoading(true);
    setValidationStatus('validating');
    setHasSearched(true);
    
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
    if (!window.google?.maps?.places?.AutocompleteService) {
      console.log('Google Maps not available for client-side fallback');
      setValidationStatus('invalid');
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
      } else {
        setValidationStatus('invalid');
      }
    } catch (error) {
      console.error('Client-side places search failed:', error);
      setValidationStatus('invalid');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    if (newValue.length <= 2) {
      setShowDropdown(false);
      setPredictions([]);
      setValidationStatus('idle');
      setHasSearched(false);
      setIsUsingFallback(false);
      setIsValidAddress(false);
    } else {
      setIsValidAddress(false); // Reset validation when user types
    }
  };

  const handlePredictionSelect = async (prediction: PlacePrediction) => {
    onChange(prediction.description);
    setShowDropdown(false);
    setPredictions([]);
    setValidationStatus('validating');
    setIsValidAddress(true); // Mark as valid since it's from predictions
    
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
      }
    } catch (error) {
      console.error('Error getting address details:', error);
      await tryClientSideDetails(prediction.place_id);
    }
  };

  const tryClientSideDetails = async (placeId: string) => {
    if (!window.google?.maps?.places?.PlacesService) {
      console.log('Google Places PlacesService not available');
      setValidationStatus('valid'); // Still consider it valid since it came from predictions
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
      }
    } catch (error) {
      console.error('Client-side place details failed:', error);
      setValidationStatus('valid'); // Still consider valid since from predictions
    }
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
        {validationStatus === 'invalid' && hasSearched && (
          <Badge variant="secondary" className="text-red-700 bg-red-100">
            <AlertCircle className="w-3 h-3 mr-1" />
            No matching addresses found
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      {label && <Label htmlFor={id}>{label}</Label>}
      
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          id={id}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          className={`pl-10 pr-10 ${className || ''} ${
            validationStatus === 'invalid' ? 'border-red-300 focus:border-red-500' : ''
          }`}
          autoComplete="off"
        />
        
        <div className="absolute right-3 top-3">
          {getValidationIcon()}
        </div>
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
    </div>
  );
}
