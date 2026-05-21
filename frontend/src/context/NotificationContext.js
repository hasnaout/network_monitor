import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const NotificationContext = createContext();
const NOTIFICATION_VISIBLE_MS = 6000;

function getDeviceName(alert) {
  if (typeof alert.device === 'object' && alert.device !== null) {
    return alert.device.name || alert.device.hostname || alert.device.ip_address;
  }

  return alert.device_name || alert.device || 'Equipement';
}

function canUseSystemNotifications() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    window.isSecureContext
  );
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [browserPermission, setBrowserPermission] = useState(
    canUseSystemNotifications()
      ? window.Notification.permission
      : 'unsupported'
  );
  const [systemNotificationReady, setSystemNotificationReady] = useState(false);

  useEffect(() => {
    if (canUseSystemNotifications()) {
      setBrowserPermission(window.Notification.permission);
      if (window.Notification.permission === 'default') {
        window.Notification.requestPermission().then(setBrowserPermission);
      }
    } else {
      setBrowserPermission('unsupported');
    }

    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.ready
        .then(() => setSystemNotificationReady(true))
        .catch(() => setSystemNotificationReady(false));
    }
  }, []);

  useEffect(() => {
    if (!canUseSystemNotifications() || window.Notification.permission !== 'default') {
      return undefined;
    }

    let requested = false;

    const requestOnInteraction = () => {
      if (requested || window.Notification.permission !== 'default') return;
      requested = true;
      window.Notification.requestPermission().then(setBrowserPermission);
    };

    window.addEventListener('click', requestOnInteraction, { once: true });
    window.addEventListener('keydown', requestOnInteraction, { once: true });
    window.addEventListener('touchstart', requestOnInteraction, { once: true });

    return () => {
      window.removeEventListener('click', requestOnInteraction);
      window.removeEventListener('keydown', requestOnInteraction);
      window.removeEventListener('touchstart', requestOnInteraction);
    };
  }, []);

  const requestBrowserPermission = useCallback(async () => {
    if (!canUseSystemNotifications()) {
      setBrowserPermission('unsupported');
      return 'unsupported';
    }

    const permission = await window.Notification.requestPermission();
    setBrowserPermission(permission);
    return permission;
  }, []);

  const showBrowserNotification = useCallback((alert) => {
    if (!canUseSystemNotifications() || window.Notification.permission !== 'granted') {
      return;
    }

    const title = `Alerte - ${getDeviceName(alert)}`;
    const options = {
      body: alert.message || 'Nouvelle alerte reseau',
      icon: `${window.location.origin}/logo.png`,
      badge: `${window.location.origin}/logo.png`,
      tag: alert.id ? `alert-${alert.id}` : `alert-${Date.now()}`,
      renotify: true,
      requireInteraction: false,
      data: { url: '/alerts' },
    };

    if ('serviceWorker' in navigator && systemNotificationReady) {
      navigator.serviceWorker.ready
        .then((registration) => registration.showNotification(title, options))
        .catch(() => {
          const notification = new window.Notification(title, options);
          notification.onclick = () => {
            window.focus();
            window.location.href = '/alerts';
            notification.close();
          };
        });
      return;
    }

    const notification = new window.Notification(title, options);

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
  }, [systemNotificationReady]);

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
