import React from 'react';
import { FiAlertCircle, FiCheckCircle, FiX } from 'react-icons/fi';
import './NotificationToast.css';

export default function NotificationToast({ notification, onClose }) {
  const isOnline = notification.type === 'first_connection' || notification.type === 'reconnection';
  const iconClass = isOnline ? 'online' : 'offline';
  const icon = isOnline ? <FiCheckCircle /> : <FiAlertCircle />;

  const deviceName = typeof notification.device === 'object' 
    ? notification.device.hostname || notification.device.ip_address
    : notification.device;

  return (
    <div className={`notification-toast ${iconClass}`}>
      <div className="toast-icon">{icon}</div>
      <div className="toast-content">
        <div className="toast-title">{deviceName}</div>
        <div className="toast-message">{notification.message}</div>
      </div>
      <button className="toast-close" onClick={onClose}>
        <FiX />
      </button>
    </div>
  );
}
