# NOVOS — Déploiement Docker

## Architecture containerisée

```
┌─────────────────────────────────────────────────┐
│              Docker Compose (novos_network)      │
│                                                  │
│  ┌──────────┐    ┌──────────┐    ┌────────────┐ │
│  │  MySQL   │    │  Redis   │    │  Backend   │ │
│  │  :3306   │◄───│  :6379   │◄───│ Django     │ │
│  │ novos_db │    │ channels │    │ Daphne     │ │
│  └──────────┘    └──────────┘    │  :8001     │ │
│                                  └─────▲──────┘ │
│  ┌──────────────────────────────────────┘        │
│  │                                               │
│  │  ┌──────────────────────┐                     │
│  │  │  Frontend (Nginx)    │                     │
│  └──│  React build         │                     │
│     │  :80                 │                     │
│     │  /api/ → backend     │                     │
│     │  /ws/  → backend     │                     │
│     └──────────────────────┘                     │
└─────────────────────────────────────────────────┘

Agent Windows (hors Docker — déployé sur les postes)
  NetworkAgent.exe → POST http://192.168.2.109:8001/api/
```

## Prérequis

- Docker Desktop 4.x+ (ou Docker Engine 24+)
- Docker Compose v2+
- 4 Go de RAM disponibles

## Démarrage rapide

```bash
# 1. Copier le fichier d'environnement
cp .env.example .env

# 2. Éditer .env avec vos valeurs réelles
notepad .env   # Windows
nano .env      # Linux/Mac

# 3. Construire et lancer la stack
docker compose up --build

# 4. Accéder à l'interface
# Frontend : http://localhost
# Backend API : http://localhost:8001
# Admin Django : http://localhost:8001/admin
```

## Commandes utiles

```bash
# Lancer en arrière-plan
docker compose up -d

# Voir les logs d'un service
docker compose logs -f backend
docker compose logs -f frontend

# Arrêter la stack
docker compose down

# Arrêter et supprimer les volumes (reset complet)
docker compose down -v

# Entrer dans le conteneur backend
docker compose exec backend bash

# Appliquer les migrations manuellement
docker compose exec backend python manage.py migrate

# Créer un superutilisateur
docker compose exec backend python manage.py createsuperuser
```

## Configuration de l'agent

L'agent Windows n'est **pas** dockerisé. Il se connecte au backend
via le réseau local. Mettre à jour `agent.config.json` :

```json
{
  "server_url": "http://<IP_SERVEUR_DOCKER>:8001",
  "AGENT_TOKEN": "<même valeur que AGENT_TOKEN dans .env>"
}
```

## Notes de sécurité

- Ne jamais commiter `.env` dans Git
- Changer tous les mots de passe par défaut avant déploiement
- Le token agent dans `.env` doit correspondre exactement
  à celui dans `agent.config.json`
