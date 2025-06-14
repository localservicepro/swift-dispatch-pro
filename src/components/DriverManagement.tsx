import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Mail, Phone, AlertCircle, Loader2, RefreshCw } from "lucide-react";
interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  role: 'admin' | 'driver';
  created_at: string;
}
export function DriverManagement() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "driver" as 'admin' | 'driver'
  });
  const {
    toast
  } = useToast();
  useEffect(() => {
    loadProfiles();
  }, []);
  const loadProfiles = async () => {
    try {
      setLoading(true);

      // Force a fresh query by adding a timestamp to bypass any caching
      const timestamp = Date.now();
      console.log(`Loading profiles at ${timestamp}...`);
      const {
        data,
        error
      } = await supabase.from('profiles').select('*').order('created_at', {
        ascending: false
      });
      console.log('Profiles query result:', {
        data,
        error,
        count: data?.length
      });
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      setProfiles(data || []);

      // Log profile breakdown
      const drivers = (data || []).filter(p => p.role === 'driver');
      const admins = (data || []).filter(p => p.role === 'admin');
      console.log('Profile breakdown:', {
        total: data?.length || 0,
        drivers: drivers.length,
        admins: admins.length,
        driversList: drivers.map(d => ({
          email: d.email,
          name: d.full_name,
          role: d.role
        }))
      });
    } catch (error: any) {
      console.error('Error loading profiles:', error);
      toast({
        title: "Error",
        description: `Failed to load staff profiles: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfiles();
  };
  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    try {
      setCreating(true);
      console.log('Creating new staff member:', {
        email: newUser.email,
        role: newUser.role,
        full_name: newUser.full_name
      });

      // Call the Edge Function to create user
      const {
        data,
        error
      } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUser.email,
          password: newUser.password,
          full_name: newUser.full_name,
          phone: newUser.phone,
          role: newUser.role
        }
      });
      console.log('Create user response:', {
        data,
        error
      });
      if (error) throw error;
      if (!data.success) {
        throw new Error(data.error || 'Failed to create staff member');
      }
      setNewUser({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        role: "driver"
      });
      setIsAdding(false);

      // Force a complete refresh after user creation
      setTimeout(async () => {
        console.log('Force refreshing profiles after user creation...');
        await loadProfiles();
      }, 2000);
      toast({
        title: "Success",
        description: data.message || `${newUser.role === 'driver' ? 'Driver' : 'Admin'} added successfully!`
      });
    } catch (error: any) {
      console.error('Error creating staff member:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create staff member",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };
  const updateUserRole = async (userId: string, newRole: 'admin' | 'driver') => {
    try {
      console.log(`Updating user ${userId} role to ${newRole}`);
      const {
        error
      } = await supabase.from('profiles').update({
        role: newRole
      }).eq('id', userId);
      if (error) throw error;
      loadProfiles(); // Refresh the list

      toast({
        title: "Success",
        description: `User role updated to ${newRole}`
      });
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive"
      });
    }
  };
  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    try {
      console.log(`Deleting user ${userId}`);
      const {
        error
      } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
      loadProfiles(); // Refresh the list
      toast({
        title: "User Deleted",
        description: "User has been removed from the system"
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
  };
  const driverProfiles = profiles.filter(p => p.role === 'driver');
  const adminProfiles = profiles.filter(p => p.role === 'admin');
  const getStatusColor = (role: string) => {
    return role === "driver" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800";
  };
  if (loading) {
    return <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading users...</span>
      </div>;
  }
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Staff Management</h2>
          <p className="text-slate-600 mt-1">Manage staff members and assign roles</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setIsAdding(true)} className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800">Add New</Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Total Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{profiles.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{driverProfiles.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{adminProfiles.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">Available Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{driverProfiles.length}</div>
          </CardContent>
        </Card>
      </div>

      {driverProfiles.length === 0 && <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-800">No Drivers Available</h3>
                <p className="text-yellow-700 text-sm">
                  You don't have any staff members with the "driver" role. Create some driver accounts or update existing staff roles to enable driver assignment in orders.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>}

      {isAdding && <Card className="border-indigo-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100">
            <CardTitle className="text-indigo-800">Add New Staff Member</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="userEmail">Email *</Label>
                <Input id="userEmail" type="email" value={newUser.email} onChange={e => setNewUser({
              ...newUser,
              email: e.target.value
            })} placeholder="Enter email address" disabled={creating} />
              </div>
              <div>
                <Label htmlFor="userPassword">Password *</Label>
                <Input id="userPassword" type="password" value={newUser.password} onChange={e => setNewUser({
              ...newUser,
              password: e.target.value
            })} placeholder="Enter password" disabled={creating} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="userFullName">Full Name *</Label>
                <Input id="userFullName" value={newUser.full_name} onChange={e => setNewUser({
              ...newUser,
              full_name: e.target.value
            })} placeholder="Enter full name" disabled={creating} />
              </div>
              <div>
                <Label htmlFor="userPhone">Phone Number</Label>
                <Input id="userPhone" value={newUser.phone} onChange={e => setNewUser({
              ...newUser,
              phone: e.target.value
            })} placeholder="Enter phone number" disabled={creating} />
              </div>
            </div>

            <div>
              <Label htmlFor="userRole">Role *</Label>
              <Select value={newUser.role} onValueChange={(value: 'admin' | 'driver') => setNewUser({
            ...newUser,
            role: value
          })} disabled={creating}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleAddUser} className="bg-indigo-600 hover:bg-indigo-700" disabled={creating}>
                {creating ? <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating...
                  </> : 'Add Staff Member'}
              </Button>
              <Button variant="outline" onClick={() => setIsAdding(false)} disabled={creating}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>}

      {/* User List */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">Staff Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profiles.length === 0 ? <div className="text-center py-8 text-gray-500">
                <p>No staff members found in the database.</p>
                <Button variant="outline" onClick={handleRefresh} className="mt-2" disabled={refreshing}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh Data
                </Button>
              </div> : profiles.map(profile => <div key={profile.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-gray-500" />
                      <h3 className="font-semibold text-slate-800">{profile.full_name || 'No name'}</h3>
                      <Badge className={getStatusColor(profile.role)}>
                        {profile.role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={profile.role} onValueChange={(value: 'admin' | 'driver') => updateUserRole(profile.id, value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="driver">Driver</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-slate-500">Email</p>
                        <p className="font-medium">{profile.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-slate-500">Phone</p>
                        <p className="font-medium">{profile.phone || 'Not provided'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-500">Created</p>
                      <p className="font-medium">{new Date(profile.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline">Edit Profile</Button>
                    <Button size="sm" variant="outline">View Activity</Button>
                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => deleteUser(profile.id)}>
                      Delete User
                    </Button>
                  </div>
                </div>)}
          </div>
        </CardContent>
      </Card>
    </div>;
}