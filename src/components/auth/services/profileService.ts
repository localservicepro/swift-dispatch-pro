import { supabase } from '@/integrations/supabase/client';
import { Profile } from '../types';

export const fetchProfile = async (userId: string): Promise<Profile | null> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    // Only allow admin and driver roles in main application - type guard
    if (profile && (profile.role === 'admin' || profile.role === 'driver')) {
      return {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role as 'admin' | 'driver' // Type assertion since we've verified the role
      };
    } else {
      // If user has customer role or no profile, return null without signing out
      console.log('User has customer role or invalid profile, returning null');
      return null;
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
};

export const createAdminProfileIfNeeded = async (userId: string, userEmail: string, userMetadata: any) => {
  try {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingProfile) {
      // Only create profile if user doesn't exist in customers table
      const { data: customerCheck } = await supabase
        .from('customers')
        .select('id')
        .eq('auth_user_id', userId)
        .single();

      if (!customerCheck) {
        await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: userEmail || '',
            full_name: userMetadata?.full_name || '',
            role: 'admin'
          });
        return true; // Profile was created
      }
    }
    return false; // Profile was not created
  } catch (error) {
    console.error('Error creating profile:', error);
    return false;
  }
};
