const { Sequelize } = require('sequelize');
require('dotenv').config();

const POOL_CONFIG = {
  max: 5,           // Supabase free tier: limite de ~10 conexões no session mode
  min: 1,           // manter 1 conexão aquecida (economiza conexões)
  acquire: 60000,   // tempo máximo para obter conexão
  idle: 10000,      // liberar conexões ociosas em 10s (libera para outros processos)
  evict: 3000,      // verificar conexões ociosas a cada 3s
};

const IS_SUPABASE = process.env.DB_HOST && process.env.DB_HOST.includes('supabase.co');

const DIALECT_OPTIONS = {
  keepAlive: true,
  connectTimeout: 10000,
  statement_timeout: 30000,
  idle_in_transaction_session_timeout: 30000,
  ...(IS_SUPABASE ? { ssl: { require: true, rejectUnauthorized: false } } : {}),
};

const masterDb = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
    pool: POOL_CONFIG,
    dialectOptions: DIALECT_OPTIONS,
  }
);

// Cache: schema → { db, models }
const tenantCache = new Map();

// Executa migrações pendentes no schema do tenant (idempotente — usa IF NOT EXISTS)
// OTIMIZADO: de ~30 queries sequenciais → 2 rodadas paralelas (~10x mais rápido no primeiro acesso)
const runTenantMigrations = async (tenantDb, tenantSchema) => {
  // Helper: executa query ignorando erros (IF NOT EXISTS torna tudo idempotente)
  const run = (sql) => tenantDb.query(sql).catch(() => {});

  // SET search_path uma única vez para esta conexão
  await tenantDb.query(`SET search_path = "${tenantSchema}"`);

  // ── Rodada 1: todos os blocos independentes em paralelo ──────────────────
  await Promise.allSettled([

    // 0. Usuários — coluna nome_reduzido
    run(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nome_reduzido VARCHAR(60)`),

    // 1. Secretarias — colunas extras
    run(`
      ALTER TABLE secretarias
        ADD COLUMN IF NOT EXISTS responsaveis    JSONB        NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS data_inicio     DATE,
        ADD COLUMN IF NOT EXISTS data_fim        DATE,
        ADD COLUMN IF NOT EXISTS email           VARCHAR(255),
        ADD COLUMN IF NOT EXISTS whatsapp        VARCHAR(20),
        ADD COLUMN IF NOT EXISTS outros_sistemas BOOLEAN      NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS cnpj            VARCHAR(18),
        ADD COLUMN IF NOT EXISTS razao_social    VARCHAR(500),
        ADD COLUMN IF NOT EXISTS codigo_unidade  VARCHAR(50),
        ADD COLUMN IF NOT EXISTS orcamento       JSONB        NOT NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS dotacoes        JSONB        NOT NULL DEFAULT '[]'::jsonb
    `),

    // 2. Entidade
    run(`
      CREATE TABLE IF NOT EXISTS entidade (
        id              SERIAL PRIMARY KEY,
        nome            VARCHAR(500),
        nome_abreviado  VARCHAR(100),
        cnpj            VARCHAR(18),
        razao_social    VARCHAR(500),
        codigo_unidade  VARCHAR(50),
        esfera          VARCHAR(50),
        poder           VARCHAR(50),
        email           VARCHAR(255),
        telefone        VARCHAR(20),
        whatsapp        VARCHAR(20),
        cep             VARCHAR(9),
        logradouro      VARCHAR(500),
        numero          VARCHAR(20),
        complemento     VARCHAR(200),
        bairro          VARCHAR(200),
        cidade          VARCHAR(200),
        uf              VARCHAR(2),
        created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
      );
      INSERT INTO entidade (id) VALUES (1) ON CONFLICT DO NOTHING;
    `),

    // 3. Módulo Contratos (num único bloco SQL — FKs internas já respeitam ordem)
    run(`
      CREATE TABLE IF NOT EXISTS credores (
        id            SERIAL       PRIMARY KEY,
        tipo          VARCHAR(10)  NOT NULL DEFAULT 'Jurídica',
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
        status        VARCHAR(20)  NOT NULL DEFAULT 'ATIVO',
        created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS credores_cnpj_cpf_uq ON credores (cnpj_cpf);

      CREATE TABLE IF NOT EXISTS contratos_itens (
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
        status           VARCHAR(20)  NOT NULL DEFAULT 'ATIVO',
        validado         BOOLEAN      NOT NULL DEFAULT FALSE,
        created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMP    NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS contratos (
        id               SERIAL        PRIMARY KEY,
        tipo_contrato    VARCHAR(50)   NOT NULL DEFAULT 'CONTRATO',
        numero_contrato  VARCHAR(50)   NOT NULL,
        objeto           TEXT          NOT NULL,
        modalidade       VARCHAR(100),
        numero_licitacao VARCHAR(100),
        credor_id        INTEGER       NOT NULL REFERENCES credores(id),
        valor            NUMERIC(15,2),
        vigencia_inicio  DATE,
        vigencia_fim     DATE,
        data_assinatura  DATE,
        secretaria       VARCHAR(200),
        fiscal           VARCHAR(500),
        observacoes      TEXT,
        status           VARCHAR(20)   NOT NULL DEFAULT 'ATIVO',
        dias_alerta      INTEGER       NOT NULL DEFAULT 30,
        created_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMP     NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS contratos_numero_uq ON contratos (numero_contrato);

      CREATE TABLE IF NOT EXISTS contratos_itens_vinculo (
        id              SERIAL        PRIMARY KEY,
        contrato_id     INTEGER       NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
        item_id         INTEGER                REFERENCES contratos_itens(id),
        lote            VARCHAR(20),
        descricao       VARCHAR(500),
        unidade         VARCHAR(50),
        quantidade      NUMERIC(15,4),
        valor_unitario  NUMERIC(15,4),
        valor_total     NUMERIC(15,4) GENERATED ALWAYS AS
                          (COALESCE(quantidade, 0) * COALESCE(valor_unitario, 0)) STORED,
        ordem           INTEGER       NOT NULL DEFAULT 0,
        created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP     NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS contratos_itens_vinculo_contrato_idx
        ON contratos_itens_vinculo (contrato_id);

      CREATE TABLE IF NOT EXISTS responsaveis (
        id            SERIAL        PRIMARY KEY,
        secretaria_id UUID          REFERENCES secretarias(id) ON DELETE SET NULL,
        nome          VARCHAR(500)  NOT NULL,
        cargo         VARCHAR(300),
        cpf           VARCHAR(14),
        email         VARCHAR(255),
        telefone      VARCHAR(20),
        data_inicio   DATE,
        data_fim      DATE,
        ativo         BOOLEAN       NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP     NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS responsaveis_secretaria_idx ON responsaveis (secretaria_id);

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
      CREATE INDEX IF NOT EXISTS agentes_secretaria_idx ON agentes (secretaria_id);
    `),

    // 4. Módulo DID — cria tabela base (ALTER dids vai na Rodada 2)
    run(`
      CREATE TABLE IF NOT EXISTS dids (
        id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        processo_id             UUID          NOT NULL,
        numero_did              INTEGER,
        tipo_did                VARCHAR(20)   DEFAULT 'fixas',
        objeto                  TEXT,
        data_did                DATE,
        secretario_nome         VARCHAR(500),
        secretaria_sec1         VARCHAR(500),
        fonte_recurso           VARCHAR(200)  DEFAULT 'PRÓPRIO',
        detalhes_em_anexo       BOOLEAN       DEFAULT false,
        contrato_ref            VARCHAR(200),
        credor_sec1             VARCHAR(500),
        cnpj_cpf_credor_sec1    VARCHAR(30),
        nro_licitacao_sec1      VARCHAR(200),
        tipo_licitacao_sec1     VARCHAR(200),
        valor_did               NUMERIC(15,2),
        itens_did               JSONB,
        ci_recebido_em          DATE,
        ci_responsavel          VARCHAR(500),
        despacho_ci             TEXT,
        dotacao_numero          VARCHAR(200),
        fonte_recurso_numero    VARCHAR(200),
        compras_recebido_em     DATE,
        compras_responsavel     VARCHAR(500),
        ja_licitado             BOOLEAN       DEFAULT false,
        nro_licitacao           VARCHAR(200),
        realizar_cotacao        BOOLEAN       DEFAULT false,
        modalidade              VARCHAR(200),
        data_compras            DATE,
        responsavel_compras     VARCHAR(500),
        nro_empenho_solicitacao VARCHAR(200),
        local_entrega           VARCHAR(500),
        contabil_recebido_em    DATE,
        contabil_responsavel    VARCHAR(500),
        credor                  VARCHAR(500),
        cnpj_cpf_credor         VARCHAR(30),
        nf_numero               VARCHAR(200),
        nf_valor                NUMERIC(15,2),
        cert_cnd_federal        BOOLEAN       DEFAULT false,
        cert_fgts               BOOLEAN       DEFAULT false,
        cert_tst                BOOLEAN       DEFAULT false,
        cert_municipal          BOOLEAN       DEFAULT false,
        cert_estadual           BOOLEAN       DEFAULT false,
        empenho_numero          VARCHAR(200),
        data_liquidacao         DATE,
        tipo_empenho            VARCHAR(20),
        financas_recebido_em    DATE,
        financas_responsavel    VARCHAR(500),
        tesouraria_recebido_em  DATE,
        tesouraria_responsavel  VARCHAR(500),
        banco_pagador           VARCHAR(200),
        ag_pagador              VARCHAR(50),
        cc_pagador              VARCHAR(50),
        cnpj_fornecedor         VARCHAR(30),
        banco_fornecedor        VARCHAR(200),
        ag_fornecedor           VARCHAR(50),
        cc_fornecedor           VARCHAR(50),
        cert_teso_cnd           BOOLEAN       DEFAULT false,
        cert_teso_fgts          BOOLEAN       DEFAULT false,
        cert_teso_estadual      BOOLEAN       DEFAULT false,
        cert_teso_trabalhista   BOOLEAN       DEFAULT false,
        cert_teso_municipal     BOOLEAN       DEFAULT false,
        analisado_por           VARCHAR(500),
        valor_bruto             NUMERIC(15,2) DEFAULT 0,
        desconto_inss           NUMERIC(15,2) DEFAULT 0,
        desconto_iss            NUMERIC(15,2) DEFAULT 0,
        desconto_irrf           NUMERIC(15,2) DEFAULT 0,
        desconto_sindicato      NUMERIC(15,2) DEFAULT 0,
        desconto_bb             NUMERIC(15,2) DEFAULT 0,
        desconto_caixa          NUMERIC(15,2) DEFAULT 0,
        desconto_pensao         NUMERIC(15,2) DEFAULT 0,
        desconto_outros         NUMERIC(15,2) DEFAULT 0,
        doc_caixa               VARCHAR(200),
        status                  VARCHAR(20)   DEFAULT 'rascunho',
        criado_por_id           UUID,
        created_at              TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at              TIMESTAMP     NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS dids_processo_id_idx ON dids (processo_id);
    `),

    // 5. ALTER processos — campos opcionais
    run(`
      ALTER TABLE processos
        ALTER COLUMN interessado_nome      DROP NOT NULL,
        ALTER COLUMN interessado_cpf_cnpj  DROP NOT NULL
    `),

    // 6. Almoxarifado — cria lotes + audit_log, depois altera lotes (chained para evitar race)
    run(`
      CREATE TABLE IF NOT EXISTS almoxarifado_lotes (
        id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id            UUID          NOT NULL,
        numero_empenho     VARCHAR(100),
        numero_nf          VARCHAR(100),
        fornecedor_nome    VARCHAR(500),
        data_entrada       DATE          NOT NULL,
        data_validade      DATE,
        quantidade_inicial NUMERIC(10,3) NOT NULL,
        quantidade_atual   NUMERIC(10,3) NOT NULL,
        valor_unitario     NUMERIC(10,2) NOT NULL DEFAULT 0,
        observacao         TEXT,
        usuario_id         UUID          NOT NULL,
        ativo              BOOLEAN       NOT NULL DEFAULT TRUE,
        created_at         TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at         TIMESTAMP     NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS almox_lotes_item_idx     ON almoxarifado_lotes (item_id);
      CREATE INDEX IF NOT EXISTS almox_lotes_validade_idx ON almoxarifado_lotes (data_validade);

      CREATE TABLE IF NOT EXISTS almoxarifado_audit_log (
        id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        tabela           VARCHAR(100)  NOT NULL,
        registro_id      VARCHAR(100)  NOT NULL,
        acao             VARCHAR(50)   NOT NULL,
        descricao        TEXT,
        dados_anteriores JSONB,
        dados_novos      JSONB,
        user_id          UUID,
        user_nome        VARCHAR(500),
        ip               VARCHAR(50),
        created_at       TIMESTAMP     NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS almox_audit_tabela_idx ON almoxarifado_audit_log (tabela, registro_id);
      CREATE INDEX IF NOT EXISTS almox_audit_user_idx   ON almoxarifado_audit_log (user_id);
    `).then(() => run(`
      ALTER TABLE almoxarifado_lotes
        ADD COLUMN IF NOT EXISTS chave_nfe                VARCHAR(44),
        ADD COLUMN IF NOT EXISTS numero_contrato          VARCHAR(100),
        ADD COLUMN IF NOT EXISTS conferencia_cega_qtd     NUMERIC(10,3),
        ADD COLUMN IF NOT EXISTS conferencia_cega_ok      BOOLEAN,
        ADD COLUMN IF NOT EXISTS numero_patrimonio_inicio  VARCHAR(50),
        ADD COLUMN IF NOT EXISTS numero_patrimonio_fim     VARCHAR(50)
    `)),

    // 7. ALTER almoxarifado_movimentacoes
    run(`
      ALTER TABLE almoxarifado_movimentacoes
        ADD COLUMN IF NOT EXISTS lote_id          UUID,
        ADD COLUMN IF NOT EXISTS numero_empenho   VARCHAR(100),
        ADD COLUMN IF NOT EXISTS numero_nf        VARCHAR(100),
        ADD COLUMN IF NOT EXISTS fornecedor_nome   VARCHAR(500)
    `),

    // 8. ALTER almoxarifado_requisicoes
    run(`
      ALTER TABLE almoxarifado_requisicoes
        ADD COLUMN IF NOT EXISTS secretaria_id          UUID,
        ADD COLUMN IF NOT EXISTS prioridade             VARCHAR(20) DEFAULT 'NORMAL',
        ADD COLUMN IF NOT EXISTS data_autorizacao       TIMESTAMP,
        ADD COLUMN IF NOT EXISTS data_separacao         TIMESTAMP,
        ADD COLUMN IF NOT EXISTS data_entrega           TIMESTAMP,
        ADD COLUMN IF NOT EXISTS justificativa          TEXT,
        ADD COLUMN IF NOT EXISTS usuario_autorizador_id UUID,
        ADD COLUMN IF NOT EXISTS hash_assinatura        VARCHAR(128),
        ADD COLUMN IF NOT EXISTS token_entrega          VARCHAR(32),
        ADD COLUMN IF NOT EXISTS token_expiry           TIMESTAMP,
        ADD COLUMN IF NOT EXISTS centro_custo           VARCHAR(200)
    `),

    // 9. ALTER almoxarifado_itens + ALTER almoxarifado_requisicao_itens
    run(`
      ALTER TABLE almoxarifado_itens
        ADD COLUMN IF NOT EXISTS corredor              VARCHAR(20),
        ADD COLUMN IF NOT EXISTS prateleira            VARCHAR(20),
        ADD COLUMN IF NOT EXISTS gaveta                VARCHAR(20),
        ADD COLUMN IF NOT EXISTS tipo_item             VARCHAR(10)  NOT NULL DEFAULT 'CONSUMO',
        ADD COLUMN IF NOT EXISTS ponto_ressuprimento   NUMERIC(10,3),
        ADD COLUMN IF NOT EXISTS numero_patrimonio_seq INTEGER;
      ALTER TABLE almoxarifado_requisicao_itens
        ADD COLUMN IF NOT EXISTS valor_unitario_saida  NUMERIC(10,2),
        ADD COLUMN IF NOT EXISTS lote_id               UUID
    `),

    // 10. Cotas e inventários
    run(`
      CREATE TABLE IF NOT EXISTS almox_cotas (
        id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        setor_id             UUID          NOT NULL,
        item_id              UUID          NOT NULL,
        mes_ano              VARCHAR(7)    NOT NULL,
        quantidade_cota      NUMERIC(10,3) NOT NULL,
        quantidade_consumida NUMERIC(10,3) NOT NULL DEFAULT 0,
        ativo                BOOLEAN       NOT NULL DEFAULT TRUE,
        observacao           TEXT,
        usuario_id           UUID,
        created_at           TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMP     NOT NULL DEFAULT NOW(),
        UNIQUE (setor_id, item_id, mes_ano)
      );
      CREATE INDEX IF NOT EXISTS almox_cotas_setor_mes_idx ON almox_cotas (setor_id, mes_ano);

      CREATE TABLE IF NOT EXISTS almox_inventarios (
        id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        numero                 VARCHAR(30) NOT NULL UNIQUE,
        data_inicio            DATE        NOT NULL,
        data_conclusao         DATE,
        status                 VARCHAR(20) NOT NULL DEFAULT 'EM_ANDAMENTO',
        usuario_responsavel_id UUID        NOT NULL,
        observacao             TEXT,
        total_itens            INTEGER     NOT NULL DEFAULT 0,
        total_divergencias     INTEGER     NOT NULL DEFAULT 0,
        created_at             TIMESTAMP   NOT NULL DEFAULT NOW(),
        updated_at             TIMESTAMP   NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS almox_inventario_itens (
        id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        inventario_id      UUID          NOT NULL,
        item_id            UUID          NOT NULL,
        quantidade_sistema NUMERIC(10,3) NOT NULL,
        quantidade_contada NUMERIC(10,3),
        diferenca          NUMERIC(10,3),
        valor_unitario     NUMERIC(10,2) NOT NULL DEFAULT 0,
        valor_divergencia  NUMERIC(10,2),
        contado            BOOLEAN       NOT NULL DEFAULT FALSE,
        observacao         TEXT,
        created_at         TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at         TIMESTAMP     NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS almox_inv_itens_inv_idx ON almox_inventario_itens (inventario_id);
    `),

    // 11. ALTER TYPE enum (PostgreSQL só permite ADD VALUE individualmente)
    (async () => {
      for (const val of ['RASCUNHO', 'PENDENTE_AUTORIZACAO', 'AUTORIZADA', 'EM_SEPARACAO', 'ENTREGUE']) {
        await run(`ALTER TYPE "enum_almoxarifado_requisicoes_status" ADD VALUE IF NOT EXISTS '${val}'`);
      }
    })(),

  ]); // fim Rodada 1

  // ── Rodada 2: todos os ALTER dids mesclados em UMA única query ────────────
  // (antes eram 4 round-trips sequenciais; agora 1 round-trip)
  await run(`
    ALTER TABLE dids
      ADD COLUMN IF NOT EXISTS secretaria_sec1               VARCHAR(500),
      ADD COLUMN IF NOT EXISTS cnpj_cpf_credor_sec1          VARCHAR(30),
      ADD COLUMN IF NOT EXISTS mes_referencia                VARCHAR(20),
      ADD COLUMN IF NOT EXISTS nf_sec1                       VARCHAR(50),
      ADD COLUMN IF NOT EXISTS cert_sec1_municipal           BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS cert_sec1_trabalhista         BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS cert_sec1_fgts                BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS cert_sec1_estadual            BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS cert_sec1_federal             BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS contabil_auditor              VARCHAR(500),
      ADD COLUMN IF NOT EXISTS data_empenho                  DATE,
      ADD COLUMN IF NOT EXISTS liquidacao_numero             VARCHAR(200),
      ADD COLUMN IF NOT EXISTS financas2_recebido_em         DATE,
      ADD COLUMN IF NOT EXISTS financas2_responsavel         VARCHAR(500),
      ADD COLUMN IF NOT EXISTS financas2_enviado_pagamento   DATE,
      ADD COLUMN IF NOT EXISTS contab_fech_finalizado        VARCHAR(10),
      ADD COLUMN IF NOT EXISTS contab_fech_tce               VARCHAR(10),
      ADD COLUMN IF NOT EXISTS pago                          VARCHAR(10),
      ADD COLUMN IF NOT EXISTS receb_data                    DATE,
      ADD COLUMN IF NOT EXISTS receb_nf_data                 DATE,
      ADD COLUMN IF NOT EXISTS receb_responsavel             VARCHAR(500),
      ADD COLUMN IF NOT EXISTS receb_cargo                   VARCHAR(300),
      ADD COLUMN IF NOT EXISTS receb_nf_conferida            BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS receb_qtd_conferida           BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS receb_esp_conforme            BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS receb_obs                     TEXT,
      ADD COLUMN IF NOT EXISTS receb_nf_enviado_compras      DATE,
      ADD COLUMN IF NOT EXISTS compras2_recebido_em          DATE,
      ADD COLUMN IF NOT EXISTS compras2_responsavel          VARCHAR(500),
      ADD COLUMN IF NOT EXISTS compras2_ja_licitado          BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS compras2_nro_licitacao        VARCHAR(200),
      ADD COLUMN IF NOT EXISTS compras2_realizar_cotacao     BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS compras2_modalidade           VARCHAR(200),
      ADD COLUMN IF NOT EXISTS compras2_data                 DATE,
      ADD COLUMN IF NOT EXISTS compras2_responsavel_compras  VARCHAR(500),
      ADD COLUMN IF NOT EXISTS compras2_nro_empenho_solicitacao VARCHAR(200),
      ADD COLUMN IF NOT EXISTS compras2_local_entrega        VARCHAR(500),
      ADD COLUMN IF NOT EXISTS compras3_recebido_em          DATE,
      ADD COLUMN IF NOT EXISTS compras3_responsavel          VARCHAR(500),
      ADD COLUMN IF NOT EXISTS compras3_ja_licitado          BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS compras3_nro_licitacao        VARCHAR(200),
      ADD COLUMN IF NOT EXISTS compras3_realizar_cotacao     BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS compras3_modalidade           VARCHAR(200),
      ADD COLUMN IF NOT EXISTS compras3_data                 DATE,
      ADD COLUMN IF NOT EXISTS compras3_responsavel_compras  VARCHAR(500),
      ADD COLUMN IF NOT EXISTS compras3_nro_empenho_solicitacao VARCHAR(200),
      ADD COLUMN IF NOT EXISTS compras3_local_entrega        DATE,
      ADD COLUMN IF NOT EXISTS contabil_pc_recebido_em       DATE,
      ADD COLUMN IF NOT EXISTS contabil_pc_responsavel       VARCHAR(500),
      ADD COLUMN IF NOT EXISTS contabil_pc_auditor           VARCHAR(500),
      ADD COLUMN IF NOT EXISTS contabil_pc_empenho_numero    VARCHAR(200),
      ADD COLUMN IF NOT EXISTS contabil_pc_tipo_empenho      VARCHAR(20),
      ADD COLUMN IF NOT EXISTS contabil_pc_data_empenho      DATE,
      ADD COLUMN IF NOT EXISTS contabil_pc_liquidacao_numero VARCHAR(200),
      ADD COLUMN IF NOT EXISTS contabil_pc_data_liquidacao   DATE,
      ADD COLUMN IF NOT EXISTS contabil_pc_doc_caixa         VARCHAR(200)
  `);
};

const getTenantConnection = async (tenantSchema) => {
  if (tenantCache.has(tenantSchema)) {
    return tenantCache.get(tenantSchema).db;
  }

  // CRÍTICO: o search_path precisa ser definido em nível de conexão
  // (dialectOptions.options → passado ao PostgreSQL no handshake de cada conexão do pool).
  // Se fosse apenas um SET search_path numa query isolada, as demais conexões do pool
  // usariam o schema 'public' e as tabelas do tenant não seriam encontradas.
  const tenantDb = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: 'postgres',
      schema: tenantSchema,
      logging: false,
      pool: POOL_CONFIG,
      dialectOptions: {
        ...DIALECT_OPTIONS,
        options: `-c search_path="${tenantSchema}",public`,
      },
    }
  );

  await tenantDb.authenticate();
  await runTenantMigrations(tenantDb, tenantSchema);    // ← garante colunas novas antes de qualquer query

  // Invalida o schema context cacheado para que a Ayla reflita as novas tabelas
  try {
    const { invalidateSchemaCache } = require('../controllers/schemaContextController');
    invalidateSchemaCache(tenantSchema);
  } catch (_) { /* ignora se o controller ainda não foi carregado */ }

  tenantCache.set(tenantSchema, { db: tenantDb, models: null });
  return tenantDb;
};

// Retorna models cacheados por schema (define só uma vez)
const getCachedModels = (tenantSchema, initFn) => {
  const entry = tenantCache.get(tenantSchema);
  if (!entry) return null;
  if (!entry.models) {
    entry.models = initFn(entry.db);
  }
  return entry.models;
};

const closeTenantConnection = (tenantSchema) => {
  if (tenantCache.has(tenantSchema)) {
    const { db } = tenantCache.get(tenantSchema);
    db.close();
    tenantCache.delete(tenantSchema);
  }
};

module.exports = {
  masterDb,
  getTenantConnection,
  getCachedModels,
  closeTenantConnection
};
