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

function getStatusClass(status) {
  if (status === 'Online') return 'status-pill is-online';
  if (status === 'Maintenance') return 'status-pill is-maintenance';
  return 'status-pill is-offline';
}

export default function DeviceDetail({ auth, onLogout, onSessionExpired, route }) {
  const deviceId = route.split('/').pop(); // Simple parsing for #/devices/1
  const [device, setDevice] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      setError('');

      try {
        const res = await fetch(`${API_URL}/api/devices/${deviceId}/`, {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
          signal: controller.signal,
        });

        if (res.status === 401) {
          onSessionExpired();
          return;
        }

        if (!res.ok) throw new Error("Équipement non trouvé");

        const data = await res.json();
        setDevice(data);
      } catch (e) {
        if (e.name !== 'AbortError') {
          setError(e.message);
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (deviceId) load();
    return () => controller.abort();
  }, [auth.accessToken, deviceId]);

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
            <p className="hero-copy">
              Informations détaillées et métriques de l'équipement.
            </p>
            <div className="hero-actions">
              <a className="primary-link" href="#/devices">
                Retour à la liste
              </a>
              <a className="primary-link" href="#/">
                Dashboard
              </a>
            </div>
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
          </aside>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <p className="stat-label">Disponibilité</p>
            <p className="stat-value">{device.status === 'Online' ? '100%' : '0%'}</p>
            <p className="stat-detail">Statut actuel</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Adresse MAC</p>
            <p className="stat-value">{device.mac_address || "—"}</p>
            <p className="stat-detail">Identifiant physique</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Créé le</p>
            <p className="stat-value">{formatDate(device.created_at)}</p>
            <p className="stat-detail">Date d'ajout</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Actions</p>
            <p className="stat-value">
              <button className="secondary-button">Modifier</button>
            </p>
            <p className="stat-detail">Gérer l'équipement</p>
          </div>
        </section>
      </main>
    </div>
  );
}