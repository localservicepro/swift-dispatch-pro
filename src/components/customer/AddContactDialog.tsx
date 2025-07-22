
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Mail, Phone, Building } from "lucide-react";

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  onContactAdded: (contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string | null;
  }) => void;
}

export function AddContactDialog({ 
  open, 
  onOpenChange, 
  customerId, 
  onContactAdded 
}: AddContactDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    contact_role: "Contact"
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.first_name || !formData.last_name) {
      toast({
        title: "Error",
        description: "First name and last name are required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('customer_contacts')
        .insert([{
          customer_id: customerId,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email || null,
          phone: formData.phone || null,
          contact_role: formData.contact_role,
          is_primary_contact: false,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      const newContact = {
        id: data.id,
        name: `${data.first_name} ${data.last_name}`,
        email: data.email,
        phone: data.phone,
        role: data.contact_role
      };

      onContactAdded(newContact);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        contact_role: "Contact"
      });

      toast({
        title: "Success",
        description: "Contact added successfully!",
      });

    } catch (error: any) {
      console.error('Error adding contact:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add contact",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      contact_role: "Contact"
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Add New Contact
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email" className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="phone" className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              Phone
            </Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="contact_role" className="flex items-center gap-1">
              <Building className="w-3 h-3" />
              Role
            </Label>
            <Input
              id="contact_role"
              value={formData.contact_role}
              onChange={(e) => setFormData({ ...formData, contact_role: e.target.value })}
              placeholder="e.g. Manager, Director, Assistant"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Adding..." : "Add Contact"}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
