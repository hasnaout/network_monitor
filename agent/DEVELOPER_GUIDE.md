# Guide Développeur - Compilation et Déploiement de l'Agent

## Architecture

L'agent fonctionne en deux phases:

### Phase 1: Développement (Une seule fois)
- Éditer `agent.py` 
- Compiler en EXE avec PyInstaller
- Créer un paquet de déploiement

### Phase 2: Déploiement Client (Simple)
- Les clients reçoivent le dossier `dist/` avec `agent.exe`
- Ils exécutent `install_service.bat`
- ✅ Aucune dépendance Python requise

## Instructions de Compilation

### 1. Environnement de Développement

```bash
# Installer les dépendances du projet
pip install -r ../requirements.txt

# Installer PyInstaller pour la compilation
pip install -r requirements-agent-build.txt
```

### 2. Compiler l'agent

**Automatique (recommandé):**
```bash
build_agent.bat
```

**Manuel:**
```bash
pyinstaller agent.spec
```

Cela crée:
- `dist/agent.exe` - Executable standalone
- `build/` - Fichiers intermédiaires
- `agent.spec` - Configuration PyInstaller

### 3. Tester l'agent compilé (optionnel)

```bash
# Tester que l'exe fonctionne
dist\agent.exe --help

# Ou directement l'installer
install_service.bat
```

## Structure du Paquet de Déploiement

Pour les clients, préparez ce dossier:

```
agent-deploy/
├── dist/
│   └── agent.exe           ← Executable compilé (principal)
├── agent.config.json       ← Configuration
├── install_service.bat     ← Installation
├── uninstall_service.bat   ← Désinstallation
├── reset_service.bat       ← Reset complet
├── INSTALL_CLIENT.md       ← Instructions client
└── README_AGENT.md         ← Notes techniques
```

**Ne pas inclure:**
- `build/` (fichiers temporaires)
- `agent.py` (source)
- `agent.spec` (déjà compilé dans l'exe)
- `.pyc` ou `__pycache__`

## Mise à Jour de l'Agent

Quand le code change:

1. **Développeurs:**
   ```bash
   # Modifier agent.py
   # Recompiler
   build_agent.bat
   ```

2. **Clients:**
   ```bash
   # Télécharger le nouveau agent-deploy
   # Lancer dans PowerShell (admin):
   .\reset_service.bat
   .\install_service.bat
   ```

## Optimisations PyInstaller

Le fichier `agent.spec` configure:

- **hiddenimports**: Modules implicitement importés (pywin32, psutil, requests)
- **datas**: Fichiers inclus dans l'exe (agent.config.json)
- **console=False**: Pas de fenêtre console affichée
- **upx=True**: Compression du binaire

## Troubleshooting Compilation

### Erreur: "PyInstaller not found"
```bash
pip install pyinstaller
```

### Erreur: "No such file: agent.py"
Vérifier que vous êtes dans le dossier `agent/`

### L'exe compilé ne marche pas
1. Vérifier les hidden imports dans `agent.spec`
2. Récompiler: `pyinstaller agent.spec --clean`
3. Vérifier l'output: `dist/agent.exe --version`

### Agent.exe s'arrête immédiatement
- Problème de permissions Windows
- URL serveur inaccessible
- Vérifier les logs d'événement Windows (Event Viewer)

## Performance

L'executable compilé:
- **Taille**: ~80-120 MB (PyInstaller inclut Python runtime)
- **Temps de démarrage**: ~2-3 secondes
- **Mémoire**: ~50-100 MB au repos
- **CPU**: 0% quand inactif

## Sécurité

- L'exe n'inclut pas le code source Python (compilé en bytecode)
- Les données sensibles (URL) restent dans `agent.config.json`
- Le service s'exécute avec les permissions minimales requises
- Windows service isolation: pas de privilèges root

## Distribution

Options de distribution:

### Option 1: Installer MSI (non implémentée)
```bash
# Créer un installeur Windows standard
pyinstaller agent.py --onefile -w --name NetworkAgent
```

### Option 2: Script d'installation automatique
```batch
# Télécharger et installer automatiquement
powershell -Command "Invoke-WebRequest https://... -OutFile agent-deploy.zip; Expand-Archive agent-deploy.zip; .\install_service.bat"
```

### Option 3: Distribution manuelle (actuelle)
Les clients téléchargent le dossier `agent-deploy/` et lancent `install_service.bat`
