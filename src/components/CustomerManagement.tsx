import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerDialog } from "@/components/customer/CustomerDialog";
import { CustomerOrders } from "@/components/customer/CustomerOrders";
import { CustomerStats } from "@/components/customer/CustomerStats";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Search, Eye, Edit, Trash2, MapPin, Bell, BellOff, Building2, User, Home, Wrench, Filter, X } from "lucide-react";

export function CustomerManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers, isLoading, error } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select(`
          *,
          suburbs (
            id,
            name,
            state,
            postcode,
            delivery_rate
          )
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const filteredCustomers = customers?.filter((customer) => {
    const searchText = searchTerm.toLowerCase();
    const matchesSearch = 
      customer.first_name.toLowerCase().includes(searchText) ||
      customer.last_name.toLowerCase().includes(searchText) ||
      customer.email.toLowerCase().includes(searchText) ||
      customer.suburbs?.name?.toLowerCase().includes(searchText) ||
      customer.company_name?.toLowerCase().includes(searchText) ||
      customer.business_name?.toLowerCase().includes(searchText);
    
    const matchesCustomerType = customerTypeFilter === "all" || customer.customer_type === customerTypeFilter;
    const matchesEntityType = entityTypeFilter === "all" || customer.entity_type === entityTypeFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && customer.is_active) ||
      (statusFilter === "inactive" && !customer.is_active);
    
    return matchesSearch && matchesCustomerType && matchesEntityType && matchesStatus;
  });

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  const handleEditCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleViewOrders = (customer: any) => {
    setSelectedCustomer(customer);
    setShowOrders(true);
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;

    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerId);

      if (error) throw error;

      toast({
        title: "Customer Deleted",
        description: "Customer has been successfully deleted.",
      });

      queryClient.invalidateQueries({ queryKey: ["customers"] });
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast({
        title: "Error",
        description: "Failed to delete customer. Please try again.",
        variant: "destructive",
      });
    }
  };

  const clearAllFilters = () => {
    setCustomerTypeFilter("all");
    setEntityTypeFilter("all");
    setStatusFilter("all");
    setSearchTerm("");
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (customerTypeFilter !== "all") count++;
    if (entityTypeFilter !== "all") count++;
    if (statusFilter !== "all") count++;
    if (searchTerm.trim()) count++;
    return count;
  };

  if (showOrders && selectedCustomer) {
    return (
      <CustomerOrders 
        customer={selectedCustomer} 
        onBack={() => setShowOrders(false)}
      />
    );
  }

  const getCustomerDisplayName = (customer: any) => {
    if (customer.entity_type === 'business' && customer.company_name) {
      return customer.company_name;
    }
    return `${customer.first_name} ${customer.last_name}`;
  };

  const getCustomerSubtitle = (customer: any) => {
    if (customer.entity_type === 'business' && customer.company_name) {
      return `Contact: ${customer.first_name} ${customer.last_name}`;
    }
    return customer.email;
  };

  const getCustomerTypeIcon = (customerType: string) => {
    switch (customerType) {
      case 'residential': return <Home className="w-5 h-5 text-green-600" />;
      case 'trade': return <Wrench className="w-5 h-5 text-orange-600" />;
      case 'account': return <Building2 className="w-5 h-5 text-purple-600" />;
      default: return <User className="w-5 h-5 text-gray-600" />;
    }
  };

  const getCustomerTypeColor = (customerType: string) => {
    switch (customerType) {
      case 'residential': return 'bg-green-100 text-green-800';
      case 'trade': return 'bg-orange-100 text-orange-800';
      case 'account': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEntityTypeColor = (entityType: string) => {
    switch (entityType) {
      case 'individual': return 'bg-blue-100 text-blue-800';
      case 'business': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Customer Management</h1>
          <p className="text-slate-600">Manage Residential, Trade, and Account customers</p>
        </div>
        <Button onClick={handleAddCustomer} className="flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Add Customer
        </Button>
      </div>

      <CustomerStats customers={customers || []} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5" />
            Search & Filter Customers
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount} active
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by name, email, company, or suburb..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearchTerm("")}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Customer Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Customer Type</label>
              <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="residential">
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-green-600" />
                      Residential
                    </div>
                  </SelectItem>
                  <SelectItem value="trade">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-orange-600" />
                      Trade
                    </div>
                  </SelectItem>
                  <SelectItem value="account">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-purple-600" />
                      Account
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Entity Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Entity Type</label>
              <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="individual">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      Individual
                    </div>
                  </SelectItem>
                  <SelectItem value="business">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      Business
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 opacity-0">Actions</label>
              <Button
                variant="outline"
                onClick={clearAllFilters}
                disabled={activeFilterCount === 0}
                className="w-full flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear All
              </Button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-sm text-slate-600 border-t pt-4">
            <span>
              Showing {filteredCustomers?.length || 0} of {customers?.length || 0} customers
            </span>
            {activeFilterCount > 0 && (
              <span className="text-blue-600">
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-8">Loading customers...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              Error loading customers. Please try again.
            </div>
          ) : (
            <div className="space-y-4 p-6">
              {filteredCustomers?.map((customer) => (
                <div key={customer.id} className="border rounded-lg p-4 hover:bg-slate-50">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {getCustomerTypeIcon(customer.customer_type)}
                        <h3 className="font-semibold text-lg">
                          {getCustomerDisplayName(customer)}
                        </h3>
                        <Badge className={getCustomerTypeColor(customer.customer_type)}>
                          {customer.customer_type}
                        </Badge>
                        <Badge className={getEntityTypeColor(customer.entity_type)}>
                          {customer.entity_type}
                        </Badge>
                        {!customer.is_active && (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                        {customer.sms_notifications_enabled ? (
                          <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-200 bg-green-50">
                            <Bell className="w-3 h-3" />
                            <span>Notifications On</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="flex items-center gap-1 text-amber-600 border-amber-200 bg-amber-50">
                            <BellOff className="w-3 h-3" />
                            <span>Notifications Off</span>
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <p>{getCustomerSubtitle(customer)}</p>
                        {customer.entity_type === 'business' && customer.business_name && (
                          <p>Trading as: {customer.business_name}</p>
                        )}
                        {customer.phone && <p>Phone: {customer.phone}</p>}
                        {customer.contact_role && (
                          <p>Role: {customer.contact_role}</p>
                        )}
                        <p>Address: {customer.full_address}</p>
                        {customer.suburbs && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>
                              {customer.suburbs.name}, {customer.suburbs.state} {customer.suburbs.postcode}
                              {customer.suburbs.delivery_rate && customer.suburbs.delivery_rate !== "0" && (
                                <span className="ml-2 text-green-600 font-medium">
                                  (Delivery: ${customer.suburbs.delivery_rate})
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewOrders(customer)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Orders
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCustomer(customer)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCustomer(customer.id)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredCustomers?.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  {activeFilterCount > 0 ? (
                    <div className="space-y-2">
                      <p>No customers found matching your criteria.</p>
                      <Button variant="link" onClick={clearAllFilters} className="text-blue-600">
                        Clear all filters to see all customers
                      </Button>
                    </div>
                  ) : (
                    "No customers found."
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        customer={selectedCustomer}
        isEdit={isEditMode}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["customers"] });
          setIsDialogOpen(false);
        }}
      />
    </div>
  );
}
