@echo off
setlocal

cd /d "%~dp0"

REM Verifier si l'exe compilé existe
if not exist "dist\agent.exe" (
  echo ERREUR: dist\agent.exe n'existe pas.
  echo La compilation PyInstaller n'a pas encore ete effectuee.
  exit /b 1
)

echo Arret du service NetworkAgent...
"dist\agent.exe" stop >nul 2>&1

echo Suppression du service NetworkAgent...
"dist\agent.exe" remove

if errorlevel 1 (
  echo Echec pendant la suppression du service.
  exit /b 1
)

echo Service supprime. Si Windows dit qu'il est encore marque pour suppression,
echo fermez services.msc et redemarrez la machine avant une nouvelle installation.
exit /b 0
