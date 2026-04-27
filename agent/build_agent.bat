@echo off
setlocal

cd /d "%~dp0"

if exist "build" rmdir /s /q "build"
if exist "dist" rmdir /s /q "dist"

echo Generation de agent.exe...
..\venv\Scripts\python.exe -m PyInstaller --noconfirm agent.spec
if errorlevel 1 (
  echo Echec pendant la generation de agent.exe.
  exit /b 1
)

copy /y "dist\agent.exe" ".\agent.exe" >nul
if errorlevel 1 (
  echo Echec pendant la copie de agent.exe.
  exit /b 1
)

echo Build termine : %cd%\agent.exe
exit /b 0
