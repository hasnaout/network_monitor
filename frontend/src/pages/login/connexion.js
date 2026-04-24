import React, { useState } from 'react';
import "./connexion.css";
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

export default function Connexion() {

  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      setError("Veuillez remplir tous les champs");
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
        throw new Error(data.detail || "Connexion échouée");
      }

      // 🔥 LOGIN CENTRALISÉ
      login({
        accessToken: data.access,
        refreshToken: data.refresh,
        username,
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="connexion-container">

      <section className="connexion-card">

        <h2>Connexion</h2>

        <form onSubmit={handleSubmit} className="connexion-form">

          <label>
            <span>Nom d'utilisateur</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </label>

          <label>
            <span>Mot de passe</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error && (
            <p className="error-text">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-submit"
          >
            {isSubmitting ? "Connexion..." : "Se connecter"}
          </button>

        </form>

      </section>

    </div>
  );
}