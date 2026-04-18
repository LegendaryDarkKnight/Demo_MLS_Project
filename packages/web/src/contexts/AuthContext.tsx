'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthUser } from '@/types/listing';
import { getMe, signIn, signOut, signUp } from '@/lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    getMe().then((u) => {
      setUser(u);
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await signIn(email, password);
    setUser(u);
    queryClient.invalidateQueries({ queryKey: ['listings'] });
  }, [queryClient]);

  const register = useCallback(async (email: string, password: string, firstName?: string, lastName?: string) => {
    const u = await signUp({ email, password, firstName, lastName });
    setUser(u);
    queryClient.invalidateQueries({ queryKey: ['listings'] });
  }, [queryClient]);

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
    queryClient.invalidateQueries({ queryKey: ['listings'] });
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
