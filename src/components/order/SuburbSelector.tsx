
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface Suburb {
  id: string;
  name: string;
  state: string;
  postcode: string;
  delivery_rate: string;
  distance_km: number | null;
}

interface SuburbSelectorProps {
  selectedSuburbId?: string;
  onSuburbChange: (suburbId: string) => void;
}

export function SuburbSelector({ selectedSuburbId, onSuburbChange }: SuburbSelectorProps) {
  const [suburbs, setSuburbs] = useState<Suburb[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuburbs();
  }, []);

  const fetchSuburbs = async () => {
    try {
      console.log('Fetching suburbs...');
      const { data, error } = await supabase
        .from('suburbs')
        .select('id, name, state, postcode, delivery_rate, distance_km')
        .eq('is_active', true)
        .order('state, name');

      if (error) throw error;
      console.log('Fetched suburbs:', data?.length, 'total');
      setSuburbs(data || []);
    } catch (error) {
      console.error('Error fetching suburbs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuburbChange = (suburbId: string) => {
    const selectedSuburb = suburbs.find(s => s.id === suburbId);
    console.log('Suburb selected:', selectedSuburb);
    if (selectedSuburb) {
      onSuburbChange(suburbId);
    }
  };

  const getSuburbLabel = (suburb: Suburb) => {
    const distanceText = suburb.distance_km ? `, ${suburb.distance_km}km` : '';
    return `${suburb.postcode}, ${suburb.name}${distanceText} - ${suburb.delivery_rate} (estimate)`;
  };

  // Debug the selected suburb
  useEffect(() => {
    if (selectedSuburbId) {
      const selectedSuburb = suburbs.find(s => s.id === selectedSuburbId);
      console.log('SuburbSelector - selectedSuburbId:', selectedSuburbId, 'found suburb:', selectedSuburb);
    }
  }, [selectedSuburbId, suburbs]);

  if (loading) {
    return (
      <div>
        <Label>Suburb</Label>
        <div className="h-10 w-full flex items-center px-3 py-2 border border-input rounded-md bg-background text-sm text-muted-foreground">
          Loading suburbs...
        </div>
      </div>
    );
  }

  return (
    <div>
      <Label htmlFor="suburb">Suburb (Delivery rates are estimates only)</Label>
      <Select value={selectedSuburbId || ""} onValueChange={handleSuburbChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select a suburb" />
        </SelectTrigger>
        <SelectContent>
          {suburbs.map((suburb) => (
            <SelectItem key={suburb.id} value={suburb.id}>
              {getSuburbLabel(suburb)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
