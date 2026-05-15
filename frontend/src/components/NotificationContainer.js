import React, { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useNotification } from '../context/NotificationContext';
import NotificationToast from './NotificationToast';
import './NotificationContainer.css';

export default function NotificationContainer() {
  const { alerts = [] } = useSocket();
  const { addNotification } = useNotification();
  const [toastNotifications, setToastNotifications] = React.useState([]);
  const lastAlertIdRef = useRef(null);

  useEffect(() => {
    const latestAlert = alerts[0];

    if (latestAlert && lastAlertIdRef.current !== latestAlert.id) {
      const notif = addNotification(latestAlert);
      if (notif) {
        setToastNotifications((prev) => [...prev, notif]);
      }
      lastAlertIdRef.current = latestAlert.id;
    }
  }, [alerts, addNotification]);

  const removeToast = (id) => {
    setToastNotifications((prev) => prev.filter((n) => n.id !== id));
  };

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

