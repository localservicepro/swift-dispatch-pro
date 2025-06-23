
import React from 'react';
import { EnhancedAddressInput } from './enhanced-address-input';

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

interface GoogleAddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (addressData: AddressData) => void;
  placeholder?: string;
  label?: string;
  id?: string;
  required?: boolean;
  className?: string;
}

export function GoogleAddressAutocomplete(props: GoogleAddressAutocompleteProps) {
  // Use the enhanced address input component
  return <EnhancedAddressInput {...props} />;
}
