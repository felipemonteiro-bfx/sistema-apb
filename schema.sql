-- Tabela de clientes (transportadoras)
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE NOT NULL,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  valor_padrao_chapa NUMERIC(10, 2) NOT NULL,
  prazo_pagamento INTEGER DEFAULT 30,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- Tabela de chapas
CREATE TABLE chapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE NOT NULL,
  telefone TEXT,
  email TEXT,
  valor_diaria NUMERIC(10, 2) NOT NULL,
  pix TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- Tabela de serviços
CREATE TABLE servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_servico DATE NOT NULL,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  quantidade_chapas INTEGER NOT NULL,
  valor_por_chapa NUMERIC(10, 2) NOT NULL,
  valor_total NUMERIC(10, 2) GENERATED ALWAYS AS (quantidade_chapas * valor_por_chapa) STORED,
  status TEXT DEFAULT 'agendado',
  local_servico TEXT,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Tabela de custos adicionais
CREATE TABLE custos_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id UUID NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
  tipo_custo TEXT NOT NULL,
  valor NUMERIC(10, 2) NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Tabela de pagamentos
CREATE TABLE pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id UUID NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
  valor NUMERIC(10, 2) NOT NULL,
  data_pagamento DATE,
  forma_pagamento TEXT DEFAULT 'pix',
  observacao TEXT,
  confirmado BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

-- Tabela de notas fiscais
CREATE TABLE notas_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id UUID NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
  numero_nf TEXT,
  valor NUMERIC(10, 2) NOT NULL,
  data_emissao DATE,
  status TEXT DEFAULT 'pendente',
  link_pdf TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_servicos_cliente ON servicos(cliente_id);
CREATE INDEX idx_servicos_status ON servicos(status);
CREATE INDEX idx_custos_servico ON custos_servico(servico_id);
CREATE INDEX idx_pagamentos_servico ON pagamentos(servico_id);
CREATE INDEX idx_notas_servico ON notas_fiscais(servico_id);
