import { useEffect, useState } from 'react';
import "../dashboard/home.css";
import { normalizeDevice } from "../../utils/apiData";
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
  return 'status-pill is-offline';
}

export default function DeviceDetail({ auth, onLogout, onSessionExpired, onTokensUpdate, route }) {
  const deviceId = route.split('/').pop(); // Simple parsing for #/devices/1
  const [device, setDevice] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const accessToken = auth?.accessToken;
  const refreshToken = auth?.refreshToken;

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      setError('');

      try {
        const data = await fetchJsonWithAuth(`${API_URL}/api/devices/${deviceId}/`, {
          apiUrl: API_URL,
          auth: { accessToken, refreshToken },
          onTokensUpdate,
          options: { signal: controller.signal },
        });

        setDevice(normalizeDevice(data));
      } catch (e) {
        if (e.name !== 'AbortError') {
          if (e.status === 401) {
            onSessionExpired();
            return;
          }
          setError(e.message);
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (deviceId) load();
    return () => controller.abort();
  }, [accessToken, refreshToken, deviceId, onSessionExpired, onTokensUpdate]);

  if (isLoading) return <div className="screen-state"><h2>Chargement...</h2></div>;
  if (error) return <div className="screen-state"><h2>Erreur: {error}</h2></div>;
  if (!device) return <div className="screen-state"><h2>Équipement non trouvé</h2></div>;

  return (
    <div className="dashboard-shell">
      <main className="dashboard-main">
        <section className="hero-panel">
          <div className="hero-copy-block">
            <p className="eyebrow">Détails de l'Équipement</p>
            <h2>{device.name}</h2>
          </div>
          <aside className="hero-sidecard">
            <span className="section-label">Statut</span>
            <div className="hero-score">
              <span className={getStatusClass(device.status)}>
                {device.status}
              </span>
            </div>
            <div className="hero-sidecard__grid">
              <div><span>Type</span><strong>{device.device_type}</strong></div>
              <div><span>IP</span><strong>{device.ip_address}</strong></div>
              <div><span>Localisation</span><strong>{device.location || "—"}</strong></div>
              <div><span>Dernière activité</span><strong>{formatDate(device.last_seen || device.created_at)}</strong></div>
            </div>


            <div className="hero-sidecard__grid" style={{ marginTop: '1.5rem' }}>
              <div><span>Disponibilité</span><strong>{device.status === 'Online' ? '100%' : '0%'}</strong></div>
              <div><span>Adresse MAC</span><strong>{device.mac_address || "—"}</strong></div>
              <div><span>Créé le</span><strong>{formatDate(device.created_at)}</strong></div>
              <div>
                <span>Actions</span>
                <strong>
                  <button className="secondary-button">Modifier</button>
                </strong>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
