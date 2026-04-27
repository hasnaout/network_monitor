# Agent Windows - Network Monitoring

> **Aucune installation de Python requise pour les clients** ✅

## Pour les Clients

→ Voir [INSTALL_CLIENT.md](INSTALL_CLIENT.md)

**Installation rapide:**
1. Éditer `agent.config.json` (optional)
2. Exécuter `install_service.bat` en tant qu'administrateur
3. ✅ C'est tout!

## Pour les Développeurs

→ Voir [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)

**Compilation:**
```bash
pip install -r requirements-agent-build.txt
build_agent.bat
```

## Architecture

### Phase 1: Compilation (Développeur)
- Modifier `agent.py`
- Exécuter `build_agent.bat` → crée `dist/agent.exe`
- Agent compilé en executable standalone (Python inclus)

### Phase 2: Déploiement (Client)
- Recevoir dossier avec `dist/agent.exe`
- Lancer `install_service.bat`
- Service s'installe et démarre automatiquement
- **Zéro dépendance Python** ✨

## Fonctionnalités

- ✅ Envoie heartbeats toutes les 30 secondes
- ✅ Auto-enregistrement des appareils
- ✅ Détection connexion/reconnexion/déconnexion
- ✅ Exécution en tant que service Windows
- ✅ Arrêt/démarrage automatique au reboot
- ✅ Compatible Windows 7+
- ✅ Aucune UI (mode service silencieux)

## Fichiers

```
agent/
├── agent.py                           # Source (pour développeurs)
├── agent.config.json                  # Config client
├── agent.spec                         # Config PyInstaller
├── build_agent.bat                    # Script compilation
├── install_service.bat                # Installation cliente
├── uninstall_service.bat              # Désinstallation cliente
├── reset_service.bat                  # Reset complet
├── dist/                              # [Généré après compilation]
│   └── agent.exe                      # Executable client
├── build/                             # [Généré après compilation]
├── README_AGENT.md                    # Ce fichier
├── INSTALL_CLIENT.md                  # Guide client
├── DEVELOPER_GUIDE.md                 # Guide développeur
└── requirements-agent-build.txt       # Dépendances build
```

## Configuration

Éditer `agent.config.json`:

```json
{
  "server_url": "http://192.168.120.237:8000/api/heartbeat/ping/"
}
```

## Vérification

```bash
# Windows Services
services.msc
# → Chercher "Network Monitoring Agent"
# → Status doit être "Running"
```

## Support

- Clients: Voir [INSTALL_CLIENT.md](INSTALL_CLIENT.md)
- Développeurs: Voir [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)

