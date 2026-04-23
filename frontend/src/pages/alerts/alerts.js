import { useEffect, useState } from 'react';
import "../dashboard/home.css";
import { useAuth } from "../../context/AuthContext";
import { getAlerts } from "../../services/alerts";

export default function Alerts() {

  const { auth } = useAuth();
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {

    if (!auth.accessToken) return;

    async function load() {
      const res = await getAlerts();
      setAlerts(res.data);
    }

    load();

  }, [auth.accessToken]);

  return (
    <div className="dashboard-shell">
      <main className="dashboard-main">

        <section className="hero-panel">
          <h2>Alerts</h2>
        </section>

        <section className="table-panel">
          <table>
            <thead>
              <tr>
                <th>Device</th>
                <th>Type</th>
                <th>Message</th>
              </tr>
            </thead>

            <tbody>
              {alerts.map(a => (
                <tr key={a.id}>
                  <td>{a.device_name}</td>
                  <td>{a.alert_type}</td>
                  <td>{a.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

      </main>
    </div>
  );
}