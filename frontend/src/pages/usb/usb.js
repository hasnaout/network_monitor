import { useEffect, useState, useCallback } from 'react';
import "../dashboard/home.css";
import "./usb.css";
import Header from "../../components/Header";
import { useAuth } from "../../context/AuthContext";
import { getDevices } from "../../services/deviceService";
import {
  getUSBDevices,
  getUSBPolicy,
  updateUSBPolicy,
  allowUSBDevice,
  blockUSBDevice,
  getUSBHistory,
  getUSBAlerts,
  markAllUSBAlertRead,
  getUSBStatistics,
} from "../../services/usbService";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getUSBStatusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'connected')    return 'usb-badge is-connected';
  if (s === 'disconnected') return 'usb-badge is-disconnected';
  if (s === 'blocked')      return 'usb-badge is-blocked';
  return 'usb-badge';
}

function getUSBStatusLabel(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'connected')    return 'Connecté';
  if (s === 'disconnected') return 'Déconnecté';
  if (s === 'blocked')      return 'Bloqué';
  return status || '—';
}

function getSeverityClass(severity) {
  const s = String(severity || '').toLowerCase();
  if (s === 'critical') return 'alert-badge is-critical';
  if (s === 'high')     return 'alert-badge is-high';
  if (s === 'medium')   return 'alert-badge is-medium';
  return 'alert-badge is-low';
}

function getEventIcon(eventType) {
  const t = String(eventType || '').toLowerCase();
  if (t === 'connected')    return '🔌';
  if (t === 'disconnected') return '⏏️';
  if (t === 'blocked')      return '🚫';
  if (t === 'allowed')      return '✅';
  if (t === 'write')        return '✏️';
  if (t === 'read')         return '👁️';
  if (t === 'eject')        return '⏏️';
  return '•';
}

function formatSize(bytes) {
  if (!bytes) return '—';
  const gb = bytes / (1024 ** 3);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 ** 2);
  return `${mb.toFixed(0)} MB`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const POLICY_LABELS = {
  allow:   'Autoriser',
  block:   'Bloquer',
  monitor: 'Surveiller',
};

// ─── Composant Stats ────────────────────────────────────────────────────────

