import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User, Star, AlertCircle, Plus } from "lucide-react";
import { AddContactInlineForm } from "./AddContactInlineForm";

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

interface SelectedContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
}

interface ContactSelectorProps {
  customerId: string;
  selectedContact: SelectedContact | null;
  onContactSelect: (contact: SelectedContact | null) => void;
  disabled?: boolean;
}

export function ContactSelector({ 
  customerId, 
  selectedContact, 
  onContactSelect, 
  disabled = false 
}: ContactSelectorProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
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

  const handleContactChange = (contactId: string) => {
    if (contactId === "none") {
      onContactSelect(null);
      return;
    }

    if (contactId === "add_new") {
      setShowAddForm(true);
      return;
    }

    const contact = contacts.find(c => c.id === contactId);
    if (contact) {
      onContactSelect({
        id: contact.id,
        name: `${contact.first_name} ${contact.last_name}`,
        email: contact.email,
        phone: contact.phone,
        role: contact.contact_role
      });
    }
  };

  const handleContactCreated = async (newContact: SelectedContact) => {
    // Refresh contacts list
    await loadContacts();
    // Select the newly created contact
    onContactSelect(newContact);
    // Hide the form
    setShowAddForm(false);
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
  };

  const formatContactDisplay = (contact: Contact) => {
    const name = `${contact.first_name} ${contact.last_name}`;
    const role = contact.contact_role || 'Contact';
    return `${name} (${role})`;
  };

  if (contacts.length === 0 && !loading && !showAddForm) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">
                No contacts found for this company.
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
              disabled={disabled}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Contact
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="w-4 h-4" />
          Select Contact
        </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {showAddForm ? (
            <AddContactInlineForm
              customerId={customerId}
              onContactCreated={handleContactCreated}
              onCancel={handleCancelAdd}
            />
          ) : (
            <div>
              <Label htmlFor="contact-select">Company Contact</Label>
              <Select
                value={selectedContact?.id || "none"}
                onValueChange={handleContactChange}
                disabled={disabled || loading}
              >
                <SelectTrigger id="contact-select">
                  <SelectValue placeholder={loading ? "Loading contacts..." : "Select a contact (optional)"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific contact</SelectItem>
                  <SelectItem value="add_new">
                    <div className="flex items-center gap-2 text-primary">
                      <Plus className="w-3 h-3" />
                      <span>Add New Contact</span>
                    </div>
                  </SelectItem>
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
          )}

        {selectedContact && (
          <div className="border rounded-lg p-3 bg-green-50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-green-800">{selectedContact.name}</h4>
              {contacts.find(c => c.id === selectedContact.id)?.is_primary_contact && (
                <Badge variant="secondary" className="text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  Primary
                </Badge>
              )}
            </div>
            <div className="space-y-1 text-sm text-green-700">
              {selectedContact.role && (
                <div>Role: {selectedContact.role}</div>
              )}
              {selectedContact.email && (
                <div>Email: {selectedContact.email}</div>
              )}
              {selectedContact.phone && (
                <div>Phone: {selectedContact.phone}</div>
              )}
            </div>
          </div>
        )}

        {contacts.length > 0 && !selectedContact && (
          <p className="text-xs text-gray-500">
            Selecting a contact is optional. Primary contacts are marked with a star.
          </p>
        )}
      </CardContent>
    </Card>
  );
}