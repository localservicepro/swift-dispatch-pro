
import React, { useState, useRef, useEffect } from 'react';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';
import { Badge } from './badge';
import { MapPin, Search, CheckCircle, AlertCircle, Map } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import { GoogleMapsLightbox } from './google-maps-lightbox';

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
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const debouncedValue = useDebounce(value, 300);

  // Fetch predictions when user types
  useEffect(() => {
    if (debouncedValue && debouncedValue.length > 2) {
      fetchPredictions(debouncedValue);
    } else {
      setPredictions([]);
      setShowDropdown(false);
      setValidationStatus('idle');
      setHasSearched(false);
    }
  }, [debouncedValue]);

  const fetchPredictions = async (input: string) => {
    setIsLoading(true);
    setValidationStatus('validating');
    setHasSearched(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('google-places', {
        body: { input, sessionToken }
      });

      if (error) {
        console.error('Google Places API error:', error);
        throw error;
      }

      if (data.predictions && data.predictions.length > 0) {
        setPredictions(data.predictions);
        setShowDropdown(true);
        setSelectedIndex(-1);
        setValidationStatus('idle'); // Don't show valid until user selects
        onValidationChange?.(true);
      } else {
        // No predictions found - auto-open map lightbox after a short delay
        setPredictions([]);
        setShowDropdown(false);
        setValidationStatus('idle'); // Don't show invalid immediately
        
        // Auto-open map lightbox when no results found
        setTimeout(() => {
          console.log('No address predictions found, opening map lightbox');
          setShowMapLightbox(true);
        }, 500);
      }
    } catch (error) {
      console.error('Error fetching address predictions:', error);
      setPredictions([]);
      setShowDropdown(false);
      setValidationStatus('idle'); // Don't show invalid on API error
      
      // Auto-open map lightbox on API error too
      setTimeout(() => {
        console.log('Address lookup failed, opening map lightbox');
        setShowMapLightbox(true);
      }, 500);
      
      onValidationChange?.(false);
    } finally {
      setIsLoading(false);
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
    }
  };

  const handlePredictionSelect = async (prediction: PlacePrediction) => {
    onChange(prediction.description);
    setShowDropdown(false);
    setPredictions([]);
    setValidationStatus('validating');
    
    // Get detailed address information
    try {
      const { data, error } = await supabase.functions.invoke('google-places-details', {
        body: { placeId: prediction.place_id, sessionToken }
      });

      if (error) throw error;

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
      setValidationStatus('invalid');
      onValidationChange?.(false);
    }
  };

  const handleMapAddressSelect = (addressData: AddressData) => {
    onChange(addressData.fullAddress);
    onAddressSelect?.(addressData);
    setValidationStatus('valid');
    onValidationChange?.(true);
    setShowMapLightbox(false);
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
        {hasSearched && predictions.length === 0 && !isLoading && validationStatus === 'idle' && value.length > 2 && (
          <Badge variant="outline" className="text-blue-700 bg-blue-50">
            <Map className="w-3 h-3 mr-1" />
            Try the map to find your address
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
