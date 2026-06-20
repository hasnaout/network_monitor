import { useEffect, useState, useMemo } from 'react';
import "./home.css";
import { useAuth } from "../../context/AuthContext";
import Header from "../../components/Header";
import { getDevices } from "../../services/deviceService";
import { cancelCommand, executeCommand, getCommandHistory } from "../../services/commandService";

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

function getCommandStatusLabel(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'success') return 'Succès';
  if (s === 'error') return 'Erreur';
  if (s === 'timeout') return 'Timeout';
  if (s === 'exception') return 'Exception';
  if (s === 'cancelled') return 'Annulée';
  if (s === 'running') return 'En cours';
  return 'En attente';
}

function getCommandOutput(item) {
  if (!item) return '';
  return item.stderr || item.stdout || 'Aucun retour pour le moment.';
}

function formatPrompt(path) {
  const normalizedPath = String(path || '').trim();
  if (!normalizedPath) return 'C:\\>';
  return normalizedPath.endsWith('>') ? normalizedPath : `${normalizedPath}>`;
}

export default function Home() {

  const { auth } = useAuth();
  const [machines, setMachines] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCommandModalOpen, setIsCommandModalOpen] = useState(false);
  const [targetMode, setTargetMode] = useState('all');
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [selectedMachineSearch, setSelectedMachineSearch] = useState('');
  const [isMachinePickerOpen, setIsMachinePickerOpen] = useState(false);
  const [command, setCommand] = useState('');
  const [shell, setShell] = useState('cmd');
  const [timeout, setTimeout] = useState(30);
  const [commandError, setCommandError] = useState('');
  const [isCommandSubmitting, setIsCommandSubmitting] = useState(false);
  const [commandResultIds, setCommandResultIds] = useState([]);
  const [commandResults, setCommandResults] = useState([]);
  const [isCommandPolling, setIsCommandPolling] = useState(false);
  const [isCancellingCommand, setIsCancellingCommand] = useState(false);
  const [consoleHistory, setConsoleHistory] = useState([]);
  const [currentPath, setCurrentPath] = useState('C:\\>');

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
    const terminalStatuses = ['success', 'error', 'timeout', 'exception', 'cancelled'];

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

        const latestDirectory = [...results]
          .reverse()
          .find(item => item.working_directory)?.working_directory;
        if (latestDirectory) {
          setCurrentPath(formatPrompt(latestDirectory));
        }

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

  const filteredMachines = useMemo(() => {
    const query = selectedMachineSearch.trim().toLowerCase();
    if (!query) return machines.slice(0, 5);

    return machines
      .filter(machine => {
        const searchable = [
          machine.name,
          machine.hostname,
          machine.ip_address,
          machine.mac_address,
          machine.status,
        ].filter(Boolean).join(' ').toLowerCase();

        return searchable.includes(query);
      })
      .slice(0, 8);
  }, [machines, selectedMachineSearch]);

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

    const historyEntry = {
      type: 'command',
      prompt: currentPath,
      command: trimmedCommand,
      shell: shell,
      timestamp: new Date(),
    };
    setConsoleHistory(prev => [...prev, historyEntry]);

    try {
      setIsCommandSubmitting(true);
      setCommandResults([]);
      setCommandResultIds([]);

      const res = await executeCommand({
        command: trimmedCommand,
        macAddress: targetMode === 'specific' ? selectedMachine.mac_address : '',
        shell: shell,
        timeout: parseInt(timeout),
      });

      setCommandResultIds(res.data.command_ids || []);

      setCommand('');
    } catch (err) {
      setCommandError(
        err.response?.data?.detail ||
        "Impossible de lancer l'exécution de la commande"
      );
      setConsoleHistory(prev => [...prev, {
        type: 'error',
        message: err.response?.data?.detail || "Erreur d'exécution",
        timestamp: new Date(),
      }]);
    } finally {
      setIsCommandSubmitting(false);
    }
  }

  async function handleCancelCommand() {
    if (commandResultIds.length === 0) return;

    try {
      setIsCancellingCommand(true);
      const results = await Promise.allSettled(commandResultIds.map(commandId => cancelCommand(commandId)));
      const rejected = results.filter(result => result.status === 'rejected');
      if (rejected.length === results.length) {
        throw rejected[0].reason;
      }
      setConsoleHistory(prev => [...prev, {
        type: 'info',
        message: "Demande d'annulation envoyée.",
        timestamp: new Date(),
      }]);
    } catch (err) {
      setCommandError(
        err.response?.data?.detail ||
        "Impossible d'annuler la commande"
      );
    } finally {
      setIsCancellingCommand(false);
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

            <div className="console-panel-options">
              <div className="target-toggle" role="radiogroup" aria-label="Cible de commande">
                <label className={targetMode === 'all' ? 'is-active' : ''}>
                  <input
                    type="radio"
                    name="targetMode"
                    value="all"
                    checked={targetMode === 'all'}
                    onChange={() => {
                      setTargetMode('all');
                      setSelectedMachineId('');
                      setSelectedMachineSearch('');
                      setIsMachinePickerOpen(false);
                    }}
                  />
                  Toutes les machines
                </label>
                <label className={targetMode === 'specific' ? 'is-active' : ''}>
                  <input
                    type="radio"
                    name="targetMode"
                    value="specific"
                    checked={targetMode === 'specific'}
                    onChange={() => {
                      setTargetMode('specific');
                      setIsMachinePickerOpen(false);
                    }}
                  />
                  Machine spécifique
                </label>
              </div>

              {targetMode === 'specific' && (
                <div className="machine-search">
                  <input
                    type="text"
                    className="console-option-input machine-search__input"
                    value={selectedMachineSearch}
                    onChange={(event) => {
                      setSelectedMachineSearch(event.target.value);
                      setSelectedMachineId('');
                      setIsMachinePickerOpen(true);
                    }}
                    onFocus={() => setIsMachinePickerOpen(true)}
                    placeholder="Chercher une machine..."
                  />

                  {isMachinePickerOpen && (
                    <div className="machine-search__list">
                      {filteredMachines.length === 0 ? (
                        <div className="machine-search__empty">Aucune machine trouvée</div>
                      ) : (
                        filteredMachines.map(machine => (
                          <button
                            type="button"
                            key={machine.id}
                            className="machine-search__item"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setSelectedMachineId(machine.id);
                              setSelectedMachineSearch(machine.name || '');
                              setIsMachinePickerOpen(false);
                            }}
                          >
                            <strong>{machine.name}</strong>
                            <span>
                              {machine.hostname ? `${machine.hostname} - ` : ''}
                              {machine.ip_address || 'IP inconnue'}
                              {machine.status ? ` - ${machine.status}` : ''}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              <select
                className="console-option-select"
                value={shell}
                onChange={(event) => setShell(event.target.value)}
              >
                <option value="cmd">cmd.exe</option>
                <option value="powershell">powershell.exe</option>
              </select>

              <input
                type="number"
                className="console-option-input"
                value={timeout}
                onChange={(event) => setTimeout(Math.max(1, Math.min(1200, parseInt(event.target.value) || 30)))}
                min="1"
                max="1200"
                placeholder="Timeout (s)"
                title="Timeout en secondes (1-1200)"
              />
            </div>

            <div className="console-emulator">
              <div className="console-content">
                {consoleHistory.map((entry, idx) => {
                  if (entry.type === 'command') {
                    return (
                      <div key={idx} className="console-line">
                        <span className="console-prompt">{entry.prompt}</span>
                        <span className="console-command">{entry.command}</span>
                      </div>
                    );
                  } else if (entry.type === 'error') {
                    return (
                      <div key={idx} className="console-line console-error-line">
                        <span className="console-error-text">Erreur: {entry.message}</span>
                      </div>
                    );
                  } else if (entry.type === 'info') {
                    return (
                      <div key={idx} className="console-line console-info">
                        <span>{entry.message}</span>
                      </div>
                    );
                  }
                  return null;
                })}

                {(commandResults.length > 0 || isCommandPolling) && (
                  <div className="console-results-section">
                    {isCommandPolling && (
                      <div className="console-line console-info">
                        <span>Attente des resultats des agents...</span>
                      </div>
                    )}

                    {commandResults.map(item => (
                      <div key={item.id} className="console-result-block">
                        <div className="console-line console-result-header">
                          <span className="console-result-device">[{item.device_name || 'Machine'}] [{item.shell || 'cmd'}]</span>
                          <span className={`console-result-status console-status-${item.status}`}>
                            {getCommandStatusLabel(item.status)}
                          </span>
                        </div>
                        {item.working_directory && (
                          <div className="console-line console-info">
                            <span>{formatPrompt(item.working_directory)}</span>
                          </div>
                        )}
                        <div className="console-result-output">
                          {getCommandOutput(item).split('\n').map((line, i) => (
                            <div key={i} className="console-line">
                              <span className="console-output">{line}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {commandError && (
                  <div className="console-line console-error-line">
                    <span className="console-error-text">{commandError}</span>
                  </div>
                )}
              </div>

              <form className="console-input-form" onSubmit={handleCommandSubmit}>
                <div className="console-input-line">
                  <span className="console-prompt">{currentPath}</span>
                  <input
                    type="text"
                    className="console-input"
                    value={command}
                    onChange={(event) => setCommand(event.target.value)}
                    placeholder="Tapez votre commande..."
                    disabled={isCommandSubmitting || isCommandPolling}
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="console-submit-btn"
                  disabled={isCommandSubmitting || isCommandPolling}
                >
                  {isCommandSubmitting ? "Envoi..." : "Executer"}
                </button>
                {isCommandPolling && (
                  <button
                    type="button"
                    className="console-cancel-btn"
                    onClick={handleCancelCommand}
                    disabled={isCancellingCommand}
                  >
                    {isCancellingCommand ? "Annulation..." : "Cancel"}
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
