import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface UpdateEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentEmail: string;
  onSuccess: () => void;
  onUpdate: (userId: string, newEmail: string) => Promise<void>;
  isUpdating: boolean;
}

export const UpdateEmailDialog = ({
  open,
  onOpenChange,
  userId,
  currentEmail,
  onSuccess,
  onUpdate,
  isUpdating,
}: UpdateEmailDialogProps) => {
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [errors, setErrors] = useState<{ newEmail?: string; confirmEmail?: string }>({});

  const validateForm = () => {
    const newErrors: { newEmail?: string; confirmEmail?: string } = {};

    if (!newEmail) {
      newErrors.newEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      newErrors.newEmail = 'Please enter a valid email address';
    } else if (newEmail === currentEmail) {
      newErrors.newEmail = 'New email must be different from current email';
    }

    if (!confirmEmail) {
      newErrors.confirmEmail = 'Please confirm the email address';
    } else if (newEmail !== confirmEmail) {
      newErrors.confirmEmail = 'Email addresses must match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await onUpdate(userId, newEmail);
      setNewEmail('');
      setConfirmEmail('');
      setErrors({});
      onSuccess();
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleClose = () => {
    setNewEmail('');
    setConfirmEmail('');
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Email Address</DialogTitle>
          <DialogDescription>
            Change the user's email address. They will need to log in with the new email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> The user must log in with the new email address immediately. 
              The old email will no longer work for login.
            </AlertDescription>
          </Alert>

          {/* Current Email - Read Only */}
          <div className="space-y-2">
            <Label htmlFor="current-email">Current Email</Label>
            <Input
              id="current-email"
              value={currentEmail}
              disabled
              className="bg-muted"
            />
          </div>

          {/* New Email Input */}
          <div className="space-y-2">
            <Label htmlFor="new-email">
              New Email Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="new-email"
              type="email"
              placeholder="user@example.com"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                setErrors({ ...errors, newEmail: undefined });
              }}
              disabled={isUpdating}
            />
            {errors.newEmail && (
              <p className="text-sm text-destructive">{errors.newEmail}</p>
            )}
          </div>

          {/* Confirm Email */}
          <div className="space-y-2">
            <Label htmlFor="confirm-email">
              Confirm Email Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="confirm-email"
              type="email"
              placeholder="user@example.com"
              value={confirmEmail}
              onChange={(e) => {
                setConfirmEmail(e.target.value);
                setErrors({ ...errors, confirmEmail: undefined });
              }}
              disabled={isUpdating}
            />
            {errors.confirmEmail && (
              <p className="text-sm text-destructive">{errors.confirmEmail}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isUpdating}
          >
            {isUpdating ? 'Updating...' : 'Update Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
