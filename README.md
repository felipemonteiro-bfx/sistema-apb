# Sistema APB - Gestão de Chapas e Transportadoras

MVP funcional para gestão de serviços, custos, faturamento e lucro real de uma empresa de fornecimento de chapas para carga e descarga.

## 📋 Stack

- **Frontend**: HTML + TailwindCSS + JavaScript Vanilla
- **Backend**: Supabase (PostgreSQL)
- **Deploy**: Vercel
- **Build**: Vite

## 🚀 Setup Inicial

### 1. Criar Projeto Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Na aba **SQL Editor**, execute o conteúdo do arquivo `schema.sql` para criar todas as tabelas
4. Na aba **Settings > API**, copie:
   - `URL` (VITE_SUPABASE_URL)
   - `anon public` key (VITE_SUPABASE_ANON_KEY)

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Abra `.env.local` e preencha:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-aqui
```

### 3. Instalar Dependências

```bash
npm install
# ou
yarn install
```

### 4. Rodar Localmente

```bash
npm run dev
# ou
yarn dev
```

Acesse http://localhost:3000 no navegador.

## 📁 Estrutura do Projeto

```
/sistema-apb
  ├── src/
  │   ├── pages/
  │   │   ├── index.html          # Dashboard
  │   │   ├── clientes.html       # Cadastro de clientes
  │   │   ├── chapas.html         # Cadastro de chapas
  │   │   ├── servicos.html       # Registro de serviços
  │   │   └── financeiro.html     # Contas a receber e relatórios
  │   ├── components/
  │   │   ├── navbar.html
  │   │   └── sidebar.html
  │   ├── js/
  │   │   ├── supabase.js         # Cliente Supabase e queries
  │   │   ├── dashboard.js        # Lógica do dashboard
  │   │   ├── clientes.js         # Gestão de clientes
  │   │   ├── chapas.js           # Gestão de chapas
  │   │   ├── servicos.js         # Registro de serviços
  │   │   ├── financeiro.js       # Relatórios financeiros
  │   │   └── utils.js            # Funções auxiliares
  │   └── css/
  │       └── styles.css          # Estilos base
  ├── schema.sql                  # Script SQL do banco
  ├── index.html                  # Entry point
  ├── vite.config.js              # Config Vite
  ├── package.json
  ├── vercel.json                 # Config Vercel
  ├── .env.example
  └── README.md
```

## 📊 Funcionalidades

### Dashboard
- Faturamento do mês
- Lucro estimado (com desconto de 7.85% de imposto)
- Serviços realizados
- Contas a receber
- Gráficos de faturamento por cliente
- Últimos serviços

### Cadastro de Clientes
- Nome, CNPJ, telefone, email
- Valor padrão por chapa
- Prazo de pagamento
- Cidade
- Editar cliente existente

### Cadastro de Chapas
- Nome, CPF, telefone
- Valor da diária
- Chave PIX para pagamento

### Registro de Serviços
- Data do serviço
- Cliente
- Quantidade de chapas
- Valor por chapa (cálculo automático do total)
- Custos adicionais:
  - Diária chapa
  - Uber
  - EPI
  - Stretch
  - Matrin
  - Outros
- Status: agendado, executado, faturado, recebido
- Cálculo automático de lucro

### Financeiro
- **Contas a Receber**: lista serviços pendentes com dias de atraso
- **Ranking de Clientes**: 
  - Top 5 maior faturamento
  - Top 5 maior lucro
- **Análise de Lucro**: margem por cliente

## 💰 Cálculo de Lucro

O sistema calcula automaticamente:

```
Lucro = Valor Cobrado - (Custos × (1 + 7.85%))
Margem % = (Lucro / Valor Cobrado) × 100
```

Custos incluem:
- Diária das chapas
- Custos adicionais (uber, EPI, etc)

## 📱 Integração Supabase

O arquivo `src/js/supabase.js` contém:
- Inicialização do cliente
- Queries para todas as tabelas
- Funções de CRUD
- Queries para dashboard

## 🚢 Deploy em Vercel

### 1. Fazer Login

```bash
npm install -g vercel
vercel login
```

### 2. Deploy

```bash
vercel
```

Ou:
1. Faça push do projeto para GitHub
2. Acesse [vercel.com](https://vercel.com)
3. Importe o repositório
4. Adicione as variáveis de ambiente (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY)
5. Clique em Deploy

## 🔧 Variáveis de Ambiente (Vercel)

Na dashboard do Vercel, adicione:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 📈 Roadmap

### Fase 2 (Futura)
- [ ] Integração Cora para emissão de nota fiscal automática
- [ ] WhatsApp automático (envio de nota, cobrança, comprovante)
- [ ] Precificação automática baseada em custos e histórico
- [ ] Exportação de relatórios em PDF/Excel

### Fase 3 (Escalabilidade)
- [ ] Login e autenticação de usuários
- [ ] Controle de múltiplos usuários
- [ ] Permissões por função
- [ ] Auditoria de operações

### Fase 4 (Mobile)
- [ ] App mobile com Capacitor (Android/iOS)
- [ ] Registro de serviço offline
- [ ] Sincronização automática

## 🆘 Troubleshooting

### "Missing Supabase environment variables"
- Verifique se `.env.local` existe
- Copie `.env.example` para `.env.local`
- Preencha as chaves corretamente

### Tabelas não aparecem no Supabase
- Execute novamente o `schema.sql` na aba SQL Editor
- Verifique se não há erros na execução

### CORS error ao conectar
- Supabase CORS está configurado automaticamente
- Se persistir, verifique a URL do Supabase em `.env.local`

## 📝 Notas

- Todos os valores são em BRL (Real)
- Datas no formato DD/MM/YYYY
- Imposto fixo de 7.85% no cálculo de lucro (configurável em `utils.js`)
- Taxa de juros/multa em contas atrasadas: implementar na Fase 2

## 📄 Licença

Privado - Uso interno

## 👨‍💼 Suporte

Para dúvidas ou melhorias, consulte o documento de especificações.
