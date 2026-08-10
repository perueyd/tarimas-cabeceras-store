@echo off
chcp 65001 >nul
title Subir fotos a la tienda E^|D
cd /d "%~dp0"

echo.
echo  ============================================================
echo    SUBIR FOTOS A LA TIENDA
echo  ============================================================
echo.

REM Si arrastraste una carpeta encima de este archivo, esa se usa.
set "CARPETA=%~1"

REM Si no, se abre una ventana para que la elijas.
if "%CARPETA%"=="" (
  echo  Elige la carpeta con tus fotos en la ventana que se abrio...
  echo.
  for /f "usebackq delims=" %%i in (`powershell -NoProfile -STA -Command "Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description = 'Elige la carpeta con tus fotos'; if ($d.ShowDialog() -eq 'OK') { $d.SelectedPath }"`) do set "CARPETA=%%i"
)

if "%CARPETA%"=="" (
  echo  No elegiste ninguna carpeta. No se hizo nada.
  echo.
  pause
  exit /b
)

echo  Carpeta: %CARPETA%
echo.
echo  Preparando las fotos... esto tarda un poco, no cierres esta ventana.
echo.

node "scripts\elegir-fotos.mjs" "%CARPETA%"

echo.
echo  ============================================================
echo    Termino. Ya puedes cerrar esta ventana.
echo  ============================================================
pause
