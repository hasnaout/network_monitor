@echo off
setlocal

cd /d "%~dp0"
set "SOURCE_EXE=%~dp0dist\agent.exe"
set "BUILD_DIST=%~dp0release_build\dist"
set "BUILD_WORK=%~dp0release_build\build"
set "BUILD_EXE=%BUILD_DIST%\agent.exe"

where pyinstaller >nul 2>&1
if errorlevel 1 (
  if not exist "%SOURCE_EXE%" (
    echo PyInstaller est introuvable et aucun agent.exe existant n'a ete trouve.
    echo Activez votre environnement de developpement puis installez PyInstaller.
    exit /b 1
  )
  echo PyInstaller est introuvable. Utilisation de dist\agent.exe existant.
  goto package_release
)

echo Construction de agent.exe...
pyinstaller --noconfirm --distpath "%BUILD_DIST%" --workpath "%BUILD_WORK%" agent.spec
if errorlevel 1 (
  if not exist "%SOURCE_EXE%" (
    echo Echec pendant la construction de agent.exe.
    exit /b 1
  )
  echo Echec pendant la construction. Utilisation de dist\agent.exe existant.
  goto package_release
)

set "SOURCE_EXE=%BUILD_EXE%"

:package_release
if not exist "release" mkdir "release"

echo Copie des fichiers de deployment...
copy /Y "%SOURCE_EXE%" "agent\agent.exe" >nul
copy /Y "%SOURCE_EXE%" "release\agent.exe" >nul
copy /Y "agent\agent.config.json" "release\agent.config.json" >nul
copy /Y "agent\install_service.bat" "release\install_service.bat" >nul
copy /Y "agent\reset_service.bat" "release\reset_service.bat" >nul
copy /Y "agent\uninstall_service.bat" "release\uninstall_service.bat" >nul
copy /Y "agent\README_AGENT.md" "release\README_AGENT.md" >nul

echo Release prete dans le dossier agent\release
echo Copiez ce dossier sur les machines clientes puis lancez install_service.bat en administrateur.
exit /b 0
