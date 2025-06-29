
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Percent, DollarSign, Save, Settings } from "lucide-react";

interface PricingTier {
  id: string;
  name: string;
  display_name: string;
  description: string;
  percentage_adjustment: number;
  is_markup: boolean;
  is_default: boolean;
  is_active: boolean;
}

export function PricingTierManagement() {
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPricingTiers();
  }, []);

  const loadPricingTiers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pricing_tiers')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading pricing tiers:', error);
      toast({
        title: "Error",
        description: "Failed to load pricing tiers",
        variant: "destructive",
      });
    } else {
      setPricingTiers(data || []);
    }
    setLoading(false);
  };

  const updatePricingTier = async (id: string, updates: Partial<PricingTier>) => {
    const { error } = await supabase
      .from('pricing_tiers')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating pricing tier:', error);
      throw error;
    }
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      for (const tier of pricingTiers) {
        await updatePricingTier(tier.id, {
          percentage_adjustment: tier.percentage_adjustment,
          is_markup: tier.is_markup,
          description: tier.description,
          is_active: tier.is_active,
        });
      }

      toast({
        title: "Success",
        description: "Pricing tiers updated successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update pricing tiers",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateTierField = (id: string, field: keyof PricingTier, value: any) => {
    setPricingTiers(prev => prev.map(tier => 
      tier.id === id ? { ...tier, [field]: value } : tier
    ));
  };

  const toggleAllTiers = (enabled: boolean) => {
    setPricingTiers(prev => prev.map(tier => ({ ...tier, is_active: enabled })));
  };

  if (loading) {
    return <div className="text-center py-8">Loading pricing tiers...</div>;
  }

  const activeTiersCount = pricingTiers.filter(tier => tier.is_active).length;
  const allTiersEnabled = activeTiersCount === pricingTiers.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Pricing Tier Management</h3>
          <p className="text-slate-600">Configure global pricing rules that apply to all products</p>
        </div>
        <Button 
          onClick={handleSaveChanges} 
          disabled={saving}
          className="bg-green-600 hover:bg-green-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Global Pricing Tier Toggle */}
      <Card className="border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Settings className="w-5 h-5" />
            Global Pricing Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="enable-all-tiers"
              checked={allTiersEnabled}
              onCheckedChange={toggleAllTiers}
            />
            <Label htmlFor="enable-all-tiers" className="text-sm font-medium">
              Enable Pricing Tiers ({activeTiersCount} of {pricingTiers.length} active)
            </Label>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {allTiersEnabled 
              ? "Pricing tiers are enabled. Different customer types will see tier-specific pricing." 
              : activeTiersCount > 0
              ? "Some pricing tiers are enabled. Only active tiers will be shown to customers."
              : "All pricing tiers are disabled. Only base prices will be displayed."
            }
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pricingTiers.map((tier) => (
          <Card key={tier.id} className={`${tier.is_active ? 'border-blue-200' : 'border-gray-200 opacity-60'}`}>
            <CardHeader className={tier.is_active ? 'bg-blue-50' : 'bg-gray-50'}>
              <CardTitle className={`flex items-center gap-2 ${tier.is_active ? 'text-blue-800' : 'text-gray-600'}`}>
                <DollarSign className="w-5 h-5" />
                {tier.display_name}
                <Switch
                  checked={tier.is_active}
                  onCheckedChange={(checked) => updateTierField(tier.id, 'is_active', checked)}
                  className="ml-auto"
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div>
                <Label htmlFor={`description-${tier.id}`}>Description</Label>
                <Input
                  id={`description-${tier.id}`}
                  value={tier.description || ''}
                  onChange={(e) => updateTierField(tier.id, 'description', e.target.value)}
                  placeholder="Enter tier description"
                  disabled={!tier.is_active}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id={`markup-${tier.id}`}
                  checked={tier.is_markup}
                  onCheckedChange={(checked) => updateTierField(tier.id, 'is_markup', checked)}
                  disabled={!tier.is_active}
                />
                <Label htmlFor={`markup-${tier.id}`}>
                  {tier.is_markup ? 'Markup (increase price)' : 'Discount (decrease price)'}
                </Label>
              </div>

              <div>
                <Label htmlFor={`percentage-${tier.id}`} className="flex items-center gap-1">
                  <Percent className="w-4 h-4" />
                  Percentage {tier.is_markup ? 'Markup' : 'Discount'}
                </Label>
                <Input
                  id={`percentage-${tier.id}`}
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={tier.percentage_adjustment}
                  onChange={(e) => updateTierField(tier.id, 'percentage_adjustment', parseFloat(e.target.value) || 0)}
                  placeholder="0.0"
                  disabled={!tier.is_active}
                />
              </div>

              <div className={`p-3 rounded ${tier.is_active ? 'bg-gray-50' : 'bg-gray-100'}`}>
                <p className="text-sm font-medium text-gray-700 mb-1">Example Calculation:</p>
                <p className="text-sm text-gray-600">
                  Base Price: $100.00 → Final Price: $
                  {tier.is_markup 
                    ? (100 * (1 + tier.percentage_adjustment / 100)).toFixed(2)
                    : (100 * (1 - tier.percentage_adjustment / 100)).toFixed(2)
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <h4 className="font-semibold text-yellow-800 mb-2">How Pricing Tiers Work</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Set a single base price for each product</li>
            <li>• Pricing tiers automatically calculate customer-specific prices</li>
            <li>• Use the global toggle to enable/disable all pricing tiers at once</li>
            <li>• Individual tiers can be turned on/off independently</li>
            <li>• Changes here apply to all products immediately</li>
            <li>• Use discounts for VIP customers, markups for premium tiers</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
