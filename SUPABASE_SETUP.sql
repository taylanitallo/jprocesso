-- ============================================================
-- jProcesso — Script de Setup para Supabase
-- Execute este script no SQL Editor do painel do Supabase
-- Projeto: jProcessos | Data: 2026-03-19
-- ============================================================
-- INSTRUÇÕES:
-- 1. Acesse https://supabase.com/dashboard → seu projeto
-- 2. Clique em "SQL Editor" no menu lateral
-- 3. Cole TODO este conteúdo e clique em "Run"
-- ============================================================

-- ── EXTENSÕES NECESSÁRIAS ─────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── TABELA GLOBAL DE TENANTS (prefeituras) ────────────────────
CREATE TABLE IF NOT EXISTS public.tenants (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nome        VARCHAR(255) NOT NULL,
    cnpj        VARCHAR(14)  NOT NULL UNIQUE,
    subdominio  VARCHAR(100) NOT NULL UNIQUE,
    schema      VARCHAR(100) NOT NULL UNIQUE,
    cidade      VARCHAR(255) NOT NULL,
    estado      VARCHAR(2)   NOT NULL,
    ativo       BOOLEAN      NOT NULL DEFAULT TRUE,
    logo_url    TEXT,
    brasao_url  TEXT,
    configuracoes JSONB      NOT NULL DEFAULT '{}',
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_subdominio ON public.tenants (subdominio);
CREATE INDEX IF NOT EXISTS idx_tenants_ativo ON public.tenants (ativo);

-- ── INSERIR TENANTS ──────────────────────────────────────────
INSERT INTO public.tenants (nome, cnpj, subdominio, schema, cidade, estado)
VALUES
  ('Prefeitura de Irauçuba',  '07594574000170', 'iraucuba', 'tenant_iraucuba', 'Irauçuba',  'CE'),
  ('Prefeitura de Teste',     '00000000000000', 'teste',    'tenant_teste',    'Teste',     'CE')
ON CONFLICT (subdominio) DO NOTHING;

-- ============================================================
-- SCHEMAS DOS TENANTS
-- ============================================================
CREATE SCHEMA IF NOT EXISTS tenant_iraucuba;
CREATE SCHEMA IF NOT EXISTS tenant_teste;

-- ============================================================
-- FUNÇÃO update_updated_at (reutilizada em todos os schemas)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ── ESTRUTURA DO TENANT (repetir para cada schema) ───────────
-- Vamos criar tudo nos dois schemas de uma vez
-- ============================================================

DO $$
DECLARE
  s TEXT;
BEGIN
  FOREACH s IN ARRAY ARRAY['tenant_iraucuba','tenant_teste']
  LOOP
    -- ── SECRETARIAS ───────────────────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.secretarias (
        id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        nome            VARCHAR(255) NOT NULL,
        sigla           VARCHAR(20)  NOT NULL,
        descricao       TEXT,
        ativo           BOOLEAN      NOT NULL DEFAULT TRUE,
        responsaveis    JSONB        NOT NULL DEFAULT ''[]''::jsonb,
        data_inicio     DATE,
        data_fim        DATE,
        email           VARCHAR(255),
        whatsapp        VARCHAR(20),
        outros_sistemas BOOLEAN      NOT NULL DEFAULT false,
        cnpj            VARCHAR(18),
        razao_social    VARCHAR(500),
        codigo_unidade  VARCHAR(50),
        orcamento       JSONB        NOT NULL DEFAULT ''{}''::jsonb,
        dotacoes        JSONB        NOT NULL DEFAULT ''[]''::jsonb,
        created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
      )', s);

    EXECUTE format('
      CREATE INDEX IF NOT EXISTS idx_%s_secretarias_ativo ON %I.secretarias (ativo)',
      replace(s,'_',''), s);

    -- ── SETORES ───────────────────────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.setores (
        id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        secretaria_id UUID         NOT NULL REFERENCES %I.secretarias(id) ON DELETE CASCADE,
        nome          VARCHAR(255) NOT NULL,
        sigla         VARCHAR(20)  NOT NULL,
        descricao     TEXT,
        ativo         BOOLEAN      NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
      )', s, s);

    EXECUTE format('
      CREATE INDEX IF NOT EXISTS idx_%s_setores_sec ON %I.setores (secretaria_id)',
      replace(s,'_',''), s);

    -- ── USUÁRIOS ──────────────────────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.usuarios (
        id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        nome          VARCHAR(255) NOT NULL,
        nome_reduzido VARCHAR(60),
        email         VARCHAR(255) NOT NULL,
        cpf           VARCHAR(11)  NOT NULL,
        senha         VARCHAR(255) NOT NULL,
        telefone      VARCHAR(20),
        tipo          VARCHAR(20)  NOT NULL DEFAULT ''operacional''
                        CHECK (tipo IN (''admin'',''gestor'',''operacional'')),
        ativo         BOOLEAN      NOT NULL DEFAULT TRUE,
        secretaria_id UUID         REFERENCES %I.secretarias(id),
        setor_id      UUID         REFERENCES %I.setores(id),
        ultimo_acesso TIMESTAMP,
        created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
        UNIQUE (email),
        UNIQUE (cpf)
      )', s, s, s);

    -- ── PROCESSOS ─────────────────────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.processos (
        id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        numero               VARCHAR(50)  NOT NULL UNIQUE,
        ano                  INTEGER      NOT NULL,
        sequencial           INTEGER      NOT NULL,
        assunto              VARCHAR(500) NOT NULL,
        descricao            TEXT         NOT NULL,
        interessado_nome     VARCHAR(255),
        interessado_cpf_cnpj VARCHAR(14),
        interessado_email    VARCHAR(255),
        interessado_telefone VARCHAR(20),
        status               VARCHAR(20)  NOT NULL DEFAULT ''aberto''
                               CHECK (status IN (''aberto'',''em_analise'',''pendente'',''devolvido'',''concluido'',''arquivado'')),
        setor_atual_id       UUID         REFERENCES %I.setores(id),
        usuario_atual_id     UUID         REFERENCES %I.usuarios(id),
        qrcode               TEXT,
        prioridade           VARCHAR(20)  NOT NULL DEFAULT ''normal''
                               CHECK (prioridade IN (''baixa'',''normal'',''alta'',''urgente'')),
        data_abertura        TIMESTAMP    NOT NULL DEFAULT NOW(),
        data_conclusao       TIMESTAMP,
        criado_por_id        UUID         NOT NULL REFERENCES %I.usuarios(id),
        observacoes          TEXT,
        created_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMP    NOT NULL DEFAULT NOW()
      )', s, s, s, s);

    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_proc_status ON %I.processos (status)', replace(s,'_',''), s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_proc_setor  ON %I.processos (setor_atual_id)', replace(s,'_',''), s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_proc_ano    ON %I.processos (ano, sequencial)', replace(s,'_',''), s);

    -- ── TRAMITAÇÕES ───────────────────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.tramitacoes (
        id                UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
        processo_id       UUID      NOT NULL REFERENCES %I.processos(id) ON DELETE CASCADE,
        origem_usuario_id UUID      NOT NULL REFERENCES %I.usuarios(id),
        origem_setor_id   UUID      REFERENCES %I.setores(id),
        destino_setor_id  UUID      REFERENCES %I.setores(id),
        destino_usuario_id UUID     REFERENCES %I.usuarios(id),
        tipo              VARCHAR(20) NOT NULL
                            CHECK (tipo IN (''abertura'',''tramitacao'',''devolucao'',''conclusao'',''arquivamento'')),
        despacho          TEXT,
        observacao        TEXT,
        data_hora         TIMESTAMP NOT NULL DEFAULT NOW(),
        ip_origem         VARCHAR(45),
        created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
      )', s, s, s, s, s, s);

    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_tram_proc ON %I.tramitacoes (processo_id)', replace(s,'_',''), s);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_tram_data ON %I.tramitacoes (data_hora DESC)', replace(s,'_',''), s);

    -- ── DOCUMENTOS ────────────────────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.documentos (
        id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        processo_id   UUID         NOT NULL REFERENCES %I.processos(id) ON DELETE CASCADE,
        nome_original VARCHAR(255) NOT NULL,
        nome_sistema  VARCHAR(255) NOT NULL,
        caminho       VARCHAR(500) NOT NULL,
        tipo_mime     VARCHAR(100) NOT NULL,
        tamanho       INTEGER      NOT NULL,
        hash          VARCHAR(64)  NOT NULL,
        upload_por_id UUID         NOT NULL REFERENCES %I.usuarios(id),
        data_upload   TIMESTAMP    NOT NULL DEFAULT NOW(),
        descricao     TEXT,
        created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
      )', s, s, s);

    -- ── ENTIDADE ──────────────────────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.entidade (
        id             SERIAL       PRIMARY KEY,
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
        created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMP    NOT NULL DEFAULT NOW()
      )', s);

    EXECUTE format('INSERT INTO %I.entidade (id) VALUES (1) ON CONFLICT DO NOTHING', s);

    -- ── CREDORES ──────────────────────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.credores (
        id            SERIAL       PRIMARY KEY,
        tipo          VARCHAR(10)  NOT NULL DEFAULT ''Jurídica'',
        razao_social  VARCHAR(500) NOT NULL,
        nome_fantasia VARCHAR(500),
        cnpj_cpf      VARCHAR(20)  NOT NULL UNIQUE,
        email         VARCHAR(255),
        telefone      VARCHAR(20),
        celular       VARCHAR(20),
        cep           VARCHAR(9),
        logradouro    VARCHAR(500),
        numero        VARCHAR(20),
        complemento   VARCHAR(200),
        bairro        VARCHAR(200),
        cidade        VARCHAR(200),
        uf            VARCHAR(2),
        status        VARCHAR(20)  NOT NULL DEFAULT ''ATIVO'',
        created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
      )', s);

    -- ── CONTRATOS ITENS (catálogo) ────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.contratos_itens (
        id               SERIAL       PRIMARY KEY,
        codigo           VARCHAR(10)  UNIQUE,
        descricao        VARCHAR(500) NOT NULL,
        categoria        VARCHAR(20),
        unidade_medida   VARCHAR(50),
        catalogo         VARCHAR(50),
        classificacao    VARCHAR(200),
        subclassificacao VARCHAR(200),
        especificacao    TEXT,
        palavra1         VARCHAR(200),
        palavra2         VARCHAR(200),
        palavra3         VARCHAR(200),
        palavra4         VARCHAR(200),
        catmat_serv      VARCHAR(100),
        status           VARCHAR(20)  NOT NULL DEFAULT ''ATIVO'',
        validado         BOOLEAN      NOT NULL DEFAULT FALSE,
        created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMP    NOT NULL DEFAULT NOW()
      )', s);

    -- ── CONTRATOS ─────────────────────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.contratos (
        id               SERIAL        PRIMARY KEY,
        tipo_contrato    VARCHAR(50)   NOT NULL DEFAULT ''CONTRATO'',
        numero_contrato  VARCHAR(50)   NOT NULL UNIQUE,
        objeto           TEXT          NOT NULL,
        modalidade       VARCHAR(100),
        numero_licitacao VARCHAR(100),
        credor_id        INTEGER       NOT NULL REFERENCES %I.credores(id),
        valor            NUMERIC(15,2),
        vigencia_inicio  DATE,
        vigencia_fim     DATE,
        data_assinatura  DATE,
        secretaria       VARCHAR(200),
        fiscal           VARCHAR(500),
        observacoes      TEXT,
        status           VARCHAR(20)   NOT NULL DEFAULT ''ATIVO'',
        dias_alerta      INTEGER       NOT NULL DEFAULT 30,
        created_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMP     NOT NULL DEFAULT NOW()
      )', s, s);

    -- ── CONTRATOS ITENS VÍNCULO ───────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.contratos_itens_vinculo (
        id             SERIAL        PRIMARY KEY,
        contrato_id    INTEGER       NOT NULL REFERENCES %I.contratos(id) ON DELETE CASCADE,
        item_id        INTEGER                REFERENCES %I.contratos_itens(id),
        lote           VARCHAR(20),
        descricao      VARCHAR(500),
        unidade        VARCHAR(50),
        quantidade     NUMERIC(15,4),
        valor_unitario NUMERIC(15,4),
        valor_total    NUMERIC(15,4) GENERATED ALWAYS AS
                         (COALESCE(quantidade,0) * COALESCE(valor_unitario,0)) STORED,
        ordem          INTEGER       NOT NULL DEFAULT 0,
        created_at     TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMP     NOT NULL DEFAULT NOW()
      )', s, s, s);

    -- ── RESPONSÁVEIS ──────────────────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.responsaveis (
        id            SERIAL       PRIMARY KEY,
        secretaria_id UUID         REFERENCES %I.secretarias(id) ON DELETE SET NULL,
        nome          VARCHAR(500) NOT NULL,
        cargo         VARCHAR(300),
        cpf           VARCHAR(14),
        email         VARCHAR(255),
        telefone      VARCHAR(20),
        data_inicio   DATE,
        data_fim      DATE,
        ativo         BOOLEAN      NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
      )', s, s);

    -- ── AGENTES ───────────────────────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.agentes (
        id            SERIAL       PRIMARY KEY,
        nome          VARCHAR(500) NOT NULL,
        cargo         VARCHAR(300),
        matricula     VARCHAR(50),
        cpf           VARCHAR(14),
        email         VARCHAR(255),
        telefone      VARCHAR(20),
        secretaria_id UUID         REFERENCES %I.secretarias(id) ON DELETE SET NULL,
        ativo         BOOLEAN      NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
      )', s, s);

    -- ── DIDs ──────────────────────────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.dids (
        id                          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        processo_id                 UUID          NOT NULL,
        numero_did                  INTEGER,
        tipo_did                    VARCHAR(20)   DEFAULT ''fixas'',
        objeto                      TEXT,
        data_did                    DATE,
        secretario_nome             VARCHAR(500),
        secretaria_sec1             VARCHAR(500),
        fonte_recurso               VARCHAR(200)  DEFAULT ''PRÓPRIO'',
        detalhes_em_anexo           BOOLEAN       DEFAULT false,
        contrato_ref                VARCHAR(200),
        credor_sec1                 VARCHAR(500),
        cnpj_cpf_credor_sec1        VARCHAR(30),
        nro_licitacao_sec1          VARCHAR(200),
        tipo_licitacao_sec1         VARCHAR(200),
        valor_did                   NUMERIC(15,2),
        itens_did                   JSONB,
        mes_referencia              VARCHAR(20),
        nf_sec1                     VARCHAR(50),
        ci_recebido_em              DATE,
        ci_responsavel              VARCHAR(500),
        despacho_ci                 TEXT,
        dotacao_numero              VARCHAR(200),
        fonte_recurso_numero        VARCHAR(200),
        compras_recebido_em         DATE,
        compras_responsavel         VARCHAR(500),
        ja_licitado                 BOOLEAN       DEFAULT false,
        nro_licitacao               VARCHAR(200),
        realizar_cotacao            BOOLEAN       DEFAULT false,
        modalidade                  VARCHAR(200),
        data_compras                DATE,
        responsavel_compras         VARCHAR(500),
        nro_empenho_solicitacao     VARCHAR(200),
        local_entrega               VARCHAR(500),
        contabil_recebido_em        DATE,
        contabil_responsavel        VARCHAR(500),
        contabil_auditor            VARCHAR(500),
        credor                      VARCHAR(500),
        cnpj_cpf_credor             VARCHAR(30),
        nf_numero                   VARCHAR(200),
        nf_valor                    NUMERIC(15,2),
        cert_cnd_federal            BOOLEAN       DEFAULT false,
        cert_fgts                   BOOLEAN       DEFAULT false,
        cert_tst                    BOOLEAN       DEFAULT false,
        cert_municipal              BOOLEAN       DEFAULT false,
        cert_estadual               BOOLEAN       DEFAULT false,
        empenho_numero              VARCHAR(200),
        data_liquidacao             DATE,
        tipo_empenho                VARCHAR(20),
        data_empenho                DATE,
        liquidacao_numero           VARCHAR(200),
        financas_recebido_em        DATE,
        financas_responsavel        VARCHAR(500),
        financas2_recebido_em       DATE,
        financas2_responsavel       VARCHAR(500),
        financas2_enviado_pagamento DATE,
        tesouraria_recebido_em      DATE,
        tesouraria_responsavel      VARCHAR(500),
        banco_pagador               VARCHAR(200),
        ag_pagador                  VARCHAR(50),
        cc_pagador                  VARCHAR(50),
        cnpj_fornecedor             VARCHAR(30),
        banco_fornecedor            VARCHAR(200),
        ag_fornecedor               VARCHAR(50),
        cc_fornecedor               VARCHAR(50),
        cert_teso_cnd               BOOLEAN       DEFAULT false,
        cert_teso_fgts              BOOLEAN       DEFAULT false,
        cert_teso_estadual          BOOLEAN       DEFAULT false,
        cert_teso_trabalhista       BOOLEAN       DEFAULT false,
        cert_teso_municipal         BOOLEAN       DEFAULT false,
        cert_sec1_municipal         BOOLEAN       DEFAULT false,
        cert_sec1_trabalhista       BOOLEAN       DEFAULT false,
        cert_sec1_fgts              BOOLEAN       DEFAULT false,
        cert_sec1_estadual          BOOLEAN       DEFAULT false,
        cert_sec1_federal           BOOLEAN       DEFAULT false,
        analisado_por               VARCHAR(500),
        valor_bruto                 NUMERIC(15,2) DEFAULT 0,
        desconto_inss               NUMERIC(15,2) DEFAULT 0,
        desconto_iss                NUMERIC(15,2) DEFAULT 0,
        desconto_irrf               NUMERIC(15,2) DEFAULT 0,
        desconto_sindicato          NUMERIC(15,2) DEFAULT 0,
        desconto_bb                 NUMERIC(15,2) DEFAULT 0,
        desconto_caixa              NUMERIC(15,2) DEFAULT 0,
        desconto_pensao             NUMERIC(15,2) DEFAULT 0,
        desconto_outros             NUMERIC(15,2) DEFAULT 0,
        doc_caixa                   VARCHAR(200),
        pago                        VARCHAR(10),
        receb_data                  DATE,
        receb_nf_data               DATE,
        receb_responsavel           VARCHAR(500),
        receb_cargo                 VARCHAR(300),
        receb_nf_conferida          BOOLEAN       DEFAULT false,
        receb_qtd_conferida         BOOLEAN       DEFAULT false,
        receb_esp_conforme          BOOLEAN       DEFAULT false,
        receb_obs                   TEXT,
        receb_nf_enviado_compras    DATE,
        contab_fech_finalizado      VARCHAR(10),
        contab_fech_tce             VARCHAR(10),
        status                      VARCHAR(20)   DEFAULT ''rascunho'',
        criado_por_id               UUID,
        created_at                  TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at                  TIMESTAMP     NOT NULL DEFAULT NOW()
      )', s);

    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_dids_proc ON %I.dids (processo_id)', replace(s,'_',''), s);

    -- ── DID FORMULÁRIOS ───────────────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.did_formularios (
        id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
        did_id      UUID      NOT NULL REFERENCES %I.dids(id) ON DELETE CASCADE,
        tipo        VARCHAR(50),
        dados       JSONB,
        created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
      )', s, s);

    -- ── DID ENTRADAS ──────────────────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.did_entradas (
        id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
        did_id      UUID      NOT NULL REFERENCES %I.dids(id) ON DELETE CASCADE,
        campo       VARCHAR(200),
        valor       TEXT,
        created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
      )', s, s);

    -- ── FINANCEIRO LANÇAMENTOS ────────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.financeiro_lancamentos (
        id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        tipo           VARCHAR(20)   NOT NULL CHECK (tipo IN (''RECEITA'',''DESPESA'')),
        categoria      VARCHAR(100)  NOT NULL,
        descricao      VARCHAR(500)  NOT NULL,
        valor          NUMERIC(15,2) NOT NULL,
        data_lancamento DATE         NOT NULL,
        secretaria_id  UUID          REFERENCES %I.secretarias(id),
        processo_id    UUID          REFERENCES %I.processos(id),
        dotacao        VARCHAR(200),
        empenho        VARCHAR(100),
        status         VARCHAR(20)   NOT NULL DEFAULT ''PENDENTE''
                         CHECK (status IN (''PENDENTE'',''APROVADO'',''PAGO'',''CANCELADO'')),
        observacoes    TEXT,
        usuario_id     UUID          NOT NULL REFERENCES %I.usuarios(id),
        created_at     TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMP     NOT NULL DEFAULT NOW()
      )', s, s, s, s);

    -- ── ALMOXARIFADO ITENS ────────────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.almoxarifado_itens (
        id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        codigo               VARCHAR(50)   NOT NULL UNIQUE,
        nome                 VARCHAR(500)  NOT NULL,
        descricao            TEXT,
        unidade_medida       VARCHAR(50)   NOT NULL,
        categoria            VARCHAR(100),
        estoque_atual        NUMERIC(10,3) NOT NULL DEFAULT 0,
        estoque_minimo       NUMERIC(10,3) NOT NULL DEFAULT 0,
        estoque_maximo       NUMERIC(10,3),
        ponto_ressuprimento  NUMERIC(10,3),
        valor_medio          NUMERIC(10,2) NOT NULL DEFAULT 0,
        tipo_item            VARCHAR(10)   NOT NULL DEFAULT ''CONSUMO'',
        corredor             VARCHAR(20),
        prateleira           VARCHAR(20),
        gaveta               VARCHAR(20),
        numero_patrimonio_seq INTEGER,
        ativo                BOOLEAN       NOT NULL DEFAULT TRUE,
        created_at           TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMP     NOT NULL DEFAULT NOW()
      )', s);

    -- ── ALMOXARIFADO MOVIMENTAÇÕES ────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.almoxarifado_movimentacoes (
        id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id         UUID          NOT NULL REFERENCES %I.almoxarifado_itens(id),
        tipo            VARCHAR(20)   NOT NULL CHECK (tipo IN (''ENTRADA'',''SAIDA'',''AJUSTE'',''TRANSFERENCIA'',''DEVOLUCAO'')),
        quantidade      NUMERIC(10,3) NOT NULL,
        valor_unitario  NUMERIC(10,2) NOT NULL DEFAULT 0,
        lote_id         UUID,
        numero_empenho  VARCHAR(100),
        numero_nf       VARCHAR(100),
        fornecedor_nome VARCHAR(500),
        setor_destino_id UUID         REFERENCES %I.setores(id),
        usuario_id      UUID          NOT NULL REFERENCES %I.usuarios(id),
        motivo          TEXT,
        data_movimentacao TIMESTAMP   NOT NULL DEFAULT NOW(),
        created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP     NOT NULL DEFAULT NOW()
      )', s, s, s, s);

    -- ── ALMOXARIFADO REQUISIÇÕES ──────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.almoxarifado_requisicoes (
        id                      UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
        numero                  VARCHAR(30) NOT NULL UNIQUE,
        setor_id                UUID        NOT NULL REFERENCES %I.setores(id),
        secretaria_id           UUID        REFERENCES %I.secretarias(id),
        usuario_id              UUID        NOT NULL REFERENCES %I.usuarios(id),
        status                  VARCHAR(30) NOT NULL DEFAULT ''PENDENTE'',
        prioridade              VARCHAR(20) DEFAULT ''NORMAL'',
        data_solicitacao        TIMESTAMP   NOT NULL DEFAULT NOW(),
        data_autorizacao        TIMESTAMP,
        data_separacao          TIMESTAMP,
        data_entrega            TIMESTAMP,
        justificativa           TEXT,
        usuario_autorizador_id  UUID        REFERENCES %I.usuarios(id),
        hash_assinatura         VARCHAR(128),
        token_entrega           VARCHAR(32),
        token_expiry            TIMESTAMP,
        centro_custo            VARCHAR(200),
        observacoes             TEXT,
        created_at              TIMESTAMP   NOT NULL DEFAULT NOW(),
        updated_at              TIMESTAMP   NOT NULL DEFAULT NOW()
      )', s, s, s, s, s);

    -- ── ALMOXARIFADO REQUISIÇÃO ITENS ─────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.almoxarifado_requisicao_itens (
        id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        requisicao_id        UUID          NOT NULL REFERENCES %I.almoxarifado_requisicoes(id) ON DELETE CASCADE,
        item_id              UUID          NOT NULL REFERENCES %I.almoxarifado_itens(id),
        quantidade_solicitada NUMERIC(10,3) NOT NULL,
        quantidade_entregue  NUMERIC(10,3) DEFAULT 0,
        valor_unitario_saida NUMERIC(10,2),
        lote_id              UUID,
        observacao           TEXT,
        created_at           TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMP     NOT NULL DEFAULT NOW()
      )', s, s, s);

    -- ── ALMOXARIFADO LOTES ────────────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.almoxarifado_lotes (
        id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id                   UUID          NOT NULL REFERENCES %I.almoxarifado_itens(id),
        numero_empenho            VARCHAR(100),
        numero_nf                 VARCHAR(100),
        chave_nfe                 VARCHAR(44),
        numero_contrato           VARCHAR(100),
        fornecedor_nome           VARCHAR(500),
        data_entrada              DATE          NOT NULL,
        data_validade             DATE,
        quantidade_inicial        NUMERIC(10,3) NOT NULL,
        quantidade_atual          NUMERIC(10,3) NOT NULL,
        valor_unitario            NUMERIC(10,2) NOT NULL DEFAULT 0,
        conferencia_cega_qtd      NUMERIC(10,3),
        conferencia_cega_ok       BOOLEAN,
        numero_patrimonio_inicio  VARCHAR(50),
        numero_patrimonio_fim     VARCHAR(50),
        observacao                TEXT,
        usuario_id                UUID          NOT NULL REFERENCES %I.usuarios(id),
        ativo                     BOOLEAN       NOT NULL DEFAULT TRUE,
        created_at                TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at                TIMESTAMP     NOT NULL DEFAULT NOW()
      )', s, s, s);

    -- ── ALMOX COTAS ───────────────────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.almox_cotas (
        id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        setor_id             UUID          NOT NULL REFERENCES %I.setores(id),
        item_id              UUID          NOT NULL REFERENCES %I.almoxarifado_itens(id),
        mes_ano              VARCHAR(7)    NOT NULL,
        quantidade_cota      NUMERIC(10,3) NOT NULL,
        quantidade_consumida NUMERIC(10,3) NOT NULL DEFAULT 0,
        ativo                BOOLEAN       NOT NULL DEFAULT TRUE,
        observacao           TEXT,
        usuario_id           UUID          REFERENCES %I.usuarios(id),
        created_at           TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMP     NOT NULL DEFAULT NOW(),
        UNIQUE (setor_id, item_id, mes_ano)
      )', s, s, s, s);

    -- ── ALMOX INVENTÁRIOS ─────────────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.almox_inventarios (
        id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        numero                 VARCHAR(30) NOT NULL UNIQUE,
        data_inicio            DATE        NOT NULL,
        data_conclusao         DATE,
        status                 VARCHAR(20) NOT NULL DEFAULT ''EM_ANDAMENTO'',
        usuario_responsavel_id UUID        NOT NULL REFERENCES %I.usuarios(id),
        observacao             TEXT,
        total_itens            INTEGER     NOT NULL DEFAULT 0,
        total_divergencias     INTEGER     NOT NULL DEFAULT 0,
        created_at             TIMESTAMP   NOT NULL DEFAULT NOW(),
        updated_at             TIMESTAMP   NOT NULL DEFAULT NOW()
      )', s, s);

    -- ── ALMOX INVENTÁRIO ITENS ────────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.almox_inventario_itens (
        id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        inventario_id      UUID          NOT NULL REFERENCES %I.almox_inventarios(id),
        item_id            UUID          NOT NULL REFERENCES %I.almoxarifado_itens(id),
        quantidade_sistema NUMERIC(10,3) NOT NULL,
        quantidade_contada NUMERIC(10,3),
        diferenca          NUMERIC(10,3),
        valor_unitario     NUMERIC(10,2) NOT NULL DEFAULT 0,
        valor_divergencia  NUMERIC(10,2),
        contado            BOOLEAN       NOT NULL DEFAULT FALSE,
        observacao         TEXT,
        created_at         TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at         TIMESTAMP     NOT NULL DEFAULT NOW()
      )', s, s, s);

    -- ── ALMOXARIFADO AUDIT LOG ────────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.almoxarifado_audit_log (
        id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        tabela           VARCHAR(100) NOT NULL,
        registro_id      VARCHAR(100) NOT NULL,
        acao             VARCHAR(50)  NOT NULL,
        descricao        TEXT,
        dados_anteriores JSONB,
        dados_novos      JSONB,
        user_id          UUID,
        user_nome        VARCHAR(500),
        ip               VARCHAR(50),
        created_at       TIMESTAMP    NOT NULL DEFAULT NOW()
      )', s);

    -- ── ANEXOS ────────────────────────────────────────────────
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.anexos (
        id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        processo_id   UUID         REFERENCES %I.processos(id) ON DELETE CASCADE,
        did_id        UUID         REFERENCES %I.dids(id) ON DELETE CASCADE,
        nome_original VARCHAR(255) NOT NULL,
        nome_sistema  VARCHAR(255) NOT NULL,
        caminho       VARCHAR(500) NOT NULL,
        tipo_mime     VARCHAR(100) NOT NULL,
        tamanho       INTEGER      NOT NULL,
        hash          VARCHAR(64),
        upload_por_id UUID         REFERENCES %I.usuarios(id),
        data_upload   TIMESTAMP    NOT NULL DEFAULT NOW(),
        descricao     TEXT,
        created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
      )', s, s, s, s);

  END LOOP;
