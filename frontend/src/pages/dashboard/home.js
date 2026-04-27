import { useEffect, useState, useMemo } from 'react';
import "./home.css";
import { useAuth } from "../../context/AuthContext";
import Header from "../../components/Header";
import { getDevices } from "../../services/deviceService";

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
  return 'status-pill is-offline';
}

export default function Home() {

  const { auth } = useAuth();
  const [machines, setMachines] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth?.accessToken) return;

    let interval;

    async function load() {
      try {
        setIsLoading(true);
        setError('');
        const res = await getDevices();
        setMachines(res.data);
      } catch (err) {
        setError("Impossible de charger les données");
      } finally {
        setIsLoading(false);
      }
    }
    load();
    interval = setInterval(load, 10000);
    return () => clearInterval(interval);

  }, [auth?.accessToken]);

  const stats = useMemo(() => {
    const total = machines.length;
    const online = machines.filter(m => m.status === "online").length;
    const offline = machines.filter(m => m.status === "offline").length;
    const health = total === 0
      ? 100
      : Math.round((online / total) * 100);
    return { total, online, offline, health };

  }, [machines]);

  return (
    <>
      <Header />

      <div className="dashboard-shell">
        <main className="dashboard-main">
          <section className="hero-panel hero-panel--split">

            <div className="hero-copy-block">
              <h2>Surveillance centralisée du parc informatique</h2>

              <p className="hero-copy">
                Visualisation temps réel de votre infrastructure
              </p>

              <div className="hero-actions">
                <span className="welcome-chip">
                  Bienvenue, {auth?.username || "Utilisateur"}
                </span>
              </div>
            </div>

            <aside className="hero-sidecard">
              <span className="section-label">Health Overview</span>

              <div className="hero-score">
                <strong>{stats.health}%</strong>
                <span>Disponibilité globale</span>
              </div>

              <div className="hero-sidecard__grid">
                <div><span>Total</span><strong>{stats.total}</strong></div>
                <div><span>Online</span><strong>{stats.online}</strong></div>
                <div><span>Offline</span><strong>{stats.offline}</strong></div>
              </div>

            </aside>

          </section>
          <section className="dashboard-columns">
            <article className="table-panel">
              <div className="panel-heading">
                <h3>Machines récentes</h3>
              </div>
              {error && <p className="error-feedback">{error}</p>}
              {isLoading ? (
                <div className="empty-state">Chargement...</div>
              ) : machines.length === 0 ? (
                <div className="empty-state">Aucune machine trouvée</div>
              ) : (
                <div className="table-wrap">
                  <table>

                    <thead>
                      <tr>
                        <th>Machine</th>
                        <th>IP</th>
                        <th>Statut</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {machines.slice(0, 6).map(m => (
                        <tr key={m.id}>
                          <td><strong>{m.name}</strong></td>
                          <td>{m.ip_address || "—"}</td>
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
          </section>
        </main>
      </div>
    </>
  );
}