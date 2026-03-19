# jProcesso — System Prompt / Contexto Completo da IA
> Gerado automaticamente em 12/03/2026. Carregar integralmente antes de interagir com o sistema.

---

## 1. VISÃO GERAL DO SISTEMA

**jProcesso** é um sistema de gestão pública municipal desenvolvido pela **JEOS Sistemas**.  
O sistema é multi-tenant (multi-prefeitura), cada município tendo seu próprio schema isolado no PostgreSQL.

**Tecnologias:**
- **Backend:** Node.js + Express + Sequelize ORM
- **Frontend:** React + Vite + Tailwind CSS + Lucide Icons
- **Banco:** PostgreSQL — banco principal `jprocesso_global`, schemas por tenant: `tenant_iraucuba`, `tenant_teste`, etc.
- **Auth:** JWT — token enviado via `Authorization: Bearer <token>`
- **Tenant:** identificado pelo header `x-tenant-subdomain` em toda requisição autenticada

**URL base da API:** `/api`  
**Porta do servidor:** `5000`

---

## 2. ARQUITETURA MULTI-TENANT

```
jprocesso_global (banco principal)
├── public.clientes          ← tabela de tenants (Sequelize model: Tenant)
└── tenant_iraucuba/         ← schema do município "Iracuba"
│   ├── secretarias
│   ├── setores
│   ├── usuarios
│   ├── processos
│   ├── tramitacoes
│   ├── documentos
│   ├── entidade
│   ├── almoxarifado_itens
│   ├── almoxarifado_movimentacoes
│   ├── almoxarifado_requisicoes
│   ├── almoxarifado_requisicao_itens
│   ├── financeiro_lancamentos
│   ├── did_formularios
│   ├── did_entradas
│   ├── credores                  ← NOVO (módulo Contratos)
│   ├── contratos_itens           ← NOVO (módulo Contratos)
│   ├── contratos                 ← NOVO (módulo Contratos)
│   ├── contratos_itens_vinculo   ← NOVO (módulo Contratos)
│   ├── responsaveis              ← NOVO (módulo Contratos)
│   └── agentes                   ← NOVO (módulo Contratos)
└── tenant_teste/            ← schema de testes (mesmas tabelas)
```

**Como conectar ao tenant:**
```js
// server/config/database.js
const tenantDb = await getTenantConnection('tenant_iraucuba')
// Executa runTenantMigrations() automaticamente — todas as tabelas são criadas se não existirem
```

**runTenantMigrations()** — chamada a cada conexão de tenant, idempotente (usa `IF NOT EXISTS`). Garante:
- Colunas extras em `secretarias` (responsaveis, orcamento, dotacoes, etc.)
- Tabela `entidade`
- Todas as tabelas do módulo Contratos

---

## 3. AUTENTICAÇÃO E AUTORIZAÇÃO

**Login:** `POST /api/auth/login` — retorna `{ token, user, tenant }`

**Headers obrigatórios em toda requisição autenticada:**
```
Authorization: Bearer <jwt_token>
x-tenant-subdomain: iraucuba
```

**Perfis de usuário:**
| Perfil | Descrição |
|--------|-----------|
| `admin` | Acesso total |
| `gestor` | Relatórios + gestão de usuários/secretarias |
| `operacional` | Apenas tramitação de processos |

**Middleware:**
- `authenticate` — valida JWT
- `tenantMiddleware` — resolve tenant pelo header, injeta `req.tenant` e `req.tenantDb`
- `authorize('admin', 'gestor')` — restringe por perfil

**Permissões granulares** (JSONB em `usuarios.permissoes`):
```json
{
  "criar_processo": true,
  "editar_processo": true,
  "excluir_processo": false,
  "tramitar_processo": true,
  "visualizar_relatorios": false,
  "gerenciar_usuarios": false,
  "gerenciar_secretarias": false
}
```

---

## 4. TABELAS DO BANCO DE DADOS

