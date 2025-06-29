
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
  const [initializing, setInitializing] = useState(true);

  const clearAuthState = () => {
    console.log('Clearing auth state completely');
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const handleProfileFetch = async (userId: string, event?: string) => {
    console.log('Starting profile fetch for user:', userId, 'event:', event);
    try {
      const fetchedProfile = await fetchProfile(userId);
      console.log('Profile fetch result:', fetchedProfile);
      setProfile(fetchedProfile);
      
      // If no profile exists and this is a new sign in, try to create admin profile
      if (!fetchedProfile && event === 'SIGNED_IN') {
        console.log('No profile found, attempting to create admin profile');
        const profileCreated = await createAdminProfileIfNeeded(
          userId,
          session?.user?.email || '',
          session?.user?.user_metadata || {}
        );
        
        if (profileCreated) {
          console.log('Admin profile created, fetching new profile');
          const newProfile = await fetchProfile(userId);
          console.log('New profile fetched:', newProfile);
          setProfile(newProfile);
        }
      }
    } catch (error) {
      console.error('Error handling profile:', error);
      setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    console.log('Setting up auth state listener');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', event, 'User ID:', session?.user?.id);
        
        // Handle sign out immediately
        if (event === 'SIGNED_OUT' || !session) {
          console.log('User signed out, clearing state');
          clearAuthState();
          setLoading(false);
          setInitializing(false);
          return;
        }
        
        // Update session and user state
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch profile data for authenticated users
        if (session?.user) {
          try {
            await handleProfileFetch(session.user.id, event);
          } catch (error) {
            console.error('Profile fetch error:', error);
          } finally {
            if (mounted) {
              setLoading(false);
              setInitializing(false);
            }
          }
        } else {
          setLoading(false);
          setInitializing(false);
        }
      }
    );

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          setInitializing(false);
          return;
        }
        
        console.log('Initial session check:', session?.user?.id);
        
        if (session?.user && mounted) {
          setSession(session);
          setUser(session.user);
          
          // Fetch profile for existing session
          try {
            await handleProfileFetch(session.user.id);
          } catch (error) {
            console.error('Initial profile fetch error:', error);
          } finally {
            if (mounted) {
              setLoading(false);
              setInitializing(false);
            }
          }
        } else {
          console.log('No initial session found');
          if (mounted) {
            setLoading(false);
            setInitializing(false);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
          setInitializing(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      console.log('Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    session,
    profile,
    loading: loading || initializing,
    clearAuthState
  };
};
