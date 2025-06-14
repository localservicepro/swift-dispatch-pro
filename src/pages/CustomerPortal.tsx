
import { Routes, Route, Navigate } from "react-router-dom";
import { CustomerDashboard } from "@/components/customer/CustomerDashboard";
import { CustomerOrders } from "@/components/customer/CustomerOrders";
import { CustomerProfile } from "@/components/customer/CustomerProfile";
import { CustomerOrderDetails } from "@/components/customer/CustomerOrderDetails";

const CustomerPortal = () => {
  return (
    <Routes>
      <Route path="/" element={<CustomerDashboard />} />
      <Route path="/orders" element={<CustomerOrders />} />
      <Route path="/orders/:orderId" element={<CustomerOrderDetails />} />
      <Route path="/profile" element={<CustomerProfile />} />
      <Route path="*" element={<Navigate to="/customer" replace />} />
    </Routes>
  );
};

export default CustomerPortal;
