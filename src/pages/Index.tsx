
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { MobileHeader } from "@/components/MobileHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { LogOut, Loader2, BookOpen } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PersonalizedGreeting } from "@/components/PersonalizedGreeting";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useNavigate, Outlet } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

const Index = () => {
  const { signOut, profile, signingOut } = useAuth();
  const navigate = useNavigate();
  const { role } = useUserRole();

  // Defense-in-depth: Double-check role access to prevent unauthorized access
  useEffect(() => {
    if (role && role !== 'admin' && role !== 'super_admin') {
      console.warn('Unauthorized access attempt to admin dashboard by role:', role);
      if (role === 'account_customer') {
        navigate('/customer-portal', { replace: true });
      } else if (role === 'driver') {
        navigate('/driver', { replace: true });
      } else {
        navigate('/portal-login', { replace: true });
      }
    }
  }, [role, navigate]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    
    if (error) {
      console.error("Sign out failed:", error);
    } else {
      console.log("Successfully signed out");
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <AdminSidebar />
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header with user info */}
          <div className="md:hidden">
            <MobileHeader profile={profile} />
          </div>
          
          {/* Desktop header with personalized greeting */}
          <div className="hidden md:flex justify-between items-center py-1.5 px-4 bg-white border-b">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <PersonalizedGreeting profile={profile} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{profile?.email}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/guide')}
                  >
                    <BookOpen className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>SwiftDispatch Guide</TooltipContent>
              </Tooltip>
              <ThemeToggle />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex items-center gap-2"
              >
                {signingOut ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                {signingOut ? "Signing Out..." : "Sign Out"}
              </Button>
            </div>
          </div>
          
          {/* Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 md:p-6 pb-20 md:pb-6">
              <Outlet />
            </div>
          </main>
        </div>
        
        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
};

export default Index;
