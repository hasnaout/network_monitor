import { useEffect, useState } from 'react'
import './App.css'
import Connexion from "./pages/login/connexion.js"
import Home from "./pages/dashboard/home.js";

const API_URL = process.env.REACT_APP_API_URL

function getCurrentRoute() {
  return window.location.hash || '#/'
}

function App() {
  const [route, setRoute] = useState(getCurrentRoute())
  const [auth, setAuth] = useState(() => ({
    accessToken: localStorage.getItem('access_token') || '',
    refreshToken: localStorage.getItem('refresh_token') || '',
    username: localStorage.getItem('username') || '',
  }))
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(getCurrentRoute())
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function validateSession() {
      if (!auth.accessToken) {
        setIsCheckingAuth(false)
        if (route !== '#/connexion') {
          window.location.hash = '#/connexion'
        }
        return
      }

      try {
        const response = await fetch(`${API_URL}/dashboard`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Session invalide')
        }

        const data = await response.json()
        setAuth((currentAuth) => ({
          ...currentAuth,
          username: data.username || currentAuth.username,
        }))
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('username')
        setAuth({ accessToken: '', refreshToken: '', username: '' })
        if (window.location.hash !== '#/connexion') {
          window.location.hash = '#/connexion'
        }
      } finally {
        setIsCheckingAuth(false)
      }
    }

    validateSession()

    return () => controller.abort()
  }, [auth.accessToken, route])

  const handleLoginSuccess = ({ accessToken, refreshToken, username }) => {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    localStorage.setItem('username', username)
    setAuth({ accessToken, refreshToken, username })
    window.location.hash = '#/'
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('username')
    setAuth({ accessToken: '', refreshToken: '', username: '' })
    window.location.hash = '#/connexion'
  }

  if (isCheckingAuth) {
    return (
      <div className="screen-state">
        <div className="screen-card">
          <p className="screen-kicker">Network Monitor</p>
          <h1>Verification de la session</h1>
          <p>Nous preparons votre espace d'administration et validons l'acces au dashboard.</p>
        </div>
      </div>
    );
  }

  if (route === '#/connexion') {
    return <Connexion onLoginSuccess={handleLoginSuccess} />;
  }

  if (!auth.accessToken) {
    return null;
  }



  return <Home auth={auth} onLogout={handleLogout} onSessionExpired={handleLogout} route={route} />;
}

export default App