### 4.1 TABELA GLOBAL — `public.clientes` (Tenants)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | |
| nome_municipio | VARCHAR | Nome completo da prefeitura |
| cnpj | VARCHAR(14) UNIQUE | CNPJ da prefeitura |
| subdominio | VARCHAR UNIQUE | Ex: `iraucuba` — usado no header e na URL |
| schema | VARCHAR UNIQUE | Schema PostgreSQL: `tenant_iraucuba` |
| cidade | VARCHAR | |
| estado | VARCHAR(2) | |
| ativo | BOOLEAN | |
| configuracoes | JSONB | Logo, brasão, cores institucionais |

---

### 4.2 TABELAS POR TENANT

#### `secretarias`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | |
| nome | VARCHAR NOT NULL | Nome completo |
| sigla | VARCHAR(10) NOT NULL | Ex: SEJUV |
| descricao | TEXT | |
| data_inicio | DATE | Início da vigência da secretaria |
| data_fim | DATE | Fim da vigência |
| email | VARCHAR | |
| whatsapp | VARCHAR(20) | |
| outros_sistemas | BOOLEAN DEFAULT false | |
| cnpj | VARCHAR(18) | |
| razao_social | VARCHAR(500) | |
| codigo_unidade | VARCHAR(50) | |
| ativo | BOOLEAN DEFAULT true | |
| **responsaveis** | **JSONB** | **Lista de responsáveis por período: `[{nome, cargo, cpf, data_inicio, data_fim}]`** |
| **orcamento** | **JSONB** | **`{exercicio, valor_loa, valor_suplementado, valor_reduzido}`** |
| **dotacoes** | **JSONB** | **`[{id, codigo, descricao, elemento_despesa, fonte_recurso, valor_previsto}]`** |

> ⚠️ `responsaveis` é o campo chave do módulo de Contratos. O campo Fiscal de um contrato é preenchido com o nome do responsável **cuja vigência (`data_inicio`↔`data_fim`) cobre a data de início do contrato**.

#### `setores`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | |
| nome | VARCHAR | |
| sigla | VARCHAR(10) | |
| descricao | TEXT | |
| secretariaId | UUID FK → secretarias.id | |
| ativo | BOOLEAN | |

#### `usuarios`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | |
| nome | VARCHAR | |
| email | VARCHAR UNIQUE | Para login |
| cpf | VARCHAR(11) UNIQUE | Para login (sem pontuação) |
| senha | VARCHAR | bcrypt |
| telefone | VARCHAR(11) | |
| tipo | ENUM | `admin`, `gestor`, `operacional` |
| ativo | BOOLEAN | |
| secretariaId | UUID FK → secretarias | |
| setorId | UUID FK → setores | |
| permissoes | JSONB | Ver seção 3 |
| ultimoAcesso | TIMESTAMP | |

#### `processos`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | |
| numero | VARCHAR UNIQUE | Formato: `2026.0001` |
| ano | INTEGER | |
| sequencial | INTEGER | Sequencial dentro do ano |
| assunto | VARCHAR | Título/resumo |
| descricao | TEXT | Detalhamento |
| interessado_nome | VARCHAR | |
| interessado_cpf_cnpj | VARCHAR(14) | Sem pontuação |
| interessado_email | VARCHAR | |
| interessado_telefone | VARCHAR(11) | |
| status | ENUM | `aberto`, `em_analise`, `pendente`, `devolvido`, `concluido`, `arquivado` |
| setor_atual_id | UUID FK → setores | |
| usuario_atual_id | UUID FK → usuarios | |
| qrcode | TEXT | Base64 para consulta pública |
| prioridade | ENUM | `baixa`, `normal`, `alta`, `urgente` |
| data_abertura | DATE | |

