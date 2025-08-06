
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

  const findSuburbByNameAndPostcode = (city: string, postcode: string): Suburb | null => {
    if (!city && !postcode) return null;
    if (suburbs.length === 0) return null;
    
    // Primary: Match by both name and postcode (exact match)
    if (city && postcode) {
      const exactMatch = suburbs.find(suburb => 
        suburb.name.toLowerCase() === city.toLowerCase() && 
        suburb.postcode === postcode
      );
      if (exactMatch) return exactMatch;
    }
    
    // Secondary: Match by name only (case-insensitive)
    if (city) {
      const nameMatch = suburbs.find(suburb => 
        suburb.name.toLowerCase() === city.toLowerCase()
      );
      if (nameMatch) return nameMatch;
    }
    
    // Fallback: Original postcode-only logic
    if (postcode) {
      return findSuburbByPostcode(postcode);
    }
    
    return null;
  };

  const handleAutoSuburbSelection = (
    cityOrPostcode: string,
    onSuburbChange: (suburbId: string, suburb?: Suburb) => void,
    postcode?: string
  ) => {
    let matchingSuburb: Suburb | null = null;
    let matchMethod = '';
    
    // If we have both city and postcode (new method)
    if (postcode) {
      matchingSuburb = findSuburbByNameAndPostcode(cityOrPostcode, postcode);
      if (matchingSuburb) {
        if (matchingSuburb.name.toLowerCase() === cityOrPostcode.toLowerCase() && matchingSuburb.postcode === postcode) {
          matchMethod = `based on suburb name "${cityOrPostcode}" and postcode ${postcode}`;
        } else if (matchingSuburb.name.toLowerCase() === cityOrPostcode.toLowerCase()) {
          matchMethod = `based on suburb name "${cityOrPostcode}"`;
        } else {
          matchMethod = `based on postcode ${postcode}`;
        }
      }
    } else {
      // Fallback to old method (postcode only)
      matchingSuburb = findSuburbByPostcode(cityOrPostcode);
      if (matchingSuburb) {
        matchMethod = `based on postcode ${cityOrPostcode}`;
      }
    }
    
    if (matchingSuburb) {
      console.log('Auto-selecting suburb:', matchingSuburb);
      onSuburbChange(matchingSuburb.id, matchingSuburb);
      
      const distanceText = matchingSuburb.distance_km ? ` (${matchingSuburb.distance_km}km away)` : '';
      
      toast({
        title: "Suburb Auto-Selected",
        description: `${matchingSuburb.name} selected ${matchMethod}${distanceText}. Estimated delivery: ${matchingSuburb.delivery_rate}`,
        duration: 3000,
      });
    } else {
      const searchTerm = postcode ? `suburb "${cityOrPostcode}" with postcode ${postcode}` : `postcode ${cityOrPostcode}`;
      console.log('No matching suburb found for:', searchTerm);
      toast({
        title: "No Matching Suburb",
        description: `No delivery suburb found for ${searchTerm}. Please select manually.`,
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  return {
    suburbs,
    refreshSuburbs,
    findSuburbByPostcode,
    findSuburbByNameAndPostcode,
    handleAutoSuburbSelection
  };
}
