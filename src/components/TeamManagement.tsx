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
import { UserRoleManagement } from "./team/UserRoleManagement";
import { AddTeamMemberDialog } from "./team/AddTeamMemberDialog";
import { ErrorBoundary } from "./ErrorBoundary";
import { useDatabaseHealth } from "@/hooks/useDatabaseHealth";
import { useUserRole } from "@/hooks/useUserRole";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  role: 'super_admin' | 'admin' | 'driver' | 'customer' | 'account_customer';
  created_at: string;
}
export function TeamManagement() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [activeTab, setActiveTab] = useState("drivers");
  const [error, setError] = useState<string | null>(null);
  const {
    toast
  } = useToast();
  const {
    healthCheck,
    runHealthCheck
  } = useDatabaseHealth();
  const { isSuperAdmin } = useUserRole();
  useEffect(() => {
    loadProfiles();
  }, []);
  const loadProfiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const timestamp = Date.now();
      console.log(`[TeamManagement] Loading profiles at ${timestamp}...`);

      // Check authentication first
      const {
        data: {
          user
        },
        error: authError
      } = await supabase.auth.getUser();
      if (authError) {
        console.error('[TeamManagement] Auth error:', authError);
        throw new Error(`Authentication error: ${authError.message}`);
      }
      if (!user) {
        throw new Error('No authenticated user found');
      }
      console.log('[TeamManagement] Authenticated user:', user.id);
      const {
        data,
        error
      } = await supabase.from('profiles').select('*').order('created_at', {
        ascending: false
      });
      console.log('[TeamManagement] Profiles query result:', {
        data,
        error,
        count: data?.length,
        timestamp
      });
      if (error) {
        console.error('[TeamManagement] Database error:', error);
        throw error;
      }
      if (!data) {
        console.warn('[TeamManagement] No data returned from profiles query');
        setProfiles([]);
        return;
      }
      setProfiles(data);
      const drivers = data.filter(p => p.role === 'driver');
      const admins = data.filter(p => p.role === 'admin' || p.role === 'super_admin');
      console.log('[TeamManagement] Profile breakdown:', {
        total: data.length,
        drivers: drivers.length,
        admins: admins.length
      });
    } catch (error: any) {
      console.error('[TeamManagement] Error loading profiles:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      setError(errorMessage);
      toast({
        title: "Error Loading Team",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  const handleRefresh = async () => {
    console.log('[TeamManagement] Refreshing profiles...');
    setRefreshing(true);
    await loadProfiles();
    await runHealthCheck();
  };
  const updateUserRole = async (userId: string, newRole: 'super_admin' | 'admin' | 'driver' | 'customer') => {
    try {
      console.log(`[TeamManagement] Updating user ${userId} role to ${newRole}`);
      
      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      
      if (profileError) throw profileError;
      
      // Update user_roles table - delete old roles and insert new one
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
        
      if (deleteError) throw deleteError;
      
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });
        
      if (insertError) throw insertError;
      
      loadProfiles();
      toast({
        title: "Success",
        description: `User role updated to ${newRole}`
      });
    } catch (error: any) {
      console.error('[TeamManagement] Error updating role:', error);
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
      console.log(`[TeamManagement] Deleting user ${userId}`);
      
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId }
      });
      
      if (error) throw error;
      if (data && !data.success) {
        throw new Error(data.error || 'Failed to delete user');
      }
      
      await loadProfiles();
      
      toast({
        title: "User Deleted",
        description: "User has been removed from the system"
      });
    } catch (error: any) {
      console.error('[TeamManagement] Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive"
      });
    }
  };
  const driverProfiles = profiles.filter(p => p.role === 'driver');
  const adminProfiles = profiles.filter(p => p.role === 'admin' || p.role === 'super_admin');
  if (loading) {
    return <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading team...</span>
      </div>;
  }
  if (error) {
    return <ErrorBoundary fallbackTitle="Team Management Error" showRefresh>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-800">Failed to Load Team Data</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
                <div className="mt-3 space-y-2">
                  <Button onClick={handleRefresh} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry Loading
                  </Button>
                  {healthCheck && <div className="text-xs text-red-600 space-y-1">
                      <p>Debug Info:</p>
                      <p>• Current User: {healthCheck.currentUser.success ? `${healthCheck.currentUser.role} (${healthCheck.currentUser.id})` : healthCheck.currentUser.error}</p>
                      <p>• Profiles Access: {healthCheck.profiles.success ? `✓ (${healthCheck.profiles.count} records)` : `✗ ${healthCheck.profiles.error}`}</p>
                    </div>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </ErrorBoundary>;
  }
  return <ErrorBoundary fallbackTitle="Team Management Component Error" showRefresh>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Team Management</h2>
            <p className="text-slate-600 mt-1">Manage team members and assign roles</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setIsAddingMember(true)} className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800">
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

        {driverProfiles.length === 0 && <Card className="border-yellow-200 bg-yellow-50">
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
          </Card>}

        {/* Team Directory with Tabs */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">Team Directory</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`grid w-full ${isSuperAdmin ? 'grid-cols-3' : 'grid-cols-1'}`}>
                {isSuperAdmin && (
                  <TabsTrigger value="roles" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    User Roles
                  </TabsTrigger>
                )}
                <TabsTrigger value="drivers" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Drivers ({driverProfiles.length})
                </TabsTrigger>
                {isSuperAdmin && (
                  <TabsTrigger value="admins" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Admins ({adminProfiles.length})
                  </TabsTrigger>
                )}
              </TabsList>
              
              {isSuperAdmin && (
                <TabsContent value="roles" className="mt-6">
                  <ErrorBoundary fallbackTitle="User Roles Section Error">
                    <UserRoleManagement />
                  </ErrorBoundary>
                </TabsContent>
              )}

              <TabsContent value="drivers" className="mt-6">
                <ErrorBoundary fallbackTitle="Driver Section Error">
                  <DriverTeamSection drivers={driverProfiles} onUpdateRole={updateUserRole} onDeleteUser={deleteUser} onRefresh={handleRefresh} refreshing={refreshing} />
                </ErrorBoundary>
              </TabsContent>
              
              {isSuperAdmin && (
                <TabsContent value="admins" className="mt-6">
                  <ErrorBoundary fallbackTitle="Admin Section Error">
                    <AdminTeamSection admins={adminProfiles} onUpdateRole={updateUserRole} onDeleteUser={deleteUser} onRefresh={handleRefresh} refreshing={refreshing} />
                  </ErrorBoundary>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>

        <AddTeamMemberDialog isOpen={isAddingMember} onClose={() => setIsAddingMember(false)} onMemberAdded={loadProfiles} defaultRole={activeTab === "drivers" ? "driver" : "admin"} />
      </div>
    </ErrorBoundary>;
}