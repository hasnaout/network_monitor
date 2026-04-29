@echo off
setlocal

NET SESSION >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Lancez ce script en tant qu'Administrateur.
    pause
    exit /b 1
)

set SERVICE_NAME=NetworkAgent
set SOURCE_DIR=%~dp0
set INSTALL_DIR=%ProgramFiles%\NetworkAgent
set EXE_PATH=%INSTALL_DIR%\NetworkAgent.exe

echo [1/6] Preparation du dossier d'installation...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo [2/6] Copie des fichiers...
copy /Y "%SOURCE_DIR%NetworkAgent.exe" "%INSTALL_DIR%\" >nul
if exist "%SOURCE_DIR%_internal" (
    xcopy "%SOURCE_DIR%_internal" "%INSTALL_DIR%\_internal\" /E /I /Y >nul
)
if not exist "%INSTALL_DIR%\agent.config.json" (
    copy /Y "%SOURCE_DIR%agent.config.json" "%INSTALL_DIR%\" >nul
)
copy /Y "%SOURCE_DIR%uninstall.bat" "%INSTALL_DIR%\" >nul

echo [3/6] Arret d'une ancienne instance si elle existe...
sc query %SERVICE_NAME% >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    sc stop %SERVICE_NAME% >nul 2>&1
    timeout /t 2 /nobreak >nul
    sc delete %SERVICE_NAME% >nul 2>&1
    timeout /t 2 /nobreak >nul
)

echo [4/6] Installation du service Windows...
"%EXE_PATH%" install

echo [5/6] Configuration du demarrage automatique...
sc config %SERVICE_NAME% start= auto
sc description %SERVICE_NAME% "Agent leger de supervision reseau" >nul

echo [6/6] Demarrage du service...
sc start %SERVICE_NAME%

echo.
echo [OK] Service "%SERVICE_NAME%" installé et démarré.
echo      Il se lancera automatiquement a chaque demarrage Windows.
echo      Dossier: "%INSTALL_DIR%"
echo      Configuration: "%INSTALL_DIR%\agent.config.json"
pause
