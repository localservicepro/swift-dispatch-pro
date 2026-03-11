import { useState, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";

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
  onSuburbChange: (suburbId: string, suburb?: Suburb) => void;
  label?: string;
}

export function SuburbSelector({ selectedSuburbId, onSuburbChange, label = "Suburb" }: SuburbSelectorProps) {
  const [suburbs, setSuburbs] = useState<Suburb[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { data: paymentSettings } = usePaymentSettings();

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

  const parseRate = useCallback((deliveryRate: string): number => {
    if (!deliveryRate) return 0;
    const cleaned = deliveryRate.replace(/[AU$\s]/gi, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }, []);

  const getEffectiveRate = useCallback((baseRate: number): number => {
    if (!paymentSettings) return baseRate;
    const markup = paymentSettings.delivery_markup_value || 0;
    if (markup <= 0) return baseRate;
    if (paymentSettings.delivery_markup_type === 'fixed') return baseRate + markup;
    return baseRate + (baseRate * markup / 100);
  }, [paymentSettings]);

  const handleSuburbChange = (suburbId: string) => {
    const selectedSuburb = suburbs.find(s => s.id === suburbId);
    console.log('Suburb selected:', selectedSuburb);
    if (selectedSuburb) {
      onSuburbChange(suburbId, selectedSuburb);
      setOpen(false);
    }
  };

  const getSuburbLabel = (suburb: Suburb) => {
    const distanceText = suburb.distance_km ? `, ${suburb.distance_km}km` : '';
    const baseRate = parseRate(suburb.delivery_rate);
    const effectiveRate = getEffectiveRate(baseRate);
    return `${suburb.postcode}, ${suburb.name}${distanceText} - $${effectiveRate.toFixed(2)} (estimate)`;
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
        <Label>{label}</Label>
        <div className="h-10 w-full flex items-center px-3 py-2 border border-input rounded-md bg-background text-sm text-muted-foreground">
          Loading suburbs...
        </div>
      </div>
    );
  }

  return (
    <div>
      <Label htmlFor="suburb">{label} (Delivery rates are estimates only)</Label>
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
