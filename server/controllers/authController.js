const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Tenant = require('../models/Tenant');
const { getTenantConnection, masterDb } = require('../config/database');
const initTenantModels = require('../models');

const register = async (req, res) => {
  try {
    const { nome, nomeReduzido, email, senha, cpf, telefone, tipo, secretariaId, setorId, permissoes } = req.body;
    const { User } = req.models;

    // Verificar se email já existe
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Verificar se CPF já existe
    const existingCpf = await User.findOne({ where: { cpf } });
    if (existingCpf) {
      return res.status(400).json({ error: 'CPF já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);

    const user = await User.create({
      nome,
      nomeReduzido: nomeReduzido || null,
      email,
      senha: hashedPassword,
      cpf,
      telefone,
      tipo: tipo || 'operacional',
      secretariaId,
      setorId,
      permissoes: permissoes || {
        criar_processo: true,
        editar_processo: true,
        excluir_processo: false,
        tramitar_processo: true,
        acessar_almoxarifado: false,
        acessar_financeiro: false,
        acessar_contratos: false,
        visualizar_relatorios: false,
        gerenciar_usuarios: false,
        gerenciar_secretarias: false,
        gerenciar_configuracoes: false
      }
    });

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        tipo: user.tipo,
        tenantId: req.tenant.id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        tipo: user.tipo
      },
      token
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
};

const login = async (req, res) => {
  try {
    const { cpf, senha, subdomain } = req.body;

    // Se o subdomain for 'admin', fazer login na tabela global de admins
    if (subdomain === 'admin') {
      const result = await masterDb.query(
        'SELECT * FROM public.admins WHERE cpf = :cpf',
        { replacements: { cpf }, type: masterDb.QueryTypes.SELECT }
      );

      const rows = result;

      if (rows.length === 0) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const admin = rows[0];
      const validPassword = await bcrypt.compare(senha, admin.senha);

      if (!validPassword) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const token = jwt.sign(
        { 
          id: admin.id, 
          cpf: admin.cpf, 
          papel: 'admin',
          isAdmin: true
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      return res.json({
        message: 'Login admin realizado com sucesso',
        user: {
          id: admin.id,
          nome: admin.nome,
          cpf: admin.cpf,
          papel: 'admin'
        },
        token
      });
    }
    
    const tenant = await Tenant.findOne({ where: { subdominio: subdomain || 'teste', ativo: true } });
    if (!tenant) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const tenantDb = await getTenantConnection(tenant.schema);
    const models = initTenantModels(tenantDb);
    const { User } = models;

    const user = await User.findOne({ 
      where: { cpf, ativo: true },
      include: [
        { model: models.Secretaria, as: 'secretaria' },
        { model: models.Setor, as: 'setor' }
      ]
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const validPassword = await bcrypt.compare(senha, user.senha);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        tipo: user.tipo,
        tenantId: tenant.id,
        subdomain: tenant.subdominio
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        nome: user.nome,
        nomeReduzido: user.nomeReduzido,
        email: user.email,
        tipo: user.tipo,
        secretaria: user.secretaria,
        setor: user.setor
      },
      token,
      tenant: {
        id: tenant.id,
        nome: tenant.nome_municipio,
        subdominio: tenant.subdominio,
        configuracoes: tenant.configuracoes || {}
      }
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
};

const getProfile = async (req, res) => {
  try {
    // Admin global: busca na tabela public.admins
    if (req.user.isAdmin) {
      const rows = await masterDb.query(
        'SELECT id, nome, cpf, email FROM public.admins WHERE id = :id',
        { replacements: { id: req.user.id }, type: masterDb.QueryTypes.SELECT }
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Admin não encontrado' });
      return res.json({ user: { ...rows[0], papel: 'admin', tipo: 'admin' } });
    }

    const { User, Secretaria, Setor } = req.models;

    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['senha'] },
      include: [
        { model: Secretaria, as: 'secretaria', attributes: ['id', 'nome', 'sigla', 'logo'] },
        { model: Setor,      as: 'setor',      attributes: ['id', 'nome'] }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
};

const listUsers = async (req, res) => {
  try {
    const { User, Secretaria, Setor } = req.models;

    const users = await User.findAll({
      attributes: ['id', 'nome', 'nomeReduzido', 'email', 'cpf', 'telefone', 'tipo', 'ativo', 'permissoes', 'secretariaId', 'setorId'],
      include: [
        {
          model: Secretaria,
          as: 'secretaria',
          attributes: ['id', 'nome', 'sigla']
        },
        {
          model: Setor,
          as: 'setor',
          attributes: ['id', 'nome']
        }
      ],
      order: [['nome', 'ASC']]
    });

    res.json({ users });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, nomeReduzido, email, cpf, telefone, tipo, secretariaId, setorId, permissoes, ativo, novaSenha } = req.body;
    const { User } = req.models;
    const { Op } = require('sequelize');

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Validar unicidade de email (excluindo o próprio usuário)
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ where: { email, id: { [Op.ne]: id } } });
      if (emailExists) return res.status(400).json({ error: 'Email já cadastrado para outro usuário' });
    }

    const updatePayload = { nome, nomeReduzido: nomeReduzido ?? undefined, email, cpf, telefone, tipo, secretariaId, setorId, permissoes, ativo };

    if (novaSenha && novaSenha.trim().length >= 6) {
      updatePayload.senha = await bcrypt.hash(novaSenha.trim(), 10);
    }

    await user.update(updatePayload);

    res.json({ message: 'Usuário atualizado com sucesso', user });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { User } = req.models;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    await user.destroy();

    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  listUsers,
  updateUser,
  deleteUser
};
