import { Navigate, Routes, Route } from 'react-router-dom';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { PortalDashboard } from '@/components/portal/PortalDashboard';
import { PortalOrders } from '@/components/portal/PortalOrders';
import { PortalProfile } from '@/components/portal/PortalProfile';
import { PortalSettings } from '@/components/portal/PortalSettings';

export default function AccountPortal() {
  const { isCustomer, hasPortalAccess, isLoading } = useCustomerAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isCustomer || !hasPortalAccess) {
    return <Navigate to="/account-login" replace />;
  }

  return (
    <PortalLayout>
      <Routes>
        <Route path="/" element={<PortalDashboard />} />
        <Route path="/orders" element={<PortalOrders />} />
        <Route path="/profile" element={<PortalProfile />} />
        <Route path="/settings" element={<PortalSettings />} />
      </Routes>
    </PortalLayout>
  );
}
