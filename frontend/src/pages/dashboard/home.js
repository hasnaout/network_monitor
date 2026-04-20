import { useEffect, useState } from 'react';

const API_URL =process.env.REACT_APP_API_URL;

const statusRank = {
  Offline: 0,
  Maintenance: 1,
  Online: 2,
};

function formatDate(value) {
  if (!value) return '—';

  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}


function getStatusClass(status) {
  if (status === 'Online') return 'status-pill is-online';
  if (status === 'Maintenance') return 'status-pill is-maintenance';
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
        const res = await fetch(`${API_URL}/machines`, {
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

        setMachines(data.items || []);
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
  const online = machines.filter(m => m.status === "Online").length;
  const maintenance = machines.filter(m => m.status === "Maintenance").length;
  const offline = machines.filter(m => m.status === "Offline").length;

  const health = total === 0
    ? 100
    : Math.round(((online + maintenance * 0.6) / total) * 100);

  const latest = machines[0];

  const critical = machines
    .filter(m => m.status !== "Online")
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
              {isAuthenticated ? (
                <>
                  <span className="welcome-chip">
                    Connecté : {auth.username}
                  </span>

                  <a className="primary-link" href="#/machines/new">
                    + Ajouter une machine
                  </a>

                  <button className="secondary-button" onClick={onLogout}>
                    Se déconnecter
                  </button>
                </>
              ) : (
                <a className="primary-link" href="#/connexion">
                  Accéder au dashboard
                </a>
              )}
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
                        <td><strong>{m.name}</strong></td>
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

            <article className="insight-card">
              <h3>Actions rapides</h3>

              <a className="primary-link" href="#/machines/new">
                Ajouter une machine
              </a>

              <a className="secondary-button" href="#/connexion">
                Gérer la session
              </a>
            </article>

          </aside>
        </section>

      </main>
    </div>
  );
}