#### `tramitacoes`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | |
| processo_id | UUID FK | |
| origem_usuario_id | UUID FK | |
| origem_setor_id | UUID FK | |
| destino_setor_id | UUID FK | |
| destino_usuario_id | UUID FK | |
| tipo_acao | ENUM | `abertura`, `tramite`, `devolucao`, `conclusao`, `arquivamento` |
| despacho | TEXT | Parecer/análise |
| justificativa_devolucao | TEXT | Obrigatório quando `tipo_acao = devolucao` |
| data_hora | TIMESTAMP | |
| ip_origem | VARCHAR | Para auditoria |

#### `entidade`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | SERIAL PK | Sempre registro único id=1 |
| nome | VARCHAR(500) | Nome da prefeitura/entidade |
| nome_abreviado | VARCHAR(100) | |
| cnpj | VARCHAR(18) | |
| razao_social | VARCHAR(500) | |
| codigo_unidade | VARCHAR(50) | |
| esfera | VARCHAR(50) | Municipal/Estadual/Federal |
| poder | VARCHAR(50) | Executivo/Legislativo |
| email | VARCHAR | |
| telefone | VARCHAR(20) | |
| whatsapp | VARCHAR(20) | |
| cep, logradouro, numero, complemento, bairro, cidade, uf | VARCHAR | Endereço completo |

---

### 4.3 MÓDULO ALMOXARIFADO

#### `almoxarifado_itens`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | |
| codigo | VARCHAR UNIQUE | Ex: MAT-001 |
| nome | VARCHAR | |
| descricao | TEXT | |
| unidade | VARCHAR(10) | UN, KG, L, CX, M, etc. |
| categoria | VARCHAR | |
| estoque_atual | DECIMAL(10,3) | |
| estoque_minimo | DECIMAL(10,3) | Nível de alerta |
| estoque_maximo | DECIMAL(10,3) | |
| valor_unitario | DECIMAL(10,2) | Valor médio |
| localizacao | VARCHAR | Ex: Prateleira A3 |
| ativo | BOOLEAN | |

#### `almoxarifado_movimentacoes`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | |
| item_id | UUID FK | |
| tipo | ENUM | `ENTRADA`, `SAIDA` |
| quantidade | DECIMAL(10,3) | |
| valor_unitario | DECIMAL(10,2) | |
| valor_total | DECIMAL(10,2) | |
| data_movimentacao | DATE | |
| documento_referencia | VARCHAR | NF, empenho, requisição |
| observacao | TEXT | |
| requisicao_id | UUID FK | Para saídas originadas de requisição |
| usuario_id | UUID FK | |

#### `almoxarifado_requisicoes` e `almoxarifado_requisicao_itens`
Tabelas de requisição de materiais com controle de status (`pendente`, `atendida`, `cancelada`).

---

### 4.4 MÓDULO FINANCEIRO

#### `financeiro_lancamentos`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | |
| processo_id | UUID FK | Processo DID vinculado (opcional) |
| numero_documento | VARCHAR(50) | NF, empenho, contrato |
| tipo | ENUM | `empenho`, `liquidacao`, `pagamento`, `receita`, `outros` |
| categoria | VARCHAR(50) | material, servicos, pessoal, obras, outros |
| fornecedor_nome | VARCHAR | |
| fornecedor_cpf_cnpj | VARCHAR(14) | |
| descricao | VARCHAR | |
| valor | DECIMAL(15,2) | |
| data_lancamento | DATE | |
| data_vencimento | DATE | |
| data_pagamento | DATE | |
| status | ENUM | `pendente`, `pago`, `cancelado`, `vencido` |
| setor_id | UUID FK | |
| usuario_id | UUID FK | |

---

### 4.5 MÓDULO DID (Documento de Instrução de Despesa)

