import { useEffect, useMemo, useState } from 'react';
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [devicesPage, setDevicesPage] = useState(1);
  const [deviceSearch, setDeviceSearch] = useState('');

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

  const filteredDevices = useMemo(() => {
    const search = deviceSearch.trim().toLowerCase();

    return devices.filter((device) => {
      const matchesStatus =
        statusFilter === 'all' ||
        String(device.status || '').toLowerCase() === statusFilter;
      const matchesSearch =
        !search ||
        String(device.name || '').toLowerCase().includes(search);

      return matchesStatus && matchesSearch;
    });
  }, [devices, statusFilter, deviceSearch]);

  const devicesPerPage = 10;
  const totalDevicePages = Math.ceil(filteredDevices.length / devicesPerPage);
  const paginatedDevices = filteredDevices.slice(
    (devicesPage - 1) * devicesPerPage,
    devicesPage * devicesPerPage
  );

  useEffect(() => {
    setDevicesPage(1);
  }, [statusFilter, deviceSearch]);

  useEffect(() => {
    if (totalDevicePages > 0 && devicesPage > totalDevicePages) {
      setDevicesPage(totalDevicePages);
    }
  }, [devicesPage, totalDevicePages]);

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
            <div className="panel-heading devices-panel-heading">
              <h3>Liste des équipements</h3>
              <span className="panel-count">{filteredDevices.length}</span>
            </div>

            <div className="device-toolbar">
              <div className="device-status-filter" aria-label="Filtrer les équipements par statut">
                <button
                  type="button"
                  className={statusFilter === 'all' ? 'is-active' : ''}
                  onClick={() => setStatusFilter('all')}
                >
                  Tous
                </button>
                <button
                  type="button"
                  className={statusFilter === 'online' ? 'is-active' : ''}
                  onClick={() => setStatusFilter('online')}
                >
                  Online
                </button>
                <button
                  type="button"
                  className={statusFilter === 'offline' ? 'is-active' : ''}
                  onClick={() => setStatusFilter('offline')}
                >
                  Offline
                </button>
              </div>

              <input
                className="device-search-input"
                type="search"
                value={deviceSearch}
                onChange={(event) => setDeviceSearch(event.target.value)}
                placeholder="Rechercher par nom"
                aria-label="Rechercher une machine par son nom"
              />
            </div>

            {error && <p className="error-feedback">{error}</p>}
            {loading ? (
              <div className="empty-state">Chargement...</div>
            ) : devices.length === 0 ? (
              <div className="empty-state">Aucun équipement trouvé</div>
            ) : filteredDevices.length === 0 ? (
              <div className="empty-state">Aucun équipement trouvé pour cette recherche</div>
            ) : (
              <>
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
                      {paginatedDevices.map(device => (
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

                {filteredDevices.length > devicesPerPage && (
                  <div className="pagination-controls">
                    <button
                      className="btn-pagination"
                      onClick={() => setDevicesPage(devicesPage - 1)}
                      disabled={devicesPage === 1}
                    >
                      &lt;
                    </button>

                    <span className="pagination-info">
                      {devicesPage} / {totalDevicePages}
                    </span>

                    <button
                      className="btn-pagination"
                      onClick={() => setDevicesPage(devicesPage + 1)}
                      disabled={devicesPage >= totalDevicePages}
                    >
                      &gt;
                    </button>
                  </div>
                )}
              </>
            )}

          </section>

        </main>
      </div>
    </>
  );
}
