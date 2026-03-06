# Configuração para produção (Vercel)

Para o sistema funcionar em produção, configure as variáveis de ambiente no Vercel.

## Opção 1: Pelo painel do Vercel

1. Acesse [vercel.com](https://vercel.com) → seu projeto **sistema-apb**
2. **Settings** → **Environment Variables**
3. Adicione cada variável:

| Nome | Valor | Ambiente |
|------|-------|----------|
| `VITE_FIREBASE_API_KEY` | (sua API key do Firebase) | Production |
| `VITE_FIREBASE_AUTH_DOMAIN` | sistema-apb.firebaseapp.com | Production |
| `VITE_FIREBASE_PROJECT_ID` | sistema-apb | Production |
| `VITE_FIREBASE_STORAGE_BUCKET` | sistema-apb.firebasestorage.app | Production |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | 1041607229174 | Production |
| `VITE_FIREBASE_APP_ID` | 1:1041607229174:web:... | Production |

4. Clique em **Save**
5. Faça um novo deploy: **Deployments** → **...** no último deploy → **Redeploy**

## Opção 2: Sincronizar do .env.local

Com o projeto linkado ao Vercel (`vercel link`):

```bash
node scripts/vercel-env.cjs
vercel --prod
```

## Domínio do Firebase

No [Firebase Console](https://console.firebase.google.com) → **Authentication** → **Settings** → **Authorized domains**:
- Adicione `sistema-apb.vercel.app`
- Adicione seu domínio personalizado (se usar)
