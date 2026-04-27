@echo off
setlocal

cd /d "%~dp0"

REM Verifier si l'exe compilé existe
if not exist "dist\agent.exe" (
  echo ERREUR: dist\agent.exe n'existe pas.
  echo Vous devez d'abord compiler l'agent avec PyInstaller.
  echo.
  echo Commandes:
  echo   pip install pyinstaller
  echo   pyinstaller agent.spec
  exit /b 1
)

if not exist "agent.config.json" (
  > "agent.config.json" echo { "server_url": "http://192.168.120.237:8000/api/heartbeat/ping/" }
)

echo Verification de l'etat du service NetworkAgent...
sc query NetworkAgent >nul 2>&1
if %errorlevel%==0 (
  echo Un ancien service NetworkAgent existe deja.
  echo Lance d'abord uninstall_service.bat puis redemarre Windows si besoin.
  exit /b 1
)

echo Installation du service NetworkAgent...
"dist\agent.exe" install
if errorlevel 1 (
  echo Echec pendant l'installation du service.
  exit /b 1
)

sc config NetworkAgent start= auto
if errorlevel 1 (
  echo Echec pendant la configuration du demarrage automatique.
  exit /b 1
)

"dist\agent.exe" start
if errorlevel 1 (
  echo Le service est installe mais n'a pas pu etre demarre.
  exit /b 1
)

echo Service installe et demarre avec succes.
echo Pensez a verifier le fichier agent.config.json.
exit /b 0
