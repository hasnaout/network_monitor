import React, { useCallback, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useNotification } from '../context/NotificationContext';
import NotificationToast from './NotificationToast';
import './NotificationContainer.css';

const TOAST_VISIBLE_MS = 6000;

export default function NotificationContainer() {
  const { alerts = [] } = useSocket();
  const { addNotification } = useNotification();
  const [toastNotifications, setToastNotifications] = React.useState([]);
  const seenAlertIdsRef = useRef(new Set());
  const toastTimersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    const timerId = toastTimersRef.current.get(id);
    if (timerId) {
      window.clearTimeout(timerId);
      toastTimersRef.current.delete(id);
    }
    setToastNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    const newAlerts = alerts.filter((alert) => {
      if (!alert?.id || seenAlertIdsRef.current.has(alert.id)) {
        return false;
      }
      return true;
    });

    newAlerts.reverse().forEach((alert) => {
      seenAlertIdsRef.current.add(alert.id);
      const notif = addNotification(alert);
      if (notif) {
        setToastNotifications((prev) => [...prev, notif]);
        const timerId = window.setTimeout(() => {
          removeToast(notif.id);
        }, TOAST_VISIBLE_MS);
        toastTimersRef.current.set(notif.id, timerId);
      }
    });
  }, [alerts, addNotification, removeToast]);

  useEffect(() => {
    const toastTimers = toastTimersRef.current;
    return () => {
      toastTimers.forEach((timerId) => window.clearTimeout(timerId));
      toastTimers.clear();
    };
  }, []);

  return (
    <div className="notification-container">
      {toastNotifications.map((notification) => (
        <div key={notification.id} className="toast-wrapper">
          <NotificationToast
            notification={notification}
            onClose={() => removeToast(notification.id)}
          />
        </div>
      ))}
    </div>
  );
}

