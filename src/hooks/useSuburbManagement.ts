
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Suburb {
  id: string;
  name: string;
  state: string;
  postcode: string;
  delivery_rate: string;
  distance_km: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useSuburbManagement() {
  const [suburbs, setSuburbs] = useState<Suburb[]>([]);
  const { toast } = useToast();

  // Fetch all suburbs (not just active ones for management)
  useEffect(() => {
    fetchSuburbs();
  }, []);

  const fetchSuburbs = async () => {
    try {
      const { data, error } = await supabase
        .from('suburbs')
        .select('*')
        .order('name');

      if (error) throw error;
      setSuburbs(data || []);
    } catch (error) {
      console.error('Error fetching suburbs:', error);
    }
  };

  // Refresh function for external use
  const refreshSuburbs = () => {
    fetchSuburbs();
  };

  const findSuburbByPostcode = (postcode: string): Suburb | null => {
    if (!postcode || suburbs.length === 0) return null;
    
    // Find exact postcode match
    const matchingSuburb = suburbs.find(suburb => suburb.postcode === postcode);
    return matchingSuburb || null;
  };

  const findSuburbByNameOnly = (suburbName: string): Suburb | null => {
    if (!suburbName || suburbs.length === 0) return null;
    
    // Find suburb by name only (case-insensitive)
    const nameMatch = suburbs.find(suburb => 
      suburb.name.toLowerCase() === suburbName.toLowerCase()
    );
    
    return nameMatch || null;
  };

  const handleAutoSuburbSelection = (
    suburbName: string,
    onSuburbChange: (suburbId: string, suburb?: Suburb) => void
  ) => {
    const matchingSuburb = findSuburbByNameOnly(suburbName);
    
    if (matchingSuburb) {
      console.log('Auto-selecting suburb by name:', matchingSuburb);
      onSuburbChange(matchingSuburb.id, matchingSuburb);
      
      const distanceText = matchingSuburb.distance_km ? ` (${matchingSuburb.distance_km}km away)` : '';
      
      toast({
        title: "Suburb Auto-Selected",
        description: `${matchingSuburb.name} selected based on suburb name "${suburbName}"${distanceText}. Estimated delivery: ${matchingSuburb.delivery_rate}`,
        duration: 3000,
      });
    } else {
      console.log('No matching suburb found for name:', suburbName);
      toast({
        title: "No Matching Suburb",
        description: `No delivery suburb found for "${suburbName}". Please select manually.`,
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  return {
    suburbs,
    refreshSuburbs,
    findSuburbByPostcode,
    findSuburbByNameOnly,
    handleAutoSuburbSelection
  };
}
