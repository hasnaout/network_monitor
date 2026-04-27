@echo off
setlocal enabledelayedexpansion

REM ============================================
REM Verification des droits administrateur
REM ============================================
net session >nul 2>&1
if %errorlevel%==5 (
  echo.
  echo ============================================
  echo ERREUR: Droits administrateur requis!
  echo ============================================
  echo.
  echo Vous devez executer ce script en tant qu'administrateur.
  echo.
  pause
  exit /b 5
)

cd /d "%~dp0"

REM ============================================
REM Verification de l'exe
REM ============================================
if not exist "dist\agent.exe" (
  echo.
  echo ERREUR: dist\agent.exe n'existe pas.
  echo.
  pause
  exit /b 1
)

echo.
echo ============================================
echo Agent Network Monitor - Desinstallation
echo ============================================
echo.

echo [1/3] Arret du service...
"%CD%\dist\agent.exe" stop >nul 2>&1
REM Attendre que le service s'arrete
timeout /t 2 /nobreak >nul

echo Service arrete (OK)
echo.

echo [2/3] Suppression du service...
"%CD%\dist\agent.exe" remove
if !errorlevel! neq 0 (
  echo.
  echo ERREUR: Echec pendant la suppression du service.
  echo.
  echo Si le service est marque pour suppression, redemarrez Windows.
  echo.
  pause
  exit /b 1
)
echo Service supprime (OK)
echo.

echo [3/3] Verification...
REM Attendre que Windows mette a jour l'etat
timeout /t 2 /nobreak >nul

sc query NetworkAgent >nul 2>&1
if !errorlevel! neq 0 (
  echo Service n'existe plus (OK)
  echo.
  echo ============================================
  echo SUCCESS: Desinstallation reussie!
  echo ============================================
  echo.
  echo Le service Network Monitoring Agent a ete supprime.
  echo.
  pause
  exit /b 0
) else (
  echo.
  echo INFO: Le service est marque pour suppression.
  echo.
  echo Actions requises:
  echo   1. Redemarrer Windows
  echo   2. Le service sera supprime au prochain demarrage
  echo   3. Vous pourrez reinstaller apres le redemarrage
  echo.
  pause
  exit /b 0
)
