import { useEffect, useState, useMemo } from 'react';
import "../dashboard/home.css";
import Header from "../../components/Header";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContect";
import { getAlerts } from "../../services/alertService";

export default function Alerts() {

  const { auth } = useAuth();
  const { alerts: liveAlerts } = useSocket();

  const [apiAlerts, setApiAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 🔵 LOAD INITIAL ALERTS (API)
  useEffect(() => {

    if (!auth.accessToken) return;

    async function load() {
      try {
        setLoading(true);
        setError('');

        const res = await getAlerts();
        setApiAlerts(res.data);

      } catch (err) {
        setError("Erreur chargement alertes");
      } finally {
        setLoading(false);
      }
    }

    load();

  }, [auth.accessToken]);

  // 🔥 MERGE API + LIVE ALERTS
  const alerts = useMemo(() => {

    const merged = [...liveAlerts, ...apiAlerts];

    // 🔴 suppression doublons
    const unique = merged.filter(
      (item, index, self) =>
        index === self.findIndex(a => a.id === item.id)
    );

    // 🔵 tri (plus récent en premier)
    return unique.sort((a, b) => b.id - a.id);

  }, [liveAlerts, apiAlerts]);

  return (
    <>
        <Header/>
    <div className="dashboard-shell">
      <main className="dashboard-main">

        {/* 🔵 HEADER */}
        <section className="hero-panel">
          <div className="hero-copy-block">

            <h2>Alertes système</h2>

            <p className="hero-copy">
              Surveillance en temps réel de l’infrastructure
            </p>


          </div>
        </section>

        {/* 🔵 TABLE */}
        <section className="table-panel">

          <div className="panel-heading">
            <h3>Historique des alertes</h3>
            <span className="live-badge">LIVE</span>
          </div>

          {error && <p className="error-feedback">{error}</p>}

          {loading ? (
            <div className="empty-state">Chargement...</div>
          ) : alerts.length === 0 ? (
            <div className="empty-state">
              Aucune alerte
            </div>
          ) : (
            <table>

              <thead>
                <tr>
                  <th>Device</th>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Severity</th>
                </tr>
              </thead>

              <tbody>

                {alerts.map((a) => (
                  <tr key={a.id}>

                    <td><strong>{a.device}</strong></td>

                    <td>{a.alert_type}</td>

                    <td>{a.message}</td>

                    <td>
                      <span className={`status-pill ${a.severity}`}>
                        {a.severity}
                      </span>
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>
          )}

        </section>

      </main>

    </div>
    </>
  );
}