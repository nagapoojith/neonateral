import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ParentUser {
  id: string;
  babyId: string;
  babyName: string;
  bedNumber: string;
  parentContact: string;
  status: string;
}

interface ParentAuthContextType {
  parent: ParentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (babyName: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const ParentAuthContext = createContext<ParentAuthContextType | undefined>(undefined);

export function ParentAuthProvider({ children }: { children: ReactNode }) {
  const [parent, setParent] = useState<ParentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored parent session on mount
  useEffect(() => {
    const stored = localStorage.getItem('parentSession');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setParent(parsed);
      } catch {
        localStorage.removeItem('parentSession');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (babyName: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Normalize inputs - trim whitespace
      const normalizedBabyName = babyName.trim();
      const normalizedPassword = password.trim();

      if (!normalizedBabyName || !normalizedPassword) {
        return { success: false, error: 'Please enter both Baby Name and Password.' };
      }

      const { data, error } = await supabase.functions.invoke('parent-login', {
        body: { babyName: normalizedBabyName, password: normalizedPassword },
      });

      if (error || !data?.success) {
        return { success: false, error: data?.error || error?.message || 'Unable to verify credentials.' };
      }

      const parentUser: ParentUser = data.parent;
      setParent(parentUser);
      localStorage.setItem('parentSession', JSON.stringify(parentUser));

      return { success: true };
    } catch (error) {
      console.error('Parent login error:', error);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }
  }, []);

  const logout = useCallback(() => {
    setParent(null);
    localStorage.removeItem('parentSession');
  }, []);

  return (
    <ParentAuthContext.Provider
      value={{
        parent,
        isAuthenticated: !!parent,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </ParentAuthContext.Provider>
  );
}

export function useParentAuth() {
  const context = useContext(ParentAuthContext);
  if (context === undefined) {
    throw new Error('useParentAuth must be used within a ParentAuthProvider');
  }
  return context;
}
