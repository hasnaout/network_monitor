import React, { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useNotification } from '../context/NotificationContext';
import NotificationToast from './NotificationToast';
import './NotificationContainer.css';

export default function NotificationContainer() {
  const { alerts = [] } = useSocket();
  const { addNotification } = useNotification();
  const [toastNotifications, setToastNotifications] = React.useState([]);
  const [lastAlertId, setLastAlertId] = React.useState(null);

  useEffect(() => {
    if (alerts.length > 0) {
      const latestAlert = alerts[0];
      
      // Only add if it's a new alert
      if (lastAlertId !== latestAlert.id) {
        const notif = addNotification(latestAlert);
        if (notif) {
          setToastNotifications((prev) => [...prev, notif]);
        }
        setLastAlertId(latestAlert.id);
      }
    }
  }, [alerts.length > 0 ? alerts[0]?.id : null, addNotification]);

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

