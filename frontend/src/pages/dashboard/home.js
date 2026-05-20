import { useEffect, useState, useMemo } from 'react';
import "./home.css";
import { useAuth } from "../../context/AuthContext";
import Header from "../../components/Header";
import { getDevices } from "../../services/deviceService";
import { cancelCommand, executeCommand, getCommandHistory, installSoftware } from "../../services/commandService";

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
  if (s === 'cancelled') return 'command-badge is-error';
  return 'command-badge is-pending';
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
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [targetMode, setTargetMode] = useState('all');
  const [selectedMachineId, setSelectedMachineId] = useState('');
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
  const [installTargetMode, setInstallTargetMode] = useState('specific');
  const [installMachineId, setInstallMachineId] = useState('');
  const [packageManager, setPackageManager] = useState('winget');
  const [packageName, setPackageName] = useState('');
  const [packageVersion, setPackageVersion] = useState('');
  const [installerPath, setInstallerPath] = useState('');
  const [installTimeout, setInstallTimeout] = useState(600);
  const [installError, setInstallError] = useState('');
  const [isInstallSubmitting, setIsInstallSubmitting] = useState(false);
  const [installResultIds, setInstallResultIds] = useState([]);
  const [installResults, setInstallResults] = useState([]);
  const [isInstallPolling, setIsInstallPolling] = useState(false);
  const [isCancellingInstall, setIsCancellingInstall] = useState(false);

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

  useEffect(() => {
    if (!auth?.accessToken || installResultIds.length === 0) return;

    let isMounted = true;
    let interval;
    const terminalStatuses = ['success', 'error', 'timeout', 'exception', 'cancelled'];

    async function loadInstallResults() {
      try {
        const res = await getCommandHistory({
          commandIds: installResultIds,
          limit: installResultIds.length,
          category: 'software_install',
        });
        if (!isMounted) return;

        const results = res.data.results || [];
        setInstallResults(results);

        const isComplete =
          results.length === installResultIds.length &&
          results.every(item => terminalStatuses.includes(String(item.status || '').toLowerCase()));

        setIsInstallPolling(!isComplete);
        if (isComplete && interval) {
          clearInterval(interval);
        }
      } catch (err) {
        if (!isMounted) return;
        setInstallError("Impossible de récupérer les logs d'installation");
        setIsInstallPolling(false);
        if (interval) clearInterval(interval);
      }
    }

    setIsInstallPolling(true);
    loadInstallResults();
    interval = setInterval(loadInstallResults, 2500);

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [auth?.accessToken, installResultIds]);

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

  const selectedInstallMachine = useMemo(
    () => machines.find(machine => String(machine.id) === String(installMachineId)),
    [machines, installMachineId]
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

  async function handleInstallSubmit(event) {
    event.preventDefault();
    setInstallError('');

    const usesInstallerPath = ['msi', 'exe'].includes(packageManager);
    if (!usesInstallerPath && !packageName.trim()) {
      setInstallError('Veuillez saisir le nom du paquet.');
      return;
    }
    if (usesInstallerPath && !installerPath.trim()) {
      setInstallError("Veuillez saisir le chemin de l'installateur.");
      return;
    }
    if (installTargetMode === 'specific' && !selectedInstallMachine?.mac_address) {
      setInstallError('Veuillez sélectionner une machine valide.');
      return;
    }

    try {
      setIsInstallSubmitting(true);
      setInstallResults([]);
      setInstallResultIds([]);

      const res = await installSoftware({
        packageManager,
        packageName: packageName.trim(),
        packageVersion: packageVersion.trim(),
        installerPath: installerPath.trim(),
        macAddress: installTargetMode === 'specific' ? selectedInstallMachine.mac_address : '',
        timeout: parseInt(installTimeout),
      });

      setInstallResultIds(res.data.command_ids || []);
    } catch (err) {
      setInstallError(
        err.response?.data?.detail ||
        "Impossible de lancer l'installation"
      );
    } finally {
      setIsInstallSubmitting(false);
    }
  }

  async function handleCancelInstall() {
    if (installResultIds.length === 0) return;

    try {
      setIsCancellingInstall(true);
      const results = await Promise.allSettled(installResultIds.map(commandId => cancelCommand(commandId)));
      const rejected = results.filter(result => result.status === 'rejected');
      if (rejected.length === results.length) {
        throw rejected[0].reason;
      }
    } catch (err) {
      setInstallError(
        err.response?.data?.detail ||
        "Impossible d'annuler l'installation"
      );
    } finally {
      setIsCancellingInstall(false);
    }
  }

  function closeCommandModal() {
    setIsCommandModalOpen(false);
    setCommandError('');
  }

  function closeInstallModal() {
    setIsInstallModalOpen(false);
    setInstallError('');
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
                <button
                  type="button"
                  className="remote-command-trigger"
                  onClick={() => setIsInstallModalOpen(true)}
                >
                  Software Install
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
              <p>Console libre réservée aux opérations avancées.</p>
            </div>
            <button
              type="button"
              className="remote-command-trigger"
              onClick={() => setIsCommandModalOpen(true)}
            >
              Ouvrir la console
            </button>
          </section>

          <section className="remote-command-panel">
            <div>
              <span className="section-label">Software Install</span>
              <h3>Installer un logiciel</h3>
              <p>Installation guidée par paquet, version, cible, statut et logs.</p>
            </div>
            <button
              type="button"
              className="remote-command-trigger"
              onClick={() => setIsInstallModalOpen(true)}
            >
              Ouvrir l'installation
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

      {isInstallModalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeInstallModal}>
          <div
            className="command-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="software-install-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="command-modal__header">
              <div>
                <span className="section-label">Installation guidée</span>
                <h3 id="software-install-title">Software Install</h3>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={closeInstallModal}
                aria-label="Fermer la modale"
              >
                x
              </button>
            </div>

            <form className="install-form" onSubmit={handleInstallSubmit}>
              <div className="target-toggle" role="radiogroup" aria-label="Cible installation">
                <label className={installTargetMode === 'specific' ? 'is-active' : ''}>
                  <input
                    type="radio"
                    name="installTargetMode"
                    value="specific"
                    checked={installTargetMode === 'specific'}
                    onChange={() => setInstallTargetMode('specific')}
                  />
                  Machine spécifique
                </label>
                <label className={installTargetMode === 'all' ? 'is-active' : ''}>
                  <input
                    type="radio"
                    name="installTargetMode"
                    value="all"
                    checked={installTargetMode === 'all'}
                    onChange={() => setInstallTargetMode('all')}
                  />
                  Toutes les machines
                </label>
              </div>

              {installTargetMode === 'specific' && (
                <label className="command-field">
                  <span>Machine</span>
                  <select
                    value={installMachineId}
                    onChange={(event) => setInstallMachineId(event.target.value)}
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

              <div className="command-field-row">
                <label className="command-field">
                  <span>Source</span>
                  <select
                    value={packageManager}
                    onChange={(event) => setPackageManager(event.target.value)}
                  >
                    <option value="winget">winget</option>
                    <option value="pip">pip</option>
                    <option value="npm">npm global</option>
                    <option value="msi">MSI local</option>
                    <option value="exe">EXE local</option>
                  </select>
                </label>

                <label className="command-field">
                  <span>Timeout</span>
                  <input
                    type="number"
                    value={installTimeout}
                    onChange={(event) => setInstallTimeout(Math.max(30, Math.min(7200, parseInt(event.target.value) || 600)))}
                    min="30"
                    max="7200"
                  />
                </label>
              </div>

              {['msi', 'exe'].includes(packageManager) ? (
                <>
                  <label className="command-field">
                    <span>Chemin installateur</span>
                    <input
                      type="text"
                      value={installerPath}
                      onChange={(event) => setInstallerPath(event.target.value)}
                      placeholder="C:\\Temp\\setup.msi"
                    />
                  </label>
                  <label className="command-field">
                    <span>Nom affiché</span>
                    <input
                      type="text"
                      value={packageName}
                      onChange={(event) => setPackageName(event.target.value)}
                      placeholder="Nom logiciel"
                    />
                  </label>
                </>
              ) : (
                <div className="command-field-row">
                  <label className="command-field">
                    <span>Paquet</span>
                    <input
                      type="text"
                      value={packageName}
                      onChange={(event) => setPackageName(event.target.value)}
                      placeholder={packageManager === 'winget' ? 'Google.Chrome' : 'package-name'}
                    />
                  </label>
                  <label className="command-field">
                    <span>Version</span>
                    <input
                      type="text"
                      value={packageVersion}
                      onChange={(event) => setPackageVersion(event.target.value)}
                      placeholder="Optionnel"
                    />
                  </label>
                </div>
              )}

              {installError && (
                <p className="error-feedback command-feedback">{installError}</p>
              )}

              <div className="install-actions">
                <button
                  type="submit"
                  className="command-submit"
                  disabled={isInstallSubmitting || isInstallPolling}
                >
                  {isInstallSubmitting ? "Lancement..." : "Installer"}
                </button>
                {isInstallPolling && (
                  <button
                    type="button"
                    className="console-cancel-btn"
                    onClick={handleCancelInstall}
                    disabled={isCancellingInstall}
                  >
                    {isCancellingInstall ? "Annulation..." : "Cancel"}
                  </button>
                )}
              </div>
            </form>

            {(installResults.length > 0 || isInstallPolling) && (
              <div className="install-results">
                <div className="command-results__heading">
                  <h4>Statut et logs</h4>
                  {isInstallPolling && <span>Installation en cours...</span>}
                </div>
                {installResults.map(item => (
                  <div key={item.id} className="command-result-item">
                    <div className="command-result-item__top">
                      <div>
                        <strong>{item.device_name || 'Machine'}</strong>
                        <span className="install-package-meta">
                          {item.package_manager} {item.package_name}
                          {item.package_version ? ` ${item.package_version}` : ''}
                        </span>
                      </div>
                      <span className={getCommandStatusClass(item.status)}>
                        {getCommandStatusLabel(item.status)}
                      </span>
                    </div>
                    <pre>{getCommandOutput(item)}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
                <select
                  className="console-option-select"
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
