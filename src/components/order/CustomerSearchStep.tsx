
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, User, Phone, Mail, MapPin, Building2 } from "lucide-react";
import { GoogleAddressAutocomplete } from "@/components/ui/google-address-autocomplete";
import { ContactSelector } from "@/components/customer/ContactSelector";
import { StopCreditWarningDialog } from "@/components/customer/StopCreditWarningDialog";
import { StopCreditIndicator } from "@/components/customer/StopCreditIndicator";
import { isPhoneNumber, phoneSearchMatch } from "@/utils/phoneUtils";

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
  entity_type: string | null;
  stop_credit?: boolean;
  suburb?: {
    name: string;
    state: string;
    delivery_rate: string;
  };
  customer_contacts?: Array<{
    id: string;
    phone: string | null;
    first_name: string;
    last_name: string;
    is_active: boolean;
  }>;
}

interface SelectedContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
}

interface Suburb {
  id: string;
  name: string;
  state: string;
  postcode: string;
  delivery_rate: string;
  distance_km: number | null;
}

interface CustomerSearchStepProps {
  selectedCustomer: Customer | null;
  selectedContact: SelectedContact | null;
  onCustomerSelect: (customer: Customer) => void;
  onContactSelect: (contact: SelectedContact | null) => void;
  onNext: () => void;
}

