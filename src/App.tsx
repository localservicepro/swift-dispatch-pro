
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { AuthPage } from "@/components/auth/AuthPage";
import Index from "./pages/Index";
import DriverPortal from "./pages/DriverPortal";
import CustomerPortal from "./pages/CustomerPortal";
import Shop from "./pages/Shop";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import NotFound from "./pages/NotFound";

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
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            profile?.role === 'driver' ? (
              <Navigate to="/driver" replace />
            ) : profile?.role === 'customer' ? (
              <Navigate to="/shop" replace />
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
        <Route 
          path="/customer/*" 
          element={
            profile?.role === 'customer' ? (
              <CustomerPortal />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/shop" 
          element={
            profile?.role === 'customer' ? (
              <Shop />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-cancelled" element={<PaymentCancelled />} />
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
        <AuthenticatedApp />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
