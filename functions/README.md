# Cloud Functions - Sistema APB

## Configuração

1. **Deploy:**
   ```bash
   cd functions && npm install && firebase deploy --only functions
   ```

2. **Variáveis de ambiente (Firebase):**
   - `GEMINI_API_KEY` - Para o assistente IA (obtenha em https://aistudio.google.com/apikey)
   - `CORA_CLIENT_ID` - Credenciais Cora (Conta > Integrações via APIs)
   - `CORA_CLIENT_SECRET` - Credenciais Cora
   - `RESEND_API_KEY` - Para envio de recibo por email (obtenha em https://resend.com/api-keys)

   Configure no Firebase Console: Functions > enviarReciboEmail > Configuração > Variáveis de ambiente.
   Ou use Secret Manager no Console do Firebase.

   - `NFE_IO_API_KEY` - Para emissão automática de NFS-e Manaus (obtenha em app.nfe.io)
   - `NFE_IO_COMPANY_ID` - ID da empresa cadastrada na NFE.io
   - `NFE_IO_SANDBOX` - Opcional: "true" para ambiente de testes

3. **Plano Blaze** - Cloud Functions exigem o plano de pagamento (pay-as-you-go).
