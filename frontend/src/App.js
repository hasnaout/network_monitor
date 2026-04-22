import { useEffect, useState } from 'react';
import './App.css';
import Header from './components/Header';
import Connexion from "./pages/login/connexion.js";
import Home from "./pages/dashboard/home.js";
import Devices from "./pages/devices/devices.js";
import DeviceDetail from "./pages/devices/deviceDetail.js";
import Alerts from "./pages/alerts/alerts.js";
import Reports from "./pages/reports/reports.js";

const API_URL = process.env.REACT_APP_API_URL;
const ALERT_POLL_INTERVAL_MS = 15000;

function getCurrentRoute() {
  return window.location.hash || '#/connexion';
}

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
  const [route, setRoute] = useState(getCurrentRoute());

  const [auth, setAuth] = useState(() => ({
    accessToken: localStorage.getItem('access_token') || '',
    refreshToken: localStorage.getItem('refresh_token') || '',
    username: localStorage.getItem('username') || '',
  }));

  const [loading] = useState(false);

  // ---------------- ROUTE LISTENER ----------------
  useEffect(() => {
    const handleHashChange = () => {
      setRoute(getCurrentRoute());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // ---------------- SIMPLE AUTH CHECK ----------------
  useEffect(() => {
    if (!auth.accessToken) {
      window.location.hash = '#/connexion';
    }
  }, [auth.accessToken]);

  // ---------------- DESKTOP ALERT NOTIFICATIONS ----------------
  useEffect(() => {
    if (!auth.accessToken) return;
    if (!API_URL) return;

    requestNotificationPermissionOnce();

    let stopped = false;

    async function poll() {
      try {
        const res = await fetch(`${API_URL}/api/alerts/open/`, {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
        });

        if (!res.ok) {
          console.warn('Alert poll failed:', res.status);
          return;
        }

        const data = await res.json();
        console.info('Alert poll ok:', Array.isArray(data) ? data.length : typeof data);
        if (!Array.isArray(data)) return;

        const lastNotifiedId = Number(localStorage.getItem('last_notified_alert_id') || '0');
        const newAlerts = data
          .filter((a) => typeof a?.id === 'number' && a.id > lastNotifiedId)
          .sort((a, b) => a.id - b.id)
          .slice(0, 3);

        for (const alert of newAlerts) {
          notifyAlert(alert);
        }

        const maxId = newAlerts.length ? newAlerts[newAlerts.length - 1].id : lastNotifiedId;
        if (maxId > lastNotifiedId) {
          localStorage.setItem('last_notified_alert_id', String(maxId));
        }
      } catch {
        // Ignore polling errors
      }
    }

    poll();
    const intervalId = window.setInterval(() => {
      if (!stopped) poll();
    }, ALERT_POLL_INTERVAL_MS);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
    };
  }, [auth.accessToken]);

  // ---------------- LOGIN ----------------
  const handleLoginSuccess = ({ accessToken, refreshToken, username }) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('username', username);

    setAuth({ accessToken, refreshToken, username });

    window.location.hash = '#/';
    setRoute('#/');
  };

  const handleTokensUpdate = ({ accessToken, refreshToken }) => {
    if (accessToken) localStorage.setItem('access_token', accessToken);
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);

    setAuth((prev) => ({
      ...prev,
      accessToken: accessToken || prev.accessToken,
      refreshToken: refreshToken || prev.refreshToken,
    }));
  };

  // ---------------- LOGOUT ----------------
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('username');

    setAuth({
      accessToken: '',
      refreshToken: '',
      username: '',
    });

    window.location.hash = '#/connexion';
  };

  // ---------------- SESSION EXPIRED ----------------
  const handleSessionExpired = () => {
    handleLogout();
  };

  // ---------------- LOADING ----------------
  if (loading) {
    return (
      <div className="screen-state">
        <div className="screen-card">
          <h2>Chargement...</h2>
          <p>Initialisation de l'application</p>
        </div>
      </div>
    );
  }

  // ---------------- ROUTES ----------------
  if (route === '#/connexion') {
    return <Connexion onLoginSuccess={handleLoginSuccess} />;
  }

  if (!auth.accessToken) {
    return <Connexion onLoginSuccess={handleLoginSuccess} />;
  }

  if (route === '#/devices') {
    return (
      <>
        <Header currentRoute={route} onLogout={handleLogout} />
        <Devices auth={auth} onLogout={handleLogout} onSessionExpired={handleSessionExpired} onTokensUpdate={handleTokensUpdate} />
      </>
    );
  }

  if (route.startsWith('#/devices/')) {
    return (
      <>
        <Header currentRoute={route} onLogout={handleLogout} />
        <DeviceDetail auth={auth} onLogout={handleLogout} onSessionExpired={handleSessionExpired} onTokensUpdate={handleTokensUpdate} route={route} />
      </>
    );
  }

  if (route === '#/alerts') {
    return (
      <>
        <Header currentRoute={route} onLogout={handleLogout} />
        <Alerts auth={auth} onLogout={handleLogout} onSessionExpired={handleSessionExpired} onTokensUpdate={handleTokensUpdate} />
      </>
    );
  }

  if (route === '#/reports') {
    return (
      <>
        <Header currentRoute={route} onLogout={handleLogout} />
        <Reports auth={auth} onLogout={handleLogout} onSessionExpired={handleSessionExpired} onTokensUpdate={handleTokensUpdate} />
      </>
    );
  }

  return (
    <>
      <Header currentRoute={route} onLogout={handleLogout} />
      <Home
        auth={auth}
        onLogout={handleLogout}
        onSessionExpired={handleSessionExpired}
        onTokensUpdate={handleTokensUpdate}
        route={route}
      />
    </>
  );
}

export default App;
