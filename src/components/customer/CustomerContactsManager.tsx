
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, User, Star } from 'lucide-react';

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

interface CustomerContactsManagerProps {
  customerId: string;
  customerType: "trade" | "account";
}

export function CustomerContactsManager({ customerId, customerType }: CustomerContactsManagerProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [newContact, setNewContact] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    contact_role: 'Contact'
  });
  const [editContact, setEditContact] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    contact_role: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (customerType === 'account') {
      loadContacts();
    }
  }, [customerId, customerType]);

  const loadContacts = async () => {
    const { data, error } = await supabase
      .from('customer_contacts')
      .select('*')
      .eq('customer_id', customerId)
      .eq('is_active', true)
      .order('is_primary_contact', { ascending: false })
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Error loading contacts:', error);
    } else {
      setContacts(data || []);
    }
  };

  const handleAddContact = async () => {
    if (!newContact.first_name || !newContact.last_name) {
      toast({
        title: "Error",
        description: "First name and last name are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('customer_contacts')
        .insert({
          customer_id: customerId,
          first_name: newContact.first_name,
          last_name: newContact.last_name,
          email: newContact.email || null,
          phone: newContact.phone || null,
          contact_role: newContact.contact_role || 'Contact',
          is_primary_contact: false, // Explicitly set as non-primary
          is_active: true, // Explicitly set as active
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contact added successfully",
      });

      setNewContact({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        contact_role: 'Contact'
      });
      setIsAddingContact(false);
      loadContacts();
    } catch (error) {
      console.error('Error adding contact:', error);
      toast({
        title: "Error",
        description: "Failed to add contact. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditContact = (contact: Contact) => {
    setEditContact({
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email || '',
      phone: contact.phone || '',
      contact_role: contact.contact_role || ''
    });
    setEditingContact(contact);
  };

  const handleUpdateContact = async () => {
    if (!editContact.first_name && !editContact.last_name) {
      toast({
        title: "Error",
        description: "At least one name (first or last) is required",
        variant: "destructive",
      });
      return;
    }

    if (!editingContact) return;

    const { error } = await supabase
      .from('customer_contacts')
      .update({
        first_name: editContact.first_name,
        last_name: editContact.last_name,
        email: editContact.email || null,
        phone: editContact.phone || null,
        contact_role: editContact.contact_role || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingContact.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update contact",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
      setEditingContact(null);
      setEditContact({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        contact_role: ''
      });
      loadContacts();
    }
  };

  const handleCancelEdit = () => {
    setEditingContact(null);
    setEditContact({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      contact_role: ''
    });
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm("Are you sure you want to remove this contact?")) return;

    const { error } = await supabase
      .from('customer_contacts')
      .update({ is_active: false })
      .eq('id', contactId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove contact",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Contact removed successfully",
      });
      loadContacts();
    }
  };

  if (customerType !== 'account') {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Associated Contacts</h3>
        <Button
          onClick={() => setIsAddingContact(true)}
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </Button>
      </div>

      {contacts.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No additional contacts added yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">
                        {contact.first_name} {contact.last_name}
                      </h4>
                      {contact.is_primary_contact && (
                        <Badge variant="default" className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Primary
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      {contact.contact_role && <p>Role: {contact.contact_role}</p>}
                      {contact.email && <p>Email: {contact.email}</p>}
                      {contact.phone && <p>Phone: {contact.phone}</p>}
                    </div>
                  </div>
                  {!contact.is_primary_contact && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditContact(contact)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteContact(contact.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isAddingContact && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new_first_name">First Name</Label>
                <Input
                  id="new_first_name"
                  value={newContact.first_name}
                  onChange={(e) => setNewContact({...newContact, first_name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="new_last_name">Last Name</Label>
                <Input
                  id="new_last_name"
                  value={newContact.last_name}
                  onChange={(e) => setNewContact({...newContact, last_name: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="new_email">Email</Label>
              <Input
                id="new_email"
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact({...newContact, email: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="new_phone">Phone</Label>
              <Input
                id="new_phone"
                value={newContact.phone}
                onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="new_role">Role</Label>
              <Input
                id="new_role"
                value={newContact.contact_role}
                onChange={(e) => setNewContact({...newContact, contact_role: e.target.value})}
                placeholder="e.g. Manager, Coordinator, Assistant"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddContact}>Add Contact</Button>
              <Button variant="outline" onClick={() => setIsAddingContact(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {editingContact && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_first_name">First Name</Label>
                <Input
                  id="edit_first_name"
                  value={editContact.first_name}
                  onChange={(e) => setEditContact({...editContact, first_name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit_last_name">Last Name</Label>
                <Input
                  id="edit_last_name"
                  value={editContact.last_name}
                  onChange={(e) => setEditContact({...editContact, last_name: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                type="email"
                value={editContact.email}
                onChange={(e) => setEditContact({...editContact, email: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="edit_phone">Phone</Label>
              <Input
                id="edit_phone"
                value={editContact.phone}
                onChange={(e) => setEditContact({...editContact, phone: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="edit_role">Role</Label>
              <Input
                id="edit_role"
                value={editContact.contact_role}
                onChange={(e) => setEditContact({...editContact, contact_role: e.target.value})}
                placeholder="e.g. Manager, Coordinator, Assistant"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpdateContact}>Update Contact</Button>
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
