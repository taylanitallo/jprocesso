-- ============================================================
--  JPROCESSO — SCRIPT DE MIGRAÇÃO INCREMENTAL
--  Gerado automaticamente com base nos models do backend
-- ------------------------------------------------------------
--  INSTRUÇÕES:
--  1. Abra o pgAdmin > banco jprocesso_global > Query Tool
--  2. Execute a PARTE 0 (funções auxiliares) UMA VEZ
--  3. Para cada tenant, substitua 'tenant_iraucuba' pelo
--     schema correto e execute as PARTES 1, 2 e 3
--
--  ⚠️  O script é IDEMPOTENTE: pode ser executado mais
--      de uma vez sem duplicar dados ou causar erros.
-- ============================================================


-- ============================================================
-- PARTE 0 — TABELA GLOBAL (execute no schema "public")
-- ============================================================
-- Verificação: garante que a coluna "configuracoes" existe em
-- clientes (adicionada em versão mais recente do Tenant model)
SET search_path = public;

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS configuracoes JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Recria função de atualização de updated_at (usada nos schemas)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- ▼▼▼ EXECUTE A PARTIR DAQUI PARA CADA SCHEMA DE TENANT ▼▼▼
-- Altere 'tenant_iraucuba' para o seu schema antes de rodar
-- ============================================================
SET search_path = "tenant_iraucuba";


-- ============================================================
-- PARTE 1 — ALTERAÇÕES EM TABELAS EXISTENTES
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1.1  secretarias
--      Novas colunas adicionadas no módulo Organização
-- ────────────────────────────────────────────────────────────
ALTER TABLE secretarias
  ADD COLUMN IF NOT EXISTS data_inicio     DATE,
  ADD COLUMN IF NOT EXISTS data_fim        DATE,
  ADD COLUMN IF NOT EXISTS email           VARCHAR(255),
  ADD COLUMN IF NOT EXISTS whatsapp        VARCHAR(20),
  ADD COLUMN IF NOT EXISTS outros_sistemas BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cnpj            VARCHAR(18),
  ADD COLUMN IF NOT EXISTS razao_social    VARCHAR(500),
  ADD COLUMN IF NOT EXISTS codigo_unidade  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS responsaveis    JSONB        NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS orcamento       JSONB        NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS dotacoes        JSONB        NOT NULL DEFAULT '[]'::jsonb;

-- ────────────────────────────────────────────────────────────
-- 1.2  setores
--      sigla passou a ser opcional no model (era NOT NULL)
-- ────────────────────────────────────────────────────────────
ALTER TABLE setores
  ALTER COLUMN sigla DROP NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 1.3  usuarios
--      Nova coluna de permissões granulares
-- ────────────────────────────────────────────────────────────
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS permissoes JSONB NOT NULL DEFAULT '{
    "criar_processo":        true,
    "editar_processo":       true,
    "excluir_processo":      false,
    "tramitar_processo":     true,
    "visualizar_relatorios": false,
    "gerenciar_usuarios":    false,
    "gerenciar_secretarias": false
  }'::jsonb;

-- ────────────────────────────────────────────────────────────
-- 1.4  processos
--      Nova coluna tipo_processo (Requisição, DID, Pauta…)
-- ────────────────────────────────────────────────────────────
ALTER TABLE processos
  ADD COLUMN IF NOT EXISTS tipo_processo VARCHAR(30);

-- ────────────────────────────────────────────────────────────
-- 1.5  tramitacoes
--      O model usa "tipo_acao" (ENUM renomeado) e dois campos
--      novos. A coluna original "tipo" é mantida para não
--      quebrar dados existentes.
-- ────────────────────────────────────────────────────────────
ALTER TABLE tramitacoes
  ADD COLUMN IF NOT EXISTS tipo_acao               VARCHAR(30)
    CHECK (tipo_acao IN ('abertura','tramite','devolucao','conclusao','arquivamento')),
  ADD COLUMN IF NOT EXISTS justificativa_devolucao TEXT,
  ADD COLUMN IF NOT EXISTS assinatura_digital      VARCHAR(255);

