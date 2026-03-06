# Sistema APB - Gestão de Chapas e Transportadoras

MVP funcional para gestão de serviços, custos, faturamento e lucro real de uma empresa de fornecimento de chapas para carga e descarga.

## 📋 Stack

- **Frontend**: HTML + TailwindCSS + JavaScript Vanilla
- **Backend**: Firebase (Firestore + Auth)
- **Deploy**: Vercel
- **Build**: Vite

## 🚀 Setup Inicial

### 1. Criar Projeto Firebase

Siga o guia completo em [FIREBASE_SETUP.md](FIREBASE_SETUP.md). Resumo:

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Crie um projeto e ative Firestore e Authentication
3. Crie as coleções: `clientes`, `chapas`, `servicos`, `custos_servico`, `pagamentos`, `notas_fiscais`, `config`

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Abra `.env.local` e preencha com as credenciais do Firebase (Configurações do Projeto > Sua Apps > Web):

```
VITE_FIREBASE_API_KEY=sua-api-key
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu-sender-id
VITE_FIREBASE_APP_ID=seu-app-id
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
  │   │   ├── firebase.js         # Cliente Firebase e queries
  │   │   ├── dashboard.js        # Lógica do dashboard
  │   │   ├── clientes.js         # Gestão de clientes
  │   │   ├── chapas.js           # Gestão de chapas
  │   │   ├── servicos.js         # Registro de serviços
  │   │   ├── financeiro.js       # Relatórios financeiros
  │   │   └── utils.js            # Funções auxiliares
  │   └── css/
  │       └── styles.css          # Estilos base
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

## 📱 Integração Firebase

O arquivo `src/js/firebase.js` contém:
- Inicialização do cliente Firestore e Auth
- Queries para todas as coleções
- Funções de CRUD
- Subscriptions em tempo real
- Queries para dashboard

## 🚢 Deploy em Vercel

### 1. Fazer Login

```bash
npm install -g vercel
vercel login
```

### 2. Deploy

```bash
npm run deploy   # Build + vercel --prod
# ou
npm run check    # Só validar build
vercel --prod    # Deploy manual
```

Ou:
1. Faça push do projeto para GitHub
2. Acesse [vercel.com](https://vercel.com)
3. Importe o repositório
4. Adicione as variáveis de ambiente (VITE_FIREBASE_*)
5. Clique em Deploy

## 🔧 Variáveis de Ambiente (Vercel)

Na dashboard do Vercel, adicione todas as variáveis `VITE_FIREBASE_*` do seu `.env.local`.

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

### "Configure o .env.local com as credenciais do Firebase"
- Verifique se `.env.local` existe
- Copie `.env.example` para `.env.local`
- Preencha as credenciais do Firebase (veja [FIREBASE_SETUP.md](FIREBASE_SETUP.md))

### Coleções não aparecem no Firestore
- Crie as coleções manualmente no console Firebase
- Regras de segurança devem permitir leitura/escrita (ajuste conforme necessário)

## 📝 Notas

- Todos os valores são em BRL (Real)
- Datas no formato DD/MM/YYYY
- Imposto fixo de 7.85% no cálculo de lucro (configurável em `utils.js`)
- Taxa de juros/multa em contas atrasadas: implementar na Fase 2

## 📄 Licença

Privado - Uso interno

## 👨‍💼 Suporte

Para dúvidas ou melhorias, consulte o documento de especificações.
