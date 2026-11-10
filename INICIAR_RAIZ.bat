@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo   RAIZ - Gestao e Continuidade Rural
echo ==========================================
echo.
where py >nul 2>nul
if %errorlevel%==0 (
  echo Iniciando servidor em http://localhost:8080
  echo Mantenha esta janela aberta enquanto usa o sistema.
  start "" "http://localhost:8080"
  py -m http.server 8080
  goto :fim
)
where python >nul 2>nul
if %errorlevel%==0 (
  echo Iniciando servidor em http://localhost:8080
  echo Mantenha esta janela aberta enquanto usa o sistema.
  start "" "http://localhost:8080"
  python -m http.server 8080
  goto :fim
)
echo Python nao foi encontrado.
echo Abra o VS Code e execute o Live Server no arquivo index.html.
pause
:fim
endlocal
