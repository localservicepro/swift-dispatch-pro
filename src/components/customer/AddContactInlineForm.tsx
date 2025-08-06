import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X } from "lucide-react";

interface AddContactInlineFormProps {
  customerId: string;
  onContactCreated: (contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string | null;
  }) => void;
  onCancel: () => void;
}

export function AddContactInlineForm({ 
  customerId, 
  onContactCreated, 
  onCancel 
}: AddContactInlineFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    contact_role: ""
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast({
        title: "Validation Error",
        description: "First name and last name are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_contacts')
        .insert({
          customer_id: customerId,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          contact_role: formData.contact_role.trim() || 'Contact',
          is_primary_contact: false,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      const newContact = {
        id: data.id,
        name: `${data.first_name} ${data.last_name}`,
        email: data.email,
        phone: data.phone,
        role: data.contact_role
      };

      onContactCreated(newContact);
      
      toast({
        title: "Success",
        description: "Contact created successfully",
      });
    } catch (error: any) {
      console.error('Error creating contact:', error);
      toast({
        title: "Error",
        description: "Failed to create contact. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-primary">Add New Contact</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={loading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="new-first-name" className="text-xs">First Name *</Label>
              <Input
                id="new-first-name"
                value={formData.first_name}
                onChange={handleInputChange('first_name')}
                disabled={loading}
                required
                className="h-8"
              />
            </div>
            <div>
              <Label htmlFor="new-last-name" className="text-xs">Last Name *</Label>
              <Input
                id="new-last-name"
                value={formData.last_name}
                onChange={handleInputChange('last_name')}
                disabled={loading}
                required
                className="h-8"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="new-email" className="text-xs">Email</Label>
            <Input
              id="new-email"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              disabled={loading}
              className="h-8"
            />
          </div>

          <div>
            <Label htmlFor="new-phone" className="text-xs">Phone</Label>
            <Input
              id="new-phone"
              value={formData.phone}
              onChange={handleInputChange('phone')}
              disabled={loading}
              className="h-8"
            />
          </div>

          <div>
            <Label htmlFor="new-role" className="text-xs">Role</Label>
            <Input
              id="new-role"
              value={formData.contact_role}
              onChange={handleInputChange('contact_role')}
              placeholder="e.g. Manager, Admin"
              disabled={loading}
              className="h-8"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={loading || !formData.first_name.trim() || !formData.last_name.trim()}
              className="flex-1"
            >
              {loading && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
              Create & Select
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}