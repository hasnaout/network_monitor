@echo off
setlocal

cd /d "%~dp0"
set "AGENT_EXE=%~dp0agent.exe"
set "FALLBACK_EXE=%~dp0..\dist\agent.exe"
set "AGENT_PY=%~dp0agent.py"

if not exist "agent.config.json" (
  > "agent.config.json" echo { "server_url": "http://10.229.88.134:8000/api/monitoring/ping/" }
)

if exist "%AGENT_EXE%" (
  set "RUN_MODE=exe"
  set "RUN_TARGET=%AGENT_EXE%"
) else if exist "%FALLBACK_EXE%" (
  set "RUN_MODE=exe"
  set "RUN_TARGET=%FALLBACK_EXE%"
) else (
  where python >nul 2>&1
  if errorlevel 1 (
    echo Aucun agent.exe ou interpreteur Python n'a ete trouve.
    echo Pour une machine cliente, copiez le dossier release ou placez agent.exe
    echo dans le meme dossier que install_service.bat.
    exit /b 1
  )
  set "RUN_MODE=python"
  set "RUN_TARGET=%AGENT_PY%"
)

echo Verification de l'etat du service NetworkAgent...
sc query NetworkAgent >nul 2>&1
if %errorlevel%==0 (
  echo Un ancien service NetworkAgent existe deja.
  echo Lance d'abord reset_service.bat ou uninstall_service.bat puis redemarre Windows si besoin.
  exit /b 1
)

echo Installation du service NetworkAgent...
if /I "%RUN_MODE%"=="exe" (
  "%RUN_TARGET%" install
) else (
  python "%RUN_TARGET%" install
)
if errorlevel 1 (
  echo Echec pendant l'installation du service.
  exit /b 1
)

sc config NetworkAgent start= auto
if errorlevel 1 (
  echo Echec pendant la configuration du demarrage automatique.
  exit /b 1
)

if /I "%RUN_MODE%"=="exe" (
  "%RUN_TARGET%" start
) else (
  python "%RUN_TARGET%" start
)
if errorlevel 1 (
  echo Le service est installe mais n'a pas pu etre demarre.
  exit /b 1
)

echo Service installe et demarre avec succes.
if /I "%RUN_MODE%"=="exe" (
  echo Installation realisee avec agent.exe, Python n'est pas necessaire sur ce poste.
) else (
  echo Installation realisee via Python en mode developpement.
)
echo Pensez a verifier le fichier agent.config.json.
exit /b 0