export function CustomerSearchStep({ selectedCustomer, selectedContact, onCustomerSelect, onContactSelect, onNext }: CustomerSearchStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suburbs, setSuburbs] = useState<Suburb[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    full_address: "",
    suburb_id: "",
    customer_type: "trade" as "residential" | "trade" | "account",
    entity_type: "individual" as "individual" | "business",
    company_name: "",
    business_name: "",
    contact_role: "Owner"
  });
  const [showStopCreditWarning, setShowStopCreditWarning] = useState(false);
  const [pendingCustomer, setPendingCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSuburbs();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 2) {
      searchCustomers();
    } else {
      setCustomers([]);
    }
  }, [searchQuery]);

  const loadSuburbs = async () => {
    const { data, error } = await supabase
      .from('suburbs')
      .select('*')
      .eq('is_active', true)
      .order('state', { ascending: true })
      .order('name', { ascending: true });

    if (!error && data) {
      setSuburbs(data);
    }
  };

  const searchCustomers = async () => {
    setLoading(true);
    
    // Check if the search query looks like a phone number
    if (isPhoneNumber(searchQuery)) {
      // For phone number searches, fetch all customers and their contacts
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          suburb:suburbs(name, state, delivery_rate),
          customer_contacts(id, phone, first_name, last_name, is_active)
        `)
        .eq('is_active', true);

      if (!error && data) {
        // Filter results using phone number matching on both customer phone and contact phones
        const phoneMatches = data.filter(customer => {
          // Check customer's main phone
          if (customer.phone && phoneSearchMatch(customer.phone, searchQuery)) {
            return true;
          }
          
          // Check all active contact phones
          if (customer.customer_contacts) {
            return customer.customer_contacts.some(contact => 
              contact.is_active && contact.phone && phoneSearchMatch(contact.phone, searchQuery)
            );
          }
          
          return false;
        });
        setCustomers(phoneMatches.slice(0, 10)); // Limit to 10 results
      }
    } else {
      // For regular text searches, use the existing Supabase query
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          suburb:suburbs(name, state, delivery_rate)
        `)
        .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,company_name.ilike.%${searchQuery}%,business_name.ilike.%${searchQuery}%`)
        .eq('is_active', true)
        .limit(10);

      if (!error && data) {
        setCustomers(data);
      }
    }
    
    setLoading(false);
  };

  const createCustomer = async () => {
    // Check if this is an Account Business entity
    const isAccountBusiness = newCustomer.customer_type === 'account' && newCustomer.entity_type === 'business';
    
    // Validation for Account Business entities
    if (isAccountBusiness) {
      if (!newCustomer.company_name) {
        toast({
          title: "Error",
          description: "Company name is required for business accounts",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Standard validation for all other customer types
      if (!newCustomer.first_name || !newCustomer.last_name || !newCustomer.email) {
        toast({
          title: "Error",
          description: "First name, last name, and email are required",
          variant: "destructive",
        });
        return;
      }
      
      if (newCustomer.entity_type === 'business' && !newCustomer.company_name) {
        toast({
          title: "Error",
          description: "Company name is required for business entities",
          variant: "destructive",
        });
        return;
      }
    }

    const customerData = {
      first_name: newCustomer.first_name || null,
      last_name: newCustomer.last_name || null,
      email: newCustomer.email || null,
      phone: newCustomer.phone || null,
      full_address: newCustomer.full_address,
      suburb_id: newCustomer.suburb_id || null,
      customer_type: newCustomer.customer_type,
      entity_type: newCustomer.entity_type,
      is_active: true,
      sms_notifications_enabled: true,
      stop_credit: false,
      company_name: newCustomer.entity_type === 'business' ? newCustomer.company_name : null,
      business_name: newCustomer.entity_type === 'business' ? newCustomer.business_name : null,
      contact_role: getDefaultContactRole(newCustomer.customer_type, newCustomer.entity_type),
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('customers')
      .insert([customerData])
      .select(`
        *,
        suburb:suburbs(name, state, delivery_rate)
      `)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (data) {
      onCustomerSelect(data);
      setShowCreateForm(false);
      toast({
        title: "Success",
        description: "Customer created successfully!",
      });
    }
  };

  const getDefaultContactRole = (customerType: "residential" | "trade" | "account", entityType: "individual" | "business") => {
    if (entityType === 'business') {
      return 'Primary Contact';
    }
    if (customerType === 'residential') {
      return 'Owner';
    }
    if (customerType === 'trade') {
      return 'Tradesperson';
    }
    return 'Contact';
  };

  const handleNewCustomerAddressSelect = (addressData: any) => {
    console.log('New customer address selected:', addressData);
    setNewCustomer(prev => ({
      ...prev,
      full_address: addressData.fullAddress
    }));
  };

  const getCustomerDisplayName = (customer: Customer) => {
    if (customer.customer_type === 'account' && customer.company_name) {
      return customer.company_name;
    }
    if (customer.first_name && customer.last_name) {
      return `${customer.first_name} ${customer.last_name}`;
    }
    return customer.company_name || customer.business_name || 'Unknown Customer';
  };

  const getCustomerSubtitle = (customer: Customer) => {
    if (customer.customer_type === 'account' && customer.company_name) {
      if (customer.first_name && customer.last_name) {
        return `Contact: ${customer.first_name} ${customer.last_name}`;
      }
      return customer.email || 'No contact details';
    }
    return customer.email || 'No email provided';
  };

  const handleCustomerSelect = (customer: Customer) => {
    // Check if customer has stop credit flag
    if (customer.stop_credit) {
      setPendingCustomer(customer);
      setShowStopCreditWarning(true);
    } else {
      selectCustomerAndLoadContacts(customer);
    }
  };

  const selectCustomerAndLoadContacts = async (customer: Customer) => {
    onCustomerSelect(customer);
    
    // Auto-select primary contact if available for customers that could have contacts
    if (shouldShowContactSelector(customer)) {
      await loadAndSelectPrimaryContact(customer.id);
    }
  };

  const shouldShowContactSelector = (customer: Customer) => {
    return customer.customer_type === 'account' || 
           customer.customer_type === 'trade' || 
           customer.entity_type === 'business';
  };

  const loadAndSelectPrimaryContact = async (customerId: string) => {
    const { data: contacts, error } = await supabase
      .from('customer_contacts')
      .select('*')
      .eq('customer_id', customerId)
      .eq('is_active', true)
      .order('is_primary_contact', { ascending: false })
      .order('first_name', { ascending: true });

    if (!error && contacts && contacts.length > 0) {
      const primaryContact = contacts[0];
      onContactSelect({
        id: primaryContact.id,
        name: `${primaryContact.first_name} ${primaryContact.last_name}`,
        email: primaryContact.email,
        phone: primaryContact.phone,
        role: primaryContact.contact_role
      });
    }
  };

  const handleStopCreditContinue = () => {
    if (pendingCustomer) {
      selectCustomerAndLoadContacts(pendingCustomer);
    }
    setShowStopCreditWarning(false);
    setPendingCustomer(null);
  };

  const handleStopCreditCancel = () => {
    setShowStopCreditWarning(false);
    setPendingCustomer(null);
  };

  // Check if this is an Account Business entity for form rendering
  const isAccountBusiness = newCustomer.customer_type === 'account' && newCustomer.entity_type === 'business';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Step 1: Select Customer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedCustomer ? (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-green-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {selectedCustomer.customer_type === 'account' ? (
                    <Building2 className="w-5 h-5 text-blue-600" />
                  ) : (
                    <User className="w-5 h-5 text-green-600" />
                  )}
                  <h3 className="font-semibold text-green-800">
                    {getCustomerDisplayName(selectedCustomer)}
                  </h3>
                  {selectedCustomer.stop_credit && (
                    <StopCreditIndicator />
                  )}
                </div>
                <Badge variant={selectedCustomer.customer_type === 'trade' ? 'default' : 'secondary'}>
                  {selectedCustomer.customer_type.toUpperCase()}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  {getCustomerSubtitle(selectedCustomer)}
                </div>
                {selectedCustomer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    Phone: {selectedCustomer.phone}
                  </div>
                )}
                {selectedCustomer.customer_type === 'account' && selectedCustomer.business_name && (
                  <div className="flex items-center gap-2 md:col-span-2">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    Trading as: {selectedCustomer.business_name}
                  </div>
                )}
                {selectedCustomer.contact_role && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    Role: {selectedCustomer.contact_role}
                  </div>
                )}
                <div className="flex items-center gap-2 md:col-span-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  {selectedCustomer.full_address}
                </div>
              </div>
            </div>

            {/* Contact Selection for Account, Trade, and Business Customers */}
            {shouldShowContactSelector(selectedCustomer) && (
              <ContactSelector
                customerId={selectedCustomer.id}
                selectedContact={selectedContact}
                onContactSelect={onContactSelect}
              />
            )}

            <div className="flex gap-2">
              <Button onClick={() => onCustomerSelect(null)} variant="outline">
                Change Customer
              </Button>
              <Button onClick={onNext} className="ml-auto">
                Next: Select Products
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search customers by name, email, phone, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={() => setShowCreateForm(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Customer
              </Button>
            </div>

            {loading && <div className="text-center py-4">Searching...</div>}

            {customers.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleCustomerSelect(customer)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {customer.customer_type === 'account' ? (
                          <Building2 className="w-4 h-4 text-blue-600" />
                        ) : (
                          <User className="w-4 h-4 text-green-600" />
                        )}
                        <h4 className="font-medium">
                          {getCustomerDisplayName(customer)}
                        </h4>
                        {customer.stop_credit && (
                          <StopCreditIndicator />
                        )}
                      </div>
                      <Badge variant={customer.customer_type === 'trade' ? 'default' : 'secondary'}>
                        {customer.customer_type.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>{getCustomerSubtitle(customer)}</div>
                      <div>{customer.full_address}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showCreateForm && (
              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg">Create New Customer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="customer_type">Customer Type *</Label>
                    <Select value={newCustomer.customer_type} onValueChange={(value: "residential" | "trade" | "account") => setNewCustomer({...newCustomer, customer_type: value, entity_type: value === 'residential' ? 'individual' : newCustomer.entity_type, contact_role: getDefaultContactRole(value, newCustomer.entity_type)})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="residential">Residential (Homeowners)</SelectItem>
                        <SelectItem value="trade">Trade (Professionals)</SelectItem>
                        <SelectItem value="account">Account (Business)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="entity_type">Entity Type *</Label>
                    <Select value={newCustomer.entity_type} onValueChange={(value: "individual" | "business") => setNewCustomer({...newCustomer, entity_type: value, contact_role: getDefaultContactRole(newCustomer.customer_type, value)})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="business">Business/Company</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newCustomer.entity_type === 'business' && (
                    <>
                      <div>
                        <Label htmlFor="company_name">Company Name *</Label>
                        <Input
                          id="company_name"
                          value={newCustomer.company_name}
                          onChange={(e) => setNewCustomer({...newCustomer, company_name: e.target.value})}
                          placeholder="Enter company name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="business_name">Business Name</Label>
                        <Input
                          id="business_name"
                          value={newCustomer.business_name}
                          onChange={(e) => setNewCustomer({...newCustomer, business_name: e.target.value})}
                          placeholder="Trading name or DBA name"
                        />
                      </div>
                    </>
                  )}

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">
                      {newCustomer.entity_type === 'business' 
                        ? (isAccountBusiness ? 'Primary Contact (Optional)' : 'Primary Contact') 
                        : 'Contact Information'}
                    </h4>
                    {isAccountBusiness && (
                      <p className="text-xs text-blue-600 mb-3">
                        For business accounts, contact details are optional and can be added later
                      </p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first_name">
                          First Name {!isAccountBusiness && '*'}
                        </Label>
                        <Input
                          id="first_name"
                          value={newCustomer.first_name}
                          onChange={(e) => setNewCustomer({...newCustomer, first_name: e.target.value})}
                          required={!isAccountBusiness}
                        />
                      </div>
                      <div>
                        <Label htmlFor="last_name">
                          Last Name {!isAccountBusiness && '*'}
                        </Label>
                        <Input
                          id="last_name"
                          value={newCustomer.last_name}
                          onChange={(e) => setNewCustomer({...newCustomer, last_name: e.target.value})}
                          required={!isAccountBusiness}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">
                      Email {!isAccountBusiness && '*'}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                      required={!isAccountBusiness}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                    />
                  </div>

                  <div>
                    <GoogleAddressAutocomplete
                      label="Full Address *"
                      value={newCustomer.full_address}
                      onChange={(value) => setNewCustomer({...newCustomer, full_address: value})}
                      onAddressSelect={handleNewCustomerAddressSelect}
                      placeholder="Start typing the address..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="suburb">Suburb *</Label>
                      <Select value={newCustomer.suburb_id} onValueChange={(value) => setNewCustomer({...newCustomer, suburb_id: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select suburb" />
                        </SelectTrigger>
                        <SelectContent>
                          {suburbs.map((suburb) => (
                            <SelectItem key={suburb.id} value={suburb.id}>
                              {suburb.name}, {suburb.state} - {suburb.delivery_rate}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="contact_role">Role</Label>
                      <Input
                        id="contact_role"
                        value={newCustomer.contact_role}
                        onChange={(e) => setNewCustomer({...newCustomer, contact_role: e.target.value})}
                        placeholder={newCustomer.entity_type === 'business' ? 'e.g. Manager, Owner' : 'e.g. Owner, Director'}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={createCustomer}>Create Customer</Button>
                    <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Stop Credit Warning Dialog */}
        <StopCreditWarningDialog
          isOpen={showStopCreditWarning}
          onClose={handleStopCreditCancel}
          onContinue={handleStopCreditContinue}
          customerName={pendingCustomer ? getCustomerDisplayName(pendingCustomer) : ''}
        />
      </CardContent>
    </Card>
  );
}
