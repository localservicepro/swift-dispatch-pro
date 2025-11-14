import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DriverLogin } from "@/components/driver/DriverLogin";
import { DriverDashboard } from "@/components/driver/DriverDashboard";
import { supportEmailService } from "@/utils/supportEmailService";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { isSafari, isStorageAccessible, isModernIOS, getIOSVersion } from "@/utils/browserCompatibility";

export default function DriverPortal() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [showSafariWarning, setShowSafariWarning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check for Safari-specific issues, especially iOS 17+
    if (isSafari() && (!isStorageAccessible() || isModernIOS())) {
      setShowSafariWarning(true);
    }
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
      
      // Show Safari-specific error message
      if (isSafari()) {
        toast({
          title: "Safari Compatibility Issue",
          description: "Please ensure cookies and website data are enabled in Safari Settings > Privacy",
          variant: "destructive",
          duration: 10000,
        });
      }
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
        {showSafariWarning && (
          <Alert className="absolute top-4 left-4 right-4 max-w-2xl mx-auto" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {isModernIOS() ? `iOS ${getIOSVersion()}+ Compatibility Issue` : 'Safari Compatibility Issue'}
            </AlertTitle>
            <AlertDescription className="mt-2">
              {isModernIOS() ? (
                <>
                  <p className="font-semibold mb-2">iOS 17+ has stricter privacy that blocks authentication.</p>
                  <p className="mb-2"><strong>Recommended:</strong> Install Chrome or Firefox from the App Store</p>
                  <p className="text-sm">Alternative: Add to Home Screen (tap Share → Add to Home Screen) to bypass some restrictions</p>
                </>
              ) : (
                <>
                  <strong>Safari Users:</strong> If you're having trouble logging in:
                  <ul className="list-disc ml-4 mt-2">
                    <li>Turn OFF "Prevent Cross-Site Tracking" in Settings → Safari → Privacy</li>
                    <li>Or use Chrome/Firefox browser instead</li>
                  </ul>
                </>
              )}
            </AlertDescription>
          </Alert>
        )}
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <>
        {showSafariWarning && (
          <Alert className="m-4" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {isModernIOS() ? `iOS ${getIOSVersion()}+ Not Fully Supported` : 'Safari Compatibility Issue'}
            </AlertTitle>
            <AlertDescription className="mt-2">
              {isModernIOS() ? (
                <>
                  <p className="font-semibold mb-2">Latest iPhones (iOS 17+) have privacy features that block this login.</p>
                  <p className="mb-2"><strong>Solution:</strong> Download and use Chrome or Firefox from the App Store</p>
                  <p className="text-sm mb-2"><strong>Or:</strong> Tap Share → "Add to Home Screen" to install as web app</p>
                  <p className="text-xs text-muted-foreground">iOS 17+ blocks third-party authentication even with Safari settings changed.</p>
                </>
              ) : (
                <>
                  <strong>Safari Compatibility Issue:</strong> Safari's privacy settings may prevent login. 
                  Please disable "Prevent Cross-Site Tracking" in Settings → Safari → Privacy, or use Chrome/Firefox.
                </>
              )}
            </AlertDescription>
          </Alert>
        )}
        <DriverLogin onLogin={handleLogin} />
      </>
    );
  }

  return <DriverDashboard user={user} profile={profile} onLogout={handleLogout} />;
}
