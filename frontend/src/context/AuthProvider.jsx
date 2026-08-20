import React, { createContext, useContext } from 'react';
import { useAuthStore } from '../store';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isAuth = useAuthStore((state) => state.isAuth);
  const loading = useAuthStore((state) => state.loading);
  const login = useAuthStore((state) => state.setAuth);
  const logout = useAuthStore((state) => state.logout);
  const updateProfile = useAuthStore((state) => state.updateProfile);

  return (
    <AuthContext.Provider value={{ user, token, isAuth, loading, login, logout, updateProfile }}>
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
