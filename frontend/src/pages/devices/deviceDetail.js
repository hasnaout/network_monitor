 import { Fragment, useEffect, useState } from 'react';
import "../dashboard/home.css";
import Header from "../../components/Header";
import { useAuth } from "../../context/AuthContext";
import { useParams } from "react-router-dom";
import { getDeviceById, getDeviceSoftware } from "../../services/deviceService";
import { getAppUsage } from "../../services/appUsageService";
import { getAlerts } from "../../services/alertService";
import { getCommandHistory } from "../../services/commandService";
import { useSocket } from "../../context/SocketContext";
import AppUsageChart from "../../components/AppUsageChart";

function getStatusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'online') return 'status-pill is-online';
  return 'status-pill is-offline';
}

function getCommandStatusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'success') return 'command-badge is-success';
  if (['error', 'timeout', 'exception'].includes(s)) return 'command-badge is-error';
  if (s === 'cancelled') return 'command-badge is-error';
  return 'command-badge is-pending';
}

function getCommandStatusLabel(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'success') return 'Success';
  if (s === 'error') return 'Error';
  if (s === 'timeout') return 'Timeout';
  if (s === 'exception') return 'Exception';
  if (s === 'cancelled') return 'Annulée';
  if (s === 'running') return 'Running';
  return 'Pending';
}

function getCommandResult(command) {
  if (!command) return '';
  const output = command.stderr || command.stdout || 'Aucun résultat disponible.';
  if (!command.working_directory) return output;
  return `Dossier courant: ${command.working_directory}\n\n${output}`;
}

