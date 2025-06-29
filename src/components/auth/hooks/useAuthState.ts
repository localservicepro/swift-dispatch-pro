
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
        if (session?.user) {
          // Use setTimeout to prevent infinite loops
          setTimeout(async () => {
            try {
              const fetchedProfile = await fetchProfile(session.user.id);
              setProfile(fetchedProfile);
              
              // If no profile exists and this is a new sign in, try to create admin profile
              if (!fetchedProfile && event === 'SIGNED_IN') {
                const profileCreated = await createAdminProfileIfNeeded(
                  session.user.id,
                  session.user.email || '',
                  session.user.user_metadata
                );
                
                if (profileCreated) {
                  // Fetch the newly created profile
                  const newProfile = await fetchProfile(session.user.id);
                  setProfile(newProfile);
                }
              }
            } catch (error) {
              console.error('Error handling profile:', error);
            } finally {
              setLoading(false);
            }
          }, 0);
        } else {
          setLoading(false);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        
        // Fetch profile for existing session
        setTimeout(async () => {
          try {
            const fetchedProfile = await fetchProfile(session.user.id);
            setProfile(fetchedProfile);
          } catch (error) {
            console.error('Error fetching initial profile:', error);
          } finally {
            setLoading(false);
          }
        }, 0);
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
