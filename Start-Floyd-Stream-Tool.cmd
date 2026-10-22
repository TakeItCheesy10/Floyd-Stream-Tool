@echo off
setlocal
set "FLOYD_ELECTRON=%~dp0Interface Source Code\node_modules\electron\dist\electron.exe"
if not exist "%FLOYD_ELECTRON%" set "FLOYD_ELECTRON=%LOCALAPPDATA%\Temp\floyd-electron-tooling\node_modules\electron\dist\electron.exe"
if not exist "%FLOYD_ELECTRON%" (
  echo Electron is missing. Install the program dependencies before starting Floyd Stream Tool.
  pause
  exit /b 1
)
start "" "%FLOYD_ELECTRON%" "%~dp0Interface Source Code"
