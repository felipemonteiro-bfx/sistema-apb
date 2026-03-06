# 🔥 Setup Firebase (Grátis!)

## ✅ Firebase é 100% Grátis no Plano Spark

Inclui:
- 1GB de armazenamento
- 50k leituras/dia
- 20k escritas/dia
- Perfeito para MVP!

---

## 🚀 Configuração em 5 Minutos

### Passo 1 - Criar Projeto Firebase

1. Acesse https://console.firebase.google.com
2. Clique **+ Criar projeto**
3. Nome: `sistema-apb`
4. Desabilite Google Analytics (não precisa)
5. Clique **Criar projeto**
6. Aguarde ~1 minuto

### Passo 2 - Ativar Firestore

1. No menu lateral, clique **Firestore Database**
2. Clique **Criar banco de dados**
3. Localização: **Escolha a mais próxima** (ex: us-central1)
4. Modo de segurança: **Modo de teste** (inicialmente)
5. Clique **Criar**

### Passo 2b - Ativar Autenticação (Firebase Auth)

1. No menu lateral, clique **Authentication**
2. Clique **Começar**
3. Na aba **Sign-in method**:
   - **E-mail/senha**: Ativar e salvar
   - **Google**: Ativar, escolher e-mail de suporte, salvar
4. (Opcional) Em **Settings** → **Authorized domains**, adicione seu domínio de produção

### Passo 3 - Criar Coleções

No Firestore, clique **+ Criar coleção** para cada uma:

1. **clientes** (vazio, criar depois via app)
2. **chapas** (vazio)
3. **servicos** (vazio)
4. **custos_servico** (vazio)
5. **pagamentos** (vazio)
6. **notas_fiscais** (vazio)

### Passo 4 - Copiar Credenciais

1. Clique **⚙️ Configurações do Projeto** (engrenagem)
2. Vá em **Sua Apps** → **Web** (ícone `</>`)<br>
   - Se não existe, clique **+ Adicionar app**
3. Copie o objeto `firebaseConfig`:
   ```javascript
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };
   ```

### Passo 5 - Preencher .env.local

Abra `.env.local` (na pasta do projeto) e preencha com os valores acima:

```
VITE_FIREBASE_API_KEY=seu-api-key
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu-id
VITE_FIREBASE_APP_ID=seu-app-id
```

### Passo 6 - Rodar

```bash
setup.bat
# ou
npm install
npm run dev
```

---

## ❌ Erro "configuration-not-found"

Se aparecer **Firebase: Error (auth/configuration-not-found)**:

1. Acesse o [Firebase Console](https://console.firebase.google.com) → seu projeto
2. Vá em **Authentication** (menu lateral)
3. Clique em **Sign-in method** (aba)
4. Ative o provedor **E-mail/senha** e clique em **Salvar**
5. Aguarde alguns segundos e tente criar a conta novamente

---

## ❌ Erro "api-key-not-valid"

Se aparecer **Firebase: Error (auth/api-key-not-valid)**:

1. **Reinicie o servidor** – O Vite só carrega `.env.local` ao iniciar:
   ```bash
   # Feche o terminal do npm run dev (Ctrl+C) e rode de novo:
   npm run dev
   ```

2. **Verifique o .env.local** – Deve estar na raiz do projeto, sem aspas nem espaços:
   ```
   VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   VITE_FIREBASE_AUTH_DOMAIN=sistema-apb.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=sistema-apb
   VITE_FIREBASE_STORAGE_BUCKET=sistema-apb.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=1041607229174
   VITE_FIREBASE_APP_ID=1:1041607229174:web:xxxxx
   ```

3. **Restrições de HTTP referrer** – No [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → API Keys → sua chave Web:
   - Se houver restrição de “Referrers de site”, adicione: `localhost:*`, `127.0.0.1:*` e seu domínio de produção (ex: `sistema-apb.web.app/*`)

4. **Deploy (Vercel/Firebase Hosting)** – Configure as variáveis no painel do provedor e faça novo build/deploy

---

## 🔒 Segurança - Regras Firestore

O projeto inclui `firestore.rules` que exige autenticação. Para publicar:

```bash
# Instale o Firebase CLI (se ainda não tem)
npm install -g firebase-tools

# Login no Firebase
firebase login

# Vincule ao projeto (escolha o projeto)
firebase use --add

# Publicar regras e índices
firebase deploy --only firestore
```

Ou copie manualmente o conteúdo de `firestore.rules` em **Firestore > Regras** no console e clique **Publicar**.

---

## 💰 Custos

- **Plano Spark (Grátis)**: Desenvolvimento
  - 50k leituras/dia
  - 20k escritas/dia
  - 1GB storage
  - **Suficiente para MVP!**

- **Upgrades automáticos**: Quando atingir limites (você escolhe)

---

## ✨ Pronto!

Sistema rodando com Firebase! 🎉

Sistema USA Firebase com as mesmas funcionalidades que Supabase:
- ✅ CRUD completo
- ✅ Dashboard com gráficos
- ✅ Cálculo de lucro
- ✅ Contas a receber
- ✅ Ranking de clientes

---

## 📝 Comparação

| Feature | Supabase | Firebase |
|---------|----------|----------|
| Banco | PostgreSQL | Firestore |
| Gratuito | Sim | Sim |
| Autenticação | Sim | Sim |
| Realtime | Sim | Sim |
| Escalabilidade | Excelente | Excelente |
| Preço |Pago depois | Pago depois |

**Ambos são ótimos! Firebase é mais simples de setup.** ✨
