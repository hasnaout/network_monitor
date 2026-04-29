@echo off
setlocal

cd /d "%~dp0"

if not exist "..\venv\Scripts\python.exe" (
    echo [ERREUR] Environnement virtuel introuvable: ..\venv
    pause
    exit /b 1
)

echo [1/3] Verification de PyInstaller...
..\venv\Scripts\python.exe -m pip show pyinstaller >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Installation de PyInstaller...
    ..\venv\Scripts\python.exe -m pip install pyinstaller
    if %ERRORLEVEL% NEQ 0 (
        echo [ERREUR] Impossible d'installer PyInstaller.
        pause
        exit /b 1
    )
)

echo [2/3] Construction de l'agent...
..\venv\Scripts\python.exe -m PyInstaller --clean -y agent.spec
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Build echoue.
    pause
    exit /b 1
)

copy /Y install.bat dist\NetworkAgent\ >nul
copy /Y uninstall.bat dist\NetworkAgent\ >nul
copy /Y agent.config.json dist\NetworkAgent\ >nul
copy /Y README_CLIENT.txt dist\NetworkAgent\ >nul

echo [3/3] Paquet pret.
echo Dossier client: %CD%\dist\NetworkAgent
echo Lancez install.bat en administrateur sur le PC client.
pause
