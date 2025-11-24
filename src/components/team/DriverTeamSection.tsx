
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Mail, Phone, RefreshCw, Truck, Key } from "lucide-react";
import { EditProfileDialog } from "./EditProfileDialog";
import { ViewDeliveriesDialog } from "./ViewDeliveriesDialog";
import { RemoveTeamMemberDialog } from "./RemoveTeamMemberDialog";
import { ResetPasswordDialog } from "./ResetPasswordDialog";
import { usePasswordReset } from "@/hooks/usePasswordReset";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  role: 'super_admin' | 'admin' | 'driver' | 'customer' | 'account_customer';
  created_at: string;
}

interface DriverTeamSectionProps {
  drivers: Profile[];
  onUpdateRole: (userId: string, newRole: 'admin' | 'driver' | 'customer') => void;
  onDeleteUser: (userId: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export function DriverTeamSection({ 
  drivers, 
  onUpdateRole, 
  onDeleteUser, 
  onRefresh, 
  refreshing 
}: DriverTeamSectionProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deliveriesDialogOpen, setDeliveriesDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Profile | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const { resetPassword, isResetting } = usePasswordReset();

  const handleEditProfile = (driver: Profile) => {
    setSelectedDriver(driver);
    setEditDialogOpen(true);
  };

  const handleViewDeliveries = (driver: Profile) => {
    setSelectedDriver(driver);
    setDeliveriesDialogOpen(true);
  };

  const handleRemoveDriver = (driver: Profile) => {
    setSelectedDriver(driver);
    setRemoveDialogOpen(true);
  };

  const handleResetPassword = (driver: Profile) => {
    setSelectedDriver(driver);
    setResetPasswordOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!selectedDriver) return;
    
    setIsRemoving(true);
    try {
      await onDeleteUser(selectedDriver.id);
      setRemoveDialogOpen(false);
      setSelectedDriver(null);
    } finally {
      setIsRemoving(false);
    }
  };

  if (drivers.length === 0) {
    return (
      <div className="text-center py-8">
        <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Drivers Found</h3>
        <p className="text-gray-500 mb-4">
          There are no team members with driver role in the system.
        </p>
        <Button variant="outline" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            Showing {drivers.length} driver{drivers.length !== 1 ? 's' : ''} available for deliveries
          </p>
        </div>

        {drivers.map((driver) => (
          <Card key={driver.id} className="border-blue-100 hover:bg-blue-50/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Truck className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{driver.full_name || 'No name'}</h3>
                    <Badge className="bg-blue-100 text-blue-800 text-xs">
                      Driver
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select 
                    value={driver.role} 
                    onValueChange={(value: 'admin' | 'driver' | 'customer') => onUpdateRole(driver.id, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="driver">Driver</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-slate-500">Email</p>
                    <p className="font-medium">{driver.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-slate-500">Phone</p>
                    <p className="font-medium">{driver.phone || 'Not provided'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-500">Joined</p>
                  <p className="font-medium">{new Date(driver.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleEditProfile(driver)}
                >
                  Edit Profile
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleResetPassword(driver)}
                >
                  <Key className="w-4 h-4 mr-2" />
                  Reset Password
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleViewDeliveries(driver)}
                >
                  View Deliveries
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleRemoveDriver(driver)}
                >
                  Remove Driver
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <EditProfileDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        profile={selectedDriver}
        onProfileUpdated={onRefresh}
      />

      <ViewDeliveriesDialog
        open={deliveriesDialogOpen}
        onOpenChange={setDeliveriesDialogOpen}
        driver={selectedDriver}
      />

      <RemoveTeamMemberDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        onConfirm={handleConfirmRemove}
        member={selectedDriver}
        isLoading={isRemoving}
      />

      {selectedDriver && (
        <ResetPasswordDialog
          open={resetPasswordOpen}
          onOpenChange={setResetPasswordOpen}
          userId={selectedDriver.id}
          userEmail={selectedDriver.email}
          onSuccess={() => setResetPasswordOpen(false)}
          onReset={async (userId, password) => {
            await resetPassword(userId, password);
          }}
          isResetting={isResetting}
        />
      )}
    </>
  );
}