#### `did_formularios`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | |
| processo_id | UUID FK | Opcional |
| numero_did | VARCHAR(30) | Ex: DID-2026/0078 |
| tipo_did | ENUM | `fixas` (contas fixas × meses), `variadas` (itens com qtd) |
| objeto | VARCHAR | Ex: LOCAÇÃO DE IMPRESSORA |
| empresa_fornecedor | VARCHAR | |
| cnpj_empresa | VARCHAR(18) | |
| modalidade_licitacao | VARCHAR(100) | Dispensa, Pregão Eletrônico, etc. |
| numero_contrato | VARCHAR(60) | |
| periodo_referencia | VARCHAR(30) | Ex: ABRIL/2026 |
| status | ENUM | `rascunho`, `aberto`, `fechado`, `aprovado`, `cancelado` |
| observacoes | TEXT | |
| fonte_recurso_tipo | VARCHAR(50) | PRÓPRIO, FEDERAL, ESTADUAL |
| data_did | DATE | |
| secretario | VARCHAR(150) | Nome do(a) secretário(a) |

#### `did_entradas`
Uma entrada por secretaria dentro de um DID. Contém os dados preenchidos pela secretaria (lotes, itens, valores, aprovações).

---

### 4.6 MÓDULO CONTRATOS ← NOVO (criado em 12/03/2026)

#### `credores`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | SERIAL PK | |
| tipo | VARCHAR(10) DEFAULT 'Jurídica' | `Jurídica` ou `Física` |
| razao_social | VARCHAR(500) NOT NULL | Em maiúsculas |
| nome_fantasia | VARCHAR(500) | Apenas para PJ |
| cnpj_cpf | VARCHAR(20) NOT NULL UNIQUE | Formatado com máscara |
| email | VARCHAR | |
| telefone | VARCHAR(20) | |
| celular | VARCHAR(20) | |
| cep | VARCHAR(9) | |
| logradouro | VARCHAR(500) | Em maiúsculas |
| numero | VARCHAR(20) | |
| complemento | VARCHAR(200) | |
| bairro | VARCHAR(200) | |
| cidade | VARCHAR(200) | |
| uf | VARCHAR(2) | |
| status | VARCHAR(20) DEFAULT 'ATIVO' | `ATIVO` ou `INATIVO` |

#### `contratos_itens` (Catálogo de Itens de Contratação)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | SERIAL PK | |
| codigo | VARCHAR(10) UNIQUE | Código sequencial ex: 00001 |
| descricao | VARCHAR(500) NOT NULL | Nomenclatura em MAIÚSCULAS |
| categoria | VARCHAR(20) | `COMPRAS` ou `SERVIÇOS` |
| unidade_medida | VARCHAR(50) | Ex: UNIDADE, KG, LITRO |
| catalogo | VARCHAR(50) | Código CNBS (Catálogo Nacional de Bens e Serviços) |
| classificacao | VARCHAR(200) | |
| subclassificacao | VARCHAR(200) | |
| especificacao | TEXT | Especificação técnica detalhada |
| palavra1..palavra4 | VARCHAR(200) | Palavras-chave para busca |
| catmat_serv | VARCHAR(100) | Código CatMat/Serv |
| status | VARCHAR(20) DEFAULT 'ATIVO' | `ATIVO`, `INATIVO`, `EXCLUÍDO` |
| validado | BOOLEAN DEFAULT false | Se o item foi validado pela gestão |

#### `contratos`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | SERIAL PK | |
| tipo_contrato | VARCHAR(50) | `CONTRATO`, `ATA DE REGISTRO DE PREÇO`, `TERMO ADITIVO`, `CONVÊNIO`, `ACORDO`, `OUTRO` |
| numero_contrato | VARCHAR(50) NOT NULL UNIQUE | Ex: 001/2026 |
| objeto | TEXT NOT NULL | Em maiúsculas |
| modalidade | VARCHAR(100) | `PREGÃO ELETRÔNICO`, `PREGÃO PRESENCIAL`, `CONCORRÊNCIA`, `TOMADA DE PREÇOS`, `CONVITE`, `DISPENSA`, `INEXIGIBILIDADE`, `DISPENSADA`, `OUTRO` |
| numero_licitacao | VARCHAR(100) | Ex: PE 012/2026 |
| credor_id | INTEGER NOT NULL FK → credores.id | |
| valor | NUMERIC(15,2) | Calculado a partir dos itens quando há itens vinculados |
| vigencia_inicio | DATE | |
| vigencia_fim | DATE | |
| data_assinatura | DATE | |
| secretaria | VARCHAR(200) | Sigla ou nome da secretaria |
| fiscal | VARCHAR(500) | Nome do fiscal — **obrigatoriamente dentro do período de nomeação do responsável** |
| observacoes | TEXT | |
| status | VARCHAR(20) DEFAULT 'ATIVO' | `ATIVO`, `ENCERRADO`, `SUSPENSO`, `RESCINDIDO` |
| dias_alerta | INTEGER DEFAULT 30 | Alertar X dias antes do vencimento |

