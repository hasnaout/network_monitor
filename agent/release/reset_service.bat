@echo off
setlocal

cd /d "%~dp0"

echo Arret force du service NetworkAgent...
sc stop NetworkAgent >nul 2>&1

echo Suppression forcee du service NetworkAgent...
sc delete NetworkAgent

echo Si le message indique "marque pour suppression", redemarrez Windows
echo puis relancez install_service.bat apres le redemarrage.
exit /b 0
