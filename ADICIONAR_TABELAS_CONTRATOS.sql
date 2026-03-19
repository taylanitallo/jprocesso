-- ============================================================================
-- ADICIONAR_TABELAS_CONTRATOS.sql
-- Cria as tabelas do módulo de Contratos em TODOS os schemas de tenant.
--
-- Tabelas criadas:
--   credores               → Cadastro de credores (PJ e PF)
--   contratos_itens        → Catálogo de itens (materiais e serviços)
--   contratos              → Contratos, atas, termos aditivos, convênios
--   contratos_itens_vinculo→ Pivot: itens vinculados a cada contrato
--   responsaveis           → Responsáveis / titulares por secretaria (tabela relacional)
--   agentes                → Agentes públicos (fiscais de contrato)
--
-- COMO EXECUTAR:
--   Abra no pgAdmin → selecione o banco jprocesso_global → F5
--   Repita para cada schema de tenant chamando SET search_path antes,
--   OU use o bloco DO $$ que itera sobre todos os schemas de tenant abaixo.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Iteração automática sobre todos os schemas de tenant
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  schema_rec RECORD;
BEGIN
  FOR schema_rec IN
    SELECT schema_name
    FROM   information_schema.schemata
    WHERE  schema_name LIKE 'tenant_%'
  LOOP

    EXECUTE format('SET search_path = %I', schema_rec.schema_name);

    RAISE NOTICE 'Aplicando migração de contratos no schema: %', schema_rec.schema_name;

    -- ── 1. CREDORES ──────────────────────────────────────────────────────────
    EXECUTE '
      CREATE TABLE IF NOT EXISTS credores (
        id            SERIAL       PRIMARY KEY,
        tipo          VARCHAR(10)  NOT NULL DEFAULT ''Jurídica'',   -- ''Jurídica'' | ''Física''
        razao_social  VARCHAR(500) NOT NULL,
        nome_fantasia VARCHAR(500),
        cnpj_cpf      VARCHAR(20)  NOT NULL,
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
        status        VARCHAR(20)  NOT NULL DEFAULT ''ATIVO'',      -- ''ATIVO'' | ''INATIVO''
        created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
      );
    ';

    -- Índice único por CNPJ/CPF + schema (não pode ter credor duplicado no mesmo tenant)
    EXECUTE '
      CREATE UNIQUE INDEX IF NOT EXISTS credores_cnpj_cpf_uq
        ON credores (cnpj_cpf);
    ';

    -- ── 2. CONTRATOS_ITENS (catálogo) ────────────────────────────────────────
    EXECUTE '
      CREATE TABLE IF NOT EXISTS contratos_itens (
        id               SERIAL       PRIMARY KEY,
        codigo           VARCHAR(10)  UNIQUE,       -- código sequencial (00001, etc.)
        descricao        VARCHAR(500) NOT NULL,      -- nomenclatura em MAIÚSCULAS
        categoria        VARCHAR(20),               -- ''COMPRAS'' | ''SERVIÇOS''
        unidade_medida   VARCHAR(50),
        catalogo         VARCHAR(50),               -- código CNBS
        classificacao    VARCHAR(200),
        subclassificacao VARCHAR(200),
        especificacao    TEXT,
        palavra1         VARCHAR(200),
        palavra2         VARCHAR(200),
        palavra3         VARCHAR(200),
        palavra4         VARCHAR(200),
        catmat_serv      VARCHAR(100),
        status           VARCHAR(20)  NOT NULL DEFAULT ''ATIVO'',  -- ''ATIVO'' | ''INATIVO'' | ''EXCLUÍDO''
        validado         BOOLEAN      NOT NULL DEFAULT FALSE,
        created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMP    NOT NULL DEFAULT NOW()
      );
    ';

    -- ── 3. CONTRATOS ─────────────────────────────────────────────────────────
    EXECUTE '
      CREATE TABLE IF NOT EXISTS contratos (
        id               SERIAL        PRIMARY KEY,
        tipo_contrato    VARCHAR(50)   NOT NULL DEFAULT ''CONTRATO'',
        -- ''CONTRATO'' | ''ATA DE REGISTRO DE PREÇO'' | ''TERMO ADITIVO''
        -- | ''CONVÊNIO'' | ''ACORDO'' | ''OUTRO''
        numero_contrato  VARCHAR(50)   NOT NULL,
        objeto           TEXT          NOT NULL,
        modalidade       VARCHAR(100),
        -- ''PREGÃO ELETRÔNICO'' | ''PREGÃO PRESENCIAL'' | ''CONCORRÊNCIA''
        -- | ''TOMADA DE PREÇOS'' | ''CONVITE'' | ''DISPENSA''
        -- | ''INEXIGIBILIDADE'' | ''DISPENSADA'' | ''OUTRO''
        numero_licitacao VARCHAR(100),
        credor_id        INTEGER       NOT NULL REFERENCES credores(id),
        valor            NUMERIC(15,2),
        vigencia_inicio  DATE,
        vigencia_fim     DATE,
        data_assinatura  DATE,
        secretaria       VARCHAR(200),         -- sigla ou nome da secretaria
        fiscal           VARCHAR(500),         -- nome do fiscal (auto-preenchido via responsaveis)
        observacoes      TEXT,
        status           VARCHAR(20)   NOT NULL DEFAULT ''ATIVO'',
        -- ''ATIVO'' | ''ENCERRADO'' | ''SUSPENSO'' | ''RESCINDIDO''
        dias_alerta      INTEGER       NOT NULL DEFAULT 30,
        created_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMP     NOT NULL DEFAULT NOW()
      );
    ';

    EXECUTE '
      CREATE UNIQUE INDEX IF NOT EXISTS contratos_numero_uq
        ON contratos (numero_contrato);
    ';

    -- ── 4. CONTRATOS_ITENS_VINCULO (pivot contrato ↔ catálogo) ─────────────
    EXECUTE '
      CREATE TABLE IF NOT EXISTS contratos_itens_vinculo (
        id              SERIAL        PRIMARY KEY,
        contrato_id     INTEGER       NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
        item_id         INTEGER                REFERENCES contratos_itens(id),  -- NULL = item manual
        lote            VARCHAR(20),
        descricao       VARCHAR(500),
        unidade         VARCHAR(50),
        quantidade      NUMERIC(15,4),
        valor_unitario  NUMERIC(15,4),
        valor_total     NUMERIC(15,4)  GENERATED ALWAYS AS
                          (COALESCE(quantidade, 0) * COALESCE(valor_unitario, 0)) STORED,
        ordem           INTEGER       NOT NULL DEFAULT 0,
        created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP     NOT NULL DEFAULT NOW()
      );
    ';

    EXECUTE '
      CREATE INDEX IF NOT EXISTS contratos_itens_vinculo_contrato_idx
        ON contratos_itens_vinculo (contrato_id);
    ';

    -- ── 5. RESPONSAVEIS ──────────────────────────────────────────────────────
    -- Tabela relacional que espelha / substitui o JSONB secretarias.responsaveis.
    -- Mantém histórico de titulares por secretaria com vigência.
    EXECUTE '
      CREATE TABLE IF NOT EXISTS responsaveis (
        id            SERIAL        PRIMARY KEY,
        secretaria_id UUID          REFERENCES secretarias(id) ON DELETE SET NULL,
        nome          VARCHAR(500)  NOT NULL,
        cargo         VARCHAR(300),
        cpf           VARCHAR(14),
        email         VARCHAR(255),
        telefone      VARCHAR(20),
        data_inicio   DATE,
        data_fim      DATE,          -- NULL = still active
        ativo         BOOLEAN       NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP     NOT NULL DEFAULT NOW()
      );
    ';

    EXECUTE '
      CREATE INDEX IF NOT EXISTS responsaveis_secretaria_idx
        ON responsaveis (secretaria_id);
    ';

    -- ── 6. AGENTES ───────────────────────────────────────────────────────────
    -- Agentes públicos que atuam como fiscais de contrato.
    EXECUTE '
      CREATE TABLE IF NOT EXISTS agentes (
        id            SERIAL        PRIMARY KEY,
        nome          VARCHAR(500)  NOT NULL,
        cargo         VARCHAR(300),
        matricula     VARCHAR(50),
        cpf           VARCHAR(14),
        email         VARCHAR(255),
        telefone      VARCHAR(20),
        secretaria_id UUID          REFERENCES secretarias(id) ON DELETE SET NULL,
        ativo         BOOLEAN       NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP     NOT NULL DEFAULT NOW()
      );
    ';

    EXECUTE '
      CREATE INDEX IF NOT EXISTS agentes_secretaria_idx
        ON agentes (secretaria_id);
    ';

    RAISE NOTICE 'Schema % concluído.', schema_rec.schema_name;

  END LOOP;
END $$;
