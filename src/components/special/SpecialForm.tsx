
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X, Calendar, Percent, DollarSign } from "lucide-react";
import { ProductSpecialSelector } from "./ProductSpecialSelector";

interface ProductSpecial {
  id: string;
  name: string;
  description: string | null;
  special_type: 'monthly' | 'limited_time' | 'flash_sale' | 'seasonal' | 'customer_tier';
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  customer_tiers: string[];
  minimum_quantity: number;
  maximum_uses: number | null;
  current_uses: number;
  promotional_code: string | null;
  created_at: string;
}

interface SpecialFormProps {
  isCreating: boolean;
  editingSpecial: ProductSpecial | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function SpecialForm({ isCreating, editingSpecial, onClose, onSuccess }: SpecialFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    special_type: 'limited_time' as const,
    discount_type: 'percentage' as const,
    discount_value: '',
    start_date: '',
    end_date: '',
    is_active: true,
    customer_tiers: ['trade', 'account'],
    minimum_quantity: '1',
    maximum_uses: '',
    promotional_code: ''
  });
  
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (editingSpecial) {
      setFormData({
        name: editingSpecial.name,
        description: editingSpecial.description || '',
        special_type: editingSpecial.special_type,
        discount_type: editingSpecial.discount_type,
        discount_value: editingSpecial.discount_value.toString(),
        start_date: new Date(editingSpecial.start_date).toISOString().slice(0, 16),
        end_date: new Date(editingSpecial.end_date).toISOString().slice(0, 16),
        is_active: editingSpecial.is_active,
        customer_tiers: editingSpecial.customer_tiers,
        minimum_quantity: editingSpecial.minimum_quantity.toString(),
        maximum_uses: editingSpecial.maximum_uses?.toString() || '',
        promotional_code: editingSpecial.promotional_code || ''
      });
    }
  }, [editingSpecial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const specialData = {
        name: formData.name,
        description: formData.description || null,
        special_type: formData.special_type,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        is_active: formData.is_active,
        customer_tiers: formData.customer_tiers,
        minimum_quantity: parseInt(formData.minimum_quantity),
        maximum_uses: formData.maximum_uses ? parseInt(formData.maximum_uses) : null,
        promotional_code: formData.promotional_code || null
      };

      let specialId: string;

      if (isCreating) {
        const { data, error } = await supabase
          .from('product_specials')
          .insert(specialData)
          .select()
          .single();

        if (error) throw error;
        specialId = data.id;
      } else {
        const { error } = await supabase
          .from('product_specials')
          .update(specialData)
          .eq('id', editingSpecial!.id);

        if (error) throw error;
        specialId = editingSpecial!.id;

        // Clear existing special items
        await supabase
          .from('product_special_items')
          .delete()
          .eq('special_id', specialId);
      }

      // Add product and category associations
      const specialItems = [
        ...selectedProducts.map(productId => ({
          special_id: specialId,
          product_id: productId,
          category_id: null
        })),
        ...selectedCategories.map(categoryId => ({
          special_id: specialId,
          product_id: null,
          category_id: categoryId
        }))
      ];

      if (specialItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('product_special_items')
          .insert(specialItems);

        if (itemsError) throw itemsError;
      }

      toast({
        title: "Success",
        description: `Special ${isCreating ? 'created' : 'updated'} successfully!`,
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error saving special:', error);
      toast({
        title: "Error",
        description: `Failed to ${isCreating ? 'create' : 'update'} special: ${error.message}`,
        variant: "destructive",
      });
    }

    setSaving(false);
  };

  const handleCustomerTierChange = (tier: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        customer_tiers: [...prev.customer_tiers, tier]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        customer_tiers: prev.customer_tiers.filter(t => t !== tier)
      }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Percent className="w-5 h-5" />
            {isCreating ? 'Create New Special' : 'Edit Special'}
          </span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Special Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., January Monthly Special"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="special_type">Special Type</Label>
              <Select value={formData.special_type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, special_type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly Special</SelectItem>
                  <SelectItem value="limited_time">Limited Time Offer</SelectItem>
                  <SelectItem value="flash_sale">Flash Sale</SelectItem>
                  <SelectItem value="seasonal">Seasonal Promotion</SelectItem>
                  <SelectItem value="customer_tier">Customer Tier Special</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your special offer..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount_type">Discount Type</Label>
              <Select value={formData.discount_type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, discount_type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage Off</SelectItem>
                  <SelectItem value="fixed_amount">Fixed Amount Off</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_value">
                Discount Value * {formData.discount_type === 'percentage' ? '(%)' : '($)'}
              </Label>
              <Input
                id="discount_value"
                type="number"
                step="0.01"
                min="0"
                max={formData.discount_type === 'percentage' ? "100" : undefined}
                value={formData.discount_value}
                onChange={(e) => setFormData(prev => ({ ...prev, discount_value: e.target.value }))}
                placeholder={formData.discount_type === 'percentage' ? '10' : '50.00'}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimum_quantity">Minimum Quantity</Label>
              <Input
                id="minimum_quantity"
                type="number"
                min="1"
                value={formData.minimum_quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, minimum_quantity: e.target.value }))}
                placeholder="1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date & Time *</Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date & Time *</Label>
              <Input
                id="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maximum_uses">Maximum Uses (Optional)</Label>
              <Input
                id="maximum_uses"
                type="number"
                min="1"
                value={formData.maximum_uses}
                onChange={(e) => setFormData(prev => ({ ...prev, maximum_uses: e.target.value }))}
                placeholder="Unlimited"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promotional_code">Promotional Code (Optional)</Label>
              <Input
                id="promotional_code"
                value={formData.promotional_code}
                onChange={(e) => setFormData(prev => ({ ...prev, promotional_code: e.target.value }))}
                placeholder="SAVE20"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Customer Tiers</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="trade"
                  checked={formData.customer_tiers.includes('trade')}
                  onCheckedChange={(checked) => handleCustomerTierChange('trade', checked as boolean)}
                />
                <Label htmlFor="trade">Trade Customers</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="account"
                  checked={formData.customer_tiers.includes('account')}
                  onCheckedChange={(checked) => handleCustomerTierChange('account', checked as boolean)}
                />
                <Label htmlFor="account">Account Customers</Label>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked as boolean }))}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <ProductSpecialSelector
            selectedProducts={selectedProducts}
            selectedCategories={selectedCategories}
            onProductsChange={setSelectedProducts}
            onCategoriesChange={setSelectedCategories}
            specialId={editingSpecial?.id}
          />

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : (isCreating ? 'Create Special' : 'Update Special')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
