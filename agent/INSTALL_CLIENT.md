# Installation Rapide - Guide Client

## Requirements
- Windows 7, 8, 10 ou 11
- Droits administrateur

## Installation Simple (2 étapes)

### 1. Configurer (optionnel)
Si le serveur n'est pas à `192.168.120.237:8000`, éditez `agent.config.json` et changez l'URL:
```json
{
  "server_url": "http://VOTRE_SERVEUR:8000/api/heartbeat/ping/"
}
```

### 2. Installer le service
- Ouvrir PowerShell en tant qu'administrateur
- Naviguer vers le dossier agent
- Exécuter:
```powershell
.\install_service.bat
```

✅ C'est tout! Le service s'installera et démarrera automatiquement.

## Vérification

Pour vérifier que tout fonctionne:
1. Ouvrir Services Windows (`services.msc`)
2. Chercher "Network Monitoring Agent"
3. Vérifier que le statut est "Exécution"

## Désinstallation

Si vous devez désinstaller:
```powershell
.\uninstall_service.bat
```

## Troubleshooting

### "dist\agent.exe n'existe pas"
Le compilateur PyInstaller n'a pas été exécuté. Contactez votre administrateur.

### Le service s'arrête immédiatement
1. Vérifier l'URL dans `agent.config.json`
2. Vérifier que le serveur est accessible
3. Exécuter `reset_service.bat`

### Permissions refusées
Exécutez PowerShell/Cmd en tant qu'administrateur.

## Support
Contactez votre administrateur réseau si vous avez besoin d'aide.
