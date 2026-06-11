import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AUTH_STORAGE_KEY } from '../lib/constants';

interface AuthState {
  isAuthenticated: boolean;
  email: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStoredAuth(): AuthState {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { email: string };
      return { isAuthenticated: true, email: parsed.email };
    }
  } catch {
    /* ignore */
  }
  return { isAuthenticated: false, email: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(loadStoredAuth);

  const login = useCallback((email: string, password: string) => {
    if (!email.trim() || !password.trim()) return false;
    const next = { isAuthenticated: true, email: email.trim() };
    setAuth(next);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ email: next.email }));
    return true;
  }, []);

  const logout = useCallback(() => {
    setAuth({ isAuthenticated: false, email: null });
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ ...auth, login, logout }),
    [auth, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
