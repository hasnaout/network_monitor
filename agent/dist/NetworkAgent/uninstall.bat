@echo off
setlocal

NET SESSION >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Lancez ce script en tant qu'Administrateur.
    pause
    exit /b 1
)

set SERVICE_NAME=NetworkAgent
set INSTALL_DIR=%ProgramFiles%\NetworkAgent

echo [1/3] Arret du service...
sc stop %SERVICE_NAME% >nul 2>&1
timeout /t 3 /nobreak >nul

echo [2/3] Suppression du service...
sc delete %SERVICE_NAME% >nul 2>&1

echo [3/3] Nettoyage des fichiers installes...
cd /d "%TEMP%"
if exist "%INSTALL_DIR%" rmdir /S /Q "%INSTALL_DIR%"

echo.
echo [OK] Service supprimé.
pause
