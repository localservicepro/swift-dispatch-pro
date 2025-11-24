
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Key, Mail } from "lucide-react";
import { ResetPasswordDialog } from "./ResetPasswordDialog";
import { UpdateEmailDialog } from "./UpdateEmailDialog";
import { usePasswordReset } from "@/hooks/usePasswordReset";
import { useEmailUpdate } from "@/hooks/useEmailUpdate";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  role: 'admin' | 'driver' | 'customer' | 'account_customer';
  created_at: string;
}

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  onProfileUpdated: () => void;
}

export function EditProfileDialog({ open, onOpenChange, profile, onProfileUpdated }: EditProfileDialogProps) {
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [isLoading, setIsLoading] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [updateEmailOpen, setUpdateEmailOpen] = useState(false);
  const { toast } = useToast();
  const { resetPassword, isResetting } = usePasswordReset();
  const { updateEmail, isUpdating } = useEmailUpdate();

  const handleSave = async () => {
    if (!profile) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      onProfileUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update local state when profile changes
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  value={profile?.email || ""}
                  disabled
                  className="bg-muted flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUpdateEmailOpen(true)}
                  type="button"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Update
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Click Update to change the user's email address
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter full name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
          </div>
          
          <div className="border-t pt-4 pb-4">
            <Button
              variant="outline"
              onClick={() => setResetPasswordOpen(true)}
              className="w-full"
            >
              <Key className="w-4 h-4 mr-2" />
              Reset Password
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Set a new password for this user if they forgot theirs
            </p>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {profile && (
        <>
          <ResetPasswordDialog
            open={resetPasswordOpen}
            onOpenChange={setResetPasswordOpen}
            userId={profile.id}
            userEmail={profile.email}
            onSuccess={() => setResetPasswordOpen(false)}
            onReset={async (userId, password) => {
              await resetPassword(userId, password);
            }}
            isResetting={isResetting}
          />
          
          <UpdateEmailDialog
            open={updateEmailOpen}
            onOpenChange={setUpdateEmailOpen}
            userId={profile.id}
            currentEmail={profile.email}
            onSuccess={() => {
              setUpdateEmailOpen(false);
              onProfileUpdated();
            }}
            onUpdate={updateEmail}
            isUpdating={isUpdating}
          />
        </>
      )}
    </>
  );
}
