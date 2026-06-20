import React, { useState, useRef, useEffect } from 'react';
import { FiBell, FiX, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { useSocket } from '../context/SocketContext';
import { useNotification } from '../context/NotificationContext';
import './NotificationPanel.css';

export default function NotificationPanel() {
  const { alerts = [] } = useSocket();
  const { unreadCount, markAllAsRead, clearNotifications } = useNotification();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const panelRef = useRef(null);

  const recentAlerts = alerts.slice(0, 10);

  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsPanelOpen(false);
      }
    }

    if (isPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isPanelOpen]);

  const handleBellClick = () => {
    setIsPanelOpen(!isPanelOpen);
    if (!isPanelOpen) {
      markAllAsRead();
    }
  };

  const getAlertIcon = (type) => {
    if (type === 'first_connection' || type === 'reconnection') {
      return <FiCheckCircle className="icon-online" />;
    }
    return <FiAlertCircle className="icon-offline" />;
  };

  const getAlertTypeLabel = (type) => {
    const types = {
      'first_connection': 'Connexion',
      'reconnection': 'Reconnexion',
      'disconnection': 'Déconnexion',
      'alert': 'Alerte',
    };
    return types[type] || type;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes}m`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR');
  };

  const getDeviceName = (device) => {
    if (typeof device === 'object') {
      return device.hostname || device.ip_address || 'Périphérique inconnu';
    }
    return device || 'Périphérique inconnu';
  };

  return (
    <div className="notification-panel-container" ref={panelRef}>
      <button
        className={`notification-bell ${isPanelOpen ? 'active' : ''}`}
        onClick={handleBellClick}
        title="Notifications"
      >
        <FiBell />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isPanelOpen && (
        <div className="notification-dropdown">
          <div className="panel-header">
            <h3>Notifications</h3>
            {recentAlerts.length > 0 && (
              <button 
                className="clear-btn"
                onClick={clearNotifications}
              >
                <FiX size={18} />
              </button>
            )}
          </div>

          <div className="panel-content">
            {recentAlerts.length === 0 ? (
              <div className="empty-state">
                <FiBell size={32} />
                <p>Aucune notification</p>
              </div>
            ) : (
              <div className="notifications-list">
                {recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`notification-item ${alert.alert_type === 'disconnection' ? 'critical' : 'normal'}`}
                  >
                    <div className="item-icon">
                      {getAlertIcon(alert.alert_type)}
                    </div>
                    <div className="item-content">
                      <div className="item-header">
                        <span className="item-device">
                          {getDeviceName(alert.device)}
                        </span>
                        <span className="item-type">
                          {getAlertTypeLabel(alert.alert_type)}
                        </span>
                      </div>
                      <div className="item-message">
                        {alert.message}
                      </div>
                      <div className="item-time">
                        {formatTime(alert.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel-footer">
            <a href="/alerts" className="view-all-link">
              Voir toutes les alertes
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
