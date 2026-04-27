# Checklist Préparation Distribution

Avant de distribuer l'agent aux clients, vérifier:

## ✅ Code & Compilation

- [ ] Tester `agent.py` localement
- [ ] Vérifier les imports dans `agent.py`
- [ ] Compiler: `build_agent.bat`
- [ ] Vérifier que `dist\agent.exe` existe
- [ ] Tester l'exe: `dist\agent.exe` should start without errors

## ✅ Configuration

- [ ] Vérifier `agent.config.json` URL
- [ ] Vérifier que le serveur est accessible
- [ ] Tester: `ping 192.168.120.237`
- [ ] Tester: `curl http://192.168.120.237:8000/`

## ✅ Fichiers à Inclure

Préparer le dossier `agent-deploy/`:
```
agent-deploy/
├── dist/agent.exe              ✓ Principal
├── agent.config.json           ✓ Configuration
├── install_service.bat         ✓ Installation
├── uninstall_service.bat       ✓ Désinstallation
├── INSTALL_CLIENT.md           ✓ Instructions
└── README_AGENT.md             ✓ Info générale
```

## ✅ Fichiers à EXCLURE

Ne pas inclure:
- [ ] Pas de `agent.py` (source)
- [ ] Pas de `build/` folder
- [ ] Pas de `.pyc` files
- [ ] Pas de `__pycache__`
- [ ] Pas de `DEVELOPER_GUIDE.md` (pour clients)

## ✅ Test d'Installation

Sur une machine test Windows:

1. [ ] Copier `agent-deploy/` sur le disque
2. [ ] Éditer `agent.config.json` si besoin
3. [ ] Ouvrir PowerShell en admin
4. [ ] Lancer: `.\install_service.bat`
5. [ ] Vérifier: `services.msc` → "Network Monitoring Agent" doit être Running
6. [ ] Vérifier dans le backend: device doit être "online"
7. [ ] Patienter 30-60 secondes
8. [ ] Vérifier les heartbeats dans la base de données

## ✅ Documentation

- [ ] Vérifier `INSTALL_CLIENT.md` est clair
- [ ] Vérifier les URLs
- [ ] Vérifier que pas de chemins locaux hardcodés
- [ ] Vérifier les pas de temps (30 secondes entre heartbeats)

## ✅ Sécurité

- [ ] Pas de credentials hardcodées dans `agent.py`
- [ ] URL HTTPS si possible (au lieu de HTTP)
- [ ] Vérifier les permissions fichiers
- [ ] Service run avec least privilege

## ✅ Communication Client

Avant distribution:
- [ ] Documenter la procédure d'installation
- [ ] Fournir contact support
- [ ] Fournir URL du serveur
- [ ] Préparer FAQ

---

**Checklist complète?** → Prêt pour distribution! 🚀
