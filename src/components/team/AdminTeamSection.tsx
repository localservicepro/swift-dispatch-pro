
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Mail, Phone, RefreshCw, Shield } from "lucide-react";
import { EditProfileDialog } from "./EditProfileDialog";
import { ViewActivityDialog } from "./ViewActivityDialog";
import { RemoveTeamMemberDialog } from "./RemoveTeamMemberDialog";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  role: 'admin' | 'driver' | 'customer' | 'account_customer';
  created_at: string;
}

interface AdminTeamSectionProps {
  admins: Profile[];
  onUpdateRole: (userId: string, newRole: 'admin' | 'driver' | 'customer') => void;
  onDeleteUser: (userId: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export function AdminTeamSection({ 
  admins, 
  onUpdateRole, 
  onDeleteUser, 
  onRefresh, 
  refreshing 
}: AdminTeamSectionProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Profile | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleEditProfile = (admin: Profile) => {
    setSelectedAdmin(admin);
    setEditDialogOpen(true);
  };

  const handleViewActivity = (admin: Profile) => {
    setSelectedAdmin(admin);
    setActivityDialogOpen(true);
  };

  const handleRemoveAdmin = (admin: Profile) => {
    setSelectedAdmin(admin);
    setRemoveDialogOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!selectedAdmin) return;
    
    setIsRemoving(true);
    try {
      await onDeleteUser(selectedAdmin.id);
      setRemoveDialogOpen(false);
      setSelectedAdmin(null);
    } finally {
      setIsRemoving(false);
    }
  };

  if (admins.length === 0) {
    return (
      <div className="text-center py-8">
        <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Admins Found</h3>
        <p className="text-gray-500 mb-4">
          There are no team members with admin privileges in the system.
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
            Showing {admins.length} admin{admins.length !== 1 ? 's' : ''} with system privileges
          </p>
        </div>

        {admins.map((admin) => (
          <Card key={admin.id} className="border-purple-100 hover:bg-purple-50/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{admin.full_name || 'No name'}</h3>
                    <Badge className="bg-purple-100 text-purple-800 text-xs">
                      Administrator
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select 
                    value={admin.role} 
                    onValueChange={(value: 'admin' | 'driver' | 'customer') => onUpdateRole(admin.id, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="driver">Driver</SelectItem>
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
                    <p className="font-medium">{admin.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-slate-500">Phone</p>
                    <p className="font-medium">{admin.phone || 'Not provided'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-500">Joined</p>
                  <p className="font-medium">{new Date(admin.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleEditProfile(admin)}
                >
                  Edit Profile
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleViewActivity(admin)}
                >
                  View Activity
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleRemoveAdmin(admin)}
                >
                  Remove Admin
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <EditProfileDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        profile={selectedAdmin}
        onProfileUpdated={onRefresh}
      />

      <ViewActivityDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        admin={selectedAdmin}
      />

      <RemoveTeamMemberDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        onConfirm={handleConfirmRemove}
        member={selectedAdmin}
        isLoading={isRemoving}
      />
    </>
  );
}
