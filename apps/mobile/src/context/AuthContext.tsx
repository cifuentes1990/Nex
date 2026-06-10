import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '@/lib/storage';
import { authApi } from '@/lib/api';

interface AuthCtx {
  user: any;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [saved, token] = await Promise.all([storage.getUser(), storage.getToken()]);
        if (saved && token) setUser(saved);
      } catch {
        // sesión corrupta — ignorar
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    await Promise.all([
      storage.setTokens(data.accessToken, data.refreshToken),
      storage.setUser(data.user),
    ]);
    setUser(data.user);
  };

  const logout = async () => {
    await storage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
