@echo off
REM Script de compilation de l'agent Windows
REM Pour les developpeurs: cree l'executable standalone

setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ============================================
echo Agent Network Monitor - Build Script
echo ============================================
echo.

REM Verifier si PyInstaller est installe
pyinstaller --version >nul 2>&1
if errorlevel 1 (
  echo ERREUR: PyInstaller n'est pas installe.
  echo.
  echo Installez d'abord:
  echo   pip install pyinstaller
  exit /b 1
)

echo [1/3] Nettoyage des builds precedents...
if exist "build" rmdir /s /q "build" >nul 2>&1
if exist "dist" rmdir /s /q "dist" >nul 2>&1
if exist "agent.spec" del "agent.spec" >nul 2>&1
del "*.spec" >nul 2>&1

echo [2/3] Compilation avec PyInstaller...
pyinstaller agent.spec
if errorlevel 1 (
  echo ERREUR: La compilation a echoue.
  exit /b 1
)

echo [3/3] Verification de l'executable...
if exist "dist\agent.exe" (
  for %%A in ("dist\agent.exe") do set "size=%%~zA"
  echo.
  echo ============================================
  echo SUCCESS: L'agent a ete compile avec succes!
  echo ============================================
  echo.
  echo Executable: dist\agent.exe (taille: !size! bytes^)
  echo.
  echo Prochaines etapes:
  echo  - Verifier agent.config.json avec l'URL correcte
  echo  - Executer install_service.bat en tant qu'administrateur
  echo.
) else (
  echo ERREUR: dist\agent.exe n'a pas ete cree.
  exit /b 1
)

exit /b 0
