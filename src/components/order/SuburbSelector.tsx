
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [open, setOpen] = useState(false);

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
      setOpen(false);
    }
  };

  const getSuburbLabel = (suburb: Suburb) => {
    const distanceText = suburb.distance_km ? `, ${suburb.distance_km}km` : '';
    return `${suburb.postcode}, ${suburb.name}${distanceText} - ${suburb.delivery_rate} (estimate)`;
  };

  const getDisplayValue = () => {
    if (!selectedSuburbId) return "Select a suburb";
    const selectedSuburb = suburbs.find(s => s.id === selectedSuburbId);
    return selectedSuburb ? getSuburbLabel(selectedSuburb) : "Select a suburb";
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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-left font-normal"
          >
            <span className="truncate">{getDisplayValue()}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search suburbs by postcode or name..." />
            <CommandList>
              <CommandEmpty>No suburbs found.</CommandEmpty>
              <CommandGroup>
                {suburbs.map((suburb) => (
                  <CommandItem
                    key={suburb.id}
                    value={`${suburb.postcode} ${suburb.name} ${suburb.state}`}
                    onSelect={() => handleSuburbChange(suburb.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedSuburbId === suburb.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {getSuburbLabel(suburb)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
