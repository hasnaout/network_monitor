@echo off
NET SESSION >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Lancez ce script en tant qu'Administrateur.
    pause
    exit /b 1
)

set SERVICE_NAME=NetworkAgent

echo [1/2] Arrêt du service...
sc stop %SERVICE_NAME%
timeout /t 3 /nobreak >nul

echo [2/2] Suppression du service...
sc delete %SERVICE_NAME%

echo.
echo [OK] Service supprimé.
pause