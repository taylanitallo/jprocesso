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
        if (adminSenha) {
          // Criar novo ou atualizar tudo (incluindo senha)
          const senhaHash = await bcrypt.hash(adminSenha, 10);
          await pool.query(`
            INSERT INTO ${tenant.schema}.usuarios (nome, email, cpf, senha, tipo, ativo)
            VALUES ($1, $2, $3, $4, 'admin', true)
            ON CONFLICT (cpf) DO UPDATE SET
              nome = EXCLUDED.nome,
              email = COALESCE(EXCLUDED.email, usuarios.email),
              senha = EXCLUDED.senha,
              tipo = 'admin',
              ativo = true
          `, [adminNome, adminEmail || null, adminCpf, senhaHash]);
        } else {
          // Atualizar apenas nome/email de usuário existente (sem alterar senha)
          await pool.query(`
            UPDATE ${tenant.schema}.usuarios SET
              nome = $1,
              email = COALESCE($2, email),
              tipo = 'admin',
              ativo = true
            WHERE cpf = $3
          `, [adminNome, adminEmail || null, adminCpf]);
        }
        adminCriado = true;
      } catch (adminError) {
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
        email VARCHAR(255) NOT NULL UNIQUE,
        cpf VARCHAR(11) NOT NULL UNIQUE,
        senha VARCHAR(255) NOT NULL,
        telefone VARCHAR(11),
        tipo VARCHAR(20) NOT NULL DEFAULT 'operacional' 
          CHECK (tipo IN ('admin', 'gestor', 'operacional')),
        ativo BOOLEAN DEFAULT TRUE,
        secretaria_id UUID REFERENCES ${schema}.secretarias(id),
        setor_id UUID REFERENCES ${schema}.setores(id),
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
        tipo VARCHAR(20) NOT NULL
          CHECK (tipo IN ('abertura', 'tramitacao', 'devolucao', 'conclusao', 'arquivamento')),
        despacho TEXT,
        observacao TEXT,
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
      FROM clientes
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
  getStatistics
};
