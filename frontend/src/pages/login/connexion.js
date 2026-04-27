import React, { useState } from 'react';
import "./connexion.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from '../../context/AuthContext';
import { login as loginService } from '../../services/authService'; // ✅ utiliser service

export default function Connexion() {

  const { login } = useAuth();
  const navigate = useNavigate();
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
      const data = await loginService(username, password);
      login({
        accessToken: data.access,
        refreshToken: data.refresh,
        username,
      });
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.detail || "Connexion échouée");
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