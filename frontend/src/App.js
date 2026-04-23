import { useEffect, useState } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Connexion from "./pages/login/connexion.js";
import Home from "./pages/dashboard/home.js";
import Devices from "./pages/devices/devices.js";
import DeviceDetail from "./pages/devices/deviceDetail.js";
import Alerts from "./pages/alerts/alerts.js";


function getAlertTypeLabel(alertType) {
  if (alertType === 'device_connected') return 'Connectee';
  if (alertType === 'device_reconnected') return 'Reconnectee';
  if (alertType === 'device_disconnected') return 'Deconnectee';
  return alertType || 'Evenement';
}

function requestNotificationPermissionOnce() {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;

  const asked = localStorage.getItem('notif_permission_asked') === '1';
  if (asked) return;

  localStorage.setItem('notif_permission_asked', '1');

  if (Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

function notifyAlert(alert) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const title = `${getAlertTypeLabel(alert.alert_type)}: ${alert.device_name || 'Machine'}`;
  const body = alert.message || 'Nouvelle alerte';

  try {
    new Notification(title, {
      body,
      tag: `alert-${alert.id}`,
      renotify: false,
    });
  } catch {
    // Ignore if browser blocks notifications (e.g. not a secure context)
  }
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/connexion" element={<Connexion />} />
        <Route path="/" element={<Home />} />
        <Route path="/devices" element={<Devices />} />
        <Route path="/devices/:id" element={<DeviceDetail />} />
        <Route path="/alerts" element={<Alerts />} />

        <Route path="*" element={<Navigate to="/connexion" />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
