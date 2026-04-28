@echo off
setlocal enabledelayedexpansion

REM ============================================
REM Verification des droits administrateur
REM ============================================
net session >nul 2>&1
if %errorlevel%==5 (
  echo.
  echo ============================================
  echo ERREUR: Droits administrateur requis!
  echo ============================================
  echo.
  echo Vous devez executer ce script en tant qu'administrateur.
  echo.
  echo Actions:
  echo   1. Ouvrir PowerShell en tant qu'administrateur
  echo   2. Naviguer vers ce dossier
  echo   3. Executer: .\install_service.bat
  echo.
  pause
  exit /b 5
)

cd /d "%~dp0"

REM ============================================
REM Verification des fichiers requis
REM ============================================
if not exist "dist\agent.exe" (
  echo.
  echo ============================================
  echo ERREUR: dist\agent.exe n'existe pas!
  echo ============================================
  echo.
  echo Vous devez d'abord compiler l'agent.
  echo.
  echo Actions:
  echo   1. Ouvrir PowerShell
  echo   2. Naviguer vers ce dossier
  echo   3. Executer: .\build_agent.bat
  echo.
  pause
  exit /b 1
)

if not exist "agent.config.json" (
  > "agent.config.json" echo { "server_url": "http://192.168.120.237:8000/api/heartbeat/ping/" }
)

echo.
echo ============================================
echo Agent Network Monitor - Installation
echo ============================================
echo.

echo [1/5] Verification de l'etat du service...
sc query NetworkAgent >nul 2>&1
if !errorlevel!==0 (
  echo.
  echo ERREUR: Un ancien service NetworkAgent existe deja.
  echo.
  echo Actions:
  echo   1. Executer: .\uninstall_service.bat
  echo   2. Redemarrer Windows si demande
  echo   3. Relancer: .\install_service.bat
  echo.
  pause
  exit /b 1
)

echo Service n'existe pas (OK)
echo.

echo [2/5] Installation du service Windows...
"%CD%\dist\agent.exe" install
if !errorlevel! neq 0 (
  echo.
  echo ERREUR: Echec pendant l'installation du service.
  echo.
  echo Diagnostique:
  echo   - Verifier que vous etes en administrateur
  echo   - Verifier que dist\agent.exe existe
  echo   - Verifier les permissions du dossier
  echo.
  pause
  exit /b 1
)
echo Service installe (OK)
echo.

echo [3/5] Configuration du demarrage automatique...
sc config NetworkAgent start= auto >nul 2>&1
if !errorlevel! neq 0 (
  echo.
  echo ERREUR: Echec pendant la configuration du demarrage.
  echo.
  pause
  exit /b 1
)
echo Demarrage automatique active (OK)
echo.

echo [4/5] Demarrage du service...
"%CD%\dist\agent.exe" start
if !errorlevel! neq 0 (
  echo.
  echo ERREUR: Le service n'a pas pu etre demarre.
  echo.
  pause
  exit /b 1
)
echo Service demarre (OK)
echo.

REM Attendre que le service soit bien demarré
timeout /t 2 /nobreak >nul

echo [5/5] Verification finale...
sc query NetworkAgent | find "RUNNING" >nul 2>&1
if !errorlevel! equ 0 (
  echo Service en execution (OK)
  echo.
  echo ============================================
  echo SUCCESS: Installation reussie!
  echo ============================================
  echo.
  echo Prochaines etapes:
  echo   1. Verifier agent.config.json (optionnel)
  echo   2. Ouvrir services.msc pour confirmer
  echo   3. Le service devrait apparaitre comme "Running"
  echo.
  echo Le service envoie des heartbeats toutes les 30 secondes.
  echo Les appareils seront visibles dans le backend apres 30-60 secondes.
  echo.
  pause
  exit /b 0
) else (
  echo.
  echo ERREUR: Le service n'est pas en cours d'execution.
  echo.
  echo Diagnostique possibles:
  echo   - Verifier agent.config.json (URL du serveur)
  echo   - Verifier que le serveur est accessible
  echo   - Verifier les logs d'evenement Windows
  echo.
  echo Pour plus d'info, ouvrir Event Viewer:
  echo   eventvwr.msc
  echo.
  pause
  exit /b 1
)
