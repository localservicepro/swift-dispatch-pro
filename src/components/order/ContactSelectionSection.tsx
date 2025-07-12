import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User, Star, AlertCircle, Edit } from "lucide-react";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  contact_role: string | null;
  is_primary_contact: boolean;
  is_active: boolean;
}

interface ContactSelectionSectionProps {
  customerId: string;
  currentContactId: string | null;
  currentContactName: string | null;
  currentContactEmail: string | null;
  currentContactPhone: string | null;
  onContactChange: (contactData: {
    contact_id: string | null;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
  }) => void;
  disabled?: boolean;
}

export function ContactSelectionSection({ 
  customerId, 
  currentContactId,
  currentContactName,
  currentContactEmail,
  currentContactPhone,
  onContactChange,
  disabled = false 
}: ContactSelectionSectionProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (customerId) {
      loadContacts();
    }
  }, [customerId]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_contacts')
        .select('*')
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .order('is_primary_contact', { ascending: false })
        .order('first_name', { ascending: true });

      if (error) {
        throw error;
      }

      setContacts(data || []);
    } catch (error: any) {
      console.error('Error loading contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContactSelect = (contactId: string) => {
    if (contactId === "none") {
      onContactChange({
        contact_id: null,
        contact_name: null,
        contact_email: null,
        contact_phone: null
      });
      setEditMode(false);
      return;
    }

    const contact = contacts.find(c => c.id === contactId);
    if (contact) {
      onContactChange({
        contact_id: contact.id,
        contact_name: `${contact.first_name} ${contact.last_name}`,
        contact_email: contact.email,
        contact_phone: contact.phone
      });
      setEditMode(false);
    }
  };

  const formatContactDisplay = (contact: Contact) => {
    const name = `${contact.first_name} ${contact.last_name}`;
    const role = contact.contact_role || 'Contact';
    return `${name} (${role})`;
  };

  // If no contacts exist
  if (contacts.length === 0 && !loading) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">
              No contacts found for this company.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Display current contact or edit mode
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="w-4 h-4" />
          Order Contact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!editMode && currentContactName ? (
          <div className="border rounded-lg p-3 bg-green-50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-green-800">{currentContactName}</h4>
              <div className="flex items-center gap-2">
                {contacts.find(c => c.id === currentContactId)?.is_primary_contact && (
                  <Badge variant="secondary" className="text-xs">
                    <Star className="w-3 h-3 mr-1" />
                    Primary
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditMode(true)}
                  disabled={disabled}
                >
                  <Edit className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="space-y-1 text-sm text-green-700">
              {currentContactEmail && (
                <div>Email: {currentContactEmail}</div>
              )}
              {currentContactPhone && (
                <div>Phone: {currentContactPhone}</div>
              )}
            </div>
          </div>
        ) : !editMode && !currentContactName ? (
          <div className="border rounded-lg p-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">No contact assigned</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditMode(true)}
                disabled={disabled}
              >
                <Edit className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="contact-select">Select Contact</Label>
              <Select
                value={currentContactId || "none"}
                onValueChange={handleContactSelect}
                disabled={disabled || loading}
              >
                <SelectTrigger id="contact-select">
                  <SelectValue placeholder={loading ? "Loading contacts..." : "Select a contact"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific contact</SelectItem>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      <div className="flex items-center gap-2 w-full">
                        <span>{formatContactDisplay(contact)}</span>
                        {contact.is_primary_contact && (
                          <Star className="w-3 h-3 text-amber-500 fill-current" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}