
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Truck, Eye, EyeOff } from "lucide-react";
import { isSafari, showSafariInstructions, isModernIOS, getIOSVersion } from "@/utils/browserCompatibility";

interface DriverLoginProps {
  onLogin: (user: any, profile: any) => void;
}

export function DriverLogin({ onLogin }: DriverLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Check if user is a driver
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile && profile.role === 'driver') {
          onLogin(data.user, profile);
          toast({
            title: "Welcome back!",
            description: "Successfully logged in to driver portal",
          });
        } else {
          await supabase.auth.signOut();
          toast({
            title: "Access Denied",
            description: "You don't have driver access to this portal",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      const isSafariBrowser = isSafari();
      const isModern = isModernIOS();
      
      let errorMessage = error.message;
      let errorTitle = "Login Failed";
      let duration = 5000;
      
      if (isModern) {
        errorTitle = `iOS ${getIOSVersion()}+ Not Supported in Safari`;
        errorMessage = "Please use Chrome or Firefox browser, or add this site to Home Screen as a web app.";
        duration = 15000;
      } else if (isSafariBrowser) {
        errorMessage = "Safari's privacy settings may be blocking login. Try Chrome/Firefox or adjust Settings → Safari → Privacy";
        duration = 10000;
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: duration,
      });
      
      if (isSafariBrowser) {
        console.log(showSafariInstructions());
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">
            Driver Portal
          </CardTitle>
          <p className="text-slate-600">Sign in to manage your deliveries</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
