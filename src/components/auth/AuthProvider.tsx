import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'driver';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signingOut: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      // Only allow admin and driver roles in main application - type guard
      if (profile && (profile.role === 'admin' || profile.role === 'driver')) {
        setProfile({
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role as 'admin' | 'driver' // Type assertion since we've verified the role
        });
      } else {
        // If user has customer role or no profile, sign them out
        console.log('User has customer role or invalid profile, signing out...');
        await supabase.auth.signOut();
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  };

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
        if (session?.user && event === 'SIGNED_IN') {
          await fetchProfile(session.user.id);
          
          // Create admin profile for new users if needed (only for admin/driver)
          setTimeout(async () => {
            try {
              const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', session.user.id)
                .single();

              if (!existingProfile) {
                // Only create profile if user doesn't exist in customers table
                const { data: customerCheck } = await supabase
                  .from('customers')
                  .select('id')
                  .eq('auth_user_id', session.user.id)
                  .single();

                if (!customerCheck) {
                  await supabase
                    .from('profiles')
                    .insert({
                      id: session.user.id,
                      email: session.user.email || '',
                      full_name: session.user.user_metadata?.full_name || '',
                      role: 'admin'
                    });
                  // Fetch the newly created profile
                  await fetchProfile(session.user.id);
                }
              }
            } catch (error) {
              console.error('Error creating profile:', error);
            }
          }, 0);
        } else if (session?.user && profile === null) {
          // Fetch profile if we have a user but no profile yet
          await fetchProfile(session.user.id);
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
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

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
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

  const signOut = async () => {
    if (signingOut) return { error: null };
    
    setSigningOut(true);
    
    try {
      console.log('Starting sign out process...');
      
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        console.log('No active session found, clearing local state');
        clearAuthState();
        return { error: null };
      }
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        
        if (error.message?.toLowerCase().includes('session') || 
            error.message?.toLowerCase().includes('not found') ||
            error.status === 403) {
          console.log('Session already invalid, clearing local state');
          clearAuthState();
          return { error: null };
        }
        
        return { error };
      } else {
        console.log('Sign out successful');
        clearAuthState();
        return { error: null };
      }
      
    } catch (error) {
      console.error('Sign out exception:', error);
      clearAuthState();
      return { error };
    } finally {
      setSigningOut(false);
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signingOut,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
