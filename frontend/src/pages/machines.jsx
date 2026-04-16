import { useEffect, useState } from 'react';

import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const initialForm = {
  name: '',
  ip: '',
  location: '',
  status: 'Offline',
  description: '',
};

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getStatusClass(status) {
  if (status === 'Online') {
    return 'status-pill is-online';
  }

  if (status === 'Maintenance') {
    return 'status-pill is-maintenance';
  }

  return 'status-pill is-offline';
}

export default function MachinesPage({ auth, onLogout, onSessionExpired, route }) {
  const [form, setForm] = useState(initialForm);
  const [machines, setMachines] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadMachines() {
      setIsLoading(true);
      setLoadError('');

      try {
        const response = await fetch(`${API_URL}/machines`, {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
          signal: controller.signal,
        });

        if (response.status === 401) {
          onSessionExpired();
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || 'Impossible de charger les machines');
        }

        setMachines(data.items || []);
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }

        if (err instanceof TypeError) {
          setLoadError("Impossible de joindre le backend. Demarre l'API sur http://127.0.0.1:8000.");
        } else {
          setLoadError(err.message);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadMachines();

    return () => controller.abort();
  }, [auth.accessToken, onSessionExpired]);

  const totalMachines = machines.length;
  const onlineMachines = machines.filter((machine) => machine.status === 'Online').length;
  const maintenanceMachines = machines.filter((machine) => machine.status === 'Maintenance').length;
  const offlineMachines = machines.filter((machine) => machine.status === 'Offline').length;
  const recentMachine = machines[0];
  const locations = [...new Set(machines.map((machine) => machine.location?.trim()).filter(Boolean))];
  const summaryCards = [
    {
      label: 'Total en base',
      value: `${totalMachines}`,
      detail: 'Inventaire complet',
      tone: 'neutral',
    },
    {
      label: 'Online',
      value: `${onlineMachines}`,
      detail: 'Disponibles immediatement',
      tone: 'success',
    },
    {
      label: 'Maintenance',
      value: `${maintenanceMachines}`,
      detail: 'Interventions planifiees',
      tone: 'warning',
    },
    {
      label: 'Offline',
      value: `${offlineMachines}`,
      detail: 'A verifier rapidement',
      tone: 'danger',
    },
  ];

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const response = await fetch(`${API_URL}/machines`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify(form),
      });

      if (response.status === 401) {
        onSessionExpired();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Impossible d\'ajouter la machine');
      }

      setMachines((currentMachines) => [data.machine, ...currentMachines]);
      setSuccess('La machine a ete enregistree dans la base de donnees.');
      setForm(initialForm);
    } catch (err) {
      if (err instanceof TypeError) {
        setFormError("Impossible de joindre le backend. Demarre l'API sur http://127.0.0.1:8000.");
      } else {
        setFormError(err.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="dashboard-shell">
      <Header auth={auth} onLogout={onLogout} route={route} />

      <main className="dashboard-main dashboard-flow">
        <section className="hero-panel hero-panel--split">
          <div className="hero-copy-block">
            <p className="eyebrow">Administration</p>
            <h2>Ajoutez les machines dans un espace de gestion plus propre et mieux structure.</h2>
            <p className="hero-copy">
              Cette vue centralise l'ajout des equipements, les controles essentiels et la
              lecture rapide de l'inventaire deja enregistre.
            </p>
            <div className="hero-actions">
              <span className="welcome-chip">Admin: {auth.username}</span>
              <a className="secondary-button" href="#/">
                Retour au dashboard
              </a>
            </div>
          </div>

          <aside className="hero-sidecard" aria-label="Rythme d'administration">
            <span className="section-label">Rythme d'administration</span>
            <div className="hero-score hero-score--compact">
              <strong>{totalMachines}</strong>
              <span>machine(s) enregistree(s)</span>
            </div>
            <div className="hero-sidecard__grid">
              <div>
                <span>Sites</span>
                <strong>{locations.length}</strong>
              </div>
              <div>
                <span>Online</span>
                <strong>{onlineMachines}</strong>
              </div>
              <div>
                <span>Offline</span>
                <strong>{offlineMachines}</strong>
              </div>
              <div>
                <span>Dernier ajout</span>
                <strong>{recentMachine ? recentMachine.name : 'Aucun'}</strong>
              </div>
            </div>
          </aside>
        </section>

        <section className="stats-grid" aria-label="Resume de l'inventaire">
          {summaryCards.map((card) => (
            <article className="stat-card" key={card.label}>
              <div className="stat-topline">
                <p className="stat-label">{card.label}</p>
                <span className={`stat-dot ${card.tone}`} aria-hidden="true" />
              </div>
              <p className={`stat-value ${card.tone}`}>{card.value}</p>
              <p className="stat-detail">{card.detail}</p>
            </article>
          ))}
        </section>

        <section className="page-grid">
          <article className="table-panel form-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Formulaire</p>
                <h3>Ajouter une machine</h3>
              </div>
              <span className="live-badge">Adresse IP unique requise</span>
            </div>

            <div className="form-note-strip">
              <div className="form-note">
                <strong>Conseil</strong>
                <span>Renseignez une localisation claire pour rendre le dashboard plus lisible.</span>
              </div>
              <div className="form-note">
                <strong>Statut initial</strong>
                <span>Utilisez "Maintenance" pour les equipements en cours de preparation.</span>
              </div>
            </div>

            <form className="machine-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label className="field-group">
                  <span>Nom de la machine</span>
                  <input
                    name="name"
                    onChange={handleChange}
                    placeholder="Serveur principal"
                    required
                    value={form.name}
                  />
                </label>

                <label className="field-group">
                  <span>Adresse IP</span>
                  <input
                    name="ip"
                    onChange={handleChange}
                    placeholder="192.168.1.10"
                    required
                    spellCheck="false"
                    value={form.ip}
                  />
                </label>

                <label className="field-group">
                  <span>Localisation</span>
                  <input
                    name="location"
                    onChange={handleChange}
                    placeholder="Salle serveur"
                    value={form.location}
                  />
                </label>

                <label className="field-group">
                  <span>Statut initial</span>
                  <select name="status" onChange={handleChange} value={form.status}>
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </label>
              </div>

              <label className="field-group">
                <span>Description</span>
                <textarea
                  name="description"
                  onChange={handleChange}
                  placeholder="Role ou commentaire complementaire"
                  rows="4"
                  value={form.description}
                />
              </label>

              {formError ? <p className="feedback error-feedback">{formError}</p> : null}
              {success ? <p className="feedback success-feedback">{success}</p> : null}

              <button className="primary-submit" disabled={isSaving} type="submit">
                {isSaving ? 'Enregistrement...' : 'Enregistrer la machine'}
              </button>
            </form>
          </article>

          <article className="table-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Base de donnees</p>
                <h3>Machines enregistrees</h3>
              </div>
              <span className="live-badge">{machines.length} machine(s)</span>
            </div>

            {loadError ? <p className="feedback error-feedback">{loadError}</p> : null}

            {isLoading ? (
              <div className="empty-state">
                <h3>Chargement de l'inventaire</h3>
                <p>Nous recuperons les equipements deja enregistres dans la base.</p>
              </div>
            ) : machines.length === 0 ? (
              <div className="empty-state">
                <h3>Aucune machine enregistree</h3>
                <p>Utilisez le formulaire a gauche pour initialiser l'inventaire.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>IP</th>
                      <th>Statut</th>
                      <th>Localisation</th>
                      <th>Date d&apos;ajout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {machines.map((machine) => (
                      <tr key={machine.id}>
                        <td>
                          <div className="machine-cell">
                            <strong>{machine.name}</strong>
                            <span>{machine.description || 'Aucune description complementaire'}</span>
                          </div>
                        </td>
                        <td>{machine.ip}</td>
                        <td>
                          <span className={getStatusClass(machine.status)}>{machine.status}</span>
                        </td>
                        <td>{machine.location || '-'}</td>
                        <td>{formatDate(machine.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>
      </main>

      <Footer />
    </div>
  );
}
