 import { useEffect, useState } from 'react';
import "../dashboard/home.css";
import Header from "../../components/Header";
import { useAuth } from "../../context/AuthContext";
import { useParams } from "react-router-dom";
import { getDeviceById, getDeviceSoftware } from "../../services/deviceService";
import { getAppUsage } from "../../services/appUsageService";
import { getAlerts } from "../../services/alertService";
import { useSocket } from "../../context/SocketContext";
import AppUsageChart from "../../components/AppUsageChart";

function getStatusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'online') return 'status-pill is-online';
  return 'status-pill is-offline';
}

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

function getRelativeDate(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return "Aujourd'hui";
  } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return "Hier";
  } else {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  }
}

function groupAlertsByDay(alerts) {
  const grouped = {};
  alerts.forEach((alert) => {
    const date = new Date(alert.created_at);
    const dateKey = date.toISOString().slice(0, 10);
    const label = getRelativeDate(alert.created_at);
    if (!grouped[dateKey]) {
      grouped[dateKey] = { label, alerts: [] };
    }
    grouped[dateKey].alerts.push(alert);
  });

  // Trier par date décroissante (plus récent en premier)
  return Object.entries(grouped)
    .sort(([keyA], [keyB]) => new Date(keyB) - new Date(keyA))
    .map(([, { label, alerts }]) => ({ label, alerts }));
}

