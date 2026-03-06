@echo off
chcp 65001 >nul
echo ============================================
echo   CONFIGURAR FIREBASE - Sistema APB
echo ============================================
echo.

echo [1/3] Abrindo Firebase Console...
echo Copie os valores de: Configurações do Projeto ^> Seus apps ^> Web
echo.
start "" "https://console.firebase.google.com/project/_/settings/general"

timeout /t 2 >nul

echo [2/3] Abrindo .env.local para edição...
echo Cole os valores copiados (sem aspas, sem espaços).
echo.
if exist ".env.local" (
    start "" notepad ".env.local"
) else (
    copy ".env.example" ".env.local" >nul
    start "" notepad ".env.local"
)

echo.
echo [3/3] Depois de salvar o .env.local, pressione uma tecla para iniciar o servidor...
pause >nul

echo.
echo Iniciando servidor de desenvolvimento...
call npm run dev
