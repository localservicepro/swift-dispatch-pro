import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function usePasswordReset() {
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  const resetPassword = async (userId: string, newPassword: string) => {
    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { user_id: userId, new_password: newPassword }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Password Reset Successfully",
          description: data.message || "The user can now log in with the new password."
        });
        return true;
      } else {
        throw new Error(data.error || "Failed to reset password");
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Password Reset Failed",
        description: error.message || "An error occurred while resetting the password",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsResetting(false);
    }
  };

  return { resetPassword, isResetting };
}
