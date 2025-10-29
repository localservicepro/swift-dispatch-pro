import { useEffect } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { MobileHeader } from "@/components/MobileHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { LogOut, Loader2 } from "lucide-react";
import { PersonalizedGreeting } from "@/components/PersonalizedGreeting";

const ORDER_CREATING_KEY = 'order_is_creating';
const ORDER_DRAFT_KEY = 'order_form_draft';

export function AdminLayout() {
  const { signOut, profile, signingOut } = useAuth();
  const location = useLocation();

  // Redirect to orders if there's a draft and we're on the root/dashboard
  const shouldRedirectToOrders = 
    (location.pathname === '/' || location.pathname === '/dashboard') &&
    (sessionStorage.getItem(ORDER_CREATING_KEY) === 'true' || sessionStorage.getItem(ORDER_DRAFT_KEY));

  const handleSignOut = async () => {
    const { error } = await signOut();
    
    if (error) {
      console.error("Sign out failed:", error);
    } else {
      console.log("Successfully signed out");
    }
  };

  if (shouldRedirectToOrders) {
    return <Navigate to="/orders" replace />;
  }

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
          <div className="hidden md:flex justify-between items-center p-4 bg-white border-b">
            <PersonalizedGreeting profile={profile} />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{profile?.email}</span>
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
}
