import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'driver' | 'customer';
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
  autoSignIn: (email: string, orderId: string) => Promise<{ error: any; isNewAccount?: boolean }>;
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
      setProfile(profile);
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
      (event, session) => {
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
          // Use setTimeout to avoid blocking the auth state change
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
          
          // Create admin profile for new users if needed
          setTimeout(async () => {
            try {
              const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', session.user.id)
                .single();

              if (!existingProfile) {
                await supabase
                  .from('profiles')
                  .insert({
                    id: session.user.id,
                    email: session.user.email || '',
                    full_name: session.user.user_metadata?.full_name || '',
                    role: 'admin'
                  });
                // Fetch the newly created profile
                fetchProfile(session.user.id);
              }
            } catch (error) {
              console.error('Error creating profile:', error);
            }
          }, 0);
        } else if (session?.user && profile === null) {
          // Fetch profile if we have a user but no profile yet
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
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
  }, [profile]);

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
    if (signingOut) return { error: null }; // Prevent multiple simultaneous sign out attempts
    
    setSigningOut(true);
    
    try {
      console.log('Starting sign out process...');
      
      // Clear state immediately to provide instant UI feedback
      clearAuthState();
      
      // Attempt to sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        // Don't restore state on error - user expects to be signed out
      } else {
        console.log('Sign out successful');
      }
      
      return { error };
    } catch (error) {
      console.error('Sign out exception:', error);
      return { error };
    } finally {
      setSigningOut(false);
    }
  };

  const autoSignIn = async (email: string, orderId: string) => {
    try {
      console.log('Starting auto-login process...', { email, orderId });
      
      // Call the auto-login edge function
      const { data, error } = await supabase.functions.invoke('auto-login-customer', {
        body: { email, orderId }
      });

      if (error) {
        console.error('Auto-login function error:', error);
        return { error };
      }

      if (!data.success) {
        console.error('Auto-login failed:', data.error);
        return { error: new Error(data.error || 'Auto-login failed') };
      }

      console.log('Auto-login response:', data);

      // If we have a temporary password, try to sign in with it
      if (data.temporaryPassword) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: data.temporaryPassword,
        });

        if (signInError) {
          console.error('Sign in with temporary password failed:', signInError);
          return { error: signInError };
        }
      }

      return { error: null, isNewAccount: data.isNewAccount };
    } catch (error) {
      console.error('Auto-login exception:', error);
      return { error };
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
    autoSignIn,
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
