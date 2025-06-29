import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface CustomerProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'customer';
}

interface CustomerAuthContextType {
  user: User | null;
  session: Session | null;
  profile: CustomerProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCustomerProfile = async (userId: string, userEmail?: string) => {
    try {
      console.log('Fetching customer profile for user:', userId);
      
      // First try to find by auth_user_id
      let { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('auth_user_id', userId)
        .single();
      
      // If not found by auth_user_id and we have an email, try to find by email
      if (error && userEmail) {
        console.log('Customer not found by auth_user_id, trying email:', userEmail);
        const { data: customerByEmail, error: emailError } = await supabase
          .from('customers')
          .select('*')
          .eq('email', userEmail)
          .single();
        
        if (!emailError && customerByEmail) {
          customer = customerByEmail;
          
          // Update the customer record to link it with the auth user
          await supabase
            .from('customers')
            .update({ auth_user_id: userId })
            .eq('id', customerByEmail.id);
          
          console.log('Linked existing customer to auth user');
        }
      }
      
      if (customer) {
        console.log('Customer profile found:', customer);
        setProfile({
          id: customer.id,
          email: customer.email,
          first_name: customer.first_name,
          last_name: customer.last_name,
          role: 'customer'
        });
      } else {
        console.log('No customer profile found');
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching customer profile:', error);
      setProfile(null);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Customer auth state changed:', event);
        
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setSession(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchCustomerProfile(session.user.id, session.user.email);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        fetchCustomerProfile(session.user.id, session.user.email);
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
      return { error };
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
            role: 'customer'
          }
        }
      });

      if (authError) return { error: authError };

      // Create customer profile and link it to the auth user
      if (data.user) {
        console.log('Creating customer profile for auth user:', data.user.id);
        const { error: customerError } = await supabase
          .from('customers')
          .insert({
            auth_user_id: data.user.id, // This is critical for the RLS policy
            email,
            first_name: firstName,
            last_name: lastName,
            full_address: '',
            customer_type: 'account'
          });

        if (customerError) {
          console.error('Error creating customer profile:', customerError);
          return { error: customerError };
        }
        
        console.log('Customer profile created successfully and linked to auth user');
      }

      return { error: null };
    } catch (error) {
      console.error('Signup error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}
