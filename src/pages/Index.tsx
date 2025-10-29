
import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { MobileHeader } from "@/components/MobileHeader";
import { DashboardOverview } from "@/components/DashboardOverview";
import { OpportunityPipeline } from "@/components/OpportunityPipeline";
import { OrderManagement } from "@/components/OrderManagement";
import { ProductManagement } from "@/components/ProductManagement";
import { PaymentManagement } from "@/components/PaymentManagement";
import { EmailManagement } from "@/components/EmailManagement";
import { CustomerManagement } from "@/components/CustomerManagement";
import { Settings } from "@/components/Settings";
import { TruckManagement } from "@/components/TruckManagement";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { LogOut, Loader2 } from "lucide-react";
import { TeamManagement } from "@/components/TeamManagement";
import { PersonalizedGreeting } from "@/components/PersonalizedGreeting";
import { SuburbManagement } from "@/components/SuburbManagement";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

const Index = () => {
  const [activeTab, setActiveTab] = useState(() => {
    // Remember where the user was (admin tab only, no dialog state)
    return localStorage.getItem('sd_active_tab') || 'dashboard';
  });
  const { signOut, profile, signingOut } = useAuth();
  const navigate = useNavigate();
  const { role } = useUserRole();

  // Persist active tab when it changes (minimal persistence)
  useEffect(() => {
    localStorage.setItem('sd_active_tab', activeTab);
  }, [activeTab]);

  // Defense-in-depth: Double-check role access to prevent unauthorized access
  useEffect(() => {
    if (role && role !== 'admin') {
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

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardOverview />;
      case "opportunities":
        return <OpportunityPipeline />;
      case "orders":
        return <OrderManagement />;
      case "products":
        return <ProductManagement />;
      case "customers":
        return <CustomerManagement />;
      case "payments":
        return <PaymentManagement />;
      case "trucks":
        return <TruckManagement />;
      case "drivers":
        return <TeamManagement />;
      case "suburbs":
        return <SuburbManagement />;
      case "emails":
        return <EmailManagement />;
      case "knowledgebase":
        navigate("/knowledgebase");
        return <DashboardOverview />;
      case "settings":
        return <Settings />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header with user info */}
          <div className="md:hidden">
            <MobileHeader activeTab={activeTab} setActiveTab={setActiveTab} profile={profile} />
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
              {renderContent()}
            </div>
          </main>
        </div>
        
        {/* Mobile Bottom Navigation */}
        <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </SidebarProvider>
  );
};

export default Index;
