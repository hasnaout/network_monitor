@echo off
REM Script de reset complet de l'agent
REM Utile si vous devez reinstaller completement l'agent

setlocal

cd /d "%~dp0"

echo ============================================
echo Agent Network Monitor - Reset Service
echo ============================================
echo.

REM Arreter et supprimer l'ancien service s'il existe
echo [1/3] Suppression de l'ancien service...
sc query NetworkAgent >nul 2>&1
if %errorlevel%==0 (
  echo Le service NetworkAgent existe, suppression en cours...
  if exist "dist\agent.exe" (
    "dist\agent.exe" stop >nul 2>&1
    "dist\agent.exe" remove >nul 2>&1
  )
  REM Attendre que le service soit supprime
  timeout /t 2 /nobreak
  echo Service supprime.
) else (
  echo Aucun ancien service trouve.
)

echo.
echo [2/3] Nettoyage des fichiers de build...
if exist "build" rmdir /s /q "build" >nul 2>&1
if exist "dist" rmdir /s /q "dist" >nul 2>&1

echo.
echo [3/3] Compilation de l'agent...
pyinstaller agent.spec
if errorlevel 1 (
  echo ERREUR: La recompilation a echoue.
  exit /b 1
)

echo.
echo ============================================
echo SUCCESS: Agent reset et compile!
echo ============================================
echo.
echo Vous pouvez maintenant executer:
echo   install_service.bat
echo.
