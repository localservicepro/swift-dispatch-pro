import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, User, Phone, Mail, MapPin } from "lucide-react";

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  full_address: string;
  customer_type: string;
  suburb_id: string;
  suburb?: {
    name: string;
    state: string;
    delivery_rate: number;
  };
}

interface Suburb {
  id: string;
  name: string;
  state: string;
  postcode: string;
  delivery_rate: number;
}

interface CustomerSearchStepProps {
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer) => void;
  onNext: () => void;
}

export function CustomerSearchStep({ selectedCustomer, onCustomerSelect, onNext }: CustomerSearchStepProps) {
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
    customer_type: "trade"
  });
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
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        suburb:suburbs(name, state, delivery_rate)
      `)
      .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      .eq('is_active', true)
      .limit(10);

    if (!error && data) {
      setCustomers(data);
    }
    setLoading(false);
  };

  const createCustomer = async () => {
    if (!newCustomer.first_name || !newCustomer.last_name || !newCustomer.email || !newCustomer.suburb_id) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from('customers')
      .insert([newCustomer])
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
                <h3 className="font-semibold text-green-800">
                  {selectedCustomer.first_name} {selectedCustomer.last_name}
                </h3>
                <Badge variant={selectedCustomer.customer_type === 'trade' ? 'default' : 'secondary'}>
                  {selectedCustomer.customer_type.toUpperCase()}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  {selectedCustomer.email}
                </div>
                {selectedCustomer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    {selectedCustomer.phone}
                  </div>
                )}
                <div className="flex items-center gap-2 md:col-span-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  {selectedCustomer.full_address}
                </div>
              </div>
            </div>
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
                  placeholder="Search customers by name or email..."
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
                    onClick={() => onCustomerSelect(customer)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">
                        {customer.first_name} {customer.last_name}
                      </h4>
                      <Badge variant={customer.customer_type === 'trade' ? 'default' : 'secondary'}>
                        {customer.customer_type.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>{customer.email}</div>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        value={newCustomer.first_name}
                        onChange={(e) => setNewCustomer({...newCustomer, first_name: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        value={newCustomer.last_name}
                        onChange={(e) => setNewCustomer({...newCustomer, last_name: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
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
                    <Label htmlFor="full_address">Full Address *</Label>
                    <Input
                      id="full_address"
                      value={newCustomer.full_address}
                      onChange={(e) => setNewCustomer({...newCustomer, full_address: e.target.value})}
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
                              {suburb.name}, {suburb.state} - ${suburb.delivery_rate}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="customer_type">Customer Type *</Label>
                      <Select value={newCustomer.customer_type} onValueChange={(value) => setNewCustomer({...newCustomer, customer_type: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trade">Trade (Direct Billing)</SelectItem>
                          <SelectItem value="account">Account (Monthly Billing)</SelectItem>
                        </SelectContent>
                      </Select>
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
      </CardContent>
    </Card>
  );
}
