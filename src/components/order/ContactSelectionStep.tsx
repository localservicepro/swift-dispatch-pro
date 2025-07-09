import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { User, Mail, Phone, Crown } from "lucide-react";

interface Customer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  full_address: string;
  customer_type: string;
  suburb_id: string;
  company_name: string | null;
  business_name: string | null;
  contact_role: string | null;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  contact_role: string | null;
  is_primary_contact: boolean;
}

interface ContactSelectionStepProps {
  customer: Customer;
  selectedContact: Contact | null;
  onContactSelect: (contact: Contact | null) => void;
  onBack: () => void;
  onNext: () => void;
}

export function ContactSelectionStep({ 
  customer, 
  selectedContact, 
  onContactSelect, 
  onBack, 
  onNext 
}: ContactSelectionStepProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, [customer.id]);

  const loadContacts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customer_contacts')
      .select('*')
      .eq('customer_id', customer.id)
      .eq('is_active', true)
      .order('is_primary_contact', { ascending: false })
      .order('first_name', { ascending: true });

    if (!error && data) {
      setContacts(data);
      
      // Auto-select primary contact if none selected and only one contact exists
      if (!selectedContact && data.length === 1) {
        onContactSelect(data[0]);
      }
    }
    setLoading(false);
  };

  const getContactDisplayName = (contact: Contact) => {
    return `${contact.first_name} ${contact.last_name}`;
  };

  const getPrimaryContactFromCustomer = () => {
    if (!customer.first_name || !customer.last_name) return null;
    
    return {
      id: 'customer_primary',
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      phone: customer.phone,
      contact_role: customer.contact_role || 'Primary Contact',
      is_primary_contact: true
    };
  };

  // Show all contacts including customer's primary contact info
  const allContacts = [
    ...contacts,
    // Add customer's primary contact if no contacts exist in customer_contacts table
    ...(contacts.length === 0 && getPrimaryContactFromCustomer() ? [getPrimaryContactFromCustomer()!] : [])
  ];

  const handleContactSelect = (contact: Contact) => {
    onContactSelect(contact);
  };

  const handleSkipContactSelection = () => {
    // Use customer's primary contact details
    const primaryContact = getPrimaryContactFromCustomer();
    onContactSelect(primaryContact);
    onNext();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading contacts...</div>
        </CardContent>
      </Card>
    );
  }

  // If only one contact (or customer primary), auto-proceed
  if (allContacts.length <= 1) {
    return null; // This step will be skipped
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Select Contact Person
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Choose who this order is for at {customer.company_name || customer.business_name || `${customer.first_name} ${customer.last_name}`}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {allContacts.map((contact) => (
            <div
              key={contact.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedContact?.id === contact.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
              onClick={() => handleContactSelect(contact)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <h4 className="font-medium">{getContactDisplayName(contact)}</h4>
                    {contact.is_primary_contact && (
                      <Badge variant="secondary" className="text-xs">
                        <Crown className="w-3 h-3 mr-1" />
                        Primary
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {contact.contact_role && (
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3" />
                        {contact.contact_role}
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3" />
                        {contact.email}
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3" />
                        {contact.phone}
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedContact?.id === contact.id && (
                  <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleSkipContactSelection}>
              Use Primary Contact
            </Button>
            <Button 
              onClick={onNext}
              disabled={!selectedContact}
            >
              Continue with Selected Contact
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}