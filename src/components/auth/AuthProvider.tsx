
import { createContext, useContext, useState, ReactNode } from 'react';
import { AuthContextType } from './types';
import { useAuthState } from './hooks/useAuthState';
import * as authService from './services/authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, session, profile, loading, clearAuthState } = useAuthState();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    
    try {
      const result = await authService.signOut(signingOut, clearAuthState);
      return result;
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
    signIn: authService.signIn,
    signUp: authService.signUp,
    signOut: handleSignOut,
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
