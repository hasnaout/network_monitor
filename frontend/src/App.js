import { useEffect, useState } from 'react';
import './App.css';
import Header from './components/Header';
import Connexion from "./pages/login/connexion.js";
import Home from "./pages/dashboard/home.js";
import Devices from "./pages/devices/devices.js";
import DeviceDetail from "./pages/devices/deviceDetail.js";
import Alerts from "./pages/alerts/alerts.js";
import Reports from "./pages/reports/reports.js";

function getCurrentRoute() {
  return window.location.hash || '#/connexion';
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

  // ---------------- LOGIN ----------------
  const handleLoginSuccess = ({ accessToken, refreshToken, username }) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('username', username);

    setAuth({ accessToken, refreshToken, username });

    window.location.hash = '#/';
    setRoute('#/');
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
        <Devices auth={auth} onLogout={handleLogout} onSessionExpired={handleSessionExpired} />
      </>
    );
  }

  if (route.startsWith('#/devices/')) {
    return (
      <>
        <Header currentRoute={route} onLogout={handleLogout} />
        <DeviceDetail auth={auth} onLogout={handleLogout} onSessionExpired={handleSessionExpired} route={route} />
      </>
    );
  }

  if (route === '#/alerts') {
    return (
      <>
        <Header currentRoute={route} onLogout={handleLogout} />
        <Alerts auth={auth} onLogout={handleLogout} onSessionExpired={handleSessionExpired} />
      </>
    );
  }

  if (route === '#/reports') {
    return (
      <>
        <Header currentRoute={route} onLogout={handleLogout} />
        <Reports auth={auth} onLogout={handleLogout} onSessionExpired={handleSessionExpired} />
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
        route={route}
      />
    </>
  );
}

export default App;