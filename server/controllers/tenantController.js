const Tenant = require('../models/Tenant');
const { masterDb, getTenantConnection } = require('../config/database');
const tenantCache = new Map(); // espelho do cache do auth middleware
const bcrypt = require('bcryptjs');
const initTenantModels = require('../models');
const { Pool } = require('pg');

// Listar todos os tenants
const listTenants = async (req, res) => {
  try {
    const tenants = await Tenant.findAll({
      order: [['created_at', 'DESC']],
      attributes: ['id', 'nome_municipio', 'cnpj', 'subdominio', 'schema', 'cidade', 'estado', 'ativo', 'configuracoes', 'created_at']
    });

    res.json({ 
      success: true,
      tenants,
      total: tenants.length
    });
  } catch (error) {
    console.error('❌ Erro ao listar tenants:', error);
    res.status(500).json({ error: 'Erro ao listar municípios' });
  }
};

// Buscar tenant específico
const getTenantById = async (req, res) => {
  try {
    const { id } = req.params;

    const tenant = await Tenant.findByPk(id);

    if (!tenant) {
      return res.status(404).json({ error: 'Município não encontrado' });
    }

    // Buscar administrador principal do schema isolado
    let adminPrincipal = null;
    const pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
    try {
      const result = await pool.query(
        `SELECT nome, email, cpf FROM ${tenant.schema}.usuarios WHERE tipo = 'admin' AND ativo = true ORDER BY created_at ASC LIMIT 1`
      );
      if (result.rows.length > 0) adminPrincipal = result.rows[0];
    } catch (_) {
      // schema pode não existir ainda
    } finally {
      await pool.end();
    }

    res.json({ success: true, tenant, adminPrincipal });
  } catch (error) {
    console.error('Erro ao buscar município');
    res.status(500).json({ error: 'Erro ao buscar município' });
  }
};

