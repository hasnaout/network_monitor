import { useEffect, useState } from 'react';
import './App.css';
import Connexion from "./pages/login/connexion.js";
import Home from "./pages/dashboard/home.js";

const API_URL = process.env.REACT_APP_API_URL;

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

  const [loading, setLoading] = useState(false);

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

  return (
    <Home
      auth={auth}
      onLogout={handleLogout}
      route={route}
    />
  );
}

export default App;