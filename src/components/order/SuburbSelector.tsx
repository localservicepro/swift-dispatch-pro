
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface Suburb {
  id: string;
  name: string;
  state: string;
  postcode: string;
  delivery_rate: number;
}

interface SuburbSelectorProps {
  selectedSuburbId?: string;
  onSuburbChange: (suburbId: string, deliveryRate: number) => void;
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
        .select('id, name, state, postcode, delivery_rate')
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
      onSuburbChange(suburbId, selectedSuburb.delivery_rate);
    }
  };

  const getSuburbLabel = (suburb: Suburb) => {
    return `${suburb.name}, ${suburb.state} (${suburb.postcode}) - $${suburb.delivery_rate.toFixed(2)}`;
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
      <Label htmlFor="suburb">Suburb</Label>
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
