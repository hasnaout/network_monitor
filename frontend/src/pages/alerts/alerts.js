import { useEffect, useState, useMemo } from 'react';
import "../dashboard/home.css";
import Header from "../../components/Header";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { getAlerts } from "../../services/alertService";

function getAlertTypeClass(type) {
  if (type === "first_connection" || type === "reconnection") {
    return "status-pill is-online";
  }
  return "status-pill is-offline";
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default function Alerts() {

  const { auth } = useAuth();
  const { alerts: liveAlerts = [] } = useSocket();
  const [apiAlerts, setApiAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alertsPage, setAlertsPage] = useState(1);


  useEffect(() => {
    if (!auth?.accessToken) return;
    async function load() {
      try {
        setLoading(true);
        setError('');
        const res = await getAlerts();
        setApiAlerts(res.data);
        setAlertsPage(1);

      } catch (err) {
        setError("Erreur chargement alertes");
        setAlertsPage(1);
      } finally {
        setLoading(false);
      }
    }
    load();

  }, [auth?.accessToken]);

  const alerts = useMemo(() => {

    const merged = [...liveAlerts, ...apiAlerts];
    const unique = merged.filter(
      (item, index, self) =>
        index === self.findIndex(a => a.id === item.id)
    );
    return unique.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

  }, [liveAlerts, apiAlerts]);

  const alertsPerPage = 10;
  const totalAlertPages = Math.ceil(alerts.length / alertsPerPage);
  const paginatedAlerts = alerts.slice(
    (alertsPage - 1) * alertsPerPage,
    alertsPage * alertsPerPage
  );

  useEffect(() => {
    if (totalAlertPages > 0 && alertsPage > totalAlertPages) {
      setAlertsPage(totalAlertPages);
    }
  }, [alertsPage, totalAlertPages]);

  return (
    <>
      <Header />

      <div className="dashboard-shell">
        <main className="dashboard-main">
          <section className="hero-panel">
            <div className="hero-copy-block">
              <h2>Alertes système</h2>
              <p className="hero-copy">
                Surveillance en temps réel de l’infrastructure
              </p>
            </div>
          </section>
          <section className="table-panel">
            <div className="panel-heading">
              <h3>Historique des alertes</h3>
            </div>
            {error && <p className="error-feedback">{error}</p>}
            {loading ? (
              <div className="empty-state">Chargement...</div>
            ) : alerts.length === 0 ? (
              <div className="empty-state">Aucune alerte</div>
            ) : (
              <>
                <table>
                  <thead>
                    <tr>
                      <th>Device</th>
                      <th>Type</th>
                      <th>Message</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAlerts.map((a) => {
                      const deviceName =
                        typeof a.device === "object"
                          ? a.device.name
                          : a.device_name || a.device;
                      return (
                        <tr key={a.id}>
                          <td><strong>{deviceName}</strong></td>
                          <td>
                            <span className={getAlertTypeClass(a.alert_type)}>
                              {a.alert_type}
                            </span>
                          </td>
                          <td>{a.message}</td>
                          <td>{formatDate(a.created_at)}</td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {alerts.length > alertsPerPage && (
                  <div className="pagination-controls">
                    <button
                      className="btn-pagination"
                      onClick={() => setAlertsPage(alertsPage - 1)}
                      disabled={alertsPage === 1}
                    >
                      &lt;
                    </button>

                    <span className="pagination-info">
                      {alertsPage} / {totalAlertPages}
                    </span>

                    <button
                      className="btn-pagination"
                      onClick={() => setAlertsPage(alertsPage + 1)}
                      disabled={alertsPage >= totalAlertPages}
                    >
                      &gt;
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </main>
      </div>
    </>
  );
}