function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function toDateKey(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatDuration(seconds) {
  const totalSeconds = Number(seconds || 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}min`;
  }

  if (minutes > 0) {
    return remainingSeconds > 0 ? `${minutes}min ${remainingSeconds}s` : `${minutes}min`;
  }

  return `${remainingSeconds}s`;
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
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [appUsages, setAppUsages] = useState([]);
  const [appUsageHourly, setAppUsageHourly] = useState([]);
  const [softwareLoading, setSoftwareLoading] = useState(false);
  const [appUsageLoading, setAppUsageLoading] = useState(false);
  const [commandHistory, setCommandHistory] = useState([]);
  const [commandHistoryLoading, setCommandHistoryLoading] = useState(false);
  const [commandHistoryError, setCommandHistoryError] = useState('');
  const [expandedCommandId, setExpandedCommandId] = useState(null);
  const [softwareError, setSoftwareError] = useState('');
  const [appUsageError, setAppUsageError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [softwareSearch, setSoftwareSearch] = useState('');
  
  
  const [softwarePage, setSoftwarePage] = useState(1);
  const [alertsPage, setAlertsPage] = useState(1);
  const [commandHistoryPage, setCommandHistoryPage] = useState(1);

  useEffect(() => {

    if (!auth?.accessToken || !id) return;

    async function load() {
      try {
        setLoading(true);
        setError('');

        const [deviceRes, alertsRes] = await Promise.all([
          getDeviceById(id, selectedDate),
          getAlerts({ device_id: id, date: selectedDate }),
        ]);
        setDevice(deviceRes.data);
        setApiAlerts(alertsRes.data);
        setAlertsPage(1);

        if (deviceRes.data?.mac_address) {
          try {
            setSoftwareLoading(true);
            setSoftwareError('');
            const softwareRes = await getDeviceSoftware(deviceRes.data.mac_address, selectedDate);
            setSoftware(softwareRes.data.software || []);
            setSoftwarePage(1);
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

  }, [auth?.accessToken, id, selectedDate]);

  useEffect(() => {
    if (!auth?.accessToken || !device?.mac_address || !selectedDate) return;

    async function loadAppUsage() {
      try {
        setAppUsageLoading(true);
        setAppUsageError('');
        const usageRes = await getAppUsage(device.mac_address, selectedDate);
        setAppUsageHourly(usageRes.data.usages || []);
        setAppUsages(usageRes.data.app_totals || usageRes.data.usages || []);
      } catch (usageErr) {
        setAppUsages([]);
        setAppUsageHourly([]);
        setAppUsageError("Erreur chargement utilisation applications");
      } finally {
        setAppUsageLoading(false);
      }
    }

    loadAppUsage();
  }, [auth?.accessToken, device?.mac_address, selectedDate]);

  useEffect(() => {
    if (!auth?.accessToken || !device?.id || !selectedDate) return;

    async function loadCommandHistory() {
      try {
        setCommandHistoryLoading(true);
        setCommandHistoryError('');
        const res = await getCommandHistory({ deviceId: device.id, date: selectedDate, limit: 50 });
        setCommandHistory(res.data.results || []);
        setCommandHistoryPage(1);
        setExpandedCommandId(null);
      } catch (historyErr) {
        setCommandHistory([]);
        setCommandHistoryError("Erreur chargement historique des commandes");
        setCommandHistoryPage(1);
      } finally {
        setCommandHistoryLoading(false);
      }
    }

    loadCommandHistory();
  }, [auth?.accessToken, device?.id, selectedDate]);

  useEffect(() => {
    setSoftwarePage(1);
  }, [softwareSearch]);

  const mergedAlerts = [...alerts, ...apiAlerts].filter(
    (item, index, self) =>
      index === self.findIndex(a => a.id === item.id)
  );

  const deviceAlerts = mergedAlerts
    .filter(a => {
      const alertDevice = typeof a.device === 'object' && a.device !== null
        ? a.device
        : null;

      return (
        String(alertDevice?.id || a.device) === String(device?.id) ||
        alertDevice?.name === device?.name ||
        alertDevice?.mac_address === device?.mac_address ||
        a.device === device?.name ||
        a.device_name === device?.name
      );
    })
    .filter(a => toDateKey(a.created_at) === selectedDate)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const totalUsageSeconds = appUsages.reduce(
    (sum, item) => sum + Number(item.duration_seconds || 0),
    0
  );

  const maxUsageSeconds = Math.max(
    ...appUsages.map(item => Number(item.duration_seconds || 0)),
    1
  );

  const filteredSoftware = software.filter((item) => {
    const query = softwareSearch.trim().toLowerCase();
    if (!query) return true;
    return String(item.name || '').toLowerCase().includes(query);
  });

  const commandHistoryItemsPerPage = 10;
  const commandHistoryTotalPages = Math.ceil(commandHistory.length / commandHistoryItemsPerPage);
  const paginatedCommandHistory = commandHistory.slice(
    (commandHistoryPage - 1) * commandHistoryItemsPerPage,
    commandHistoryPage * commandHistoryItemsPerPage
  );

  if (loading) {
    return <div className="screen-state">Chargement...</div>;
  }
  if (error) {
    return <div className="screen-state error-feedback">{error}</div>;
  }
  if (!device) return null;

  const sessionUser = device.current_user || device.name || "—";
  const pcName = device.hostname || (!device.current_user ? device.name : "") || "—";
  const selectedDateLabel = selectedDate === todayISO()
    ? "Aujourd'hui"
    : new Date(`${selectedDate}T00:00:00`).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

  return (
    <>
      <Header />

      <div className="dashboard-shell">
        <main className="dashboard-main">
          <section className="hero-panel">
            <div className="device-detail-topbar">
              <h2>{sessionUser}</h2>
              <label className="device-date-picker">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value || todayISO())}
                  aria-label="Choisir la date des détails du périphérique"
                />
                <small>{selectedDateLabel}</small>
              </label>
            </div>
            <div className="device-meta">
              <p><strong>Nom du PC :</strong> {pcName}</p>
              <p><strong>Utilisateur de session :</strong> {sessionUser}</p>
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
              <div className="panel-heading-actions">
                <input
                  className="device-search-input"
                  type="search"
                  value={softwareSearch}
                  onChange={(event) => setSoftwareSearch(event.target.value)}
                  placeholder="Rechercher un logiciel..."
                  aria-label="Rechercher un logiciel par son nom"
                />
          
              </div>
            </div>

            {softwareError && <p className="error-feedback detail-feedback">{softwareError}</p>}

            {softwareLoading ? (
              <div className="empty-state">Chargement des logiciels...</div>
            ) : software.length === 0 ? (
              <div className="empty-state">
                Aucun logiciel inventorié pour cette date
              </div>
            ) : filteredSoftware.length === 0 ? (
              <div className="empty-state">
                Aucun logiciel trouvé pour cette recherche
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
                      {filteredSoftware
                        .slice((softwarePage - 1) * 10, softwarePage * 10)
                        .map((item) => (
                          <tr key={item.id}>
                            <td>{item.name}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {filteredSoftware.length > 10 && (
                  <div className="pagination-controls">
                    <button
                      className="btn-pagination"
                      onClick={() => setSoftwarePage(softwarePage - 1)}
                      disabled={softwarePage === 1}
                    >
                      &lt;
                    </button>

                    <span className="pagination-info">
                      {softwarePage} / {Math.ceil(filteredSoftware.length / 10)}
                    </span>

                    <button
                      className="btn-pagination"
                      onClick={() => setSoftwarePage(softwarePage + 1)}
                      disabled={softwarePage >= Math.ceil(filteredSoftware.length / 10)}
                    >
                      &gt;
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="table-panel detail-panel">
            <div className="panel-heading">
              <h3>Utilisation des applications</h3>
              <span className="panel-count">{formatDuration(totalUsageSeconds)}</span>
            </div>

            {appUsageError && <p className="error-feedback detail-feedback">{appUsageError}</p>}

            {appUsageLoading ? (
              <div className="empty-state">Chargement de l'utilisation...</div>
            ) : (
              <>
                {/* Dashboard avec graphique */}
                <AppUsageChart appUsages={appUsageHourly} usageDate={selectedDate} />

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
                                  ? new Date(item.last_updated).toLocaleTimeString('fr-FR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
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

          <section className="table-panel detail-panel">
            <div className="panel-heading">
              <h3>Historique des Commandes Distantes</h3>
              <span className="panel-count">{commandHistory.length}</span>
            </div>

            {commandHistoryError && <p className="error-feedback detail-feedback">{commandHistoryError}</p>}

            {commandHistoryLoading ? (
              <div className="empty-state">Chargement des commandes...</div>
            ) : commandHistory.length === 0 ? (
              <div className="empty-state">Aucune commande distante exécutée pour cette date</div>
            ) : (
              <>
                <div className="table-wrap">
                  <table className="command-history-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Commande</th>
                        <th>Statut</th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedCommandHistory.map((item) => (
                        <Fragment key={item.id}>
                          <tr
                            className="command-history-row"
                            onClick={() => setExpandedCommandId(
                              expandedCommandId === item.id ? null : item.id
                            )}
                          >
                            <td>
                              {item.created_at
                                ? new Date(item.created_at).toLocaleTimeString('fr-FR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : "—"}
                            </td>
                            <td><code>{item.command}</code></td>
                            <td>
                              <span className={getCommandStatusClass(item.status)}>
                                {getCommandStatusLabel(item.status)}
                              </span>
                            </td>
                          </tr>
                          {expandedCommandId === item.id && (
                            <tr className="command-history-detail-row">
                              <td colSpan="3">
                                <pre>{getCommandResult(item)}</pre>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {commandHistory.length > commandHistoryItemsPerPage && (
                  <div className="pagination-controls">
                    <button
                      className="btn-pagination"
                      onClick={() => {
                        setCommandHistoryPage(commandHistoryPage - 1);
                        setExpandedCommandId(null);
                      }}
                      disabled={commandHistoryPage === 1}
                    >
                      &lt;
                    </button>

                    <span className="pagination-info">
                      {commandHistoryPage} / {commandHistoryTotalPages}
                    </span>

                    <button
                      className="btn-pagination"
                      onClick={() => {
                        setCommandHistoryPage(commandHistoryPage + 1);
                        setExpandedCommandId(null);
                      }}
                      disabled={commandHistoryPage >= commandHistoryTotalPages}
                    >
                      &gt;
                    </button>
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
                Aucune alerte pour cette date
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
                  const groupedArray = groupAlertsByDay(paginatedAlerts);

                  return (
                    <>
                      {groupedArray.map((group) => (
                        <div key={group.label} className="alerts-group">
                          <div className="alerts-group-header">{group.label}</div>
                          <table>
                            <thead>
                              <tr>
                                <th>Message</th>
                                <th>Heure</th>
                              </tr>
                            </thead>

                            <tbody>
                              {group.alerts.map((a) => (
                                <tr key={a.id}>
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
                          &lt;
                        </button>

                        <span className="pagination-info">
                           {alertsPage} / {totalPages}
                        </span>

                        <button
                          className="btn-pagination"
                          onClick={() => setAlertsPage(alertsPage + 1)}
                          disabled={alertsPage >= totalPages}
                        >
                          &gt;
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
