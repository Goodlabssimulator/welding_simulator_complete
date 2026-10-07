import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../utils/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const token = localStorage.getItem('weldsim_token');
    const savedUser = localStorage.getItem('weldsim_user');
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        // Verify token is still valid
        authAPI.me()
          .then(res => {
            setUser(res.data.user);
            localStorage.setItem('weldsim_user', JSON.stringify(res.data.user));
          })
          .catch(() => {
            // Token expired or invalid
            logout();
          });
      } catch {
        logout();
      }
    }
    setLoading(false);
  }, []);

const login = useCallback(async (credentials) => {
  const res = await authAPI.login(credentials);

  const { tokens, user: userData } = res.data;

  localStorage.setItem('weldsim_token', tokens.accessToken);
  localStorage.setItem('weldsim_user', JSON.stringify(userData));

  setUser(userData);

  return userData;
}, []);

const register = useCallback(async (data) => {
  const res = await authAPI.register(data);

  const { tokens, user: userData } = res.data;

  localStorage.setItem('weldsim_token', tokens.accessToken);
  localStorage.setItem('weldsim_user', JSON.stringify(userData));

  setUser(userData);

  return userData;
}, []);


  const logout = useCallback(() => {
    localStorage.removeItem('weldsim_token');
    localStorage.removeItem('weldsim_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;
