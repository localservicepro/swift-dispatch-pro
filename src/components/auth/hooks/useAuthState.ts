
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '../types';
import { fetchProfile, createAdminProfileIfNeeded } from '../services/profileService';

export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const clearAuthState = () => {
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const handleProfileFetch = async (userId: string) => {
    const fetchedProfile = await fetchProfile(userId);
    setProfile(fetchedProfile);
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        // Handle sign out immediately
        if (event === 'SIGNED_OUT' || !session) {
          clearAuthState();
          setLoading(false);
          return;
        }
        
        // Update session and user state
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch profile data for authenticated users
        if (session?.user && event === 'SIGNED_IN') {
          await handleProfileFetch(session.user.id);
          
          // Create admin profile for new users if needed (only for admin/driver)
          setTimeout(async () => {
            const profileCreated = await createAdminProfileIfNeeded(
              session.user.id,
              session.user.email || '',
              session.user.user_metadata
            );
            
            if (profileCreated) {
              // Fetch the newly created profile
              await handleProfileFetch(session.user.id);
            }
          }, 0);
        } else if (session?.user && profile === null) {
          // Fetch profile if we have a user but no profile yet
          await handleProfileFetch(session.user.id);
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        handleProfileFetch(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    session,
    profile,
    loading,
    clearAuthState
  };
};
