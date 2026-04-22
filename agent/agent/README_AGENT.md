# Agent Windows

## Configuration

Modifiez `agent.config.json` avant installation :

```json
{
  "server_url": "http://192.168.120.237:8000/api/monitoring/ping/"
}
```

## Installation

Lancer l'invite de commandes en administrateur, puis executer :

```bat
install_service.bat
```

## Desinstallation

```bat
uninstall_service.bat
```

## Remarques

- Le service envoie un heartbeat toutes les 30 secondes.
- La machine est ajoutee automatiquement a la base lors du premier heartbeat.
- Les alertes de connexion, reconnexion et deconnexion sont generees par le serveur.
