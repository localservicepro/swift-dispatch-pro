
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminTeamSection } from "./team/AdminTeamSection";
import { DriverTeamSection } from "./team/DriverTeamSection";
import { AddTeamMemberDialog } from "./team/AddTeamMemberDialog";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  role: 'admin' | 'driver' | 'customer';
  created_at: string;
}

export function TeamManagement() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [activeTab, setActiveTab] = useState("drivers");
  const { toast } = useToast();

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setLoading(true);

      const timestamp = Date.now();
      console.log(`Loading profiles at ${timestamp}...`);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('Profiles query result:', { data, error, count: data?.length });
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      setProfiles(data || []);

      const drivers = (data || []).filter(p => p.role === 'driver');
      const admins = (data || []).filter(p => p.role === 'admin');
      console.log('Profile breakdown:', {
        total: data?.length || 0,
        drivers: drivers.length,
        admins: admins.length,
      });
    } catch (error: any) {
      console.error('Error loading profiles:', error);
      toast({
        title: "Error",
        description: `Failed to load team profiles: ${error.message}`,
        variant: "destructive",
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

  const updateUserRole = async (userId: string, newRole: 'admin' | 'driver' | 'customer') => {
    try {
      console.log(`Updating user ${userId} role to ${newRole}`);
      
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      loadProfiles();

      toast({
        title: "Success",
        description: `User role updated to ${newRole}`,
      });
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      console.log(`Deleting user ${userId}`);
      
      const { error } = await supabase.auth.admin.deleteUser(userId);
      
      if (error) throw error;

      loadProfiles();
      
      toast({
        title: "User Deleted",
        description: "User has been removed from the system",
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const driverProfiles = profiles.filter(p => p.role === 'driver');
  const adminProfiles = profiles.filter(p => p.role === 'admin');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading team...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Team Management</h2>
          <p className="text-slate-600 mt-1">Manage team members and assign roles</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={() => setIsAddingMember(true)} 
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
          >
            Add New Member
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Total Team</CardTitle>
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

      {driverProfiles.length === 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-800">No Drivers Available</h3>
                <p className="text-yellow-700 text-sm">
                  You don't have any team members with the "driver" role. Create some driver accounts or update existing team roles to enable driver assignment in orders.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Directory with Tabs */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">Team Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="drivers" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Drivers ({driverProfiles.length})
              </TabsTrigger>
              <TabsTrigger value="admins" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Admins ({adminProfiles.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="drivers" className="mt-6">
              <DriverTeamSection 
                drivers={driverProfiles}
                onUpdateRole={updateUserRole}
                onDeleteUser={deleteUser}
                onRefresh={handleRefresh}
                refreshing={refreshing}
              />
            </TabsContent>
            
            <TabsContent value="admins" className="mt-6">
              <AdminTeamSection 
                admins={adminProfiles}
                onUpdateRole={updateUserRole}
                onDeleteUser={deleteUser}
                onRefresh={handleRefresh}
                refreshing={refreshing}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AddTeamMemberDialog 
        isOpen={isAddingMember}
        onClose={() => setIsAddingMember(false)}
        onMemberAdded={loadProfiles}
        defaultRole={activeTab === "drivers" ? "driver" : "admin"}
      />
    </div>
  );
}
