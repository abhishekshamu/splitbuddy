import React, { createContext, useContext, useEffect } from 'react';
import { useUIStore } from '../store';
import { useAuth } from './AuthProvider';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const notifications = useUIStore((state) => state.notifications);
  const unreadCount = useUIStore((state) => state.unreadCount);
  const fetchNotifications = useUIStore((state) => state.fetchNotifications);
  const markAsRead = useUIStore((state) => state.markAsRead);
  const markAllAsRead = useUIStore((state) => state.markAllAsRead);
  const clearAll = useUIStore((state) => state.clearAll);
  
  const { isAuth } = useAuth();

  useEffect(() => {
    if (isAuth) {
      fetchNotifications();
    }
  }, [isAuth, fetchNotifications]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
