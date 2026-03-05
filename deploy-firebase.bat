@echo off
echo ==================================
echo Deploy Regras Firestore
echo ==================================
echo.
echo 1. Fazendo login no Firebase...
call npx firebase-tools login
if %ERRORLEVEL% NEQ 0 (
    echo Erro no login!
    pause
    exit /b 1
)
echo.
echo 2. Vinculando projeto (escolha o projeto sistema-apb)...
call npx firebase-tools use --add
echo.
echo 3. Publicando regras e indices...
call npx firebase-tools deploy --only firestore
echo.
if %ERRORLEVEL% EQU 0 (
    echo Deploy concluido com sucesso!
) else (
    echo Erro no deploy.
)
pause
