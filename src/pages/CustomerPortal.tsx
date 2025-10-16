import { useAuth } from "@/components/auth/AuthProvider";
import { useUserRole } from "@/hooks/useUserRole";
import { CustomerPortalDashboard } from "@/components/customer/CustomerPortalDashboard";
import { Navigate } from "react-router-dom";

export default function CustomerPortal() {
  const { user, loading: authLoading } = useAuth();
  const { isAccountCustomer, loading: roleLoading } = useUserRole();

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
    return <Navigate to="/" replace />;
  }

  // Only account customers can access this portal
  if (!isAccountCustomer) {
    return <Navigate to="/" replace />;
  }

  return <CustomerPortalDashboard />;
}
