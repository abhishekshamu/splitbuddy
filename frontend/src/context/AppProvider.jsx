import React from 'react';
import { AuthProvider } from './AuthProvider';
import { ThemeProvider } from './ThemeProvider';
import { CurrencyProvider } from './CurrencyContext';
import { NotificationProvider } from './NotificationProvider';

export function AppProvider({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CurrencyProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </CurrencyProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
