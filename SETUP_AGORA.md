# ⚡ SETUP AGORA - Sistema APB

## 🎯 3 Passos para Rodar

### PASSO 1️⃣ - Criar Banco de Dados (2 min)

1. Abra https://supabase.com
2. Crie conta (grátis)
3. Novo Projeto → Digite "sistema-apb"
4. Aguarde carregar
5. Vá em **SQL Editor** (lado esquerdo)
6. Clique **+ New Query**
7. Cole TODO o conteúdo do arquivo: **schema.sql**
   - Abra: `C:\Users\Administrador\Desktop\sistema APB\schema.sql`
   - Copie tudo (Ctrl+A)
   - Cole na aba SQL do Supabase
8. Clique **RUN** (botão verde)
9. ✅ Banco pronto!

### PASSO 2️⃣ - Copiar Chaves (1 min)

1. No Supabase, vá em **Settings > API** (lado esquerdo)
2. Copie a **URL** (algo como `https://xxxxx.supabase.co`)
3. Copie **anon public** key
4. Abra o arquivo: `.env.local`
   - Está em: `C:\Users\Administrador\Desktop\sistema APB\.env.local`
5. Cole nos valores:
   ```
   VITE_SUPABASE_URL=cole-a-url-aqui
   VITE_SUPABASE_ANON_KEY=cole-a-chave-aqui
   ```
6. Salve (Ctrl+S)
7. ✅ Configurado!

### PASSO 3️⃣ - Rodar Sistema (1 min)

**Opção A - Automático (recomendado):**
1. Abra pasta: `C:\Users\Administrador\Desktop\sistema APB`
2. Dê duplo clique em: **setup.bat**
3. Aguarde instalar dependências (~2-3 min)
4. Navegador abre automaticamente em http://localhost:3000
5. ✅ Sistema rodando!

**Opção B - Manual:**
```bash
# Abra PowerShell/CMD nesta pasta
npm install
npm run dev
```

---

## 🧪 Testando

Depois que abrir em http://localhost:3000:

1. Clique em **🚚 Clientes** → **+ Novo Cliente**
   - Nome: "Transportes Silva"
   - CNPJ: "12345678000190"
   - Valor/Chapa: "150"
   - Prazo: "30"
   - Salvar

2. Clique em **👤 Chapas** → **+ Nova Chapa**
   - Nome: "João da Silva"
   - CPF: "12345678901"
   - Valor Diária: "80"
   - Salvar

3. Clique em **📋 Serviços** → **+ Novo Serviço**
   - Data: (hoje)
   - Cliente: "Transportes Silva"
   - Quantidade: "2"
   - Valor/Chapa: "150"
   - Adicionar custo: "Uber" = "50"
   - Salvar

4. Clique em **📊 Dashboard**
   - Veja os números aparecerem!

---

## 📊 Estrutura Criada

```
✅ Backend (7 tabelas SQL)
✅ Frontend (5 páginas + 7 módulos JS)
✅ Gráficos (Chart.js)
✅ Cálculo de Lucro automático
✅ Dashboard financeiro
✅ Contas a receber
✅ Ranking de clientes
```

---

## ❓ Problemas?

**P: npm não funciona?**
R: Instale Node.js: https://nodejs.org (v18+)

**P: Erro "Missing Supabase variables"?**
R: Verifique se `.env.local` foi preenchido corretamente

**P: Porta 3000 já em uso?**
R: Mude em `vite.config.js`, linha 3: `port: 3001`

---

## 🚀 Próximas Fases

| Fase | O quê | Quando |
|------|-------|--------|
| **Agora** | MVP rodando | ✅ Pronto! |
| **Fase 2** | Integração Cora | Depois |
| **Fase 3** | Login + multiempresa | Depois |
| **Fase 4** | App mobile | Depois |

---

## 📝 Checklist de Setup

- [ ] Criar projeto no Supabase
- [ ] Executar schema.sql
- [ ] Copiar env vars para .env.local
- [ ] Rodar `setup.bat`
- [ ] Abrir http://localhost:3000
- [ ] Cadastrar teste (cliente + chapa + serviço)
- [ ] ✅ Sistema funcionando!

---

**Pronto? Comece pelo PASSO 1!** 🚀
