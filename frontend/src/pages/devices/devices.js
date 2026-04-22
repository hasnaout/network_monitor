import { useEffect, useState } from 'react';
import "../dashboard/home.css"; // Reuse styles
import { getCollection, normalizeDevice } from "../../utils/apiData";
import { fetchJsonWithAuth } from "../../utils/authFetch";

const API_URL = process.env.REACT_APP_API_URL;

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

export default function Devices({ auth, onLogout, onSessionExpired, onTokensUpdate }) {
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      setError('');

      try {
        const data = await fetchJsonWithAuth(`${API_URL}/api/devices/`, {
          apiUrl: API_URL,
          auth,
          onTokensUpdate,
          options: { signal: controller.signal },
        });

        setDevices(getCollection(data).map(normalizeDevice));
      } catch (e) {
        if (e.name !== 'AbortError') {
          if (e.status === 401) {
            onSessionExpired();
            return;
          }
          setError("Impossible de joindre le serveur.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [auth.accessToken, auth.refreshToken, onSessionExpired, onTokensUpdate]);

  return (
    <div className="dashboard-shell">
      <main className="dashboard-main">
        <section className="hero-panel">
          <div className="hero-copy-block">
            <h2>Équipements</h2>
            <p className="hero-copy">
              Gestion et surveillance de votre parc informatique
            </p>
          </div>
        </section>

        <section className="table-panel">
          <div className="panel-heading">
            <h3>Équipements ({devices.length})</h3>
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
                    <th>Nom</th>
                    <th>IP</th>
                    <th>Type</th>
                    <th>Localisation</th>
                    <th>Statut</th>
                    <th>Dernière activité</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map(d => (
                    <tr key={d.id}>
                      <td><a href={`#/devices/${d.id}`} className="device-link"><strong>{d.name}</strong></a></td>
                      <td>{d.ip_address}</td>
                      <td>{d.device_type}</td>
                      <td>{d.location || "—"}</td>
                      <td>
                        <span className={getStatusClass(d.status)}>
                          {d.status}
                        </span>
                      </td>
                      <td>{formatDate(d.last_seen || d.created_at)}</td>
                      <td>
                        <a href={`#/devices/${d.id}`}>Détails</a>
                      </td>
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
