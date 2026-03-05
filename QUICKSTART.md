# 🚀 Quick Start - Sistema APB

## ⚡ Começar em 5 Minutos

### 1️⃣ Preparar Banco de Dados

1. Abra [supabase.com](https://supabase.com) e faça login
2. Crie um novo projeto (nome: "sistema-apb")
3. Aguarde inicializar (~1 min)
4. Vá até **SQL Editor**
5. Cole o conteúdo de `schema.sql` e execute

### 2️⃣ Configurar Ambiente Local

```bash
# Copiar arquivo de exemplo
cp .env.example .env.local
```

Abra `.env.local` e preencha:
- Vá em **Settings > API** no Supabase
- Copie `URL` → `VITE_SUPABASE_URL`
- Copie `anon public` → `VITE_SUPABASE_ANON_KEY`

### 3️⃣ Rodar Projeto

```bash
npm install
npm run dev
```

Abra http://localhost:3000 🎉

### 4️⃣ Testar Funcionalidades

1. **Clientes** → Cadastre uma transportadora
2. **Chapas** → Cadastre uma chapa
3. **Serviços** → Crie um novo serviço com custos adicionais
4. **Dashboard** → Veja os gráficos se preencherem
5. **Financeiro** → Contas a receber e ranking

## 📦 O que foi Criado

### Backend
- ✅ 7 tabelas SQL no Supabase
- ✅ Relacionamentos e índices otimizados
- ✅ Cliente JavaScript `supabase.js` com todas as queries

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
npm run build  # Gera pasta dist/
vercel         # Faz deploy
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
├── src/css/             ← Estilos
├── schema.sql           ← Script do banco (SQL)
├── vite.config.js       ← Config build
├── vercel.json          ← Config deploy
├── .env.example         ← Variáveis (copiar)
└── README.md            ← Documentação completa
```

## 💡 Dicas

- Modifique o imposto em `src/js/utils.js` (linha 3: `TAXA_IMPOSTO = 0.0785`)
- Estude `src/js/supabase.js` para entender as queries
- Use Chrome DevTools (F12) para debugar
- Log de erros aparece no console

## ❓ Dúvidas Frequentes

**P: Dados não aparecem?**
R: Verifique se o banco foi criado e as env vars estão corretas.

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
