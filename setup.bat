@echo off
echo ==================================
echo Sistema APB - Setup
echo ==================================
echo.
echo [1/2] Instalando dependencias...
call npm install
echo.
if %ERRORLEVEL% EQU 0 (
    echo [2/2] Iniciando servidor de desenvolvimento...
    echo.
    call npm run dev
) else (
    echo Erro ao instalar dependencias!
    pause
)
