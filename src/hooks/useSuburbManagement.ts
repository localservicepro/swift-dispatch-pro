
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

  const findSuburbInAddress = (fullAddress: string): Suburb | null => {
    if (!fullAddress || suburbs.length === 0) return null;

    // Australian addresses look like:
    //   "12 Smith St, HORNSBY NSW 2077, Australia"
    // The suburb is (nearly) always in one of the trailing comma-separated
    // segments — never in the street segment. Scanning the whole string
    // (as the previous implementation did) matched suburb names inside
    // street names (e.g. "Kingston Road" incorrectly picked "Kingston"),
    // which produced the wrong delivery fee. We now:
    //   1) Prefer an EXACT suburb-name match inside any non-street segment
    //      (checked from the LAST segment backward to bias toward the real
    //      suburb line).
    //   2) Fall back to postcode match on those segments.
    //   3) Only as a last resort do a whole-string word-boundary scan.
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rawSegments = fullAddress.split(',').map(s => s.trim()).filter(Boolean);
    // Skip the first segment (street/number) unless the address has only one
    // segment; suburbs live in later segments.
    const suburbSegments = rawSegments.length > 1 ? rawSegments.slice(1) : rawSegments;
    const reversedSegments = [...suburbSegments].reverse();

    // Sort by name length desc so multi-word suburbs match before shorter
    // substrings ("Port Melbourne" beats "Port").
    const sortedSuburbs = [...suburbs].sort((a, b) => b.name.length - a.name.length);

    // 1) Exact suburb-name match in a trailing segment.
    for (const segment of reversedSegments) {
      for (const suburb of sortedSuburbs) {
        const pattern = new RegExp(`\\b${escapeRegex(suburb.name)}\\b`, 'i');
        if (pattern.test(segment)) {
          console.log('Suburb matched in address segment:', { segment, suburb: suburb.name });
          return suburb;
        }
      }
    }

    // 2) Postcode match in trailing segments (4-digit AU postcode).
    for (const segment of reversedSegments) {
      const pc = segment.match(/\b\d{4}\b/);
      if (pc) {
        const bySuburb = suburbs.find(s => s.postcode === pc[0]);
        if (bySuburb) {
          console.log('Suburb matched by postcode in segment:', { segment, suburb: bySuburb.name });
          return bySuburb;
        }
      }
    }

    console.log('No suburb found in address');
    return null;
  };

  const handleAutoSuburbSelection = (
    fullAddressOrSuburbName: string,
    onSuburbChange: (suburbId: string, suburb?: Suburb) => void
  ) => {
    // First try to find suburb within the full address
    let matchingSuburb = findSuburbInAddress(fullAddressOrSuburbName);
    
    // If not found and input looks like a suburb name (not a full address), try direct name match
    if (!matchingSuburb && !fullAddressOrSuburbName.includes(',')) {
      matchingSuburb = findSuburbByNameOnly(fullAddressOrSuburbName);
    }
    
    // If still not found, try postcode matching as a fallback
    if (!matchingSuburb) {
      // Extract postcode from address (last 4 digits)
      const postcodeMatch = fullAddressOrSuburbName.match(/\b\d{4}\b/);
      if (postcodeMatch) {
        matchingSuburb = findSuburbByPostcode(postcodeMatch[0]);
      }
    }
    
    if (matchingSuburb) {
      console.log('Auto-selecting suburb:', matchingSuburb);
      onSuburbChange(matchingSuburb.id, matchingSuburb);
      
      const distanceText = matchingSuburb.distance_km ? ` (${matchingSuburb.distance_km}km away)` : '';
      
      toast({
        title: "Suburb Auto-Selected",
        description: `${matchingSuburb.name} selected from address. ${distanceText} Estimated delivery: ${matchingSuburb.delivery_rate}`,
        duration: 3000,
      });
    } else {
      console.log('No matching suburb found for:', fullAddressOrSuburbName);
      toast({
        title: "No Matching Suburb",
        description: `No delivery suburb found in the address. Please select manually.`,
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
    findSuburbInAddress,
    handleAutoSuburbSelection
  };
}