// Criar novo tenant com isolamento completo
const createTenant = async (req, res) => {
  try {
    const {
      nome,
      cnpj,
      subdominio,
      cidade,
      estado,
      configuracoes,
      adminNome,
      adminEmail,
      adminCpf,
      adminSenha
    } = req.body;

    // Validações
    if (!nome || !cnpj || !subdominio || !cidade || !estado) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    if (!adminCpf || !adminSenha) {
      return res.status(400).json({ error: 'Dados do administrador são obrigatórios' });
    }

    // Verificar se subdomínio já existe
    const subdominioExistente = await Tenant.findOne({ 
      where: { subdominio } 
    });
    
    if (subdominioExistente) {
      return res.status(400).json({ error: 'Subdomínio já está em uso' });
    }

    // Verificar se CNPJ já existe
    const cnpjExistente = await Tenant.findOne({ where: { cnpj } });
    if (cnpjExistente) {
      return res.status(400).json({ error: 'CNPJ já cadastrado' });
    }

    // Gerar nome do schema isolado
    const schema = `tenant_${subdominio.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    // Criar tenant no banco master
    const tenant = await Tenant.create({
      nome_municipio: nome,
      cnpj,
      subdominio,
      schema,
      cidade,
      estado,
      ativo: true,
      configuracoes: configuracoes || {
        cor_primaria: '#0066CC',
        cor_secundaria: '#004C99',
        logo_url: null
      }
    });

    // Criar schema e estrutura isolada do banco
    try {
      await criarEstruturaIsolada(schema, tenant, {
        nome: adminNome,
        email: adminEmail,
        cpf: adminCpf,
        senha: adminSenha
      });
    } catch (schemaError) {
      console.error('Erro ao criar estrutura isolada');
      // Rollback: deletar tenant
      await tenant.destroy();
      throw new Error('Erro ao criar banco de dados isolado');
    }

    res.status(201).json({
      success: true,
      message: 'Município cadastrado com sucesso! Banco de dados isolado criado.',
      tenant: {
        id: tenant.id,
        nome_municipio: tenant.nome_municipio,
        subdominio: tenant.subdominio,
        cidade: tenant.cidade,
        estado: tenant.estado,
        url_acesso: `${subdominio}.jprocesso.gov.br`
      }
    });
  } catch (error) {
    console.error('Erro ao criar município');
    res.status(500).json({ error: error.message || 'Erro ao criar município' });
  }
};

// Atualizar tenant
const updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome,
      cnpj,
      cidade,
      estado,
      ativo,
      configuracoes,
      adminNome,
      adminEmail,
      adminCpf,
      adminSenha
    } = req.body;

    const tenant = await Tenant.findByPk(id);
    
    if (!tenant) {
      return res.status(404).json({ error: 'Município não encontrado' });
    }

    // Não permite alterar subdomínio e schema após criação
    await tenant.update({
      nome_municipio: nome,
      cnpj,
      cidade,
      estado,
      ativo,
      configuracoes
    });

    // Criar/atualizar administrador se dados foram fornecidos
    let adminCriado = false;
    let aviso = null;
    if (adminNome && adminCpf) {
      const pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
      });
      try {
        // Garantir colunas ausentes antes de inserir
        await migrarSchemaUsuarios(tenant.schema, pool);

        // Email placeholder para evitar violação de NOT NULL em schemas antigos
        const emailFinal = adminEmail || `admin_${adminCpf}@noemail.local`;

        if (adminSenha) {
          // Criar novo ou atualizar tudo (incluindo senha)
          const senhaHash = await bcrypt.hash(adminSenha, 10);
          await pool.query(`
            INSERT INTO ${tenant.schema}.usuarios (nome, email, cpf, senha, tipo, ativo)
            VALUES ($1, $2, $3, $4, 'admin', true)
            ON CONFLICT (cpf) DO UPDATE SET
              nome = EXCLUDED.nome,
              email = CASE WHEN EXCLUDED.email NOT LIKE '%@noemail.local' THEN EXCLUDED.email ELSE usuarios.email END,
              senha = EXCLUDED.senha,
              tipo = 'admin',
              ativo = true
          `, [adminNome, emailFinal, adminCpf, senhaHash]);
        } else {
          // Atualizar apenas nome/email de usuário existente (sem alterar senha)
          await pool.query(`
            UPDATE ${tenant.schema}.usuarios SET
              nome = $1,
              email = CASE WHEN $2 IS NOT NULL THEN $2 ELSE email END,
              tipo = 'admin',
              ativo = true
            WHERE cpf = $3
          `, [adminNome, adminEmail || null, adminCpf]);
        }
        adminCriado = true;
      } catch (adminError) {
        console.error('Erro ao salvar admin:', adminError.message);
        aviso = 'Município salvo, mas houve erro ao atualizar o administrador. Verifique se o e-mail já está em uso.';
      } finally {
        await pool.end();
      }
    }

    res.json({
      success: true,
      message: adminCriado
        ? 'Município e administrador atualizados com sucesso'
        : 'Município atualizado com sucesso',
      ...(aviso ? { aviso } : {}),
      tenant
    });
  } catch (error) {
    console.error('Erro ao atualizar município');
    res.status(500).json({ error: 'Erro ao atualizar município' });
  }
};

// Deletar/Desativar tenant
const deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmar_exclusao } = req.body;
    
    const tenant = await Tenant.findByPk(id);
    
    if (!tenant) {
      return res.status(404).json({ error: 'Município não encontrado' });
    }

    // Por segurança, apenas desativar por padrão
    if (confirmar_exclusao === true) {
      // ATENÇÃO: Isso irá deletar TODOS os dados do município!
      const schema = tenant.schema;
      
      // Deletar schema do banco
      await masterDb.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await tenant.destroy();

      res.json({
        success: true,
        message: 'Município e todos os seus dados foram deletados permanentemente',
        tenant_deletado: tenant.nome_municipio
      });
    } else {
      await tenant.update({ ativo: false });

      res.json({
        success: true,
        message: 'Município desativado com sucesso',
        nota: 'Os dados foram preservados. Para exclusão permanente, envie "confirmar_exclusao: true" no corpo da requisição.'
      });
    }
  } catch (error) {
    console.error('Erro ao processar operação no município');
    res.status(500).json({ error: 'Erro ao processar operação' });
  }
};

// Migração automática: cria tabela agentes se não existir
async function migrarAgentes(schema, pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.agentes (
      id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      nome          VARCHAR(500)  NOT NULL,
      cargo         VARCHAR(300),
      matricula     VARCHAR(50),
      cpf           VARCHAR(14),
      email         VARCHAR(255),
      telefone      VARCHAR(20),
      secretaria_id UUID          REFERENCES ${schema}.secretarias(id) ON DELETE SET NULL,
      ativo         BOOLEAN       NOT NULL DEFAULT TRUE,
      created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMP     NOT NULL DEFAULT NOW()
    );
  `);
}

