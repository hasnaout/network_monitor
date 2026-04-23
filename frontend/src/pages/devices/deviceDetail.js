import { useEffect, useState } from 'react';
import "../dashboard/home.css";
import { useAuth } from "../../context/AuthContext";
import { getDeviceById } from "../../services/device";

export default function DeviceDetail({ route }) {

  const { auth } = useAuth();
  const id = route.split('/').pop();

  const [device, setDevice] = useState(null);

  useEffect(() => {

    if (!auth.accessToken) return;

    async function load() {
      const res = await getDeviceById(id);
      setDevice(res.data);
    }

    load();

  }, [auth.accessToken, id]);

  if (!device) return <div className="screen-state">Chargement...</div>;

  return (
    <div className="dashboard-shell">
      <main className="dashboard-main">

        <section className="hero-panel">
          <h2>{device.name}</h2>

          <p>IP: {device.ip_address}</p>
          <p>Type: {device.device_type}</p>
          <p>Status: {device.status}</p>
        </section>

      </main>
    </div>
  );
}