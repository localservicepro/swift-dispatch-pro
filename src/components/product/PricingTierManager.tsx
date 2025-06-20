
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePricingTiers, useCreatePricingTier } from "@/hooks/usePricingTiers";
import { Plus, Edit, Trash2, Crown } from "lucide-react";

export function PricingTierManager() {
  const { data: tiers = [], refetch } = usePricingTiers();
  const createTier = useCreatePricingTier();
  const { toast } = useToast();

  const [newTier, setNewTier] = useState({
    name: "",
    display_name: "",
    description: "",
    discount_percentage: 0,
    is_default: false,
    is_active: true
  });

  const [showCreate, setShowCreate] = useState(false);

  const handleCreateTier = async () => {
    if (!newTier.name || !newTier.display_name) {
      toast({
        title: "Error",
        description: "Name and display name are required",
        variant: "destructive",
      });
      return;
    }

    try {
      await createTier(newTier);
      toast({
        title: "Success",
        description: "Pricing tier created successfully!",
      });
      setNewTier({
        name: "",
        display_name: "",
        description: "",
        discount_percentage: 0,
        is_default: false,
        is_active: true
      });
      setShowCreate(false);
      refetch();
    } catch (error) {
      console.error('Error creating pricing tier:', error);
      toast({
        title: "Error",
        description: "Failed to create pricing tier",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Pricing Tiers</h3>
          <p className="text-slate-600">Manage different pricing levels for customer groups</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Pricing Tier
        </Button>
      </div>

      {/* Create Tier Form */}
      {showCreate && (
        <Card className="border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-blue-800">Create New Pricing Tier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tierName">Name (Internal)</Label>
                <Input
                  id="tierName"
                  value={newTier.name}
                  onChange={(e) => setNewTier({...newTier, name: e.target.value})}
                  placeholder="e.g., wholesale"
                />
              </div>
              <div>
                <Label htmlFor="tierDisplayName">Display Name</Label>
                <Input
                  id="tierDisplayName"
                  value={newTier.display_name}
                  onChange={(e) => setNewTier({...newTier, display_name: e.target.value})}
                  placeholder="e.g., Wholesale"
                />
              </div>
              <div>
                <Label htmlFor="tierDiscount">Discount Percentage</Label>
                <Input
                  id="tierDiscount"
                  type="number"
                  step="0.01"
                  value={newTier.discount_percentage}
                  onChange={(e) => setNewTier({...newTier, discount_percentage: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="tierDescription">Description</Label>
              <Textarea
                id="tierDescription"
                value={newTier.description}
                onChange={(e) => setNewTier({...newTier, description: e.target.value})}
                placeholder="Description of this pricing tier"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleCreateTier} className="bg-blue-600 hover:bg-blue-700">
                Create Tier
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tiers List */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Pricing Tiers</CardTitle>
        </CardHeader>
        <CardContent>
          {tiers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pricing tiers found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tiers.map((tier) => (
                <div key={tier.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{tier.display_name}</h4>
                        {tier.is_default && (
                          <Crown className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                      {tier.discount_percentage && tier.discount_percentage > 0 && (
                        <Badge variant="secondary" className="mb-2">
                          {tier.discount_percentage}% discount
                        </Badge>
                      )}
                      {tier.description && (
                        <p className="text-sm text-gray-600">{tier.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <Badge variant={tier.is_default ? "default" : "outline"}>
                    {tier.is_default ? "Default" : "Custom"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