END $$;

-- ============================================================
-- INSERIR USUÁRIO ADMIN PADRÃO (iraucuba)
-- Senha: 123456 (hash bcrypt)
-- ============================================================
DO $$
DECLARE
  sec_id UUID;
  set_id UUID;
BEGIN
  -- Secretaria padrão
  INSERT INTO tenant_iraucuba.secretarias (nome, sigla, descricao)
  VALUES ('Gabinete do Prefeito', 'GAB', 'Gabinete do Prefeito Municipal')
  ON CONFLICT DO NOTHING
  RETURNING id INTO sec_id;

  IF sec_id IS NULL THEN
    SELECT id INTO sec_id FROM tenant_iraucuba.secretarias WHERE sigla = 'GAB' LIMIT 1;
  END IF;

  -- Setor padrão
  INSERT INTO tenant_iraucuba.setores (secretaria_id, nome, sigla)
  VALUES (sec_id, 'Administração Geral', 'ADM')
  ON CONFLICT DO NOTHING
  RETURNING id INTO set_id;

  IF set_id IS NULL THEN
    SELECT id INTO set_id FROM tenant_iraucuba.setores WHERE sigla = 'ADM' LIMIT 1;
  END IF;

  -- Usuário admin (senha: 123456)
  INSERT INTO tenant_iraucuba.usuarios (nome, email, cpf, senha, tipo, secretaria_id, setor_id)
  VALUES (
    'Administrador',
    'admin@iraucuba.ce.gov.br',
    '00000000000',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'admin',
    sec_id,
    set_id
  )
  ON CONFLICT (email) DO NOTHING;
