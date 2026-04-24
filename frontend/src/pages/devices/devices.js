import { useEffect, useState, useMemo } from 'react';
import "../dashboard/home.css";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContect";
import { getDevices } from "../../services/deviceService";

export default function Devices() {

  const { auth } = useAuth();
  const { alerts } = useSocket(); // 🔥 prêt pour extension temps réel

  const [devices, setDevices] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // 🔵 LOAD DEVICES
  useEffect(() => {

    if (!auth.accessToken) return;

    async function load() {
      try {
        setLoading(true);
        setError('');

        const res = await getDevices();
        setDevices(res.data);

      } catch (err) {
        setError("Erreur chargement devices");
      } finally {
        setLoading(false);
      }
    }

    load();

  }, [auth.accessToken]);

  // 🔥 STATS OPTIMISÉES
  const stats = useMemo(() => {

    const total = devices.length;
    const online = devices.filter(d => d.status === "online").length;
    const maintenance = devices.filter(d => d.status === "maintenance").length;
    const offline = devices.filter(d => d.status === "offline").length;

    return { total, online, maintenance, offline };

  }, [devices]);

  return (
    <div className="dashboard-shell">

      <main className="dashboard-main">

        {/* 🔵 HEADER */}
        <section className="hero-panel">
          <div className="hero-copy-block">

            <h2>Équipements</h2>

            <p className="hero-copy">
              Gestion centralisée des machines du réseau
            </p>

            {/* 🔥 LIVE ALERT (OPTIONNEL) */}
            {alerts.length > 0 && (
              <div className="live-alert">
                🚨 {alerts[0].device} : {alerts[0].message}
              </div>
            )}

          </div>
        </section>

        {/* 🔵 STATS */}
        <section className="hero-sidecard">

          <div className="hero-sidecard__grid">

            <div>
              <span>Total</span>
              <strong>{stats.total}</strong>
            </div>

            <div>
              <span>Online</span>
              <strong>{stats.online}</strong>
            </div>

            <div>
              <span>Maintenance</span>
              <strong>{stats.maintenance}</strong>
            </div>

            <div>
              <span>Offline</span>
              <strong>{stats.offline}</strong>
            </div>

          </div>

        </section>

        {/* 🔵 TABLE */}
        <section className="table-panel">

          {error && <p className="error-feedback">{error}</p>}

          {loading ? (
            <div className="empty-state">Chargement...</div>
          ) : (
            <div className="table-wrap">

              <table>

                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>IP</th>
                    <th>Type</th>
                    <th>Statut</th>
                  </tr>
                </thead>

                <tbody>

                  {devices.map(device => (
                    <tr key={device.id}>

                      <td>
                        <strong>{device.name}</strong>
                      </td>

                      <td>{device.ip_address}</td>

                      <td>{device.device_type}</td>

                      <td>
                        <span className={`status-pill ${device.status}`}>
                          {device.status}
                        </span>
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