#### `contratos_itens_vinculo` (Itens de cada Contrato)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | SERIAL PK | |
| contrato_id | INTEGER NOT NULL FK → contratos.id CASCADE | |
| item_id | INTEGER FK → contratos_itens.id | NULL = item manual sem catálogo |
| lote | VARCHAR(20) | Número do lote |
| descricao | VARCHAR(500) | Cópia ou manual |
| unidade | VARCHAR(50) | |
| quantidade | NUMERIC(15,4) | |
| valor_unitario | NUMERIC(15,4) | |
| valor_total | NUMERIC(15,4) GENERATED | `quantidade × valor_unitario` (coluna computada) |
| ordem | INTEGER DEFAULT 0 | Ordenação |

#### `responsaveis` (Tabela relacional de titulares por secretaria)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | SERIAL PK | |
| secretaria_id | UUID FK → secretarias.id | |
| nome | VARCHAR(500) NOT NULL | |
| cargo | VARCHAR(300) | |
| cpf | VARCHAR(14) | |
| email | VARCHAR(255) | |
| telefone | VARCHAR(20) | |
| data_inicio | DATE | Início da nomeação |
| data_fim | DATE | Fim da nomeação (NULL = ainda ativo) |
| ativo | BOOLEAN DEFAULT true | |

> Nota: A tabela `responsaveis` é a versão relacional dos dados que também existem como JSONB em `secretarias.responsaveis`. Ambas coexistem.

#### `agentes` (Agentes públicos fiscais de contrato)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | SERIAL PK | |
| nome | VARCHAR(500) NOT NULL | |
| cargo | VARCHAR(300) | |
| matricula | VARCHAR(50) | |
| cpf | VARCHAR(14) | |
| email | VARCHAR(255) | |
| telefone | VARCHAR(20) | |
| secretaria_id | UUID FK → secretarias.id | |
| ativo | BOOLEAN DEFAULT true | |

---

## 5. ROTAS DA API

### Auth — `/api/auth`
| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| POST | `/login` | Pública | Login com CPF + senha + subdomínio |
| POST | `/register` | admin | Cadastrar usuário |
| GET | `/profile` | Autenticado | Perfil do usuário logado |
| GET | `/users` | Autenticado | Listar usuários do tenant |
| PUT | `/users/:id` | Autenticado | Atualizar usuário |
| DELETE | `/users/:id` | Autenticado | Excluir usuário |

### Organização — `/api/organizacao`
| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| POST | `/secretarias` | admin, gestor | Criar secretaria |
| GET | `/secretarias` | Autenticado | Listar secretarias (inclui campo `responsaveis` JSONB) |
| GET | `/secretarias/:id/setores` | Autenticado | Setores de uma secretaria |
| PUT | `/secretarias/:id` | admin, gestor | Atualizar secretaria |
| DELETE | `/secretarias/:id` | admin | Excluir secretaria |
| POST | `/setores` | admin, gestor | Criar setor |
| GET | `/setores` | Autenticado | Listar setores |
| GET | `/setores/:id/usuarios` | Autenticado | Usuários de um setor |
| PUT | `/setores/:id` | admin, gestor | Atualizar setor |
| DELETE | `/setores/:id` | admin | Excluir setor |
| GET | `/entidade` | Autenticado | Dados da entidade municipal |
| PUT | `/entidade` | admin, gestor | Atualizar entidade |

