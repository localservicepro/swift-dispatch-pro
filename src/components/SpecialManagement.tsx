
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, Percent, DollarSign, Clock, Users } from "lucide-react";
import { SpecialForm } from "./special/SpecialForm";
import { SpecialList } from "./special/SpecialList";

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

export function SpecialManagement() {
  const [specials, setSpecials] = useState<ProductSpecial[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingSpecial, setEditingSpecial] = useState<ProductSpecial | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSpecials();
  }, []);

  const loadSpecials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_specials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading specials:', error);
        toast({
          title: "Error",
          description: "Failed to load specials",
          variant: "destructive",
        });
      } else {
        setSpecials(data || []);
      }
    } catch (error) {
      console.error('Error loading specials:', error);
      toast({
        title: "Error",
        description: "Failed to load specials",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleFormClose = () => {
    setIsCreating(false);
    setEditingSpecial(null);
  };

  const handleFormSuccess = () => {
    loadSpecials();
    handleFormClose();
  };

  const getSpecialTypeColor = (type: string) => {
    switch (type) {
      case 'monthly': return 'bg-blue-100 text-blue-800';
      case 'flash_sale': return 'bg-red-100 text-red-800';
      case 'seasonal': return 'bg-green-100 text-green-800';
      case 'customer_tier': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSpecialStatus = (special: ProductSpecial) => {
    const now = new Date();
    const startDate = new Date(special.start_date);
    const endDate = new Date(special.end_date);

    if (!special.is_active) return { status: 'Inactive', color: 'bg-gray-100 text-gray-800' };
    if (now < startDate) return { status: 'Scheduled', color: 'bg-yellow-100 text-yellow-800' };
    if (now > endDate) return { status: 'Expired', color: 'bg-red-100 text-red-800' };
    return { status: 'Active', color: 'bg-green-100 text-green-800' };
  };

  const activeSpecials = specials.filter(s => {
    const now = new Date();
    const startDate = new Date(s.start_date);
    const endDate = new Date(s.end_date);
    return s.is_active && now >= startDate && now <= endDate;
  });

  const upcomingSpecials = specials.filter(s => {
    const now = new Date();
    const startDate = new Date(s.start_date);
    return s.is_active && now < startDate;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Special Offers Management</h3>
          <p className="text-slate-600">Create and manage time-limited promotions and discounts</p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)} 
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Special
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Specials</p>
                <p className="text-2xl font-bold text-green-600">{activeSpecials.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calendar className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Upcoming Specials</p>
                <p className="text-2xl font-bold text-yellow-600">{upcomingSpecials.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Percent className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Specials</p>
                <p className="text-2xl font-bold text-blue-600">{specials.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Special Form */}
      {(isCreating || editingSpecial) && (
        <SpecialForm
          isCreating={isCreating}
          editingSpecial={editingSpecial}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Special List */}
      <SpecialList
        specials={specials}
        loading={loading}
        onEdit={setEditingSpecial}
        onDeleteSuccess={loadSpecials}
        getSpecialTypeColor={getSpecialTypeColor}
        getSpecialStatus={getSpecialStatus}
      />
    </div>
  );
}
