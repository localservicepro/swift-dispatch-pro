
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Edit, Trash2, Users, Percent, DollarSign, Clock } from "lucide-react";
import { format } from "date-fns";

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

interface SpecialListProps {
  specials: ProductSpecial[];
  loading: boolean;
  onEdit: (special: ProductSpecial) => void;
  onDeleteSuccess: () => void;
  getSpecialTypeColor: (type: string) => string;
  getSpecialStatus: (special: ProductSpecial) => { status: string; color: string };
}

export function SpecialList({
  specials,
  loading,
  onEdit,
  onDeleteSuccess,
  getSpecialTypeColor,
  getSpecialStatus
}: SpecialListProps) {
  const { toast } = useToast();

  const handleDeleteSpecial = async (specialId: string) => {
    try {
      const { error } = await supabase
        .from('product_specials')
        .delete()
        .eq('id', specialId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Special deleted successfully!",
      });

      onDeleteSuccess();
    } catch (error: any) {
      console.error('Error deleting special:', error);
      toast({
        title: "Error",
        description: "Failed to delete special",
        variant: "destructive",
      });
    }
  };

  const toggleSpecialStatus = async (special: ProductSpecial) => {
    try {
      const { error } = await supabase
        .from('product_specials')
        .update({ is_active: !special.is_active })
        .eq('id', special.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Special ${!special.is_active ? 'activated' : 'deactivated'} successfully!`,
      });

      onDeleteSuccess(); // Refresh the list
    } catch (error: any) {
      console.error('Error updating special status:', error);
      toast({
        title: "Error",
        description: "Failed to update special status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">Loading specials...</div>
        </CardContent>
      </Card>
    );
  }

  if (specials.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            No specials created yet. Create your first special offer!
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          All Specials ({specials.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {specials.map((special) => {
            const status = getSpecialStatus(special);
            const isExpired = new Date() > new Date(special.end_date);
            const timeLeft = isExpired ? null : new Date(special.end_date).getTime() - new Date().getTime();
            const daysLeft = timeLeft ? Math.ceil(timeLeft / (1000 * 60 * 60 * 24)) : 0;

            return (
              <div key={special.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-lg">{special.name}</h4>
                      <Badge className={getSpecialTypeColor(special.special_type)}>
                        {special.special_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge className={status.color}>
                        {status.status}
                      </Badge>
                    </div>
                    
                    {special.description && (
                      <p className="text-gray-600 text-sm mb-2">{special.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        {special.discount_type === 'percentage' ? (
                          <Percent className="w-4 h-4" />
                        ) : (
                          <DollarSign className="w-4 h-4" />
                        )}
                        <span className="font-medium text-green-600">
                          {special.discount_type === 'percentage' 
                            ? `${special.discount_value}% off`
                            : `$${special.discount_value} off`
                          }
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(new Date(special.start_date), 'MMM d, yyyy')} - {format(new Date(special.end_date), 'MMM d, yyyy')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{special.customer_tiers.join(', ')}</span>
                      </div>

                      {!isExpired && status.status === 'Active' && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span className="text-orange-600 font-medium">
                            {daysLeft > 0 ? `${daysLeft} days left` : 'Expires today'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Min quantity: {special.minimum_quantity}</span>
                      {special.maximum_uses && (
                        <span>
                          Uses: {special.current_uses}/{special.maximum_uses}
                        </span>
                      )}
                      {special.promotional_code && (
                        <span>Code: <code className="bg-gray-100 px-1 rounded">{special.promotional_code}</code></span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleSpecialStatus(special)}
                      className={special.is_active ? "text-orange-600 border-orange-200" : "text-green-600 border-green-200"}
                    >
                      {special.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onEdit(special)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleDeleteSpecial(special.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Progress bar for limited uses */}
                {special.maximum_uses && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Usage Progress</span>
                      <span>{special.current_uses}/{special.maximum_uses}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min((special.current_uses / special.maximum_uses) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