export default function DeviceDetail() {

  const { auth } = useAuth();
  const { id } = useParams();
  const { alerts = [] } = useSocket();

  const [device, setDevice] = useState(null);
  const [apiAlerts, setApiAlerts] = useState([]);
  const [software, setSoftware] = useState([]);
  const [usageDate, setUsageDate] = useState(todayISO());
  const [appUsages, setAppUsages] = useState([]);
  const [softwareLoading, setSoftwareLoading] = useState(false);
  const [appUsageLoading, setAppUsageLoading] = useState(false);
  const [softwareError, setSoftwareError] = useState('');
  const [appUsageError, setAppUsageError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // États pour la pagination
  const [softwarePage, setSoftwarePage] = useState(1);
  const [alertsPage, setAlertsPage] = useState(1);

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

        if (deviceRes.data?.mac_address) {
          try {
            setSoftwareLoading(true);
            setSoftwareError('');
            const softwareRes = await getDeviceSoftware(deviceRes.data.mac_address);
            setSoftware(softwareRes.data.software || []);
          } catch (softwareErr) {
            setSoftware([]);
            setSoftwareError("Erreur chargement logiciels");
          } finally {
            setSoftwareLoading(false);
          }
        } else {
          setSoftware([]);
        }

      } catch (err) {
        setError("Erreur chargement device");
      } finally {
        setLoading(false);
      }
    }

    load();

  }, [auth?.accessToken, id]);

  useEffect(() => {
    if (!auth?.accessToken || !device?.mac_address || !usageDate) return;

    async function loadAppUsage() {
      try {
        setAppUsageLoading(true);
        setAppUsageError('');
        const usageRes = await getAppUsage(device.mac_address, usageDate);
        setAppUsages(usageRes.data.usages || []);
      } catch (usageErr) {
        setAppUsages([]);
        setAppUsageError("Erreur chargement utilisation applications");
      } finally {
        setAppUsageLoading(false);
      }
    }

    loadAppUsage();
  }, [auth?.accessToken, device?.mac_address, usageDate]);

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

  const totalUsageSeconds = appUsages.reduce(
    (sum, item) => sum + Number(item.duration_seconds || 0),
    0
  );

  const maxUsageSeconds = Math.max(
    ...appUsages.map(item => Number(item.duration_seconds || 0)),
    1
  );

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

          <section className="table-panel detail-panel">
            <div className="panel-heading">
              <h3>Logiciels installés</h3>
              <span className="panel-count">{software.length}</span>
            </div>

            {softwareError && <p className="error-feedback detail-feedback">{softwareError}</p>}

            {softwareLoading ? (
              <div className="empty-state">Chargement des logiciels...</div>
            ) : software.length === 0 ? (
              <div className="empty-state">
                Aucun logiciel inventorié
              </div>
            ) : (
              <>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Nom</th>
                      </tr>
                    </thead>

                    <tbody>
                      {software
                        .slice((softwarePage - 1) * 10, softwarePage * 10)
                        .map((item) => (
                          <tr key={item.id}>
                            <td>{item.name}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="pagination-controls">
                  <button
                    className="btn-pagination"
                    onClick={() => setSoftwarePage(softwarePage - 1)}
                    disabled={softwarePage === 1}
                  >
                    ← Précédent
                  </button>

                  <span className="pagination-info">
                    Page {softwarePage} sur {Math.ceil(software.length / 10)}
                  </span>

                  <button
                    className="btn-pagination"
                    onClick={() => setSoftwarePage(softwarePage + 1)}
                    disabled={softwarePage >= Math.ceil(software.length / 10)}
                  >
                    Suivant →
                  </button>
                </div>
              </>
            )}
          </section>

          <section className="table-panel detail-panel">
            <div className="panel-heading">
              <h3>Utilisation des applications</h3>
              <span className="panel-count">{formatDuration(totalUsageSeconds)}</span>
            </div>

            <div className="usage-filters">
              <label>
                <span>Date</span>
                <input
                  type="date"
                  value={usageDate}
                  onChange={(event) => setUsageDate(event.target.value)}
                />
              </label>
            </div>

            {appUsageError && <p className="error-feedback detail-feedback">{appUsageError}</p>}

            {appUsageLoading ? (
              <div className="empty-state">Chargement de l'utilisation...</div>
            ) : (
              <>
                {/* Dashboard avec graphique */}
                <AppUsageChart appUsages={appUsages} usageDate={usageDate} />

                {/* Tableau détaillé */}
                {appUsages.length === 0 ? (
                  <div className="empty-state">
                    Aucune utilisation trouvée pour cette date
                  </div>
                ) : (
                  <div className="table-wrap">
                    <div className="table-section-title">Détail des applications</div>
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
                        {appUsages.map((item) => {
                          const width = Math.max(
                            6,
                            Math.round((Number(item.duration_seconds || 0) / maxUsageSeconds) * 100)
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
              </>
            )}
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
              <>
                {/* Pagination par alertes (10 à la fois) */}
                {(() => {
                  const itemsPerPage = 10;
                  const totalPages = Math.ceil(deviceAlerts.length / itemsPerPage);
                  const startIdx = (alertsPage - 1) * itemsPerPage;
                  const endIdx = startIdx + itemsPerPage;
                  const paginatedAlerts = deviceAlerts.slice(startIdx, endIdx);
                  
                  // Regrouper les alertes paginées par jour
                  const grouped = {};
                  paginatedAlerts.forEach((alert) => {
                    const date = new Date(alert.created_at);
                    const dateKey = date.toISOString().slice(0, 10);
                    const label = getRelativeDate(alert.created_at);
                    if (!grouped[dateKey]) {
                      grouped[dateKey] = { label, alerts: [] };
                    }
                    grouped[dateKey].alerts.push(alert);
                  });

                  const groupedArray = Object.entries(grouped)
                    .sort(([keyA], [keyB]) => new Date(keyB) - new Date(keyA))
                    .map(([, { label, alerts }]) => ({ label, alerts }));

                  return (
                    <>
                      {groupedArray.map((group) => (
                        <div key={group.label} className="alerts-group">
                          <div className="alerts-group-header">{group.label}</div>
                          <table>
                            <thead>
                              <tr>
                                <th>Type</th>
                                <th>Message</th>
                                <th>Heure</th>
                              </tr>
                            </thead>

                            <tbody>
                              {group.alerts.map((a) => (
                                <tr key={a.id}>
                                  <td><span className="alert-badge">{a.alert_type}</span></td>
                                  <td>{a.message}</td>
                                  <td>
                                    {a.created_at
                                      ? new Date(a.created_at).toLocaleTimeString('fr-FR', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}

                      {/* Pagination Controls */}
                      <div className="pagination-controls">
                        <button
                          className="btn-pagination"
                          onClick={() => setAlertsPage(alertsPage - 1)}
                          disabled={alertsPage === 1}
                        >
                          ← Précédent
                        </button>

                        <span className="pagination-info">
                          Page {alertsPage} sur {totalPages}
                        </span>

                        <button
                          className="btn-pagination"
                          onClick={() => setAlertsPage(alertsPage + 1)}
                          disabled={alertsPage >= totalPages}
                        >
                          Suivant →
                        </button>
                      </div>
                    </>
                  );
                })()}
              </>
            )}

          </section>

        </main>
      </div>
    </>
  );
}
