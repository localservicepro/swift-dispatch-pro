import React from 'react';
import './App.css';
import { Index } from "./pages/Index";
import { NotFound } from "./pages/NotFound";
import { DriverPortal } from "./pages/DriverPortal";
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import { Toaster } from "@/components/ui/toaster"
import { QueryClient } from "@tanstack/react-query";
import { PayInvoice } from "./pages/PayInvoice";
import { PaymentSuccess } from "./pages/PaymentSuccess";
import { PaymentCancel } from "./pages/PaymentCancel";

function App() {
  return (
    <QueryClient>
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
    </QueryClient>
  );
}

export default App;
