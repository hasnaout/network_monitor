import { useEffect, useState } from 'react';
import "../dashboard/home.css";
import { useAuth } from "../../context/AuthContext";
import { getDevices } from "../../services/device";

export default function Devices() {

  const { auth } = useAuth();
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    if (!auth.accessToken) return;

    async function load() {
      try {
        setLoading(true);
        const res = await getDevices();
        setDevices(res.data);
      } catch {
        setError("Erreur chargement devices");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [auth.accessToken]);

  return (
    <div className="dashboard-shell">
      <main className="dashboard-main">

        <section className="hero-panel">
          <div className="hero-copy-block">
            <h2>Équipements</h2>
          </div>
        </section>

        <section className="table-panel">

          {error && <p className="error-feedback">{error}</p>}

          {loading ? (
            <div className="empty-state">Chargement...</div>
          ) : (
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
                {devices.map(d => (
                  <tr key={d.id}>
                    <td>{d.name}</td>
                    <td>{d.ip_address}</td>
                    <td>{d.device_type}</td>
                    <td>{d.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        </section>

      </main>
    </div>
  );
}