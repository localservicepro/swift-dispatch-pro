
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Suburb {
  id: string;
  name: string;
  state: string;
  postcode: string;
  delivery_rate: number;
}

export function useSuburbManagement() {
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

  const handleAutoSuburbSelection = (
    postcode: string,
    onSuburbChange: (suburbId: string) => void
  ) => {
    const matchingSuburb = findSuburbByPostcode(postcode);
    
    if (matchingSuburb) {
      console.log('Auto-selecting suburb:', matchingSuburb);
      onSuburbChange(matchingSuburb.id);
      
      toast({
        title: "Suburb Auto-Selected",
        description: `${matchingSuburb.name} selected based on postcode ${postcode}. Estimated delivery: AU$${matchingSuburb.delivery_rate.toFixed(2)}`,
        duration: 3000,
      });
    } else {
      console.log('No matching suburb found for postcode:', postcode);
      toast({
        title: "No Matching Suburb",
        description: `No delivery suburb found for postcode ${postcode}. Please select manually.`,
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  return {
    suburbs,
    findSuburbByPostcode,
    handleAutoSuburbSelection
  };
}