function StatsBar({ stats }) {
  if (!stats) return null;
  const items = [
    { label: 'Total',        value: stats.total_devices,  color: 'var(--usb-blue)' },
    { label: 'Connectés',    value: stats.connected,      color: 'var(--usb-green)' },
    { label: 'Déconnectés',  value: stats.disconnected,   color: 'var(--usb-muted)' },
    { label: 'Bloqués',      value: stats.blocked,        color: 'var(--usb-red)' },
    { label: 'De confiance', value: stats.trusted,        color: 'var(--usb-accent)' },
  ];
  return (
    <div className="usb-stats-bar">
      {items.map(({ label, value, color }) => (
        <div className="usb-stat-card" key={label}>
          <span className="usb-stat-value" style={{ color }}>{value ?? 0}</span>
          <span className="usb-stat-label">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Composant Politique ────────────────────────────────────────────────────

function PolicyPanel({ deviceId, policy, onPolicyUpdated }) {
  const [form, setForm]       = useState(null);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');

  useEffect(() => {
    if (policy) {
      setForm({
        default_policy:        policy.default_policy || 'monitor',
        allow_unknown_devices: policy.allow_unknown_devices ?? false,
        max_device_size_gb:    policy.max_device_size_gb ?? '',
        block_auto_run:        policy.block_auto_run ?? true,
      });
    }
  }, [policy]);

  if (!form) return null;

  async function handleSave() {
    try {
      setSaving(true);
      setMsg('');
      await updateUSBPolicy(deviceId, {
        ...form,
        max_device_size_gb: form.max_device_size_gb === '' ? null : Number(form.max_device_size_gb),
      });
      setMsg('Politique sauvegardée ✓');
      onPolicyUpdated();
    } catch {
      setMsg('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="usb-policy-grid">
      <div className="usb-policy-field">
        <label>Politique par défaut</label>
        <div className="usb-policy-toggle">
          {Object.entries(POLICY_LABELS).map(([val, lbl]) => (
            <button
              key={val}
              className={`usb-toggle-btn ${form.default_policy === val ? 'active' : ''} policy-${val}`}
              onClick={() => setForm(f => ({ ...f, default_policy: val }))}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <div className="usb-policy-field">
        <label>Taille max (GB)</label>
        <input
          type="number"
          className="usb-input"
          placeholder="Illimitée"
          value={form.max_device_size_gb}
          min={0}
          onChange={e => setForm(f => ({ ...f, max_device_size_gb: e.target.value }))}
        />
      </div>

      <div className="usb-policy-field usb-policy-checks">
        <label className="usb-check-label">
          <input
            type="checkbox"
            checked={form.allow_unknown_devices}
            onChange={e => setForm(f => ({ ...f, allow_unknown_devices: e.target.checked }))}
          />
          Autoriser les périphériques inconnus
        </label>
        <label className="usb-check-label">
          <input
            type="checkbox"
            checked={form.block_auto_run}
            onChange={e => setForm(f => ({ ...f, block_auto_run: e.target.checked }))}
          />
          Bloquer l'AutoRun
        </label>
      </div>

      <div className="usb-policy-actions">
        <button className="btn-action btn-save" onClick={handleSave} disabled={saving}>
          {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
        {msg && <span className={`usb-msg ${msg.includes('Erreur') ? 'is-error' : 'is-ok'}`}>{msg}</span>}
      </div>
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function USBControl() {
  const { auth } = useAuth();

  const [devices,        setDevices]        = useState([]);
  const [selectedId,     setSelectedId]     = useState('');
  const [usbDevices,     setUsbDevices]     = useState([]);
  const [policy,         setPolicy]         = useState(null);
  const [history,        setHistory]        = useState([]);
  const [usbAlerts,      setUsbAlerts]      = useState([]);
  const [stats,          setStats]          = useState(null);
  const [tab,            setTab]            = useState('devices'); // devices | history | alerts | policy
  const [loading,        setLoading]        = useState(false);
  const [actionMsg,      setActionMsg]      = useState('');
  const [historyFilter,  setHistoryFilter]  = useState('');
  const [historyPage,    setHistoryPage]    = useState(1);
  const [alertsPage,     setAlertsPage]     = useState(1);
  const [devicesPage,    setDevicesPage]    = useState(1);
  const ITEMS = 10;

  // Charger la liste des machines
  useEffect(() => {
    if (!auth?.accessToken) return;
    getDevices().then(res => {
      setDevices(res.data || []);
    }).catch(() => {});
  }, [auth?.accessToken]);

  // Charger les données USB quand on change de machine
  const loadUSBData = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setActionMsg('');
    try {
      const [devRes, polRes, histRes, alertRes, statsRes] = await Promise.allSettled([
        getUSBDevices(id),
        getUSBPolicy(id),
        getUSBHistory(id),
        getUSBAlerts(id),
        getUSBStatistics(id),
      ]);
      setUsbDevices(devRes.status === 'fulfilled'   ? devRes.value.data   : []);
      setPolicy(    polRes.status === 'fulfilled'   ? polRes.value.data   : null);
      setHistory(   histRes.status === 'fulfilled'  ? histRes.value.data  : []);
      setUsbAlerts( alertRes.status === 'fulfilled' ? alertRes.value.data : []);
      setStats(     statsRes.status === 'fulfilled' ? statsRes.value.data : null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      setTab('devices');
      setHistoryPage(1);
      setAlertsPage(1);
      setDevicesPage(1);
      loadUSBData(selectedId);
    }
  }, [selectedId, loadUSBData]);

  // Auto-refresh toutes les 10s si un device est sélectionné
  useEffect(() => {
    if (!selectedId) return;
    const t = setInterval(() => loadUSBData(selectedId), 10000);
    return () => clearInterval(t);
  }, [selectedId, loadUSBData]);

  async function handleAllow(usbId) {
    try {
      await allowUSBDevice(usbId);
      setActionMsg('Périphérique autorisé ✓');
      loadUSBData(selectedId);
    } catch { setActionMsg('Erreur'); }
  }

  async function handleBlock(usbId) {
    try {
      await blockUSBDevice(usbId);
      setActionMsg('Périphérique bloqué ✓');
      loadUSBData(selectedId);
    } catch { setActionMsg('Erreur'); }
  }

  async function handleMarkAllRead() {
    try {
      await markAllUSBAlertRead(selectedId);
      setActionMsg('Alertes marquées comme lues ✓');
      loadUSBData(selectedId);
    } catch { setActionMsg('Erreur'); }
  }

  // Filtres & pagination
  const filteredHistory = historyFilter
    ? history.filter(h => h.event_type === historyFilter)
    : history;

  const pagedHistory  = filteredHistory.slice((historyPage - 1) * ITEMS, historyPage * ITEMS);
  const pagedAlerts   = usbAlerts.slice((alertsPage - 1) * ITEMS, alertsPage * ITEMS);
  const pagedDevices  = usbDevices.slice((devicesPage - 1) * ITEMS, devicesPage * ITEMS);
  const historyPages  = Math.ceil(filteredHistory.length / ITEMS);
  const alertsPages   = Math.ceil(usbAlerts.length / ITEMS);
  const devicesPages  = Math.ceil(usbDevices.length / ITEMS);

  const unreadCount = usbAlerts.filter(a => !a.is_read).length;

  return (
    <>
      <Header />
      <div className="dashboard-shell">
        <main className="dashboard-main">

          {/* Hero */}
          <section className="hero-panel">
            <div className="hero-copy-block">
              <h2>Contrôle USB</h2>
              <p className="hero-copy">Surveillance et gestion des périphériques amovibles</p>
            </div>
          </section>

          {/* Sélecteur de machine */}
          <section className="table-panel usb-selector-panel">
            <div className="panel-heading">
              <h3>Machine cible</h3>
            </div>
            <div className="usb-device-select-wrap">
              <select
                className="usb-select"
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
              >
                <option value="">— Sélectionner une machine —</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.ip_address ? `(${d.ip_address})` : ''}
                  </option>
                ))}
              </select>
              {selectedId && (
                <button
                  className="btn-action btn-refresh"
                  onClick={() => loadUSBData(selectedId)}
                  disabled={loading}
                >
                  {loading ? '…' : '↻ Actualiser'}
                </button>
              )}
            </div>
            {actionMsg && (
              <p className={`usb-msg ${actionMsg.includes('Erreur') ? 'is-error' : 'is-ok'}`}>
                {actionMsg}
              </p>
            )}
          </section>

          {/* Contenu principal */}
          {selectedId && (
            <>
              {/* Stats */}
              <section className="table-panel usb-stats-panel">
                <StatsBar stats={stats} />
              </section>

              {/* Onglets */}
              <section className="table-panel usb-tabs-panel">
                <div className="usb-tabs">
                  {[
                    { key: 'devices', label: 'Périphériques', count: usbDevices.length },
                    { key: 'history', label: 'Historique',    count: history.length },
                    { key: 'alerts',  label: 'Alertes',       count: unreadCount || usbAlerts.length, badge: unreadCount > 0 },
                    { key: 'policy',  label: 'Politique',     count: null },
                  ].map(({ key, label, count, badge }) => (
                    <button
                      key={key}
                      className={`usb-tab ${tab === key ? 'active' : ''}`}
                      onClick={() => setTab(key)}
                    >
                      {label}
                      {count !== null && (
                        <span className={`tab-count ${badge ? 'tab-count-alert' : ''}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {loading && <div className="empty-state">Chargement…</div>}

                {/* ── Onglet Périphériques ── */}
                {!loading && tab === 'devices' && (
                  <>
                    {usbDevices.length === 0 ? (
                      <div className="empty-state">Aucun périphérique USB détecté</div>
                    ) : (
                      <>
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Nom</th>
                                <th>Numéro de série</th>
                                <th>Taille</th>
                                <th>Point de montage</th>
                                <th>Statut</th>
                                <th>Confiance</th>
                                <th>Dernière connexion</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pagedDevices.map(usb => (
                                <tr key={usb.id}>
                                  <td><strong>{usb.name || '—'}</strong></td>
                                  <td><code className="usb-serial">{usb.serial_number || '—'}</code></td>
                                  <td>{formatSize(usb.size_bytes)}</td>
                                  <td>{usb.mount_point || '—'}</td>
                                  <td>
                                    <span className={getUSBStatusClass(usb.status)}>
                                      {getUSBStatusLabel(usb.status)}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`trust-badge ${usb.is_trusted ? 'is-trusted' : 'is-untrusted'}`}>
                                      {usb.is_trusted ? '✓ Fiable' : '✗ Inconnu'}
                                    </span>
                                  </td>
                                  <td>{formatDate(usb.last_connected)}</td>
                                  <td>
                                    <div className="usb-actions">
                                      {usb.status !== 'blocked' ? (
                                        <button
                                          className="btn-action btn-block-sm"
                                          onClick={() => handleBlock(usb.id)}
                                        >
                                          Bloquer
                                        </button>
                                      ) : (
                                        <button
                                          className="btn-action btn-allow-sm"
                                          onClick={() => handleAllow(usb.id)}
                                        >
                                          Autoriser
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {devicesPages > 1 && (
                          <Pagination page={devicesPage} total={devicesPages} onChange={setDevicesPage} />
                        )}
                      </>
                    )}
                  </>
                )}

                {/* ── Onglet Historique ── */}
                {!loading && tab === 'history' && (
                  <>
                    <div className="usb-history-filters">
                      <select
                        className="usb-select usb-select-sm"
                        value={historyFilter}
                        onChange={e => { setHistoryFilter(e.target.value); setHistoryPage(1); }}
                      >
                        <option value="">Tous les événements</option>
                        <option value="connected">Connexion</option>
                        <option value="disconnected">Déconnexion</option>
                        <option value="blocked">Bloqué</option>
                        <option value="allowed">Autorisé</option>
                        <option value="read">Lecture</option>
                        <option value="write">Écriture</option>
                        <option value="eject">Éjection</option>
                      </select>
                      <span className="usb-filter-count">{filteredHistory.length} événement(s)</span>
                    </div>

                    {pagedHistory.length === 0 ? (
                      <div className="empty-state">Aucun événement trouvé</div>
                    ) : (
                      <>
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Événement</th>
                                <th>Périphérique USB</th>
                                <th>Date</th>
                                <th>Utilisateur</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pagedHistory.map(h => (
                                <tr key={h.id}>
                                  <td>
                                    <span className="usb-event-type">
                                      <span className="usb-event-icon">{getEventIcon(h.event_type)}</span>
                                      {h.event_type}
                                    </span>
                                  </td>
                                  <td>{h.usb_device_name || '—'}</td>
                                  <td>{formatDate(h.created_at)}</td>
                                  <td>{h.user_info || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {historyPages > 1 && (
                          <Pagination page={historyPage} total={historyPages} onChange={setHistoryPage} />
                        )}
                      </>
                    )}
                  </>
                )}

                {/* ── Onglet Alertes ── */}
                {!loading && tab === 'alerts' && (
                  <>
                    <div className="usb-alerts-header">
                      {unreadCount > 0 && (
                        <button className="btn-action btn-mark-read" onClick={handleMarkAllRead}>
                          Tout marquer comme lu ({unreadCount})
                        </button>
                      )}
                    </div>

                    {pagedAlerts.length === 0 ? (
                      <div className="empty-state">Aucune alerte USB</div>
                    ) : (
                      <>
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Message</th>
                                <th>Sévérité</th>
                                <th>Périphérique</th>
                                <th>Date</th>
                                <th>Lu</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pagedAlerts.map(a => (
                                <tr key={a.id} className={!a.is_read ? 'usb-alert-unread' : ''}>
                                  <td>{a.message}</td>
                                  <td>
                                    <span className={getSeverityClass(a.severity)}>
                                      {a.severity}
                                    </span>
                                  </td>
                                  <td>{a.usb_device_name || '—'}</td>
                                  <td>{formatDate(a.created_at)}</td>
                                  <td>{a.is_read ? '✓' : <span className="unread-dot" />}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {alertsPages > 1 && (
                          <Pagination page={alertsPage} total={alertsPages} onChange={setAlertsPage} />
                        )}
                      </>
                    )}
                  </>
                )}

                {/* ── Onglet Politique ── */}
                {!loading && tab === 'policy' && (
                  <PolicyPanel
                    deviceId={selectedId}
                    policy={policy}
                    onPolicyUpdated={() => loadUSBData(selectedId)}
                  />
                )}
              </section>
            </>
          )}

          {!selectedId && (
            <section className="table-panel">
              <div className="empty-state usb-empty-hint">
                Sélectionnez une machine pour afficher ses données USB
              </div>
            </section>
          )}

        </main>
      </div>
    </>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────

function Pagination({ page, total, onChange }) {
  return (
    <div className="pagination-controls">
      <button
        className="btn-pagination"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
      >&lt;</button>
      <span className="pagination-info">{page} / {total}</span>
      <button
        className="btn-pagination"
        onClick={() => onChange(page + 1)}
        disabled={page >= total}
      >&gt;</button>
    </div>
  );
}