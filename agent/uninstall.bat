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
sc query %SERVICE_NAME% >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    sc stop %SERVICE_NAME% >nul 2>&1
    timeout /t 3 /nobreak >nul
) else (
    echo [INFO] Le service n'existe pas.
)

echo [2/3] Suppression du service...
sc query %SERVICE_NAME% >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    sc delete %SERVICE_NAME%
    if %ERRORLEVEL% NEQ 0 (
        echo [ERREUR] Impossible de supprimer le service.
        pause
        exit /b 1
    )
) else (
    echo [INFO] Aucune suppression de service necessaire.
)

echo [3/3] Nettoyage des fichiers installes...
cd /d "%TEMP%"
if exist "%INSTALL_DIR%" (
    rmdir /S /Q "%INSTALL_DIR%"
    if exist "%INSTALL_DIR%" (
        echo [ERREUR] Impossible de supprimer "%INSTALL_DIR%".
        pause
        exit /b 1
    )
)

echo.
echo [OK] Service supprime.
pause
