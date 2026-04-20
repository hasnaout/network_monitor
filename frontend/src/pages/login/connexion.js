import React, { useState } from 'react';
import './connexion.css';

const API_URL=process.env.REACT_APP_API_URL;

export default function Connexion({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
console.log(import.meta.env.REACT_APP_API_URL);
  React.useEffect(() => {
    if (localStorage.getItem('access_token')) {
      window.location.hash = '#/';
    }
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!username || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/token/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Connexion impossible');
      }

      onLoginSuccess({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        username: data.username,
      });
    } catch (err) {
      if (err instanceof TypeError) {
        setError("Impossible de joindre le backend");
      } else {
        setError(err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="connexion-container">
      <section className="connexion-card">
        <div className="connexion-card__header">
          <h2>Connexion</h2>
        </div>
        

        <form className="connexion-form" onSubmit={handleSubmit}>
          <label className="form-group">
            <span>Nom d'utilisateur</span>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="UserName"
            />
          </label>
          <label className="form-group">
            <span>Mot de passe</span>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
          </label>

          {error ? <p className="feedback error-feedback login-feedback">{error}</p> : null}
          <button type="submit" className="btn-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </section>
      </div>
  );
}