-- Migra valores existentes de "tipo" → "tipo_acao" (só executa se a coluna "tipo" existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name   = 'tramitacoes'
       AND column_name  = 'tipo'
  ) THEN
    UPDATE tramitacoes
       SET tipo_acao = CASE tipo
         WHEN 'abertura'     THEN 'abertura'
         WHEN 'tramitacao'   THEN 'tramite'
         WHEN 'devolucao'    THEN 'devolucao'
         WHEN 'conclusao'    THEN 'conclusao'
         WHEN 'arquivamento' THEN 'arquivamento'
         ELSE tipo
       END
     WHERE tipo_acao IS NULL
       AND tipo IS NOT NULL;
  END IF;
END $$;

-- Após validar que tipo_acao está populado, pode torná-la NOT NULL
-- (descomente com cautela após verificar os dados):
-- ALTER TABLE tramitacoes ALTER COLUMN tipo_acao SET NOT NULL;


-- ============================================================
-- PARTE 2 — CRIAÇÃO DE TABELAS NOVAS
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 2.1  entidade
--      Dados da prefeitura/órgão (aba Entidade no módulo Organização)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entidade (
  id             SERIAL PRIMARY KEY,
  nome           VARCHAR(500),
  nome_abreviado VARCHAR(100),
  cnpj           VARCHAR(18),
  razao_social   VARCHAR(500),
  codigo_unidade VARCHAR(50),
  esfera         VARCHAR(50),
  poder          VARCHAR(50),
  email          VARCHAR(255),
  telefone       VARCHAR(20),
  whatsapp       VARCHAR(20),
  cep            VARCHAR(9),
  logradouro     VARCHAR(500),
  numero         VARCHAR(20),
  complemento    VARCHAR(200),
  bairro         VARCHAR(200),
  cidade         VARCHAR(200),
  uf             VARCHAR(2),
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Garante que sempre exista exatamente 1 registo (singleton)
INSERT INTO entidade (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 2.2  anexos
--      Documentos anexados a processos (model Documento,
--      tableName: 'anexos'). Diferente da tabela "documentos"
--      do setup original — contém dois hashes e versão.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anexos (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id   UUID    NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  nome_arquivo  VARCHAR(255) NOT NULL,
  nome_sistema  VARCHAR(255) NOT NULL,
  url_arquivo   VARCHAR(500) NOT NULL,
  tipo_mime     VARCHAR(100) NOT NULL,
  tamanho_bytes INTEGER     NOT NULL,
  hash_md5      VARCHAR(64) NOT NULL,
  hash_sha256   VARCHAR(64) NOT NULL,
  upload_por_id UUID        NOT NULL REFERENCES usuarios(id),
  data_upload   TIMESTAMP   NOT NULL DEFAULT NOW(),
  descricao     TEXT,
  versao        INTEGER     NOT NULL DEFAULT 1,
  "createdAt"   TIMESTAMP   NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anexos_processo_id  ON anexos(processo_id);
CREATE INDEX IF NOT EXISTS idx_anexos_upload_por   ON anexos(upload_por_id);
CREATE INDEX IF NOT EXISTS idx_anexos_hash_sha256  ON anexos(hash_sha256);

-- ────────────────────────────────────────────────────────────
-- 2.3  almoxarifado_itens
--      Catálogo de materiais do almoxarifado
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS almoxarifado_itens (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo         VARCHAR(50)  NOT NULL UNIQUE,
  nome           VARCHAR(255) NOT NULL,
  descricao      TEXT,
  unidade        VARCHAR(10)  NOT NULL DEFAULT 'UN',
  categoria      VARCHAR(100),
  estoque_atual  DECIMAL(10,3) NOT NULL DEFAULT 0,
  estoque_minimo DECIMAL(10,3) NOT NULL DEFAULT 0,
  estoque_maximo DECIMAL(10,3),
  valor_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  localizacao    VARCHAR(200),
  ativo          BOOLEAN      NOT NULL DEFAULT true,
  created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_almox_itens_codigo    ON almoxarifado_itens(codigo);
CREATE INDEX IF NOT EXISTS idx_almox_itens_categoria ON almoxarifado_itens(categoria);
CREATE INDEX IF NOT EXISTS idx_almox_itens_ativo     ON almoxarifado_itens(ativo);

-- ────────────────────────────────────────────────────────────
-- 2.4  almoxarifado_movimentacoes
--      Registro de entradas e saídas de estoque
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS almoxarifado_movimentacoes (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id              UUID          NOT NULL REFERENCES almoxarifado_itens(id),
  tipo                 VARCHAR(10)   NOT NULL CHECK (tipo IN ('ENTRADA','SAIDA')),
  quantidade           DECIMAL(10,3) NOT NULL,
  valor_unitario       DECIMAL(10,2) NOT NULL DEFAULT 0,
  valor_total          DECIMAL(10,2) NOT NULL DEFAULT 0,
  data_movimentacao    DATE          NOT NULL,
  documento_referencia VARCHAR(100),
  observacao           TEXT,
  requisicao_id        UUID,
  usuario_id           UUID          NOT NULL REFERENCES usuarios(id),
  created_at           TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_almox_mov_item_id ON almoxarifado_movimentacoes(item_id);
CREATE INDEX IF NOT EXISTS idx_almox_mov_tipo    ON almoxarifado_movimentacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_almox_mov_data    ON almoxarifado_movimentacoes(data_movimentacao);

-- ────────────────────────────────────────────────────────────
-- 2.5  almoxarifado_requisicoes
--      Pedidos de material por setor
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS almoxarifado_requisicoes (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero                 VARCHAR(50) NOT NULL UNIQUE,
  setor_id               UUID        NOT NULL REFERENCES setores(id),
  usuario_solicitante_id UUID        NOT NULL REFERENCES usuarios(id),
  status                 VARCHAR(20) NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE','APROVADA','PARCIAL','ATENDIDA','CANCELADA')),
  data_solicitacao       DATE        NOT NULL,
  data_atendimento       DATE,
  observacao             TEXT,
  usuario_atendente_id   UUID        REFERENCES usuarios(id),
  created_at             TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_almox_req_setor  ON almoxarifado_requisicoes(setor_id);
CREATE INDEX IF NOT EXISTS idx_almox_req_status ON almoxarifado_requisicoes(status);

-- Adiciona FK retroativa na movimentações (após requisições existirem)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
     WHERE constraint_name = 'fk_almox_mov_req'
       AND table_name = 'almoxarifado_movimentacoes'
  ) THEN
    ALTER TABLE almoxarifado_movimentacoes
      ADD CONSTRAINT fk_almox_mov_req
      FOREIGN KEY (requisicao_id)
      REFERENCES almoxarifado_requisicoes(id);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 2.6  almoxarifado_requisicao_itens
--      Itens dentro de cada requisição
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS almoxarifado_requisicao_itens (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicao_id         UUID          NOT NULL REFERENCES almoxarifado_requisicoes(id) ON DELETE CASCADE,
  item_id               UUID          NOT NULL REFERENCES almoxarifado_itens(id),
  quantidade_solicitada DECIMAL(10,3) NOT NULL,
  quantidade_atendida   DECIMAL(10,3) NOT NULL DEFAULT 0,
  observacao            TEXT,
  created_at            TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_almox_req_itens_req  ON almoxarifado_requisicao_itens(requisicao_id);
CREATE INDEX IF NOT EXISTS idx_almox_req_itens_item ON almoxarifado_requisicao_itens(item_id);

-- ────────────────────────────────────────────────────────────
-- 2.7  financeiro_lancamentos
--      Empenhos, liquidações, pagamentos e receitas
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financeiro_lancamentos (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id         UUID          REFERENCES processos(id),
  numero_documento    VARCHAR(50),
  tipo                VARCHAR(20)   NOT NULL DEFAULT 'outros'
    CHECK (tipo IN ('empenho','liquidacao','pagamento','receita','outros')),
  categoria           VARCHAR(50),
  fornecedor_nome     VARCHAR(255),
  fornecedor_cpf_cnpj VARCHAR(14),
  descricao           VARCHAR(500)  NOT NULL,
  valor               DECIMAL(15,2) NOT NULL DEFAULT 0,
  data_lancamento     DATE          NOT NULL,
  data_vencimento     DATE,
  data_pagamento      DATE,
  status              VARCHAR(20)   NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','pago','cancelado','vencido')),
  setor_id            UUID          REFERENCES setores(id),
  usuario_id          UUID          NOT NULL REFERENCES usuarios(id),
  observacao          TEXT,
  created_at          TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fin_lanc_tipo     ON financeiro_lancamentos(tipo);
CREATE INDEX IF NOT EXISTS idx_fin_lanc_status   ON financeiro_lancamentos(status);
CREATE INDEX IF NOT EXISTS idx_fin_lanc_data     ON financeiro_lancamentos(data_lancamento);
CREATE INDEX IF NOT EXISTS idx_fin_lanc_setor    ON financeiro_lancamentos(setor_id);
CREATE INDEX IF NOT EXISTS idx_fin_lanc_processo ON financeiro_lancamentos(processo_id);

-- ────────────────────────────────────────────────────────────
-- 2.8  did_formularios
--      Formulário DID com 6 seções (Geral, CI, Compras,
--      Contábil, Finanças, Tesouraria) + descontos
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS did_formularios (
  id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id            UUID          REFERENCES processos(id),
  numero_did             VARCHAR(30)   NOT NULL,
  tipo_did               VARCHAR(10)   NOT NULL DEFAULT 'variadas'
    CHECK (tipo_did IN ('fixas','variadas')),
  objeto                 VARCHAR(500)  NOT NULL,
  empresa_fornecedor     VARCHAR(255),
  cnpj_empresa           VARCHAR(18),
  modalidade_licitacao   VARCHAR(100),
  numero_contrato        VARCHAR(60),
  periodo_referencia     VARCHAR(30)   NOT NULL,
  status                 VARCHAR(20)   NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('rascunho','aberto','fechado','aprovado','cancelado')),
  observacoes            TEXT,

  -- Seção I — Geral
  fonte_recurso_tipo     VARCHAR(50),
  data_did               DATE,
  secretario             VARCHAR(150),
  detalhes_em_anexo      BOOLEAN       NOT NULL DEFAULT false,
  despacho_ci            TEXT,

  -- Seção II — Controle Interno
  ci_recebido_em         DATE,
  ci_responsavel         VARCHAR(150),
  ci_despacho            TEXT,
  ci_dotacao_n           VARCHAR(100),
  ci_fonte_recurso_n     VARCHAR(100),

  -- Seção III — Setor de Compras
  compras_recebido_em    DATE,
  compras_responsavel    VARCHAR(150),
  ja_licitado            BOOLEAN,
  licitacao_numero       VARCHAR(80),
  realizar_cotacao       BOOLEAN,
  compras_data           DATE,
  compras_responsavel_2  VARCHAR(150),
  empenho_solicitacao_n  VARCHAR(80),
  local_entrega          VARCHAR(200),

  -- Seção IV — Setor Contábil
  contabil_recebido_em   DATE,
  contabil_responsavel   VARCHAR(150),
  credor                 VARCHAR(200),
  cnpj_cpf_credor        VARCHAR(20),
  nf_numero              VARCHAR(40),
  nf_valor               DECIMAL(15,2),
  cert_unificada         BOOLEAN       NOT NULL DEFAULT false,
  cert_fgts              BOOLEAN       NOT NULL DEFAULT false,
  cert_estadual          BOOLEAN       NOT NULL DEFAULT false,
  cert_trabalhista       BOOLEAN       NOT NULL DEFAULT false,
  cert_municipal         BOOLEAN       NOT NULL DEFAULT false,
  data_liquidacao        DATE,
  empenho_numero         VARCHAR(80),
  tipo_empenho           VARCHAR(20)   CHECK (tipo_empenho IN ('ordinário','estimativo','global')),

  -- Seção V — Secretaria de Finanças
  financas_recebido_em   DATE,
  financas_responsavel   VARCHAR(150),

  -- Seção VI — Tesouraria
  tesouraria_recebido_em DATE,
  tesouraria_responsavel VARCHAR(150),
  pag_banco              VARCHAR(100),
  pag_ag                 VARCHAR(20),
  pag_cc                 VARCHAR(30),
  forn_banco             VARCHAR(100),
  forn_ag                VARCHAR(20),
  forn_cc                VARCHAR(30),
  teso_cert_unificada    BOOLEAN       NOT NULL DEFAULT false,
  teso_cert_fgts         BOOLEAN       NOT NULL DEFAULT false,
  teso_cert_estadual     BOOLEAN       NOT NULL DEFAULT false,
  teso_cert_trabalhista  BOOLEAN       NOT NULL DEFAULT false,
  teso_cert_municipal    BOOLEAN       NOT NULL DEFAULT false,
  analisado_por          VARCHAR(150),

  -- Demonstrativo de Descontos
  valor_bruto            DECIMAL(15,2),
  desconto_inss          DECIMAL(15,2) NOT NULL DEFAULT 0,
  desconto_iss           DECIMAL(15,2) NOT NULL DEFAULT 0,
  desconto_irrf          DECIMAL(15,2) NOT NULL DEFAULT 0,
  desconto_sindicato     DECIMAL(15,2) NOT NULL DEFAULT 0,
  desconto_bb            DECIMAL(15,2) NOT NULL DEFAULT 0,
  desconto_caixa         DECIMAL(15,2) NOT NULL DEFAULT 0,
  desconto_pensao        DECIMAL(15,2) NOT NULL DEFAULT 0,
  desconto_outros        DECIMAL(15,2) NOT NULL DEFAULT 0,
  valor_liquido          DECIMAL(15,2),
  doc_caixa              VARCHAR(100),

  -- Metadados
  secretaria_origem_id   UUID          REFERENCES secretarias(id),
  criado_por_id          UUID          NOT NULL REFERENCES usuarios(id),
  created_at             TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_did_form_status     ON did_formularios(status);
CREATE INDEX IF NOT EXISTS idx_did_form_numero_did ON did_formularios(numero_did);
CREATE INDEX IF NOT EXISTS idx_did_form_processo   ON did_formularios(processo_id);
CREATE INDEX IF NOT EXISTS idx_did_form_secretaria ON did_formularios(secretaria_origem_id);
CREATE INDEX IF NOT EXISTS idx_did_form_criado_por ON did_formularios(criado_por_id);

-- ────────────────────────────────────────────────────────────
-- 2.9  did_entradas
--      Uma linha por secretaria dentro de cada DID
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS did_entradas (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  did_id               UUID          NOT NULL REFERENCES did_formularios(id) ON DELETE CASCADE,
  secretaria_id        UUID          NOT NULL REFERENCES secretarias(id),
  descricao            TEXT,
  quantidade           DECIMAL(10,2) NOT NULL DEFAULT 0,
  unidade              VARCHAR(20)   NOT NULL DEFAULT 'UN',
  valor_unitario       DECIMAL(15,2) NOT NULL DEFAULT 0,
  valor_total          DECIMAL(15,2) NOT NULL DEFAULT 0,
  dotacao_orcamentaria VARCHAR(100),
  unidade_orcamentaria VARCHAR(150),
  elemento_despesa     VARCHAR(60),
  fonte_recurso        VARCHAR(60),
  meses                INTEGER               DEFAULT 12,
  observacoes          TEXT,
  preenchido_por_id    UUID          REFERENCES usuarios(id),
  status               VARCHAR(20)   NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','preenchido','aprovado')),
  created_at           TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_did_entradas_did        ON did_entradas(did_id);
CREATE INDEX IF NOT EXISTS idx_did_entradas_secretaria ON did_entradas(secretaria_id);
CREATE INDEX IF NOT EXISTS idx_did_entradas_status     ON did_entradas(status);


-- ============================================================
-- PARTE 3 — TRIGGERS PARA AS NOVAS TABELAS
-- ============================================================
-- (A função update_updated_at_column já foi criada na Parte 0)

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'entidade',
    'almoxarifado_itens',
    'almoxarifado_movimentacoes',
    'almoxarifado_requisicoes',
    'almoxarifado_requisicao_itens',
    'financeiro_lancamentos',
    'did_formularios',
    'did_entradas'
  ]
  LOOP
    -- Cria trigger somente se ainda não existir
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
       WHERE tgname = 'update_' || tbl || '_updated_at'
         AND tgrelid = tbl::regclass
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER update_%I_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        tbl, tbl
      );
    END IF;
  END LOOP;
END
$$;


-- ============================================================
-- ✅ MIGRAÇÃO CONCLUÍDA PARA ESTE SCHEMA
-- ============================================================
-- Repita os blocos das PARTES 1, 2 e 3 para cada outro tenant,
-- alterando o SET search_path no início.
--
-- Exemplo para o segundo tenant:
--   SET search_path = "tenant_teste";
--   (cole as PARTES 1, 2 e 3 novamente)
-- ============================================================
