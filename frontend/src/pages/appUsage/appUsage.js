import { useEffect, useMemo, useState } from 'react';
import "../dashboard/home.css";
import Header from "../../components/Header";
import { useAuth } from "../../context/AuthContext";
import { getDevices } from "../../services/deviceService";
import { getAppUsage } from "../../services/appUsageService";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDuration(seconds) {
  const totalSeconds = Number(seconds || 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}min`;
  }

  return `${minutes}min`;
}

export default function AppUsage() {
  const { auth } = useAuth();
  const [devices, setDevices] = useState([]);
  const [selectedMac, setSelectedMac] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [usages, setUsages] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [usageLoading, setUsageLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth?.accessToken) return;

    async function loadDevices() {
      try {
        setDevicesLoading(true);
        setError('');
        const res = await getDevices();
        const deviceList = res.data || [];
        setDevices(deviceList);
        const firstWithMac = deviceList.find(device => device.mac_address);
        setSelectedMac(current => current || firstWithMac?.mac_address || '');
      } catch (err) {
        setError("Impossible de charger les équipements");
      } finally {
        setDevicesLoading(false);
      }
    }

    loadDevices();
  }, [auth?.accessToken]);

  useEffect(() => {
    if (!auth?.accessToken || !selectedMac || !selectedDate) return;

    async function loadUsage() {
      try {
        setUsageLoading(true);
        setError('');
        const res = await getAppUsage(selectedMac, selectedDate);
        setUsages(res.data.usages || []);
      } catch (err) {
        setUsages([]);
        setError("Impossible de charger l'utilisation des applications");
      } finally {
        setUsageLoading(false);
      }
    }

    loadUsage();
  }, [auth?.accessToken, selectedMac, selectedDate]);

  const selectedDevice = useMemo(
    () => devices.find(device => device.mac_address === selectedMac),
    [devices, selectedMac]
  );

  const totalSeconds = useMemo(
    () => usages.reduce((sum, item) => sum + Number(item.duration_seconds || 0), 0),
    [usages]
  );

  const maxSeconds = useMemo(
    () => Math.max(...usages.map(item => Number(item.duration_seconds || 0)), 1),
    [usages]
  );

  return (
    <>
      <Header />

      <div className="dashboard-shell">
        <main className="dashboard-main">
          <section className="hero-panel hero-panel--split">
            <div className="hero-copy-block">
              <h2>Utilisation des applications</h2>
              <p className="hero-copy">
                Temps passé par application pour chaque poste client
              </p>
            </div>

            <aside className="hero-sidecard">
              <span className="section-label">Résumé</span>
              <div className="hero-score">
                <strong>{formatDuration(totalSeconds)}</strong>
                <span>{selectedDevice?.name || "Aucun poste sélectionné"}</span>
              </div>
              <div className="hero-sidecard__grid">
                <div><span>Applications</span><strong>{usages.length}</strong></div>
                <div><span>Date</span><strong className="compact-stat">{selectedDate}</strong></div>
              </div>
            </aside>
          </section>

          <section className="table-panel detail-panel">
            <div className="usage-filters">
              <label>
                <span>Équipement</span>
                <select
                  value={selectedMac}
                  onChange={(event) => setSelectedMac(event.target.value)}
                  disabled={devicesLoading}
                >
                  <option value="">Sélectionner un équipement</option>
                  {devices.map(device => (
                    <option key={device.id} value={device.mac_address || ''} disabled={!device.mac_address}>
                      {device.name} {device.mac_address ? `(${device.mac_address})` : "(MAC indisponible)"}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Date</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="table-panel">
            <div className="panel-heading">
              <h3>Applications détectées</h3>
              <span className="panel-count">{usages.length}</span>
            </div>

            {error && <p className="error-feedback detail-feedback">{error}</p>}

            {devicesLoading || usageLoading ? (
              <div className="empty-state">Chargement...</div>
            ) : !selectedMac ? (
              <div className="empty-state">Sélectionnez un équipement</div>
            ) : usages.length === 0 ? (
              <div className="empty-state">Aucune utilisation trouvée pour cette date</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Application</th>
                      <th>Durée</th>
                      <th>Visualisation</th>
                      <th>Dernière mise à jour</th>
                    </tr>
                  </thead>

                  <tbody>
                    {usages.map(item => {
                      const width = Math.max(
                        6,
                        Math.round((Number(item.duration_seconds || 0) / maxSeconds) * 100)
                      );

                      return (
                        <tr key={item.id}>
                          <td><strong>{item.app_name}</strong></td>
                          <td>{formatDuration(item.duration_seconds)}</td>
                          <td>
                            <div className="usage-bar" aria-label={`${item.app_name}: ${formatDuration(item.duration_seconds)}`}>
                              <span style={{ width: `${width}%` }} />
                            </div>
                          </td>
                          <td>
                            {item.last_updated
                              ? new Date(item.last_updated).toLocaleString('fr-FR')
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
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