### Processos — `/api/processos`
| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| POST | `/` | Autenticado | Criar processo (gera número automático AAAA.NNNN) |
| GET | `/` | Autenticado | Caixa de entrada — processos do setor/usuário atual |
| GET | `/enviados` | Autenticado | Processos enviados |
| GET | `/:id` | Autenticado | Detalhes do processo + tramitações |
| POST | `/:id/tramitar` | Autenticado | Tramitar para outro setor |
| POST | `/:id/devolver` | Autenticado | Devolver (requer justificativa) |
| POST | `/:id/concluir` | Autenticado | Concluir processo |
| GET | `/publico/:numero` | Pública | Consulta pública por número |

### Almoxarifado — `/api/almoxarifado`
| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| GET | `/dashboard` | Autenticado | Resumo do estoque |
| GET | `/itens` | Autenticado | Listar itens |
| POST | `/itens` | Autenticado | Criar item |
| PUT | `/itens/:id` | Autenticado | Atualizar item |
| DELETE | `/itens/:id` | Autenticado | Excluir item |
| GET | `/categorias` | Autenticado | Listar categorias |
| GET | `/movimentacoes` | Autenticado | Histórico de movimentações |
| POST | `/movimentacoes/entrada` | Autenticado | Registrar entrada de material |
| POST | `/movimentacoes/saida` | Autenticado | Registrar saída de material |
| GET | `/requisicoes` | Autenticado | Listar requisições |
| POST | `/requisicoes` | Autenticado | Criar requisição |
| PUT | `/requisicoes/:id/atender` | Autenticado | Atender requisição |
| PUT | `/requisicoes/:id/cancelar` | Autenticado | Cancelar requisição |

### Financeiro — `/api/financeiro`
| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| GET | `/dashboard` | Autenticado | Painel financeiro |
| GET | `/lancamentos` | Autenticado | Listar lançamentos |
| POST | `/lancamentos` | Autenticado | Criar lançamento |
| PUT | `/lancamentos/:id` | Autenticado | Atualizar lançamento |
| DELETE | `/lancamentos/:id` | Autenticado | Excluir lançamento |
| PUT | `/lancamentos/:id/pagar` | Autenticado | Marcar como pago |
| GET | `/processos-did` | Autenticado | Processos DID vinculáveis |
| GET | `/relatorio` | Autenticado | Relatório financeiro |

### DID — `/api/did`
| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| GET | `/` | Autenticado | Listar todos os DIDs |
| GET | `/processo/:processoId` | Autenticado | DID vinculado a um processo |
| POST | `/processo/:processoId` | Autenticado | Criar DID vinculado a processo |
| GET | `/:id` | Autenticado | Buscar DID por ID |
| POST | `/` | Autenticado | Criar DID avulso |
| PUT | `/:id/entrada/:entradaId` | Autenticado | Salvar/atualizar entrada de secretaria |
| POST | `/:id/entrada` | Autenticado | Adicionar secretaria ao DID |
| PATCH | `/:id/status` | Autenticado | Alterar status do DID |
| PUT | `/:id/tramitacao` | Autenticado | Salvar tramitação completa (Seções I-VI) |

### ⚠️ Módulo Contratos — SEM rotas backend ainda
> As rotas de contratos (`/api/contratos`, `/api/credores`, etc.) **ainda não foram implementadas no backend**.  
> O frontend `Contratos.jsx` usa `localStorage` como persistência temporária.  
> As tabelas no banco estão criadas e prontas para receber as rotas.  
> Para criar as rotas, seguir o padrão dos outros módulos: controller → route → register em `server/routes/index.js`.

---

## 6. FRONTEND — PÁGINAS E MÓDULOS

