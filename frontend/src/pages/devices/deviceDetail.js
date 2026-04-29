 import { useEffect, useState } from 'react';
import "../dashboard/home.css";
import Header from "../../components/Header";
import { useAuth } from "../../context/AuthContext";
import { useParams } from "react-router-dom";
import { getDeviceById } from "../../services/deviceService";
import { getAlerts } from "../../services/alertService";
import { useSocket } from "../../context/SocketContext";

function getStatusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'online') return 'status-pill is-online';
  return 'status-pill is-offline';
}

export default function DeviceDetail() {

  const { auth } = useAuth();
  const { id } = useParams();
  const { alerts = [] } = useSocket();

  const [device, setDevice] = useState(null);
  const [apiAlerts, setApiAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {

    if (!auth?.accessToken || !id) return;

    async function load() {
      try {
        setLoading(true);
        setError('');

        const [deviceRes, alertsRes] = await Promise.all([
          getDeviceById(id),
          getAlerts(),
        ]);
        setDevice(deviceRes.data);
        setApiAlerts(alertsRes.data);

      } catch (err) {
        setError("Erreur chargement device");
      } finally {
        setLoading(false);
      }
    }

    load();

  }, [auth?.accessToken, id]);

  const mergedAlerts = [...alerts, ...apiAlerts].filter(
    (item, index, self) =>
      index === self.findIndex(a => a.id === item.id)
  );

  const deviceAlerts = mergedAlerts
    .filter(a =>
      String(a.device) === String(device?.id) ||
      a.device === device?.name ||
      a.device_name === device?.name
    )
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (loading) {
    return <div className="screen-state">Chargement...</div>;
  }
  if (error) {
    return <div className="screen-state error-feedback">{error}</div>;
  }
  if (!device) return null;

  return (
    <>
      <Header />

      <div className="dashboard-shell">
        <main className="dashboard-main">
          <section className="hero-panel">
            <h2>{device.name}</h2>
            <div className="device-meta">
              <p><strong>IP :</strong> {device.ip_address || "—"}</p>
              <p><strong>MAC :</strong> {device.mac_address || "—"}</p>
              <p><strong>Type :</strong> {device.device_type || "—"}</p>

              <p>
                <strong>Status :</strong>{" "}
                <span className={getStatusClass(device.status)}>
                  {device.status}
                </span>
              </p>
            </div>

          </section>
          <section className="table-panel">

            <div className="panel-heading">
              <h3>Alertes du device</h3>
            </div>

            {deviceAlerts.length === 0 ? (
              <div className="empty-state">
                Aucune alerte récente
              </div>
            ) : (
              <table>

                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Message</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {deviceAlerts.map((a) => (
                    <tr key={a.id}>
                      <td>{a.alert_type}</td>
                      <td>{a.message}</td>
                      <td>
                        {a.created_at
                          ? new Date(a.created_at).toLocaleString('fr-FR')
                          : "—"}
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
