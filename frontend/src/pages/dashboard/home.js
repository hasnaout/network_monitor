import { useEffect, useState } from 'react';
import "./home.css"
const API_URL =process.env.REACT_APP_API_URL;

function formatDate(value) {
  if (!value) return '—';

  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}


function getStatusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'online') return 'status-pill is-online';
  if (s === 'maintenance') return 'status-pill is-maintenance';
  return 'status-pill is-offline';
}

export default function Home({ auth, onLogout, onSessionExpired, route }) {
  const [machines, setMachines] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = Boolean(auth?.accessToken);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      setError('');

      try {
        const res = await fetch(`${API_URL}/api/devices/`, {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
          signal: controller.signal,
        });

        if (res.status === 401) {
          onSessionExpired();
          return;
        }

        const data = await res.json();

        if (!res.ok) throw new Error(data.detail || "Erreur API");

        // Normaliser les données : convertir minuscule en majuscule pour les statuts
        const machines = Array.isArray(data) ? data : (data.results || []);
        const normalizedMachines = machines.map(m => ({
          ...m,
          status: m.status ? m.status.charAt(0).toUpperCase() + m.status.slice(1) : 'Offline'
        }));
        setMachines(normalizedMachines);
      } catch (e) {
        if (e.name !== 'AbortError') {
          setError("Impossible de joindre le serveur.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [auth.accessToken]);

  const total = machines.length;
  const online = machines.filter(m => m.status?.toLowerCase() === "online").length;
  const maintenance = machines.filter(m => m.status?.toLowerCase() === "maintenance").length;
  const offline = machines.filter(m => m.status?.toLowerCase() === "offline").length;

  const health = total === 0
    ? 100
    : Math.round(((online + maintenance * 0.6) / total) * 100);

  const latest = machines[0];

  const critical = machines
    .filter(m => m.status?.toLowerCase() !== "online")
    .slice(0, 4);

  return (
    <div className="dashboard-shell">

      <main className="dashboard-main">

        {/* 🔥 HERO PRO */}
        <section className="hero-panel hero-panel--split">
          
          <div className="hero-copy-block">
            <p className="eyebrow">Network Operations Center</p>

            <h2>Surveillance centralisée du parc informatique</h2>

            <p className="hero-copy">
              Visualisez en temps réel l’état de vos équipements, identifiez les incidents
              et pilotez votre infrastructure depuis une interface unifiée.
            </p>

            <div className="hero-actions">
              <span className="welcome-chip">
                Bienvenue, {auth.username}
              </span>
            </div>
          </div>

          {/* 🔥 SUMMARY CARD */}
          <aside className="hero-sidecard">
            <span className="section-label">Health Overview</span>

            <div className="hero-score">
              <strong>{health}%</strong>
              <span>Disponibilité globale du système</span>
            </div>

            <div className="hero-sidecard__grid">
              <div><span>Total</span><strong>{total}</strong></div>
              <div><span>Online</span><strong>{online}</strong></div>
              <div><span>Maintenance</span><strong>{maintenance}</strong></div>
              <div><span>Offline</span><strong>{offline}</strong></div>
            </div>

            <p className="hero-note">
              {latest
                ? `Dernière activité : ${latest.name} (${formatDate(latest.created_at)})`
                : "Aucune donnée disponible"}
            </p>
          </aside>
        </section>

        {/* 🔥 STATS */}
        <section className="stats-grid">
          <div className="stat-card">
            <p className="stat-label">Disponibilité système</p>
            <p className="stat-value">{health}%</p>
            <p className="stat-detail">Calcul basé sur l’état global du parc</p>
          </div>

          <div className="stat-card">
            <p className="stat-label">Machines actives</p>
            <p className="stat-value">{online}</p>
            <p className="stat-detail">En fonctionnement normal</p>
          </div>

          <div className="stat-card">
            <p className="stat-label">Incidents</p>
            <p className="stat-value">{offline + maintenance}</p>
            <p className="stat-detail">Demandent une attention</p>
          </div>

          <div className="stat-card">
            <p className="stat-label">Inventaire</p>
            <p className="stat-value">{total}</p>
            <p className="stat-detail">Machines enregistrées</p>
          </div>
        </section>

        {/* 🔥 TABLE + SIDEBAR */}
        <section className="dashboard-columns">

          {/* TABLE */}
          <article className="table-panel">
            <div className="panel-heading">
              <h3>Machines récentes</h3>
              <span className="live-badge">Live API</span>
            </div>

            {error && <p className="feedback error-feedback">{error}</p>}

            {isLoading ? (
              <div className="empty-state">
                Chargement des équipements...
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Machine</th>
                      <th>IP</th>
                      <th>Localisation</th>
                      <th>Statut</th>
                      <th>Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {machines.slice(0, 6).map(m => (
                      <tr key={m.id}>
                        <td><a href={`#/devices/${m.id}`} className="device-link"><strong>{m.name}</strong></a></td>
                        <td>{m.ip}</td>
                        <td>{m.location || "—"}</td>
                        <td>
                          <span className={getStatusClass(m.status)}>
                            {m.status}
                          </span>
                        </td>
                        <td>{formatDate(m.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>
            )}
          </article>

          {/* SIDEBAR */}
          <aside className="dashboard-side">

            <article className="insight-card">
              <h3>Équipements à surveiller</h3>

              {critical.length === 0 ? (
                <p>Aucun incident détecté</p>
              ) : (
                critical.map(m => (
                  <div key={m.id} className="priority-item">
                    <strong>{m.name}</strong>
                    <span>{m.status}</span>
                  </div>
                ))
              )}
            </article>

          </aside>
        </section>

      </main>
    </div>
  );
}