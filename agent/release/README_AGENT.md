# Agent Windows

## Configuration

Modifiez `agent.config.json` avant installation :

```json
{
  "server_url": "http://10.229.88.134:8000/api/monitoring/ping/"
}
```

## Deployment recommande

Les machines clientes n'ont pas besoin de Python.

Depuis votre machine de developpement, construisez d'abord le package :

```bat
cd agent
build_release.bat
```

Ensuite copiez le contenu du dossier `agent\release` sur la machine cliente.

## Installation

Lancer l'invite de commandes en administrateur, puis executer :

```bat
install_service.bat
```

Le script utilise `agent.exe` automatiquement s'il est present. Python n'est utilise que comme secours sur une machine de developpement.

## Mise a jour

Si un ancien service est deja installe, lancez d'abord :

```bat
reset_service.bat
```

Puis recopiez le nouveau dossier de release et relancez `install_service.bat`.

## Desinstallation

```bat
reset_service.bat
```

Alias compatible :

```bat
uninstall_service.bat
```

## Remarques

- Le service envoie un heartbeat toutes les 30 secondes.
- La machine est ajoutee automatiquement a la base lors du premier heartbeat.
- Les alertes de connexion, reconnexion et deconnexion sont generees par le serveur.
- En cas d'echec de demarrage, verifiez le fichier `agent.log` dans le meme dossier que `agent.exe`.
