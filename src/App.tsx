
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { AuthPage } from "@/components/auth/AuthPage";
import Index from "./pages/Index";
import DriverPortal from "./pages/DriverPortal";
import ShopPage from "./pages/ShopPage";
import CustomerAccount from "./pages/CustomerAccount";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AuthenticatedApp() {
  const { user, profile, loading } = useAuth();

  console.log('AuthenticatedApp - User:', user?.id, 'Profile:', profile?.role, 'Loading:', loading);

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

  // If no user is authenticated, show auth page
  if (!user) {
    console.log('No user authenticated, showing auth page');
    return <AuthPage />;
  }

  // If user is authenticated but we're still loading profile data, keep showing loading
  // This is crucial to prevent premature redirects
  if (user && loading) {
    console.log('User authenticated but profile still loading');
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated but has no admin/driver profile, redirect to shop (root)
  // Only do this after loading is complete to ensure we have accurate profile data
  if (user && !loading && !profile) {
    console.log('User authenticated but no admin/driver profile found, redirecting to shop');
    return <Navigate to="/" replace />;
  }

  // User is authenticated and has admin/driver profile
  console.log('User authenticated with profile:', profile?.role);
  return (
    <Routes>
      <Route 
        path="/admin" 
        element={
          profile?.role === 'admin' ? (
            <Index />
          ) : (
            <Navigate to="/" replace />
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
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public shop routes - now at root */}
        <Route path="/" element={<ShopPage />} />
        <Route path="/account" element={<CustomerAccount />} />
        
        {/* Public payment routes - no authentication required */}
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-cancelled" element={<PaymentCancelled />} />
        
        {/* Admin and driver routes require authentication */}
        <Route path="/admin/*" element={<AuthenticatedApp />} />
        <Route path="/driver" element={<AuthenticatedApp />} />
        
        {/* Catch all other routes */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <AppRoutes />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
