import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authAPI } from '../utils/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const token = localStorage.getItem('weldsim_token');
      const savedUser = localStorage.getItem('weldsim_user');

      if (!token || !savedUser) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('weldsim_token');
        localStorage.removeItem('weldsim_user');
      }

      try {
        const res = await authAPI.me();
        if (!cancelled) {
          setUser(res.data.user);
          localStorage.setItem('weldsim_user', JSON.stringify(res.data.user));
        }
      } catch {
        // Token invalid/expired
        if (!cancelled) {
          localStorage.removeItem('weldsim_token');
          localStorage.removeItem('weldsim_user');
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await authAPI.login(credentials);
    const { tokens, user: userData } = res.data;

    localStorage.setItem('weldsim_token', tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem('weldsim_refresh_token', tokens.refreshToken);
    }
    localStorage.setItem('weldsim_user', JSON.stringify(userData));

    setUser(userData);
    return userData;
  }, []);

  const register = useCallback(async (data) => {
    const res = await authAPI.register(data);
    const { tokens, user: userData } = res.data;

    localStorage.setItem('weldsim_token', tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem('weldsim_refresh_token', tokens.refreshToken);
    }
    localStorage.setItem('weldsim_user', JSON.stringify(userData));

    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout?.();
    } catch {
      // ignore
    }
    localStorage.removeItem('weldsim_token');
    localStorage.removeItem('weldsim_refresh_token');
    localStorage.removeItem('weldsim_user');
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
    }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;
