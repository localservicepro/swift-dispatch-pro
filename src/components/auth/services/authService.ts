import { supabase } from '@/integrations/supabase/client';

export const signIn = async (email: string, password: string) => {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  } catch (error) {
    console.error('Sign in error:', error);
    return { error };
  }
};

export const signUp = async (email: string, password: string, fullName?: string) => {
  try {
    const redirectUrl = `${window.location.origin}/admin`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName || ''
        }
      }
    });
    return { error };
  } catch (error) {
    console.error('Sign up error:', error);
    return { error };
  }
};

export const signOut = async (signingOut: boolean, clearAuthState: () => void) => {
  if (signingOut) return { error: null };
  
  try {
    console.log('Starting sign out process...');
    
    // Clear local state first to prevent race conditions
    clearAuthState();
    
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    
    if (!currentSession) {
      console.log('No active session found during sign out');
      return { error: null };
    }
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Sign out error:', error);
      
      if (error.message?.toLowerCase().includes('session') || 
          error.message?.toLowerCase().includes('not found') ||
          error.status === 403) {
        console.log('Session already invalid, sign out considered successful');
        return { error: null };
      }
      
      return { error };
    } else {
      console.log('Sign out successful');
      return { error: null };
    }
    
  } catch (error) {
    console.error('Sign out exception:', error);
    return { error };
  }
};
