import { useEffect, useState } from 'react';
import "../dashboard/home.css";
import { getCollection } from "../../utils/apiData";
import { fetchJsonWithAuth } from "../../utils/authFetch";

const API_URL = process.env.REACT_APP_API_URL;

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'medium',
  });
}

export default function Reports({ auth, onLogout, onSessionExpired, onTokensUpdate }) {
  const [reports, setReports] = useState([]);
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
        const data = await fetchJsonWithAuth(`${API_URL}/api/reports/`, {
          apiUrl: API_URL,
          auth: { accessToken, refreshToken },
          onTokensUpdate,
          options: { signal: controller.signal },
        });

        setReports(getCollection(data));
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
  }, [accessToken, refreshToken, onSessionExpired, onTokensUpdate]);

  const exportToCSV = () => {
    if (reports.length === 0) return;

    const headers = ['Équipement', 'Date', 'CPU Moyen (%)', 'RAM Moyen (%)', 'Latence Moyen (ms)', 'Disponibilité (%)'];
    const csvContent = [
      headers.join(','),
      ...reports.map(r => [
        r.device_name,
        r.date,
        r.avg_cpu,
        r.avg_ram,
        r.avg_latency,
        r.uptime_percentage
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'rapports_equipements.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="dashboard-shell">
      <main className="dashboard-main">
        <section className="hero-panel">
          <div className="hero-copy-block">
            <h2>Rapports</h2>
            <p className="hero-copy">
              Analyses de performance et statistiques
            </p>
            <div className="hero-actions">
              <button className="primary-link" onClick={exportToCSV}>
                Exporter CSV
              </button>
            </div>
          </div>
        </section>

        <section className="table-panel">
          <div className="panel-heading">
            <h3>Rapports quotidiens ({reports.length})</h3>
            <span className="live-badge">Données historiques</span>
          </div>

          {error && <p className="feedback error-feedback">{error}</p>}

          {isLoading ? (
            <div className="empty-state">
              Chargement des rapports...
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Équipement</th>
                    <th>Date</th>
                    <th>CPU Moyen</th>
                    <th>RAM Moyen</th>
                    <th>Latence Moyen</th>
                    <th>Disponibilité</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.device_name}</strong></td>
                      <td>{formatDate(r.date)}</td>
                      <td>{r.avg_cpu}%</td>
                      <td>{r.avg_ram}%</td>
                      <td>{r.avg_latency}ms</td>
                      <td>{r.uptime_percentage}%</td>
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
