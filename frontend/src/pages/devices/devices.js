import { useEffect, useState } from 'react';
import "../dashboard/home.css";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import { useAuth } from "../../context/AuthContext";
import { getDevices } from "../../services/deviceService";

function getStatusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'online') return 'status-pill is-online';
  return 'status-pill is-offline';
}

export default function Devices() {

  const { auth } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    if (!auth?.accessToken) return;

    let interval;

    async function load() {
      try {
        setLoading(true);
        setError('');

        const res = await getDevices();
        const sorted = res.data.sort(
          (a, b) => new Date(b.last_seen) - new Date(a.last_seen)
        );
        setDevices(sorted);

      } catch (err) {
        setError("Erreur chargement devices");
      } finally {
        setLoading(false);
      }
    }

    load();
    interval = setInterval(load, 10000);
    return () => clearInterval(interval);

  }, [auth?.accessToken]);

  return (
    <>
      <Header />

      <div className="dashboard-shell">
        <main className="dashboard-main">
          <section className="hero-panel">
            <div className="hero-copy-block">
              <h2>Équipements</h2>
              <p className="hero-copy">
                Gestion centralisée des machines du réseau
              </p>
            </div>
          </section>
          <section className="table-panel">
            {error && <p className="error-feedback">{error}</p>}
            {loading ? (
              <div className="empty-state">Chargement...</div>
            ) : devices.length === 0 ? (
              <div className="empty-state">Aucun équipement trouvé</div>
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
                         <strong
                          style={{ cursor: "pointer" }}
                          onClick={() => navigate(`/devices/${device.id}`)}
                        >
                          {device.name}
                        </strong>
                       </td>
                        <td>{device.ip_address || "—"}</td>
                        <td>{device.device_type || "—"}</td>
                        <td>
                          <span className={getStatusClass(device.status)}>
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
    </>
  );
}