import { useEffect, useState } from 'react';
import "../dashboard/home.css";

const API_URL = process.env.REACT_APP_API_URL;

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getSeverityClass(severity) {
  if (severity === 'critical') return 'status-pill is-offline';
  if (severity === 'warning') return 'status-pill is-maintenance';
  return 'status-pill is-online';
}

export default function Alerts({ auth, onLogout, onSessionExpired }) {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      setError('');

      try {
        const res = await fetch(`${API_URL}/api/alerts/`, {
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

        // Normaliser les données
        const alerts = Array.isArray(data) ? data : (data.results || []);
        setAlerts(alerts);
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

  return (
    <div className="dashboard-shell">
      <main className="dashboard-main">
        <section className="hero-panel">
          <div className="hero-copy-block">
            <h2>Alertes</h2>
            <p className="hero-copy">
              Surveillance et gestion des incidents système
            </p>
          </div>
        </section>

        <section className="table-panel">
          <div className="panel-heading">
            <h3>Alertes ({alerts.length})</h3>
            <span className="live-badge">Live API</span>
          </div>

          {error && <p className="feedback error-feedback">{error}</p>}

          {isLoading ? (
            <div className="empty-state">
              Chargement des alertes...
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Équipement</th>
                    <th>Type</th>
                    <th>Message</th>
                    <th>Sévérité</th>
                    <th>Résolu</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map(a => (
                    <tr key={a.id}>
                      <td><strong>{a.device_name}</strong></td>
                      <td>{a.alert_type}</td>
                      <td>{a.message}</td>
                      <td>
                        <span className={getSeverityClass(a.severity)}>
                          {a.severity}
                        </span>
                      </td>
                      <td>{a.is_resolved ? 'Oui' : 'Non'}</td>
                      <td>{formatDate(a.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}