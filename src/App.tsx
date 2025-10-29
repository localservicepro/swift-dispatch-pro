import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { AuthPage } from "@/components/auth/AuthPage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import DriverPortal from "./pages/DriverPortal";
import CustomerPortal from "./pages/CustomerPortal";
import PortalLogin from "./pages/PortalLogin";
import Knowledgebase from "./pages/Knowledgebase";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import NotFound from "./pages/NotFound";
import { useUserRole } from "./hooks/useUserRole";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Don't refetch when tab regains focus
      refetchOnMount: false, // Don't refetch when component remounts
      staleTime: 1000 * 60 * 5, // Data stays fresh for 5 minutes
      gcTime: 1000 * 60 * 10, // Keep unused data in cache for 10 minutes
      retry: 1, // Only retry failed requests once
    },
  },
});

function AuthenticatedApp() {
  const { user, session, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  // Only show loading on initial check, not on token refresh
  const isInitializing = authLoading && !session;
  
  if (isInitializing || (roleLoading && user && !role)) {
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
      <Route 
        path="/" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Index />
          </ProtectedRoute>
        } 
      />
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
  // Unregister service worker to prevent reload loops (immediate fix)
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(reg => reg.unregister());
      });
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
