import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ParentUser {
  id: string;
  email: string;
  babyId: string;
  babyName: string;
  parentContact: string;
}

interface ParentAuthContextType {
  parent: ParentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (parentContact: string, babyId: string) => Promise<{ success: boolean; error?: string }>;
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

  const login = useCallback(async (parentContact: string, babyId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Verify baby exists and parent contact matches
      const { data: baby, error } = await supabase
        .from('babies')
        .select('id, baby_name, parent_contact')
        .eq('id', babyId)
        .single();

      if (error || !baby) {
        return { success: false, error: 'Baby not found. Please check the Baby ID.' };
      }

      // Verify parent contact matches (case-insensitive)
      if (baby.parent_contact.toLowerCase() !== parentContact.toLowerCase()) {
        return { success: false, error: 'Parent contact does not match our records.' };
      }

      const parentUser: ParentUser = {
        id: baby.id,
        email: parentContact,
        babyId: baby.id,
        babyName: baby.baby_name,
        parentContact: baby.parent_contact,
      };

      setParent(parentUser);
      localStorage.setItem('parentSession', JSON.stringify(parentUser));

      return { success: true };
    } catch (error) {
      console.error('Parent login error:', error);
      return { success: false, error: 'An error occurred during login.' };
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
