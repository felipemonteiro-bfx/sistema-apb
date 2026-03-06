# 🚀 Quick Start - Sistema APB

## ⚡ Começar em 5 Minutos

### 1️⃣ Preparar Firebase

1. Abra [console.firebase.google.com](https://console.firebase.google.com)
2. Crie um projeto (nome: "sistema-apb")
3. Ative Firestore e Authentication
4. Crie as coleções: `clientes`, `chapas`, `servicos`, `custos_servico`, `pagamentos`, `notas_fiscais`, `config`
5. Veja o guia completo em [FIREBASE_SETUP.md](FIREBASE_SETUP.md)

### 2️⃣ Configurar Ambiente Local

```bash
# Copiar arquivo de exemplo
cp .env.example .env.local
```

Abra `.env.local` e preencha com as credenciais do Firebase (Configurações do Projeto > Sua Apps > Web):
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, etc.

### 3️⃣ Rodar Projeto

```bash
npm install
npm run dev
```

Abra http://localhost:3111 🎉 (ou a porta indicada no terminal)

### 4️⃣ Testar Funcionalidades

1. **Clientes** → Cadastre uma transportadora
2. **Chapas** → Cadastre uma chapa
3. **Serviços** → Crie um novo serviço com custos adicionais
4. **Dashboard** → Veja os gráficos se preencherem
5. **Financeiro** → Contas a receber e ranking

## 📦 O que foi Criado

### Backend
- ✅ Firestore (NoSQL) com coleções otimizadas
- ✅ Firebase Auth (e-mail/senha e Google)
- ✅ Cliente JavaScript `firebase.js` com queries em batch

### Frontend
- ✅ 5 páginas HTML + JavaScript
- ✅ Dashboard com gráficos (Chart.js)
- ✅ Modais para CRUD
- ✅ Estilos com TailwindCSS
- ✅ Cálculo automático de lucro (7.85% imposto)

### Funcionalidades
- ✅ Cadastro de clientes e chapas
- ✅ Registro de serviços com custos
- ✅ Dashboard financeiro
- ✅ Contas a receber com dias de atraso
- ✅ Ranking de clientes (faturamento e lucro)
- ✅ Análise de margem por cliente

## 🔄 Próximos Passos

### Antes de Deploy
- [ ] Testar CRUD completo
- [ ] Validar cálculos de lucro
- [ ] Testar com dados reais

### Deploy (Vercel)
```bash
npm run deploy   # Build + deploy (check + vercel --prod)
# ou
npm run check    # Validar build
vercel --prod    # Deploy manual
```

**OU** via GitHub:
1. Push para GitHub
2. Conecte repo em vercel.com
3. Adicione env vars
4. Deploy automático!

### Futura Integração Cora
- Arquivo pronto em `src/js/cora.js` (implementar depois)
- Estrutura de API preparada
- Funções: emitir NF, consultar pagamento, conciliar

## 📱 Estrutura de Pastas

```
sistema-apb/
├── src/pages/           ← Páginas HTML
├── src/js/              ← Lógica JavaScript
├── firebase.json        ← Config Firebase
├── vite.config.js       ← Config build
├── vercel.json          ← Config deploy
├── .env.example         ← Variáveis (copiar)
└── README.md            ← Documentação completa
```

## 💡 Dicas

- Modifique o imposto nas Configurações ou em `src/js/utils.js`
- Estude `src/js/firebase.js` para entender as queries
- Use Chrome DevTools (F12) para debugar
- Log de erros aparece no console

## ❓ Dúvidas Frequentes

**P: Dados não aparecem?**
R: Verifique se o Firebase foi configurado e as variáveis VITE_FIREBASE_* estão corretas em `.env.local`.

**P: Como mudar a taxa de imposto?**
R: Abra `src/js/utils.js` e mude `TAXA_IMPOSTO` na linha 3.

**P: Como fazer deploy?**
R: `npm run build && vercel` ou conecte repo ao Vercel.

**P: Como escalar depois?**
R: Próxima fase: adicione login, multiempresa e app mobile.

---

**Status**: ✅ MVP Funcional  
**Próximo**: Integração Cora + Escalabilidade

Boa sorte! 🚀
