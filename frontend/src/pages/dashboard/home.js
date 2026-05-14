import { useEffect, useState, useMemo } from 'react';
import "./home.css";
import { useAuth } from "../../context/AuthContext";
import Header from "../../components/Header";
import { getDevices } from "../../services/deviceService";
import { executeCommand, getCommandHistory } from "../../services/commandService";

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getStatusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'online') return 'status-pill is-online';
  return 'status-pill is-offline';
}

function getCommandStatusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'success') return 'command-badge is-success';
  if (['error', 'timeout', 'exception'].includes(s)) return 'command-badge is-error';
  return 'command-badge is-pending';
}

function getCommandStatusLabel(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'success') return 'Succès';
  if (s === 'error') return 'Erreur';
  if (s === 'timeout') return 'Timeout';
  if (s === 'exception') return 'Exception';
  if (s === 'running') return 'En cours';
  return 'En attente';
}

function getCommandOutput(item) {
  if (!item) return '';
  return item.stderr || item.stdout || 'Aucun retour pour le moment.';
}

export default function Home() {

  const { auth } = useAuth();
  const [machines, setMachines] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCommandModalOpen, setIsCommandModalOpen] = useState(false);
  const [targetMode, setTargetMode] = useState('all');
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [command, setCommand] = useState('');
  const [commandError, setCommandError] = useState('');
  const [isCommandSubmitting, setIsCommandSubmitting] = useState(false);
  const [commandResultIds, setCommandResultIds] = useState([]);
  const [commandResults, setCommandResults] = useState([]);
  const [isCommandPolling, setIsCommandPolling] = useState(false);

  useEffect(() => {
    if (!auth?.accessToken) return;

    let interval;

    async function load() {
      try {
        setIsLoading(true);
        setError('');
        const res = await getDevices();
        setMachines(res.data);
      } catch (err) {
        setError("Impossible de charger les données");
      } finally {
        setIsLoading(false);
      }
    }
    load();
    interval = setInterval(load, 10000);
    return () => clearInterval(interval);

  }, [auth?.accessToken]);

  useEffect(() => {
    if (!auth?.accessToken || commandResultIds.length === 0) return;

    let isMounted = true;
    let interval;
    const terminalStatuses = ['success', 'error', 'timeout', 'exception'];

    async function loadCommandResults() {
      try {
        const res = await getCommandHistory({
          commandIds: commandResultIds,
          limit: commandResultIds.length,
        });
        if (!isMounted) return;

        const results = res.data.results || [];
        setCommandResults(results);

        const isComplete =
          results.length === commandResultIds.length &&
          results.every(item => terminalStatuses.includes(String(item.status || '').toLowerCase()));

        setIsCommandPolling(!isComplete);
        if (isComplete && interval) {
          clearInterval(interval);
        }
      } catch (err) {
        if (!isMounted) return;
        setCommandError("Impossible de récupérer les résultats de la commande");
        setIsCommandPolling(false);
        if (interval) clearInterval(interval);
      }
    }

    setIsCommandPolling(true);
    loadCommandResults();
    interval = setInterval(loadCommandResults, 2000);

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [auth?.accessToken, commandResultIds]);

  const stats = useMemo(() => {
    const total = machines.length;
    const online = machines.filter(m => m.status === "online").length;
    const offline = machines.filter(m => m.status === "offline").length;
    const health = total === 0
      ? 100
      : Math.round((online / total) * 100);
    return { total, online, offline, health };

  }, [machines]);

  const selectedMachine = useMemo(
    () => machines.find(machine => String(machine.id) === String(selectedMachineId)),
    [machines, selectedMachineId]
  );

  async function handleCommandSubmit(event) {
    event.preventDefault();
    setCommandError('');

    const trimmedCommand = command.trim();
    if (!trimmedCommand) {
      setCommandError('Veuillez saisir une commande.');
      return;
    }

    if (targetMode === 'specific' && !selectedMachine?.mac_address) {
      setCommandError('Veuillez sélectionner une machine valide.');
      return;
    }

    try {
      setIsCommandSubmitting(true);
      setCommandResults([]);
      setCommandResultIds([]);

      const res = await executeCommand({
        command: trimmedCommand,
        macAddress: targetMode === 'specific' ? selectedMachine.mac_address : '',
      });

      setCommandResultIds(res.data.command_ids || []);
    } catch (err) {
      setCommandError(
        err.response?.data?.detail ||
        "Impossible de lancer l'exécution de la commande"
      );
    } finally {
      setIsCommandSubmitting(false);
    }
  }

  function closeCommandModal() {
    setIsCommandModalOpen(false);
    setCommandError('');
  }

  return (
    <>
      <Header />

      <div className="dashboard-shell">
        <main className="dashboard-main">
          <section className="hero-panel hero-panel--split">

            <div className="hero-copy-block">
              <h2>Surveillance centralisée du parc informatique</h2>

              <p className="hero-copy">
                Visualisation temps réel de votre infrastructure
              </p>

              <div className="hero-actions">
                <span className="welcome-chip">
                  Bienvenue, {auth?.username || "Utilisateur"}
                </span>
                <button
                  type="button"
                  className="remote-command-trigger"
                  onClick={() => setIsCommandModalOpen(true)}
                >
                  Remote Command
                </button>
              </div>
            </div>

            <aside className="hero-sidecard">
              <span className="section-label">Health Overview</span>

              <div className="hero-score">
                <strong>{stats.health}%</strong>
                <span>Disponibilité globale</span>
              </div>

              <div className="hero-sidecard__grid">
                <div><span>Total</span><strong>{stats.total}</strong></div>
                <div><span>Online</span><strong>{stats.online}</strong></div>
                <div><span>Offline</span><strong>{stats.offline}</strong></div>
              </div>

            </aside>

          </section>

          <section className="remote-command-panel">
            <div>
              <span className="section-label">Remote Command</span>
              <h3>Exécuter une commande à distance</h3>
              <p>Déploiement ciblé ou global sur les agents actifs du parc.</p>
            </div>
            <button
              type="button"
              className="remote-command-trigger"
              onClick={() => setIsCommandModalOpen(true)}
            >
              Ouvrir la console
            </button>
          </section>

          <section className="dashboard-columns">
            <article className="table-panel">
              <div className="panel-heading">
                <h3>Machines récentes</h3>
              </div>
              {error && <p className="error-feedback">{error}</p>}
              {isLoading ? (
                <div className="empty-state">Chargement...</div>
              ) : machines.length === 0 ? (
                <div className="empty-state">Aucune machine trouvée</div>
              ) : (
                <div className="table-wrap">
                  <table>

                    <thead>
                      <tr>
                        <th>Machine</th>
                        <th>IP</th>
                        <th>Statut</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {machines.slice(0, 6).map(m => (
                        <tr key={m.id}>
                          <td><strong>{m.name}</strong></td>
                          <td>{m.ip_address || "—"}</td>
                          <td>
                            <span className={getStatusClass(m.status)}>
                              {m.status}
                            </span>
                          </td>
                          <td>{formatDate(m.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          </section>
        </main>
      </div>

      {isCommandModalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeCommandModal}>
          <div
            className="command-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remote-command-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="command-modal__header">
              <div>
                <span className="section-label">Console distante</span>
                <h3 id="remote-command-title">Remote Command</h3>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={closeCommandModal}
                aria-label="Fermer la modale"
              >
                x
              </button>
            </div>

            <form className="command-form" onSubmit={handleCommandSubmit}>
              <div className="target-toggle" role="radiogroup" aria-label="Cible de commande">
                <label className={targetMode === 'all' ? 'is-active' : ''}>
                  <input
                    type="radio"
                    name="targetMode"
                    value="all"
                    checked={targetMode === 'all'}
                    onChange={() => setTargetMode('all')}
                  />
                  Toutes les machines
                </label>
                <label className={targetMode === 'specific' ? 'is-active' : ''}>
                  <input
                    type="radio"
                    name="targetMode"
                    value="specific"
                    checked={targetMode === 'specific'}
                    onChange={() => setTargetMode('specific')}
                  />
                  Machine spécifique
                </label>
              </div>

              {targetMode === 'specific' && (
                <label className="command-field">
                  <span>Machine</span>
                  <select
                    value={selectedMachineId}
                    onChange={(event) => setSelectedMachineId(event.target.value)}
                  >
                    <option value="">Sélectionner une machine</option>
                    {machines.map(machine => (
                      <option key={machine.id} value={machine.id}>
                        {machine.name} {machine.ip_address ? `- ${machine.ip_address}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="command-field">
                <span>Commande</span>
                <textarea
                  className="console-textarea"
                  value={command}
                  onChange={(event) => setCommand(event.target.value)}
                  placeholder="ipconfig /all"
                  rows={6}
                />
              </label>

              {commandError && <p className="error-feedback command-feedback">{commandError}</p>}

              <button
                type="submit"
                className="command-submit"
                disabled={isCommandSubmitting || isCommandPolling}
              >
                {isCommandSubmitting ? "Envoi..." : "Lancer l'exécution"}
              </button>
            </form>

            {(commandResults.length > 0 || isCommandPolling) && (
              <div className="command-results">
                <div className="command-results__heading">
                  <h4>Résumé d'exécution</h4>
                  {isCommandPolling && <span>Actualisation en temps réel...</span>}
                </div>

                {commandResults.length === 0 ? (
                  <div className="empty-state compact">En attente des agents...</div>
                ) : (
                  commandResults.map(item => (
                    <article key={item.id} className="command-result-item">
                      <div className="command-result-item__top">
                        <strong>{item.device_name || 'Machine'}</strong>
                        <span className={getCommandStatusClass(item.status)}>
                          {getCommandStatusLabel(item.status)}
                        </span>
                      </div>
                      <pre>{getCommandOutput(item)}</pre>
                    </article>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
