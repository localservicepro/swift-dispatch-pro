import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { AuthPage } from "@/components/auth/AuthPage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminLayout } from "./layouts/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Pipeline from "./pages/admin/Pipeline";
import Orders from "./pages/admin/Orders";
import Products from "./pages/admin/Products";
import Customers from "./pages/admin/Customers";
import Payments from "./pages/admin/Payments";
import Fleet from "./pages/admin/Fleet";
import Team from "./pages/admin/Team";
import Suburbs from "./pages/admin/Suburbs";
import Emails from "./pages/admin/Emails";
import SettingsPage from "./pages/admin/Settings";
import DriverPortal from "./pages/DriverPortal";
import CustomerPortal from "./pages/CustomerPortal";
import PortalLogin from "./pages/PortalLogin";
import Knowledgebase from "./pages/Knowledgebase";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import NotFound from "./pages/NotFound";
import { useUserRole } from "./hooks/useUserRole";

const queryClient = new QueryClient();

function AuthenticatedApp() {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // Route based on user role with strict protection
  return (
    <Routes>
      {/* Admin routes with nested routing */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="orders" element={<Orders />} />
        <Route path="products" element={<Products />} />
        <Route path="customers" element={<Customers />} />
        <Route path="payments" element={<Payments />} />
        <Route path="fleet" element={<Fleet />} />
        <Route path="team" element={<Team />} />
        <Route path="suburbs" element={<Suburbs />} />
        <Route path="emails" element={<Emails />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      
      <Route 
        path="/driver" 
        element={
          <ProtectedRoute allowedRoles={['driver']}>
            <DriverPortal />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/customer-portal" 
        element={
          <ProtectedRoute allowedRoles={['account_customer']}>
            <CustomerPortal />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/knowledgebase" 
        element={<Knowledgebase />} 
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes - no authentication required */}
        <Route path="/portal-login" element={<PortalLogin />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-cancelled" element={<PaymentCancelled />} />
        
        {/* All other routes require authentication */}
        <Route path="/*" element={<AuthenticatedApp />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => {
  // Unregister service worker and clear all caches to fix React duplicate instance issue
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(reg => reg.unregister());
      });
    }
    
    // Clear all caches to eliminate stale chunks
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    
    // Clear sessionStorage entries except order-related ones
    try {
      const keysToKeep = ['order_form_draft', 'admin_active_tab', 'order_is_creating'];
      Object.keys(sessionStorage).forEach(key => {
        if (!keysToKeep.includes(key)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error('Error clearing storage:', e);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AppRoutes />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
