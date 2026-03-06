# Cloud Functions - Sistema APB

## Configuração

1. **Deploy:**
   ```bash
   cd functions && npm install && firebase deploy --only functions
   ```

2. **Variáveis de ambiente:**
   - **Local (emulador):** Copie `functions/.env.example` para `functions/.env` e preencha `GEMINI_API_KEY`.
   - **Produção:** Configure no Firebase Console ou: `firebase functions:secrets:set GEMINI_API_KEY`
   - `GEMINI_API_KEY` - Assistente IA (https://aistudio.google.com/apikey)
   - `GMAIL_USER` - Email de envio (ex: apbcargaedescarga@gmail.com)
   - `GMAIL_APP_PASSWORD` - Senha de app Gmail (Conta Google > Segurança > Senhas de app)
   - `CORA_CLIENT_ID` - Credenciais Cora (Conta > Integrações via APIs)
   - `CORA_CLIENT_SECRET` - Credenciais Cora
   - `CORA_API_URL` - Opcional. URL base da API Cora (padrão: https://api.stage.cora.com.br; produção: https://api.cora.com.br)
   - `GMAIL_USER` - Seu email Gmail (remetente dos recibos)
   - `GMAIL_APP_PASSWORD` - Senha de app do Google (Conta > Segurança > Senhas de app)

   Configure no Firebase Console: Functions > enviarReciboEmail > Configuração > Variáveis de ambiente.
   Ou use Secret Manager no Console do Firebase.

   - `NFE_IO_API_KEY` - Para emissão automática de NFS-e Manaus (obtenha em app.nfe.io)
   - `NFE_IO_COMPANY_ID` - ID da empresa cadastrada na NFE.io
   - `NFE_IO_SANDBOX` - Opcional: "true" para ambiente de testes

3. **Plano Blaze** - Cloud Functions exigem o plano de pagamento (pay-as-you-go).
