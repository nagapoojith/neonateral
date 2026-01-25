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

      // Query baby by baby_name (case-insensitive) and login_password
      const { data: babies, error } = await supabase
        .from('babies')
        .select('id, baby_name, bed_number, parent_contact, status, login_password')
        .ilike('baby_name', normalizedBabyName);

      if (error) {
        console.error('Database query error:', error);
        return { success: false, error: 'An error occurred while verifying credentials.' };
      }

      if (!babies || babies.length === 0) {
        return { success: false, error: 'No baby found with this name. Please verify the information provided by the hospital.' };
      }

      // Find exact match for password
      const matchingBaby = babies.find(baby => {
        const storedPassword = (baby as any).login_password;
        if (!storedPassword) {
          return false;
        }
        // Exact password match (case-sensitive)
        return storedPassword === normalizedPassword;
      });

      if (!matchingBaby) {
        return { 
          success: false, 
          error: 'Password does not match our records. Please check the password provided by the hospital.' 
        };
      }

      const parentUser: ParentUser = {
        id: matchingBaby.id,
        babyId: matchingBaby.id,
        babyName: matchingBaby.baby_name,
        bedNumber: matchingBaby.bed_number,
        parentContact: matchingBaby.parent_contact,
        status: matchingBaby.status || 'normal',
      };

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
