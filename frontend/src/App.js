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

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // ---------------- ROUTE LISTENER ----------------
  useEffect(() => {
    const handleHashChange = () => {
      setRoute(getCurrentRoute());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // ---------------- AUTH VALIDATION ----------------
  useEffect(() => {
    const controller = new AbortController();

    async function validateSession() {
      if (!auth.accessToken) {
        setIsCheckingAuth(false);
        window.location.hash = '#/connexion';
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/token/refresh/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refresh: auth.refreshToken,
          }),
          signal: controller.signal,
        });

        // si refresh échoue → logout
        if (!response.ok) {
          throw new Error('Session invalide');
        }

        const data = await response.json();

        setAuth((prev) => ({
          ...prev,
          accessToken: data.access,
        }));

      } catch (error) {
        console.log("Session expirée");

        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('username');

        setAuth({
          accessToken: '',
          refreshToken: '',
          username: '',
        });

        window.location.hash = '#/connexion';
      } finally {
        setIsCheckingAuth(false);
      }
    }

    validateSession();

    return () => controller.abort();
  }, [auth.refreshToken]);

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
  if (isCheckingAuth) {
    return (
      <div className="screen-state">
        <div className="screen-card">
          <h2>Chargement...</h2>
          <p>Vérification de la session utilisateur</p>
        </div>
      </div>
    );
  }

  // ---------------- ROUTING ----------------
  if (route === '#/connexion' || !auth.accessToken) {
    return <Connexion onLoginSuccess={handleLoginSuccess} />;
  }

  // ---------------- HOME ----------------
  return (
    <Home
      auth={auth}
      onLogout={handleLogout}
      route={route}
    />
  );
}

export default App;