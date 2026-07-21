@echo off
setlocal
chcp 65001 >nul

set "ROOT=%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\build-windows.ps1" %*
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Windows build failed with exit code %EXIT_CODE%.
)

exit /b %EXIT_CODE%
