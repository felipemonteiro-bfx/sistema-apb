# Schema e Variáveis - Sistema APB

Referência completa de todas as coleções e variáveis do Firestore.

---

## clientes

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| nome | string | Sim | Nome ou razão social |
| cnpj | string | Sim | CNPJ da transportadora |
| telefone | string | Não | Telefone de contato |
| email | string | Não | E-mail de contato |
| endereco | string | Não | Endereço completo (rua, nº, bairro) |
| cidade | string | Não | Cidade |
| estado | string | Não | UF (2 caracteres) |
| valor_padrao_chapa | number | Sim | Valor padrão cobrado por chapa |
| prazo_pagamento | number | Sim | Prazo em dias (default: 30) |
| ativo | boolean | Sim | Se o cliente está ativo |
| created_at | timestamp | Auto | Data de criação |

---

## chapas

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| nome | string | Sim | Nome completo |
| cpf | string | Sim | CPF |
| telefone | string | Não | Telefone |
| email | string | Não | E-mail |
| valor_diaria | number | Sim | Valor da diária |
| pix | string | Não | Chave PIX para pagamento |
| ativo | boolean | Sim | Se está ativo |
| created_at | timestamp | Auto | Data de criação |

---

## servicos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| data_servico | string/date | Sim | Data do serviço (YYYY-MM-DD) |
| cliente_id | string | Sim | ID do documento cliente |
| quantidade_chapas | number | Sim | Quantidade de chapas |
| valor_por_chapa | number | Sim | Valor unitário por chapa |
| valor_total | number | Sim | Valor total (qtd × valor) |
| status | string | Sim | agendado, executado, faturado, recebido |
| local_servico | string | Não | Endereço/local de execução |
| observacoes | string | Não | Observações gerais |
| created_at | timestamp | Auto | Data de criação |

---

## custos_servico

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| servico_id | string | Sim | ID do documento serviço |
| tipo_custo | string | Sim | diaria_chapa, uber, epi, stretch, matrin, outros |
| valor | number | Sim | Valor do custo |
| descricao | string | Não | Descrição adicional |
| created_at | timestamp | Auto | Data de criação |

---

## pagamentos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| servico_id | string | Sim | ID do documento serviço |
| valor | number | Sim | Valor pago |
| data_pagamento | string/date | Sim | Data do pagamento |
| forma_pagamento | string | Sim | pix, transferencia, dinheiro, boleto, cartao_credito, cartao_debito, cheque, outro |
| observacao | string | Não | Comprovante, referência |
| confirmado | boolean | Sim | Se o pagamento foi confirmado |
| created_at | timestamp | Auto | Data de criação |

---

## notas_fiscais

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| servico_id | string | Sim | ID do documento serviço |
| numero_nf | string | Sim | Número da nota fiscal |
| valor | number | Sim | Valor da NF |
| data_emissao | string/date | Não | Data de emissão |
| status | string | Sim | pendente, emitida, enviada, cancelada |
| link_pdf | string | Não | URL do PDF da NF |
| created_at | timestamp | Auto | Data de criação |

---

## Valores de Status

**serviços.status:** `agendado` | `executado` | `faturado` | `recebido`

**notas_fiscais.status:** `pendente` | `emitida` | `enviada` | `cancelada`

**custos_servico.tipo_custo:** `diaria_chapa` | `uber` | `epi` | `stretch` | `matrin` | `outros`