END $$;

-- ============================================================
-- INSERIR USUÁRIO ADMIN PADRÃO (teste)
-- ============================================================
DO $$
DECLARE
  sec_id UUID;
  set_id UUID;
BEGIN
  INSERT INTO tenant_teste.secretarias (nome, sigla, descricao)
  VALUES ('Secretaria de Administração', 'SEMAD', 'Gestão administrativa')
  ON CONFLICT DO NOTHING
  RETURNING id INTO sec_id;

  IF sec_id IS NULL THEN
    SELECT id INTO sec_id FROM tenant_teste.secretarias WHERE sigla = 'SEMAD' LIMIT 1;
  END IF;

  INSERT INTO tenant_teste.setores (secretaria_id, nome, sigla)
  VALUES (sec_id, 'Protocolo Geral', 'PROTO')
  ON CONFLICT DO NOTHING
  RETURNING id INTO set_id;

  IF set_id IS NULL THEN
    SELECT id INTO set_id FROM tenant_teste.setores WHERE sigla = 'PROTO' LIMIT 1;
  END IF;

  -- senha: 123456
  INSERT INTO tenant_teste.usuarios (nome, email, cpf, senha, tipo, secretaria_id, setor_id)
  VALUES (
    'Administrador Teste',
    'admin@teste.gov.br',
    '00000000001',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'admin',
    sec_id,
    set_id
  )
  ON CONFLICT (email) DO NOTHING;
END $$;

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
-- Credenciais de acesso após executar:
--   Prefeitura: iraucuba
--   Login:      admin@iraucuba.ce.gov.br  |  123456
--
--   Prefeitura: teste
--   Login:      admin@teste.gov.br        |  123456
-- ============================================================
