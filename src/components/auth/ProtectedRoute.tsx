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
  const { roles, loading: roleLoading } = useUserRole();

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

  if (!user || roles.length === 0) {
    return <Navigate to="/portal-login" replace />;
  }

  // Check if user has ANY of the allowed roles
  const hasAllowedRole = allowedRoles.some(allowedRole => roles.includes(allowedRole));

  if (!hasAllowedRole) {
    console.warn(`Unauthorized access attempt. User roles: ${roles.join(', ')}, Required: ${allowedRoles.join(', ')}`);
    
    // Redirect based on user roles (priority order)
    if (roles.includes('account_customer')) {
      return <Navigate to="/customer-portal" replace />;
    }
    if (roles.includes('driver')) {
      return <Navigate to="/driver" replace />;
    }
    return <Navigate to={redirectTo || "/portal-login"} replace />;
  }

  return <>{children}</>;
}
