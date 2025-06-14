
import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { MobileHeader } from "@/components/MobileHeader";
import { DashboardOverview } from "@/components/DashboardOverview";
import { OrderManagement } from "@/components/OrderManagement";
import { ProductManagement } from "@/components/ProductManagement";
import { PaymentManagement } from "@/components/PaymentManagement";
import { DriverManagement } from "@/components/DriverManagement";
import { Settings } from "@/components/Settings";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Loader2 } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { signOut, profile, signingOut } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await signOut();
    
    if (error) {
      toast({
        title: "Sign Out Failed",
        description: "There was an error signing out. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardOverview />;
      case "orders":
        return <OrderManagement />;
      case "products":
        return <ProductManagement />;
      case "payments":
        return <PaymentManagement />;
      case "drivers":
        return <DriverManagement />;
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
            <MobileHeader activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>
          
          {/* Desktop header with user info */}
          <div className="hidden md:flex justify-between items-center p-4 bg-white border-b">
            <h1 className="text-xl font-semibold">Order Management System</h1>
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
