import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ParentUser {
  id: string;
  babyId: string;
  babyName: string;
  bedNumber: string;
  parentMobile: string;
  status: string;
}

interface ParentAuthContextType {
  parent: ParentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (bedNumber: string, parentMobile: string) => Promise<{ success: boolean; error?: string }>;
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

  const login = useCallback(async (bedNumber: string, parentMobile: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Normalize inputs - trim whitespace and handle case sensitivity
      const normalizedBedNumber = bedNumber.trim();
      const normalizedMobile = parentMobile.trim();

      if (!normalizedBedNumber || !normalizedMobile) {
        return { success: false, error: 'Please enter both Bed Number and Parent Mobile Number.' };
      }

      // Query baby by bed_number (case-insensitive)
      const { data: babies, error } = await supabase
        .from('babies')
        .select('id, baby_name, bed_number, parent_contact, status')
        .ilike('bed_number', normalizedBedNumber);

      if (error) {
        console.error('Database query error:', error);
        return { success: false, error: 'An error occurred while verifying credentials.' };
      }

      if (!babies || babies.length === 0) {
        return { success: false, error: 'No baby found with this Bed Number. Please verify the information provided at discharge.' };
      }

      // Find exact match for mobile number
      const matchingBaby = babies.find(baby => {
        // Extract mobile from parent_contact - support various formats
        const storedContact = baby.parent_contact.trim();
        
        // Direct match check (case-insensitive for email format, exact for mobile)
        if (storedContact === normalizedMobile) {
          return true;
        }
        
        // Clean phone numbers by removing non-digit characters for comparison
        const cleanStored = storedContact.replace(/\D/g, '');
        const cleanInput = normalizedMobile.replace(/\D/g, '');
        
        // Match if cleaned numbers are equal (handles formatting differences)
        if (cleanStored.length > 0 && cleanInput.length > 0) {
          // Handle Indian phone numbers - could be with or without country code
          if (cleanStored === cleanInput) return true;
          if (cleanStored.endsWith(cleanInput) && cleanInput.length >= 10) return true;
          if (cleanInput.endsWith(cleanStored) && cleanStored.length >= 10) return true;
        }
        
        return false;
      });

      if (!matchingBaby) {
        return { 
          success: false, 
          error: 'Parent Mobile Number does not match our records for this Bed Number. Please check and try again.' 
        };
      }

      const parentUser: ParentUser = {
        id: matchingBaby.id,
        babyId: matchingBaby.id,
        babyName: matchingBaby.baby_name,
        bedNumber: matchingBaby.bed_number,
        parentMobile: matchingBaby.parent_contact,
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
