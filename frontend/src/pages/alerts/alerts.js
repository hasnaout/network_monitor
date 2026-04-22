import { useEffect, useState } from 'react';
import "../dashboard/home.css";
import { getCollection } from "../../utils/apiData";

const API_URL = process.env.REACT_APP_API_URL;
const REFRESH_INTERVAL_MS = 15000;

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

function getAlertTypeLabel(alertType) {
  if (alertType === 'device_connected') return 'Connectee';
  if (alertType === 'device_reconnected') return 'Reconnectee';
  if (alertType === 'device_disconnected') return 'Deconnectee';
  return alertType || 'Evenement';
}

function getAlertTypeClass(alertType) {
  if (alertType === 'device_disconnected') return 'event-pill is-disconnected';
  if (alertType === 'device_reconnected') return 'event-pill is-reconnected';
  if (alertType === 'device_connected') return 'event-pill is-connected';
  return 'event-pill';
}

export default function Alerts({ auth, onLogout, onSessionExpired }) {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function load(showLoader = true) {
      if (showLoader) {
        setIsLoading(true);
      }
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

        setAlerts(getCollection(data));
      } catch (e) {
        if (e.name !== 'AbortError') {
          setError("Impossible de joindre le serveur.");
        }
      } finally {
        if (showLoader) {
          setIsLoading(false);
        }
      }
    }

    load();
    const intervalId = window.setInterval(() => load(false), REFRESH_INTERVAL_MS);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [auth.accessToken, onSessionExpired]);

  const connectedCount = alerts.filter((alert) => alert.alert_type === 'device_connected').length;
  const reconnectedCount = alerts.filter((alert) => alert.alert_type === 'device_reconnected').length;
  const disconnectedCount = alerts.filter((alert) => alert.alert_type === 'device_disconnected').length;

  return (
    <div className="dashboard-shell">
      <main className="dashboard-main">
        <section className="hero-panel">
          <div className="hero-copy-block">
            <h2>Alertes</h2>
            <p className="hero-copy">
              Suivi en direct des connexions, deconnexions et reconnexions
            </p>
          </div>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <p className="stat-label">Connectees</p>
            <p className="stat-value">{connectedCount}</p>
            <p className="stat-detail">Machines detectees pour la premiere fois</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Reconnectees</p>
            <p className="stat-value">{reconnectedCount}</p>
            <p className="stat-detail">Machines revenues en ligne</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Deconnectees</p>
            <p className="stat-value">{disconnectedCount}</p>
            <p className="stat-detail">Machines passees hors ligne</p>
          </div>
        </section>

        <section className="table-panel">
          <div className="panel-heading">
            <h3>Alertes ({alerts.length})</h3>
            <span className="live-badge">Refresh 15s</span>
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
                    <th>Événement</th>
                    <th>Message</th>
                    <th>Sévérité</th>
                    <th>Statut</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map(a => (
                    <tr key={a.id}>
                      <td><strong>{a.device_name}</strong></td>
                      <td>
                        <span className={getAlertTypeClass(a.alert_type)}>
                          {getAlertTypeLabel(a.alert_type)}
                        </span>
                      </td>
                      <td>{a.message}</td>
                      <td>
                        <span className={getSeverityClass(a.severity)}>
                          {a.severity}
                        </span>
                      </td>
                      <td>{a.is_resolved ? 'Résolue' : 'Active'}</td>
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
