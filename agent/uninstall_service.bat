@echo off
setlocal

cd /d "%~dp0"

echo Arret du service NetworkAgent...
"%~dp0agent.exe" stop >nul 2>&1

echo Suppression du service NetworkAgent...
"%~dp0agent.exe" remove

if errorlevel 1 (
  echo Echec pendant la suppression du service.
  exit /b 1
)

echo Service supprime. Si Windows dit qu'il est encore marque pour suppression,
echo fermez services.msc et redemarrez la machine avant une nouvelle installation.
exit /b 0