### Rotas do React
```
/                          → LoginAdmin (login de super-admin)
/admin                     → AdminTenants (gestão de municípios)
/:subdomain/login          → Login (login do município)
/:subdomain/consulta/:num  → ConsultaPublica (pública)
/:subdomain                → Dashboard
/:subdomain/processos      → Processos (caixa de entrada)
/:subdomain/processos/novo → NovoProcesso
/:subdomain/processos/:id  → DetalhesProcesso
/:subdomain/processos/:id/did → FormularioDid
/:subdomain/enviados       → Enviados
/:subdomain/secretarias    → Secretarias
/:subdomain/usuarios       → Usuarios
/:subdomain/almoxarifado   → Almoxarifado
/:subdomain/financeiro     → Financeiro
/:subdomain/contratos      → Contratos (3 abas: Itens, Credor, Contratos)
/:subdomain/relatorios     → Relatorios
/:subdomain/configuracoes  → Configuracoes
```

### Módulo Contratos (`Contratos.jsx`) — Detalhado

**3 abas:**

**1. Aba "Itens" — Catálogo de itens de contratação**
- CRUD completo com `localStorage` (pendente API)
- Campos: codigo, descricao, categoria, unidade_medida, catalogo (CNBS), classificacao, subclassificacao, especificacao, palavra1-4, catmat_serv, status, validado
- Status possíveis: `ATIVO`, `INATIVO`, `EXCLUÍDO`
- Integração futura com JAI (IA — componente `JAIButton`) para sugestão de descrição, especificação e palavras-chave

**2. Aba "Credor" — Cadastro de credores**
- CRUD completo com `localStorage` (pendente API)
- Consulta automática de CNPJ via BrasilAPI (`https://brasilapi.com.br/api/cnpj/v1/{cnpj}`)
- Validação algorítmica de CNPJ e CPF
- Máscaras automáticas: CNPJ, CPF, telefone, CEP

**3. Aba "Contratos" — Contratos e atas**
- CRUD completo com `localStorage` (pendente API)
- Tipos: `CONTRATO`, `ATA DE REGISTRO DE PREÇO`, `TERMO ADITIVO`, `CONVÊNIO`, `ACORDO`, `OUTRO`
- Modalidades: `PREGÃO ELETRÔNICO`, `PREGÃO PRESENCIAL`, `CONCORRÊNCIA`, `TOMADA DE PREÇOS`, `CONVITE`, `DISPENSA`, `INEXIGIBILIDADE`, `DISPENSADA`, `OUTRO`
- **Alerta de vencimento:** calculado automaticamente — `🔴 Vencido`, `🟡 Próximo do vencimento`, `🟢 Vigente`
- **Itens inline:** grid editável com busca no catálogo; valor total calculado automaticamente
- **Credor:** busca com autocomplete nos credores cadastrados
- **Secretaria:** busca via API real (`GET /api/organizacao/secretarias`)
- **Fiscal:** `<select>` filtrado pelos responsáveis da secretaria selecionada  
  → Apenas responsáveis **dentro do período de nomeação** para a data de vigência do contrato aparecem ativos  
  → Responsáveis fora do período aparecem desabilitados com `⛔` e o intervalo de vigência  
  → Se a data de vigência mudar e o fiscal sair do período, ele é automaticamente limpo

---

## 7. COMPONENTES COMPARTILHADOS

### `JAI.jsx` — Assistente de IA Integrado
Componente flutuante disponível em todas as páginas. Acessa dados do tenant via contexto.

### `JAIButton` (dentro de Contratos.jsx)
Botão inline nos formulários de itens para sugerir texto via IA. Props: `campo`, `valorAtual`, `onSugestao`, `label`.

### `Layout.jsx`
Shell principal autenticado. Inclui:
- Sidebar com todos os itens de menu
- Relógio em tempo real
- IP e localização do usuário (via `ipapi.co`)
- Tema claro/escuro
- Componente `JAI`

### `AuthContext.jsx`
Provê: `user`, `tenant`, `login(data)`, `logout()`