// Migração automática: adiciona colunas ausentes em schemas já existentes
async function migrarSchemaUsuarios(schema, pool) {
  // usuarios
  await pool.query(`
    ALTER TABLE IF EXISTS ${schema}.usuarios
      ADD COLUMN IF NOT EXISTS nome_reduzido VARCHAR(60),
      ADD COLUMN IF NOT EXISTS permissoes JSONB NOT NULL DEFAULT '{"criar_processo":true,"editar_processo":true,"excluir_processo":false,"tramitar_processo":true,"acessar_almoxarifado":false,"acessar_financeiro":false,"acessar_contratos":false,"visualizar_relatorios":false,"gerenciar_usuarios":false,"gerenciar_secretarias":false,"gerenciar_configuracoes":false}'::jsonb;
    ALTER TABLE IF EXISTS ${schema}.usuarios ALTER COLUMN email DROP NOT NULL;
  `);

  // processos
  await pool.query(`
    ALTER TABLE IF EXISTS ${schema}.processos
      ADD COLUMN IF NOT EXISTS tipo_processo VARCHAR(30);
  `);

  // tramitacoes: renomear coluna 'tipo' para 'tipo_acao' se necessário e adicionar colunas ausentes
  await pool.query(`
    DO $$
    BEGIN
      -- Renomear coluna 'tipo' para 'tipo_acao' se ainda não foi renomeada
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = '${schema}' AND table_name = 'tramitacoes' AND column_name = 'tipo'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = '${schema}' AND table_name = 'tramitacoes' AND column_name = 'tipo_acao'
      ) THEN
        ALTER TABLE ${schema}.tramitacoes RENAME COLUMN tipo TO tipo_acao;
      END IF;

      -- Remover check constraint antiga (gerada com 'tramitacao' em vez de 'tramite')
      IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = '${schema}' AND table_name = 'tramitacoes'
          AND constraint_name = 'tramitacoes_tipo_check'
      ) THEN
        ALTER TABLE ${schema}.tramitacoes DROP CONSTRAINT tramitacoes_tipo_check;
      END IF;

      -- Remover check constraint de tipo_acao caso exista com valores errados
      IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = '${schema}' AND table_name = 'tramitacoes'
          AND constraint_name = 'tramitacoes_tipo_acao_check'
      ) THEN
        ALTER TABLE ${schema}.tramitacoes DROP CONSTRAINT tramitacoes_tipo_acao_check;
      END IF;
    END$$;
    ALTER TABLE IF EXISTS ${schema}.tramitacoes
      ADD COLUMN IF NOT EXISTS tipo_acao VARCHAR(30),
      ADD COLUMN IF NOT EXISTS justificativa_devolucao TEXT,
      ADD COLUMN IF NOT EXISTS assinatura_digital VARCHAR(255);
    -- Garantir que a coluna tipo_acao aceita os valores corretos usados pelo código
    ALTER TABLE IF EXISTS ${schema}.tramitacoes
      ADD CONSTRAINT tramitacoes_tipo_acao_check
      CHECK (tipo_acao IN ('abertura','tramite','devolucao','conclusao','arquivamento'))
      NOT VALID;
  `);

  // setores: garantir que sigla permita null (banco antigo criou como NOT NULL)
  await pool.query(`
    ALTER TABLE IF EXISTS ${schema}.setores ALTER COLUMN sigla DROP NOT NULL;
  `);

  // secretarias: adicionar colunas extras do modelo
  await pool.query(`
    ALTER TABLE IF EXISTS ${schema}.secretarias
      ADD COLUMN IF NOT EXISTS data_inicio DATE,
      ADD COLUMN IF NOT EXISTS data_fim DATE,
      ADD COLUMN IF NOT EXISTS email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20),
      ADD COLUMN IF NOT EXISTS outros_sistemas BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18),
      ADD COLUMN IF NOT EXISTS razao_social VARCHAR(500),
      ADD COLUMN IF NOT EXISTS codigo_unidade VARCHAR(50),
      ADD COLUMN IF NOT EXISTS responsaveis JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS orcamento JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS dotacoes JSONB DEFAULT '[]';
  `);

  // anexos: criar tabela se não existir (modelo Documento usa tableName 'anexos')
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.anexos (
      id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      processo_id   UUID          NOT NULL REFERENCES ${schema}.processos(id) ON DELETE CASCADE,
      nome_arquivo  VARCHAR(255)  NOT NULL,
      nome_sistema  VARCHAR(255)  NOT NULL,
      url_arquivo   VARCHAR(500)  NOT NULL,
      tipo_mime     VARCHAR(100)  NOT NULL,
      tamanho_bytes INTEGER       NOT NULL DEFAULT 0,
      hash_md5      VARCHAR(64)   NOT NULL DEFAULT '',
      hash_sha256   VARCHAR(64)   NOT NULL DEFAULT '',
      upload_por_id UUID          NOT NULL REFERENCES ${schema}.usuarios(id),
      data_upload   TIMESTAMP     DEFAULT NOW(),
      descricao     TEXT,
      versao        INTEGER       DEFAULT 1,
      created_at    TIMESTAMP     DEFAULT NOW(),
      updated_at    TIMESTAMP     DEFAULT NOW()
    );
  `);

  // =====================================================================
  // ALMOXARIFADO - categorias de material de consumo
  // =====================================================================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.alm_categorias (
      id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      codigo     VARCHAR(20)  NOT NULL UNIQUE,
      nome       VARCHAR(255) NOT NULL,
      descricao  TEXT,
      ativo      BOOLEAN      DEFAULT TRUE,
      created_at TIMESTAMP    DEFAULT NOW(),
      updated_at TIMESTAMP    DEFAULT NOW()
    );
    ALTER TABLE IF EXISTS ${schema}.alm_itens
      ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES ${schema}.alm_categorias(id),
      ADD COLUMN IF NOT EXISTS especificacao_tecnica TEXT;
  `);

  // =====================================================================
  // PATRIMÔNIO – tabelas conforme Manual TCE-Ceará
  // =====================================================================

  // Grupos de bens permanentes (classificação TCE-CE)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.pat_grupos (
      id                 UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
      codigo             VARCHAR(10)    NOT NULL UNIQUE,
      nome               VARCHAR(255)   NOT NULL,
      descricao          TEXT,
      vida_util_anos     INTEGER        DEFAULT 10,
      taxa_depreciacao   DECIMAL(5,2)   DEFAULT 10.00,
      conta_contabil     VARCHAR(30),
      ativo              BOOLEAN        DEFAULT TRUE,
      created_at         TIMESTAMP      DEFAULT NOW(),
      updated_at         TIMESTAMP      DEFAULT NOW()
    );
    INSERT INTO ${schema}.pat_grupos (codigo, nome, descricao, vida_util_anos, taxa_depreciacao, conta_contabil)
    VALUES
      ('01', 'Mobiliário em Geral',              'Mesas, cadeiras, armários e similares',      10, 10.00, '1.4.9.1.1.00.00'),
      ('02', 'Equipamentos de Processamento de Dados', 'Computadores, impressoras e periféricos', 5, 20.00, '1.4.9.2.1.00.00'),
      ('03', 'Aparelhos e Equipamentos',          'Aparelhos de ar-condicionado, TVs e similares', 10, 10.00, '1.4.9.3.1.00.00'),
      ('04', 'Veículos em Geral',                 'Automóveis, camionetes, motocicletas',        5, 20.00, '1.4.9.4.1.00.00'),
      ('05', 'Equipamentos e Material Técnico',   'Aparelhos cirúrgicos, laboratoriais e similares', 10, 10.00, '1.4.9.5.1.00.00'),
      ('06', 'Material Permanente de uso Específico', 'Instrumentos musicais, esportivos e outros', 10, 10.00, '1.4.9.6.1.00.00'),
      ('07', 'Bens de Natureza Cultural',         'Obras de arte, peças artísticas e similares', 0, 0.00, '1.4.9.7.1.00.00'),
      ('08', 'Semoventes',                        'Animais de propriedade do município',          10, 10.00, '1.4.9.8.1.00.00'),
      ('09', 'Imóveis',                           'Terrenos, edificações e benfeitorias',         0, 0.00, '1.4.8.1.1.00.00'),
      ('10', 'Outros Materiais Permanentes',      'Demais bens não classificados acima',         10, 10.00, '1.4.9.9.1.00.00')
    ON CONFLICT (codigo) DO NOTHING;
  `);

  // Bens permanentes tombados
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.pat_bens (
      id                          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
      numero_tombamento           VARCHAR(30)    NOT NULL UNIQUE,
      numero_tombamento_anterior  VARCHAR(30),
      grupo_id                    UUID           REFERENCES ${schema}.pat_grupos(id),
      descricao                   VARCHAR(500)   NOT NULL,
      especificacao_tecnica       TEXT,
      marca                       VARCHAR(100),
      modelo                      VARCHAR(100),
      numero_serie                VARCHAR(100),
      cor                         VARCHAR(50),
      numero_nota_fiscal          VARCHAR(50),
      serie_nf                    VARCHAR(10),
      chave_nfe                   VARCHAR(44),
      data_nota_fiscal            DATE,
      cnpj_fornecedor             VARCHAR(18),
      nome_fornecedor             VARCHAR(255),
      numero_empenho              VARCHAR(50),
      numero_contrato             VARCHAR(50),
      numero_processo             VARCHAR(50),
      data_aquisicao              DATE           NOT NULL,
      valor_aquisicao             DECIMAL(15,2)  NOT NULL,
      vida_util_anos              INTEGER,
      taxa_depreciacao            DECIMAL(5,2),
      valor_residual              DECIMAL(15,2)  DEFAULT 0,
      estado_conservacao          VARCHAR(20)    DEFAULT 'BOM'
                                    CHECK (estado_conservacao IN ('OTIMO','BOM','REGULAR','RUIM','PESSIMO','INSERVIVEL')),
      status                      VARCHAR(20)    DEFAULT 'ATIVO'
                                    CHECK (status IN ('ATIVO','TRANSFERIDO','BAIXADO','CEDIDO','EXTRAVIADO')),
      secretaria_id               UUID           REFERENCES ${schema}.secretarias(id),
      setor_id                    UUID           REFERENCES ${schema}.setores(id),
      responsavel_id              UUID           REFERENCES ${schema}.usuarios(id),
      local_fisico                VARCHAR(255),
      sala                        VARCHAR(100),
      placa                       VARCHAR(20),
      renavam                     VARCHAR(20),
      usuario_cadastro_id         UUID           REFERENCES ${schema}.usuarios(id),
      observacoes                 TEXT,
      foto_url                    VARCHAR(500),
      ativo                       BOOLEAN        DEFAULT TRUE,
      created_at                  TIMESTAMP      DEFAULT NOW(),
      updated_at                  TIMESTAMP      DEFAULT NOW()
    );
  `);

  // Termos de guarda e responsabilidade
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.pat_responsabilidades (
      id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      numero_termo          VARCHAR(50)  UNIQUE,
      bem_id                UUID         NOT NULL REFERENCES ${schema}.pat_bens(id),
      secretaria_id         UUID         REFERENCES ${schema}.secretarias(id),
      setor_id              UUID         REFERENCES ${schema}.setores(id),
      responsavel_id        UUID         REFERENCES ${schema}.usuarios(id),
      nome_responsavel      VARCHAR(255) NOT NULL,
      cargo_responsavel     VARCHAR(150),
      matricula_responsavel VARCHAR(50),
      data_inicio           DATE         NOT NULL,
      data_fim              DATE,
      status                VARCHAR(20)  DEFAULT 'VIGENTE' CHECK (status IN ('VIGENTE','ENCERRADO')),
      observacoes           TEXT,
      assinado_em           TIMESTAMP,
      usuario_id            UUID         REFERENCES ${schema}.usuarios(id),
      created_at            TIMESTAMP    DEFAULT NOW(),
      updated_at            TIMESTAMP    DEFAULT NOW()
    );
  `);

  // Movimentações patrimoniais
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.pat_movimentacoes (
      id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      bem_id                  UUID        NOT NULL REFERENCES ${schema}.pat_bens(id),
      tipo                    VARCHAR(30) NOT NULL
                                CHECK (tipo IN ('ENTRADA','TRANSFERENCIA','CESSAO','DEVOLUCAO','BAIXA','INVENTARIO','AJUSTE')),
      secretaria_origem_id    UUID        REFERENCES ${schema}.secretarias(id),
      setor_origem_id         UUID        REFERENCES ${schema}.setores(id),
      responsavel_origem_id   UUID        REFERENCES ${schema}.usuarios(id),
      secretaria_destino_id   UUID        REFERENCES ${schema}.secretarias(id),
      setor_destino_id        UUID        REFERENCES ${schema}.setores(id),
      responsavel_destino_id  UUID        REFERENCES ${schema}.usuarios(id),
      data_movimentacao       DATE        NOT NULL,
      numero_documento        VARCHAR(100),
      justificativa           TEXT,
      observacoes             TEXT,
      usuario_id              UUID        REFERENCES ${schema}.usuarios(id),
      created_at              TIMESTAMP   DEFAULT NOW(),
      updated_at              TIMESTAMP   DEFAULT NOW()
    );
  `);

  // Baixas de bens permanentes
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.pat_baixas (
      id                       UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
      bem_id                   UUID           NOT NULL REFERENCES ${schema}.pat_bens(id),
      motivo                   VARCHAR(30)    NOT NULL
                                 CHECK (motivo IN ('INSERVIVEL','EXTRAVIO','FURTO_ROUBO','VENDA','DOACAO','PERMUTA','SINISTRO','OUTROS')),
      numero_processo          VARCHAR(100),
      numero_resolucao         VARCHAR(100),
      data_baixa               DATE           NOT NULL,
      valor_estimado_residual  DECIMAL(15,2)  DEFAULT 0,
      descricao_ocorrencia     TEXT,
      autorizado_por           VARCHAR(255),
      usuario_id               UUID           REFERENCES ${schema}.usuarios(id),
      observacoes              TEXT,
      created_at               TIMESTAMP      DEFAULT NOW(),
      updated_at               TIMESTAMP      DEFAULT NOW()
    );
  `);

  // Inventário patrimonial
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.pat_inventarios (
      id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      numero              VARCHAR(30) NOT NULL UNIQUE,
      ano_exercicio       INTEGER     NOT NULL,
      status              VARCHAR(20) DEFAULT 'EM_ANDAMENTO'
                            CHECK (status IN ('EM_ANDAMENTO','CONCLUIDO','CANCELADO')),
      data_inicio         DATE        NOT NULL,
      data_conclusao      DATE,
      responsavel_id      UUID        REFERENCES ${schema}.usuarios(id),
      secretaria_id       UUID        REFERENCES ${schema}.secretarias(id),
      total_bens          INTEGER     DEFAULT 0,
      total_conferidos    INTEGER     DEFAULT 0,
      total_divergencias  INTEGER     DEFAULT 0,
      observacoes         TEXT,
      usuario_id          UUID        REFERENCES ${schema}.usuarios(id),
      created_at          TIMESTAMP   DEFAULT NOW(),
      updated_at          TIMESTAMP   DEFAULT NOW()
    );
  `);

  // Itens do inventário patrimonial
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.pat_inventario_itens (
      id                            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      inventario_id                 UUID        NOT NULL REFERENCES ${schema}.pat_inventarios(id) ON DELETE CASCADE,
      bem_id                        UUID        REFERENCES ${schema}.pat_bens(id),
      numero_tombamento             VARCHAR(30) NOT NULL,
      encontrado                    BOOLEAN,
      local_encontrado              VARCHAR(255),
      estado_conservacao_encontrado VARCHAR(20),
      observacoes                   TEXT,
      conferido_por_id              UUID        REFERENCES ${schema}.usuarios(id),
      conferido_em                  TIMESTAMP,
      created_at                    TIMESTAMP   DEFAULT NOW(),
      updated_at                    TIMESTAMP   DEFAULT NOW()
    );
  `);
}

// Executar migração em todos os tenants ativos (chamado no startup do servidor)
const migrarTodosOsSchemas = async () => {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });
  try {
    const tenants = await Tenant.findAll({ where: { ativo: true }, attributes: ['schema'] });
    for (const tenant of tenants) {
      try {
        await migrarSchemaUsuarios(tenant.schema, pool);
        await migrarAgentes(tenant.schema, pool);
      } catch (_) {
        // schema pode não ter sido criado ainda
      }
    }
  } finally {
    await pool.end();
  }
};

// Função auxiliar para criar estrutura isolada do tenant
async function criarEstruturaIsolada(schema, tenant, usuarioAdmin) {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  try {
    // Criar schema isolado
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);

    // Criar todas as tabelas no schema isolado
    const createTables = `
      -- Secretarias
      CREATE TABLE IF NOT EXISTS ${schema}.secretarias (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome VARCHAR(255) NOT NULL,
        sigla VARCHAR(20) NOT NULL,
        descricao TEXT,
        ativo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Setores
      CREATE TABLE IF NOT EXISTS ${schema}.setores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        secretaria_id UUID NOT NULL REFERENCES ${schema}.secretarias(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        sigla VARCHAR(20) NOT NULL,
        descricao TEXT,
        ativo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Usuários
      CREATE TABLE IF NOT EXISTS ${schema}.usuarios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome VARCHAR(255) NOT NULL,
        nome_reduzido VARCHAR(60),
        email VARCHAR(255) UNIQUE,
        cpf VARCHAR(11) NOT NULL UNIQUE,
        senha VARCHAR(255) NOT NULL,
        telefone VARCHAR(11),
        tipo VARCHAR(20) NOT NULL DEFAULT 'operacional'
          CHECK (tipo IN ('admin', 'gestor', 'operacional')),
        ativo BOOLEAN DEFAULT TRUE,
        secretaria_id UUID REFERENCES ${schema}.secretarias(id),
        setor_id UUID REFERENCES ${schema}.setores(id),
        permissoes JSONB NOT NULL DEFAULT '{"criar_processo":true,"editar_processo":true,"excluir_processo":false,"tramitar_processo":true,"acessar_almoxarifado":false,"acessar_financeiro":false,"acessar_contratos":false,"visualizar_relatorios":false,"gerenciar_usuarios":false,"gerenciar_secretarias":false,"gerenciar_configuracoes":false}'::jsonb,
        ultimo_acesso TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Processos
      CREATE TABLE IF NOT EXISTS ${schema}.processos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        numero VARCHAR(50) NOT NULL UNIQUE,
        ano INTEGER NOT NULL,
        sequencial INTEGER NOT NULL,
        assunto VARCHAR(500) NOT NULL,
        descricao TEXT NOT NULL,
        interessado_nome VARCHAR(255) NOT NULL,
        interessado_cpf_cnpj VARCHAR(14) NOT NULL,
        interessado_email VARCHAR(255),
        interessado_telefone VARCHAR(11),
        status VARCHAR(20) NOT NULL DEFAULT 'aberto'
          CHECK (status IN ('aberto', 'em_analise', 'pendente', 'devolvido', 'concluido', 'arquivado')),
        setor_atual_id UUID REFERENCES ${schema}.setores(id),
        usuario_atual_id UUID REFERENCES ${schema}.usuarios(id),
        qrcode TEXT,
        prioridade VARCHAR(20) DEFAULT 'normal'
          CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
        data_abertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data_conclusao TIMESTAMP,
        criado_por_id UUID REFERENCES ${schema}.usuarios(id),
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tramitações
      CREATE TABLE IF NOT EXISTS ${schema}.tramitacoes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        processo_id UUID NOT NULL REFERENCES ${schema}.processos(id) ON DELETE CASCADE,
        origem_usuario_id UUID NOT NULL REFERENCES ${schema}.usuarios(id),
        origem_setor_id UUID REFERENCES ${schema}.setores(id),
        destino_setor_id UUID REFERENCES ${schema}.setores(id),
        destino_usuario_id UUID REFERENCES ${schema}.usuarios(id),
        tipo_acao VARCHAR(30) NOT NULL
          CHECK (tipo_acao IN ('abertura', 'tramite', 'devolucao', 'conclusao', 'arquivamento')),
        despacho TEXT,
        observacao TEXT,
        justificativa_devolucao TEXT,
        assinatura_digital VARCHAR(255),
        data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        ip_origem VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Documentos
      CREATE TABLE IF NOT EXISTS ${schema}.documentos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        processo_id UUID NOT NULL REFERENCES ${schema}.processos(id) ON DELETE CASCADE,
        nome_original VARCHAR(255) NOT NULL,
        nome_sistema VARCHAR(255) NOT NULL,
        caminho VARCHAR(500) NOT NULL,
        tipo_mime VARCHAR(100) NOT NULL,
        tamanho INTEGER NOT NULL,
        hash VARCHAR(64) NOT NULL,
        upload_por_id UUID NOT NULL REFERENCES ${schema}.usuarios(id),
        data_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        descricao TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Agentes
      CREATE TABLE IF NOT EXISTS ${schema}.agentes (
        id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        nome          VARCHAR(500)  NOT NULL,
        cargo         VARCHAR(300),
        matricula     VARCHAR(50),
        cpf           VARCHAR(14),
        email         VARCHAR(255),
        telefone      VARCHAR(20),
        secretaria_id UUID          REFERENCES ${schema}.secretarias(id) ON DELETE SET NULL,
        ativo         BOOLEAN       NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP     NOT NULL DEFAULT NOW()
      );
    `;

    await pool.query(createTables);

    // Inserir secretaria padrão
    const secretariaResult = await pool.query(`
      INSERT INTO ${schema}.secretarias (nome, sigla, descricao) 
      VALUES ('Secretaria de Administração', 'SEMAD', 'Gestão administrativa da prefeitura')
      RETURNING id
    `);

    const secretariaId = secretariaResult.rows[0].id;

    // Inserir setor padrão
    const setorResult = await pool.query(`
      INSERT INTO ${schema}.setores (secretaria_id, nome, sigla, descricao) 
      VALUES ($1, 'Protocolo Geral', 'PROTO', 'Setor de protocolo e recebimento de processos')
      RETURNING id
    `, [secretariaId]);

    const setorId = setorResult.rows[0].id;

    // Criar usuário administrador
    const senhaHash = await bcrypt.hash(usuarioAdmin.senha, 10);
    
    await pool.query(`
      INSERT INTO ${schema}.usuarios (nome, email, cpf, senha, tipo, secretaria_id, setor_id, ativo)
      VALUES ($1, $2, $3, $4, 'admin', $5, $6, true)
    `, [
      usuarioAdmin.nome,
      usuarioAdmin.email,
      usuarioAdmin.cpf,
      senhaHash,
      secretariaId,
      setorId
    ]);

  } catch (error) {
    console.error('Erro ao criar estrutura isolada');
    throw error;
  } finally {
    await pool.end();
  }
}

// Estatísticas do sistema multi-tenant
const getStatistics = async (req, res) => {
  try {
    const totalTenants = await Tenant.count();
    const tenantsAtivos = await Tenant.count({ where: { ativo: true } });
    const tenantsInativos = await Tenant.count({ where: { ativo: false } });

    const tenantsPorEstado = await masterDb.query(`
      SELECT estado, COUNT(*) as total
      FROM public.clientes
      WHERE ativo = true
      GROUP BY estado
      ORDER BY total DESC
    `, { type: masterDb.QueryTypes.SELECT });

    const tenantsMaisRecentes = await Tenant.findAll({
      order: [['created_at', 'DESC']],
      limit: 5,
      attributes: ['id', 'nome_municipio', 'cidade', 'estado', 'created_at']
    });

    res.json({
      success: true,
      estatisticas: {
        total: totalTenants,
        ativos: tenantsAtivos,
        inativos: tenantsInativos,
        por_estado: tenantsPorEstado,
        mais_recentes: tenantsMaisRecentes
      },
      isolamento: {
        tipo: 'Schema-based isolation',
        descricao: 'Cada município possui um schema PostgreSQL isolado',
        seguranca: 'Zero risco de vazamento de dados entre municípios'
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas');
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};

// Buscar info pública do tenant por subdomain (usada na tela de Login)
const getTenantInfo = async (req, res) => {
  try {
    const { subdomain } = req.query;
    if (!subdomain) return res.status(400).json({ error: 'Subdomínio obrigatório' });

    const tenant = await Tenant.findOne({
      where: { subdominio: subdomain, ativo: true },
      attributes: ['id', 'nome_municipio', 'cidade', 'estado', 'subdominio', 'configuracoes']
    });

    if (!tenant) return res.status(404).json({ error: 'Município não encontrado' });

    res.json({ success: true, tenant });
  } catch (error) {
    console.error('❌ Erro ao buscar info do tenant:', error);
    res.status(500).json({ error: 'Erro ao buscar município' });
  }
};

// Atualizar apenas as configurações gerais do tenant (logos, cores)
// Endpoint usado pela aba Gerais das Configurações
const updateTenantConfiguracoes = async (req, res) => {
  try {
    const subdomain = req.headers['x-tenant-subdomain'];
    if (!subdomain) {
      return res.status(400).json({ error: 'Subdomínio não fornecido' });
    }

    const tenant = await Tenant.findOne({ where: { subdominio: subdomain, ativo: true } });
    if (!tenant) {
      return res.status(404).json({ error: 'Município não encontrado' });
    }

    const novoConf = { ...(tenant.configuracoes || {}), ...req.body };
    await tenant.update({ configuracoes: novoConf });

    // Limpar cache para que o próximo request leia o valor atualizado
    tenantCache.delete(subdomain);

    res.json({ success: true, configuracoes: tenant.configuracoes });
  } catch (error) {
    console.error('❌ Erro ao atualizar configurações:', error);
    res.status(500).json({ error: 'Erro ao salvar configurações' });
  }
};

module.exports = {
  createTenant,
  listTenants,
  getTenantById,
  getTenantInfo,
  updateTenant,
  updateTenantConfiguracoes,
  deleteTenant,
  getStatistics,
  migrarTodosOsSchemas
};
