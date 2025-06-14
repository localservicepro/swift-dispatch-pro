
import React from 'react';
import './App.css';
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import DriverPortal from "./pages/DriverPortal";
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PayInvoice } from "./pages/PayInvoice";
import { PaymentSuccess } from "./pages/PaymentSuccess";
import { PaymentCancel } from "./pages/PaymentCancel";
import { AuthProvider } from "@/components/auth/AuthProvider";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Toaster />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/driver" element={<DriverPortal />} />
              <Route path="/pay-invoice/:orderId" element={<PayInvoice />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/payment-cancel" element={<PaymentCancel />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
