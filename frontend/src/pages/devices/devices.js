import { useEffect, useState} from 'react';
import "../dashboard/home.css";
import Header from "../../components/Header";
import { useAuth } from "../../context/AuthContext";
import { getDevices } from "../../services/deviceService";

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

  return (
    <>    <Header />
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
    </>
  );
}