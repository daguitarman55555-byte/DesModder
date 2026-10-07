@echo off
rem Installs or updates DesModder (with Vector Tools) for Chrome.
rem
rem Downloads the latest build from GitHub and unpacks it into one fixed
rem folder. Needs nothing but Windows: no Node, no Git. Run it again any time
rem to update; the folder stays the same, so Chrome keeps your settings.
setlocal
set "DEST=%LOCALAPPDATA%\DesModder"
set "MARK=%LOCALAPPDATA%\DesModder.installed"
set "URL=https://github.com/daguitarman55555-byte/DesModder/releases/download/latest-build/DesModder-Chrome.zip"
set "ZIP=%TEMP%\DesModder-Chrome.zip"
set "NEW=%TEMP%\DesModder-new"

echo Downloading the latest DesModder...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference = 'Stop';" ^
  "[Net.ServicePointManager]::SecurityProtocol = 'Tls12';" ^
  "Invoke-WebRequest -UseBasicParsing '%URL%' -OutFile '%ZIP%';" ^
  "if (Test-Path '%NEW%') { Remove-Item -Recurse -Force '%NEW%' };" ^
  "Expand-Archive '%ZIP%' '%NEW%';" ^
  "Remove-Item '%ZIP%'"
if errorlevel 1 (
  echo.
  echo The download failed. Check the internet connection and try again.
  pause
  exit /b 1
)

rem Unpacked beside the old copy first, then mirrored over it, so Chrome never
rem finds the folder half-empty.
robocopy "%NEW%" "%DEST%" /MIR /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (
  echo.
  echo Could not copy the files into %DEST%.
  pause
  exit /b 1
)
rmdir /s /q "%NEW%"

if exist "%MARK%" goto updated

rem First time on this computer: Chrome only accepts an extension from outside
rem its store if you point it at the folder yourself, once.
<nul set /p="%DEST%" | clip
echo. > "%MARK%"
start "" chrome "chrome://extensions"
echo.
echo  Installed into %DEST%
echo.
echo  One-time step, in the Chrome tab that just opened:
echo    1. Turn on "Developer mode" (top right).
echo    2. Click "Load unpacked".
echo    3. Paste into the folder box with Ctrl+V (the path is already copied)
echo       and click "Select Folder".
echo.
echo  To update later, just double-click this file again.
echo.
pause
exit /b 0

:updated
echo.
echo  Updated. Restart Chrome, or click the reload arrow on DesModder
echo  in chrome://extensions, to use the new version.
echo.
pause
