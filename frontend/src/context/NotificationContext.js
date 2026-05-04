import { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addNotification = useCallback((alert) => {
    const id = `${alert.id}-${Date.now()}`;
    const notification = {
      id,
      alertId: alert.id,
      device: alert.device,
      type: alert.alert_type,
      message: alert.message,
      created_at: alert.created_at,
      read: false,
      timestamp: new Date(),
    };

    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);

    // Auto-remove toast notification after 6 seconds
    setTimeout(() => {
      setNotifications((prev) =>
        prev.filter((notif) => notif.id !== id)
      );
    }, 6000);

    return notification;
  }, []);

  const markAsRead = useCallback((notificationId) => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotification = () => useContext(NotificationContext);
