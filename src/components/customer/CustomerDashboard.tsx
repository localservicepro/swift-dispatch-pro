import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, BarChart2, User, ListChecks } from "lucide-react";
import { CustomerWelcome } from "./CustomerWelcome";

export const CustomerDashboard = () => {
  const { profile } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [isNewAccount, setIsNewAccount] = useState(false);

  // Check if this is a new account (you could pass this via URL params or localStorage)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const newAccount = urlParams.get('new_account');
    if (newAccount === 'true') {
      setIsNewAccount(true);
      setShowWelcome(true);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  if (showWelcome) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <CustomerWelcome 
          isNewAccount={isNewAccount}
          onClose={() => setShowWelcome(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <User className="h-8 w-8 text-blue-600 mr-4" />
              <h1 className="text-xl font-bold text-gray-900">Customer Dashboard</h1>
            </div>
            <div>
              {profile?.full_name && (
                <span className="text-gray-600">Welcome, {profile.full_name}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Profile</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Manage your personal information and settings.
              </p>
              <Link to="/customer/profile">
                <Button className="mt-4 w-full">
                  View Profile
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Orders Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ListChecks className="h-4 w-4" />
                <span>Orders</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Track your orders and view order history.
              </p>
              <Link to="/customer/orders">
                <Button className="mt-4 w-full">
                  View Orders
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Shop Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CalendarDays className="h-4 w-4" />
                <span>Shop</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Continue shopping for more products.
              </p>
              <Link to="/shop">
                <Button className="mt-4 w-full">
                  Go to Shop
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};
