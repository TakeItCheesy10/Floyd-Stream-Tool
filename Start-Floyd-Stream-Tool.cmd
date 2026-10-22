@echo off
setlocal
set "FLOYD_PROJECT=%~dp0"
powershell.exe -NoProfile -Command "$base=$env:FLOYD_PROJECT; $exe=Join-Path $base 'Interface Source Code\node_modules\electron\dist\electron.exe'; if(!(Test-Path -LiteralPath $exe)){$exe=Join-Path $env:LOCALAPPDATA 'Temp\floyd-electron-tooling\node_modules\electron\dist\electron.exe'}; if(!(Test-Path -LiteralPath $exe)){throw 'Electron is missing. Install dependencies first.'}; $dir=Join-Path $base 'Interface Source Code'; $shell=New-Object -ComObject Shell.Application; $shell.ShellExecute($exe, [char]34+$dir+[char]34, $dir, 'open', 0)"
