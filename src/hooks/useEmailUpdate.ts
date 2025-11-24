import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useEmailUpdate = () => {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateEmail = async (userId: string, newEmail: string): Promise<void> => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error('Please enter a valid email address');
      throw new Error('Invalid email format');
    }

    setIsUpdating(true);

    try {
      const { data, error } = await supabase.functions.invoke('update-user-email', {
        body: { userId, newEmail },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        throw new Error(data.error);
      }

      toast.success('Email updated successfully');
    } catch (error: any) {
      console.error('Error updating email:', error);
      toast.error(error.message || 'Failed to update email');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateEmail, isUpdating };
};
