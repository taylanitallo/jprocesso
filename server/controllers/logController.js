const { Op } = require('sequelize');

/**
 * GET /api/logs
 * Busca registros de log com filtros e paginação.
 * Acesso: admin | quem tiver permissão 'visualizar_registros'
 */
const listLogs = async (req, res) => {
  try {
    const { Log, User, Secretaria, Setor } = req.models;

    const {
      usuario_id,
      tipo_usuario,
      secretaria_id,
      setor_id,
      modulo,
      acao,
      data_inicio,
      data_fim,
      page = 1,
      limit = 50
    } = req.query;

    const where = {};

    if (modulo)       where.modulo    = modulo;
    if (acao)         where.acao      = { [Op.iLike]: `%${acao}%` };
    if (usuario_id)   where.usuario_id = usuario_id;
    if (secretaria_id) where.secretaria_id = secretaria_id;
    if (setor_id)     where.setor_id  = setor_id;

    if (data_inicio || data_fim) {
      where.created_at = {};
      if (data_inicio) where.created_at[Op.gte] = new Date(data_inicio);
      if (data_fim)    where.created_at[Op.lte] = new Date(new Date(data_fim).setHours(23, 59, 59, 999));
    }

    // Filtro por tipo de usuário — precisamos do JOIN e depois filtrar
    const userWhere = {};
    if (tipo_usuario) userWhere.tipo = tipo_usuario;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Log.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['id', 'nome', 'nomeReduzido', 'tipo', 'email'],
          where: Object.keys(userWhere).length ? userWhere : undefined,
          required: Object.keys(userWhere).length > 0
        },
        {
          model: Secretaria,
          as: 'secretaria',
          attributes: ['id', 'nome', 'sigla'],
          required: false
        },
        {
          model: Setor,
          as: 'setor',
          attributes: ['id', 'nome', 'sigla'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: Math.min(parseInt(limit), 200),
      offset
    });

    res.json({
      logs: rows,
      total: count,
      pages: Math.ceil(count / parseInt(limit)),
      page: parseInt(page)
    });
  } catch (error) {
    console.error('Erro ao listar logs:', error);
    res.status(500).json({ error: 'Erro ao buscar registros de atividade' });
  }
};

/**
 * GET /api/logs/modulos
 * Lista os módulos distintos registrados (para o filtro no frontend).
 */
const listModulos = async (req, res) => {
  try {
    const { Log } = req.models;
    const { Sequelize } = require('sequelize');

    const rows = await Log.findAll({
      attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('modulo')), 'modulo']],
      order: [['modulo', 'ASC']]
    });

    res.json({ modulos: rows.map(r => r.modulo) });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar módulos' });
  }
};

module.exports = { listLogs, listModulos };
