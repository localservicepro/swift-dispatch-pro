import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface SuburbFormProps {
  suburb?: any;
  isOpen: boolean;
  onClose: () => void;
}

const AUSTRALIAN_STATES = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'NT', label: 'Northern Territory' },
  { value: 'ACT', label: 'Australian Capital Territory' },
];

export function SuburbForm({ suburb, isOpen, onClose }: SuburbFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    state: 'NSW',
    postcode: '',
    delivery_rate: '',
    distance_km: '',
    is_active: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (suburb) {
      setFormData({
        name: suburb.name || '',
        state: suburb.state || 'NSW',
        postcode: suburb.postcode || '',
        delivery_rate: suburb.delivery_rate || '',
        distance_km: suburb.distance_km?.toString() || '',
        is_active: suburb.is_active ?? true,
      });
    } else {
      setFormData({
        name: '',
        state: 'NSW',
        postcode: '',
        delivery_rate: '',
        distance_km: '',
        is_active: true,
      });
    }
  }, [suburb]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.postcode || !formData.delivery_rate) {
      toast({
        title: "Validation Error",
        description: "Name, postcode, and delivery rate are required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const suburbData = {
        name: formData.name.trim(),
        state: formData.state,
        postcode: formData.postcode.trim(),
        delivery_rate: formData.delivery_rate.trim(),
        distance_km: formData.distance_km ? parseFloat(formData.distance_km) : null,
        is_active: formData.is_active,
      };

      if (suburb) {
        // Update existing suburb
        const { error } = await supabase
          .from('suburbs')
          .update(suburbData)
          .eq('id', suburb.id);

        if (error) throw error;

        toast({
          title: "Suburb Updated",
          description: "Suburb has been successfully updated",
        });
      } else {
        // Create new suburb
        const { error } = await supabase
          .from('suburbs')
          .insert([suburbData]);

        if (error) throw error;

        toast({
          title: "Suburb Created",
          description: "New suburb has been successfully created",
        });
      }

      onClose();
    } catch (error: any) {
      console.error('Form submission error:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save suburb",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {suburb ? 'Edit Suburb' : 'Add New Suburb'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Suburb Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter suburb name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <select
                id="state"
                className="w-full p-2 border rounded-md"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                required
              >
                {AUSTRALIAN_STATES.map(state => (
                  <option key={state.value} value={state.value}>
                    {state.value}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="postcode">Postcode *</Label>
              <Input
                id="postcode"
                value={formData.postcode}
                onChange={(e) => handleInputChange('postcode', e.target.value)}
                placeholder="e.g. 2000"
                pattern="[0-9]{4}"
                maxLength={4}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="delivery_rate">Delivery Rate ($) *</Label>
              <Input
                id="delivery_rate"
                value={formData.delivery_rate}
                onChange={(e) => handleInputChange('delivery_rate', e.target.value)}
                placeholder="e.g. 25.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="distance_km">Distance (km)</Label>
              <Input
                id="distance_km"
                type="number"
                step="0.1"
                value={formData.distance_km}
                onChange={(e) => handleInputChange('distance_km', e.target.value)}
                placeholder="e.g. 15.5"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleInputChange('is_active', checked)}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {suburb ? 'Update' : 'Create'} Suburb
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}