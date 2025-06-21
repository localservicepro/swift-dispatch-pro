import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DriverLogin } from "@/components/driver/DriverLogin";
import { DriverDashboard } from "@/components/driver/DriverDashboard";
import { supportEmailService } from "@/utils/supportEmailService";

export default function DriverPortal() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if user is a driver
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile && profile.role === 'driver') {
          setUser(user);
          setProfile(profile);
        } else {
          try {
            await supportEmailService.openSupportEmail({
              subject: 'Driver Portal Access Request',
              body: 'Hello, I am trying to access the driver portal but do not have proper access:\n\n'
            });
          } catch (error: any) {
            toast({
              title: "Access Denied",
              description: "You don't have driver access to this portal. Please contact support.",
              variant: "destructive",
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (user: any, profile: any) => {
    setUser(user);
    setProfile(profile);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <DriverLogin onLogin={handleLogin} />;
  }

  return <DriverDashboard user={user} profile={profile} onLogout={handleLogout} />;
}
