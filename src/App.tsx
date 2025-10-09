
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { AuthPage } from "@/components/auth/AuthPage";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import DriverPortal from "./pages/DriverPortal";
import Knowledgebase from "./pages/Knowledgebase";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import NotFound from "./pages/NotFound";
import AccountCustomerLogin from "./pages/AccountCustomerLogin";
import AccountPortal from "./pages/AccountPortal";
import Storefront from "./pages/Storefront";

const queryClient = new QueryClient();

function AuthenticatedApp() {
  const { user, profile, loading } = useAuth();

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

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          profile?.role === 'driver' ? (
            <Navigate to="/driver" replace />
          ) : (
            <Index />
          )
        } 
      />
      <Route 
        path="/driver" 
        element={
          profile?.role === 'driver' ? (
            <DriverPortal />
          ) : (
            <Navigate to="/" replace />
          )
        } 
      />
      {/* Direct routes for dashboard tabs */}
      <Route path="/orders" element={<Index />} />
      <Route path="/products" element={<Index />} />
      <Route path="/customers" element={<Index />} />
      <Route path="/payments" element={<Index />} />
      <Route path="/trucks" element={<Index />} />
      <Route path="/drivers" element={<Index />} />
      <Route path="/suburbs" element={<Index />} />
      <Route path="/emails" element={<Index />} />
      <Route path="/settings" element={<Index />} />
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
        {/* Public payment routes */}
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-cancelled" element={<PaymentCancelled />} />
        
        {/* Account customer portal */}
        <Route path="/account-login" element={<AccountCustomerLogin />} />
        <Route path="/account-portal/*" element={<AccountPortal />} />
        
        {/* Storefront with prefix to avoid conflicts */}
        <Route path="/store/:storeSlug" element={<Storefront />} />
        
        {/* Admin/driver routes - catch-all */}
        <Route path="/*" element={<AuthenticatedApp />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <AppRoutes />
        <Toaster />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