### `ThemeContext.jsx`  
Provê: `theme` (`light`/`dark`), `toggleTheme()`

---

## 8. REGRAS DE NEGÓCIO IMPORTANTES

### Processos
- Numeração automática no formato `AAAA.NNNN` (trigger PostgreSQL `gerar_numero_processo`)
- QR Code gerado na abertura para consulta pública
- Devolução exige justificativa

### Secretarias e Responsáveis
- O campo `responsaveis` em `secretarias` é um array JSONB: `[{nome, cargo, cpf, data_inicio, data_fim}]`
- `data_fim = null` significa que o responsável está ativo indefinidamente
- Para determinar o fiscal de um contrato: buscar o responsável cuja `data_inicio <= data_vigencia_contrato <= data_fim`

### Contratos
- `contratos_itens_vinculo.valor_total` é coluna **GENERATED** (computada no banco): `quantidade × valor_unitario`
- O `valor` em `contratos` deve ser atualizado para refletir a soma dos itens quando houver itens vinculados
- O campo `fiscal` armazena apenas o **nome** do responsável (sem cargo)
- Índice único em `contratos.numero_contrato` — não pode haver dois contratos com o mesmo número

### Tenant Isolation
- Todo acesso ao banco usa `SET search_path = "tenant_schema"` antes de queries
- Um tenant nunca consegue acessar dados de outro tenant
- O `tenantMiddleware` injeta `req.tenantDb` e `req.tenant` em todas as rotas protegidas

---

## 9. VARIÁVEIS DE AMBIENTE (`.env`)

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jprocesso_global
DB_USER=postgres
DB_PASSWORD=<senha>
DB_SCHEMA=public
JWT_SECRET=<secret>
PORT=5000
NODE_ENV=development
USE_MOCK_AUTH=false         # true = sem banco, login mock CPF:00000000000 senha:123456
```

---

## 10. ESTADO ATUAL DO DESENVOLVIMENTO

| Módulo | Backend | Frontend | Banco |
|--------|---------|----------|-------|
| Auth / Usuários | ✅ | ✅ | ✅ |
| Secretarias / Setores | ✅ | ✅ | ✅ |
| Processos / Tramitação | ✅ | ✅ | ✅ |
| Documentos | ✅ | ✅ | ✅ |
| DID | ✅ | ✅ | ✅ |
| Almoxarifado | ✅ | ✅ | ✅ |
| Financeiro | ✅ | ✅ | ✅ |
| Entidade | ✅ | ✅ | ✅ |
| **Contratos — Itens** | ❌ pendente | ✅ (localStorage) | ✅ |
| **Contratos — Credores** | ❌ pendente | ✅ (localStorage) | ✅ |
| **Contratos — Contratos** | ❌ pendente | ✅ (localStorage) | ✅ |
| **Responsáveis (tabela)** | ❌ pendente | via JSONB secretarias | ✅ |
| **Agentes** | ❌ pendente | ❌ pendente | ✅ |

**Próximos passos priorizados:**
1. Criar `server/controllers/contratosController.js` com CRUD para credores, itens e contratos
2. Criar `server/routes/contratos.js` e registrar em `server/routes/index.js`
3. Substituir `localStorage` em `Contratos.jsx` por chamadas à API

---

## 11. PADRÃO DE CÓDIGO

### Backend — Controller padrão
```js
const minhaFuncao = async (req, res) => {
  try {
    const { tenantDb, tenant } = req
    await tenantDb.query(`SET search_path = "${tenant.schema}"`)
    const [rows] = await tenantDb.query(`SELECT * FROM minha_tabela`, { type: 'SELECT' })
    res.json({ data: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro interno' })
  }
}
```

### Frontend — Chamada de API padrão
```js
import api from '../services/api'
// Header x-tenant-subdomain é adicionado automaticamente pelo interceptor
const { data } = await api.get('/organizacao/secretarias')
const { data } = await api.post('/contratos/credores', payload)
```
