
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2 } from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  role: 'admin' | 'driver' | 'customer' | 'account_customer';
  created_at: string;
}

interface RemoveTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  member: Profile | null;
  isLoading: boolean;
}

export function RemoveTeamMemberDialog({ 
  open, 
  onOpenChange, 
  onConfirm, 
  member, 
  isLoading 
}: RemoveTeamMemberDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Remove Team Member
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to remove <strong>{member?.full_name || member?.email}</strong> from the team?
            </p>
            <p className="text-sm text-muted-foreground">
              {member?.role === 'driver' && (
                "This driver will no longer be able to access the driver portal or receive delivery assignments."
              )}
              {member?.role === 'admin' && (
                "This admin will lose access to the admin dashboard and all administrative functions."
              )}
            </p>
            <p className="text-sm font-medium text-red-600">
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Removing...
              </>
            ) : (
              `Remove ${member?.role === 'driver' ? 'Driver' : 'Admin'}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
