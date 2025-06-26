
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SuburbSelector } from "@/components/order/SuburbSelector";
import { EnhancedAddressInput } from "@/components/ui/enhanced-address-input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Suburb {
  id: string;
  name: string;
  state: string;
  postcode: string;
  delivery_rate: number;
}

interface CustomerAddressFormProps {
  formData: {
    full_address: string;
    suburb_id: string;
  };
  deliveryRate: number;
  onFormDataChange: (updates: Partial<CustomerAddressFormProps['formData']>) => void;
  onSuburbChange: (suburbId: string, rate: number) => void;
}

export function CustomerAddressForm({ 
  formData, 
  deliveryRate, 
  onFormDataChange, 
  onSuburbChange 
}: CustomerAddressFormProps) {
  const [suburbs, setSuburbs] = useState<Suburb[]>([]);
  const { toast } = useToast();

  // Fetch suburbs for postcode matching
  useEffect(() => {
    fetchSuburbs();
  }, []);

  const fetchSuburbs = async () => {
    try {
      const { data, error } = await supabase
        .from('suburbs')
        .select('id, name, state, postcode, delivery_rate')
        .eq('is_active', true);

      if (error) throw error;
      setSuburbs(data || []);
    } catch (error) {
      console.error('Error fetching suburbs:', error);
    }
  };

  const findSuburbByPostcode = (postcode: string): Suburb | null => {
    if (!postcode || suburbs.length === 0) return null;
    
    // Find exact postcode match
    const matchingSuburb = suburbs.find(suburb => suburb.postcode === postcode);
    return matchingSuburb || null;
  };

  const handleAddressSelect = (addressData: any) => {
    console.log('Address selected:', addressData);
    onFormDataChange({ full_address: addressData.fullAddress });
    
    // Auto-select suburb based on postcode if available
    if (addressData.postcode) {
      const matchingSuburb = findSuburbByPostcode(addressData.postcode);
      
      if (matchingSuburb) {
        console.log('Auto-selecting suburb:', matchingSuburb);
        onSuburbChange(matchingSuburb.id, matchingSuburb.delivery_rate);
        
        toast({
          title: "Suburb Auto-Selected",
          description: `${matchingSuburb.name}, ${matchingSuburb.state} selected based on postcode ${addressData.postcode}`,
          duration: 3000,
        });
      } else {
        console.log('No matching suburb found for postcode:', addressData.postcode);
        toast({
          title: "No Matching Suburb",
          description: `No delivery suburb found for postcode ${addressData.postcode}. Please select manually.`,
          variant: "destructive",
          duration: 4000,
        });
      }
    }
  };

  return (
    <>
      <div>
        <EnhancedAddressInput
          label="Full Address"
          value={formData.full_address}
          onChange={(value) => onFormDataChange({ full_address: value })}
          onAddressSelect={handleAddressSelect}
          placeholder="Start typing your address..."
          required
          showMapButton={true}
          showValidation={true}
        />
      </div>

      <SuburbSelector
        selectedSuburbId={formData.suburb_id}
        onSuburbChange={onSuburbChange}
      />

      {deliveryRate > 0 && (
        <div className="text-sm text-gray-600">
          Delivery Rate: ${deliveryRate.toFixed(2)}
        </div>
      )}
    </>
  );
}
