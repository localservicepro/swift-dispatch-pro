
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

export function createAddressSelectHandler(
  onFormDataChange: (updates: { full_address: string }) => void,
  onAutoSuburbSelection: (postcode: string) => void
) {
  return (addressData: AddressData) => {
    console.log('Address selected:', addressData);
    onFormDataChange({ full_address: addressData.fullAddress });
    
    // Auto-select suburb based on postcode if available
    if (addressData.postcode) {
      onAutoSuburbSelection(addressData.postcode);
    }
  };
}
