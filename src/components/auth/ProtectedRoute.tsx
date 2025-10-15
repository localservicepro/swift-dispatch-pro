import { Navigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUserRole } from "@/hooks/useUserRole";

type UserRole = 'admin' | 'driver' | 'customer' | 'account_customer';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export function ProtectedRoute({ children, allowedRoles, redirectTo }: ProtectedRouteProps) {
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

  if (!user || !role) {
    return <Navigate to="/portal-login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    console.warn(`Unauthorized access attempt. User role: ${role}, Required: ${allowedRoles.join(', ')}`);
    
    // Redirect based on user role
    if (role === 'account_customer') {
      return <Navigate to="/customer-portal" replace />;
    }
    if (role === 'driver') {
      return <Navigate to="/driver" replace />;
    }
    return <Navigate to={redirectTo || "/portal-login"} replace />;
  }

  return <>{children}</>;
}
