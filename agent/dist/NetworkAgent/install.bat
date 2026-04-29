@echo off
:: Doit être exécuté en tant qu'Administrateur
NET SESSION >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Lancez ce script en tant qu'Administrateur.
    pause
    exit /b 1
)

set SERVICE_NAME=NetworkAgent
set EXE_PATH=%~dp0NetworkAgent.exe

echo [1/3] Installation du service...
"%EXE_PATH%" install

echo [2/3] Configuration du démarrage automatique...
sc config %SERVICE_NAME% start= auto

echo [3/3] Démarrage du service...
sc start %SERVICE_NAME%

echo.
echo [OK] Service "%SERVICE_NAME%" installé et démarré.
echo      Il se lancera automatiquement à chaque démarrage Windows.
pause