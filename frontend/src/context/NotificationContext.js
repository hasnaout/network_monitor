import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const NotificationContext = createContext();
const NOTIFICATION_VISIBLE_MS = 6000;

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [browserPermission, setBrowserPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window
      ? window.Notification.permission
      : 'unsupported'
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(window.Notification.permission);
      if (window.Notification.permission === 'default') {
        window.Notification.requestPermission().then(setBrowserPermission);
      }
    }
  }, []);

  const requestBrowserPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBrowserPermission('unsupported');
      return 'unsupported';
    }

    const permission = await window.Notification.requestPermission();
    setBrowserPermission(permission);
    return permission;
  }, []);

  const showBrowserNotification = useCallback((alert) => {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      window.Notification.permission !== 'granted'
    ) {
      return;
    }

    const deviceName = typeof alert.device === 'object' && alert.device !== null
      ? alert.device.name || alert.device.hostname || alert.device.ip_address
      : alert.device_name || alert.device || 'Equipement';

    const notification = new window.Notification(`Alerte - ${deviceName}`, {
      body: alert.message || 'Nouvelle alerte reseau',
      icon: `${window.location.origin}/logo.png`,
      badge: `${window.location.origin}/logo.png`,
      tag: alert.id ? `alert-${alert.id}` : `alert-${Date.now()}`,
      renotify: true,
      requireInteraction: false,
    });

    const closeTimer = window.setTimeout(() => {
      notification.close();
    }, NOTIFICATION_VISIBLE_MS);

    notification.onclick = () => {
      window.clearTimeout(closeTimer);
      window.focus();
      window.location.href = '/alerts';
      notification.close();
    };

    notification.onclose = () => {
      window.clearTimeout(closeTimer);
    };
  }, []);

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
    showBrowserNotification(alert);

    // Auto-remove toast notification after 6 seconds
    setTimeout(() => {
      setNotifications((prev) =>
        prev.filter((notif) => notif.id !== id)
      );
    }, NOTIFICATION_VISIBLE_MS);

    return notification;
  }, [showBrowserNotification]);

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
        browserPermission,
        addNotification,
        requestBrowserPermission,
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
