import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Shield, 
  Truck, 
  User, 
  Building2, 
  Search, 
  Plus, 
  X,
  Loader2,
  AlertCircle
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type UserRole = 'admin' | 'driver' | 'customer' | 'account_customer';

interface UserWithRoles {
  user_id: string;
  email: string;
  full_name: string | null;
  roles: Array<{
    role: UserRole;
    customer_id: string | null;
    customer_name: string | null;
  }>;
}

const roleConfig = {
  admin: { icon: Shield, label: "Admin", color: "bg-purple-100 text-purple-800 border-purple-200" },
  driver: { icon: Truck, label: "Driver", color: "bg-blue-100 text-blue-800 border-blue-200" },
  customer: { icon: User, label: "Customer", color: "bg-green-100 text-green-800 border-green-200" },
  account_customer: { icon: Building2, label: "Account Customer", color: "bg-orange-100 text-orange-800 border-orange-200" },
};

export function UserRoleManagement() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "all">("all");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [roleToAdd, setRoleToAdd] = useState<UserRole | null>(null);
  const [roleToRemove, setRoleToRemove] = useState<{ userId: string; role: UserRole } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUsersWithRoles();
  }, []);

  const loadUsersWithRoles = async () => {
    try {
      setLoading(true);

      // Get all user roles with profile info
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          customer_id
        `);

      if (rolesError) throw rolesError;

      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      if (profilesError) throw profilesError;

      // Get customer names for account_customer roles
      const customerIds = userRoles
        ?.filter(r => r.customer_id)
        .map(r => r.customer_id) || [];

      let customers: any[] = [];
      if (customerIds.length > 0) {
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, company_name, business_name, first_name, last_name')
          .in('id', customerIds);
        customers = customersData || [];
      }

      // Combine data
      const userMap = new Map<string, UserWithRoles>();

      profiles?.forEach(profile => {
        userMap.set(profile.id, {
          user_id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          roles: []
        });
      });

      userRoles?.forEach(ur => {
        const user = userMap.get(ur.user_id);
        if (user) {
          const customer = customers.find(c => c.id === ur.customer_id);
          const customerName = customer 
            ? customer.company_name || customer.business_name || `${customer.first_name} ${customer.last_name}`
            : null;

          user.roles.push({
            role: ur.role as UserRole,
            customer_id: ur.customer_id,
            customer_name: customerName
          });
        }
      });

      setUsers(Array.from(userMap.values()));
    } catch (error: any) {
      console.error('Error loading users with roles:', error);
      toast({
        title: "Error",
        description: "Failed to load user roles",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!selectedUser || !roleToAdd) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUser,
          role: roleToAdd,
          customer_id: null
        });

      if (error) throw error;

      toast({
        title: "Role Added",
        description: `Successfully added ${roleConfig[roleToAdd].label} role`
      });

      loadUsersWithRoles();
      setSelectedUser(null);
      setRoleToAdd(null);
    } catch (error: any) {
      console.error('Error adding role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add role",
        variant: "destructive"
      });
    }
  };

  const handleRemoveRole = async () => {
    if (!roleToRemove) return;

    // Prevent removing last admin role from yourself
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id === roleToRemove.userId && roleToRemove.role === 'admin') {
      const userRoles = users.find(u => u.user_id === roleToRemove.userId)?.roles || [];
      const adminRoles = userRoles.filter(r => r.role === 'admin');
      if (adminRoles.length === 1) {
        toast({
          title: "Cannot Remove Role",
          description: "You cannot remove your own admin role",
          variant: "destructive"
        });
        setRoleToRemove(null);
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', roleToRemove.userId)
        .eq('role', roleToRemove.role);

      if (error) throw error;

      toast({
        title: "Role Removed",
        description: `Successfully removed ${roleConfig[roleToRemove.role].label} role`
      });

      loadUsersWithRoles();
      setRoleToRemove(null);
    } catch (error: any) {
      console.error('Error removing role:', error);
      toast({
        title: "Error",
        description: "Failed to remove role",
        variant: "destructive"
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterRole === "all" || user.roles.some(r => r.role === filterRole);
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading user roles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterRole} onValueChange={(value) => setFilterRole(value as UserRole | "all")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="driver">Driver</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="account_customer">Account Customer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* User Cards */}
      {filteredUsers.length === 0 ? (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-800">No Users Found</h3>
                <p className="text-yellow-700 text-sm">
                  {searchTerm || filterRole !== "all" 
                    ? "No users match your filters" 
                    : "No users with roles found in the system"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <Card key={user.user_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {user.full_name || "Unnamed User"}
                        </h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                      {user.roles.length === 0 ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          No roles assigned
                        </Badge>
                      ) : (
                        user.roles.map((roleData, idx) => {
                          const config = roleConfig[roleData.role];
                          const Icon = config.icon;
                          return (
                            <div key={idx} className="flex items-center gap-1">
                              <Badge className={config.color}>
                                <Icon className="w-3 h-3 mr-1" />
                                {config.label}
                                {roleData.customer_name && (
                                  <span className="ml-1 text-xs opacity-75">
                                    ({roleData.customer_name})
                                  </span>
                                )}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => setRoleToRemove({ userId: user.user_id, role: roleData.role })}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUser(user.user_id)}
                    className="ml-4"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Role
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Role Dialog */}
      <AlertDialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Role</AlertDialogTitle>
            <AlertDialogDescription>
              Select a role to add to {users.find(u => u.user_id === selectedUser)?.email}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={roleToAdd || ""} onValueChange={(value) => setRoleToAdd(value as UserRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Admin
                  </div>
                </SelectItem>
                <SelectItem value="driver">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Driver
                  </div>
                </SelectItem>
                <SelectItem value="customer">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Customer
                  </div>
                </SelectItem>
                <SelectItem value="account_customer">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Account Customer
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddRole} disabled={!roleToAdd}>
              Add Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Role Confirmation */}
      <AlertDialog open={!!roleToRemove} onOpenChange={() => setRoleToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the {roleToRemove && roleConfig[roleToRemove.role].label} role from this user?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveRole} className="bg-destructive hover:bg-destructive/90">
              Remove Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
