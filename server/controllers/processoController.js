const QRCode = require('qrcode');
const crypto = require('crypto');
const { Op, Sequelize } = require('sequelize');

const createProcesso = async (req, res) => {
  const transaction = await req.tenantDb.transaction();
  
  try {
    const {
      assunto,
      descricao,
      interessado_nome,
      interessado_cpf_cnpj,
      interessado_email,
      interessado_telefone,
      prioridade,
      tipo_processo
    } = req.body;

    const { Processo, Tramitacao, User, Setor, Secretaria } = req.models;

    const ano = new Date().getFullYear();
    
    const ultimoProcesso = await Processo.findOne({
      where: { ano },
      order: [['sequencial', 'DESC']],
      transaction
    });

    const sequencial = ultimoProcesso ? ultimoProcesso.sequencial + 1 : 1;

    const user = await User.findByPk(req.user.id, { 
      include: [{ 
        model: Setor, 
        as: 'setor',
        include: [{ model: Secretaria, as: 'secretaria' }]
      }],
      transaction 
    });

    const secretariaNome = user.setor?.secretaria?.sigla || 'SEC';
    const numero = `Proc.${ano}.${String(sequencial).padStart(7, '0')} - ${secretariaNome}`;

    const qrcodeData = await QRCode.toDataURL(`${numero}-${crypto.randomBytes(8).toString('hex')}`);

    const processo = await Processo.create({
      numero,
      ano,
      sequencial,
      assunto,
      descricao,
      interessado_nome,
      interessado_cpf_cnpj: interessado_cpf_cnpj?.replace(/\D/g, '') || '',
      interessado_email,
      interessado_telefone: interessado_telefone?.replace(/\D/g, ''),
      prioridade: prioridade || 'normal',
      tipo_processo: tipo_processo || null,
      status: 'aberto',
      qrcode: qrcodeData,
      setor_atual_id: user.setorId,
      usuario_atual_id: req.user.id,
      criado_por_id: req.user.id
    }, { transaction });

    const assinaturaDigital = crypto
      .createHash('sha256')
      .update(`${processo.id}-${req.user.id}-${new Date().toISOString()}`)
      .digest('hex');

    await Tramitacao.create({
      processo_id: processo.id,
      tipo_acao: 'abertura',
      despacho: `Processo aberto por ${user.nome}`,
      origem_usuario_id: req.user.id,
      origem_setor_id: user.setorId,
      data_hora: new Date(),
      ip_origem: req.ip || req.connection.remoteAddress,
      assinatura_digital: assinaturaDigital
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      message: 'Processo criado com sucesso',
      processo: {
        id: processo.id,
        numero: processo.numero,
        assunto: processo.assunto,
        status: processo.status,
        qrcode: processo.qrcode,
        assinatura_digital: assinaturaDigital
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao criar processo:', error);
    
    // Enviar mensagem de erro mais específica
    let errorMessage = 'Erro ao criar processo';
    
    if (error.name === 'SequelizeValidationError') {
      errorMessage = `Erro de validação: ${error.errors.map(e => e.message).join(', ')}`;
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
      errorMessage = 'Erro: Referência inválida (setor ou usuário não encontrado)';
    } else if (error.message) {
      errorMessage = `Erro: ${error.message}`;
    }
    
    res.status(500).json({ error: errorMessage });
  }
};

const tramitarProcesso = async (req, res) => {
  const transaction = await req.tenantDb.transaction();
  
  try {
    const { id } = req.params;
    const { despacho, destinoSetorId, destinoUsuarioId, senhaConfirmacao } = req.body;
    const { Processo, Tramitacao, User } = req.models;
    const bcrypt = require('bcryptjs');

    // Validações
    if (!despacho || despacho.trim().length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'O despacho é obrigatório para tramitação' });
    }

    if (despacho.length < 10) {
      await transaction.rollback();
      return res.status(400).json({ error: 'O despacho deve ter pelo menos 10 caracteres' });
    }

    if (!destinoSetorId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Setor de destino é obrigatório' });
    }

    if (!senhaConfirmacao) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Senha de confirmação é obrigatória para assinatura eletrônica' });
    }

    // Buscar processo
    const processo = await Processo.findByPk(id, { transaction });
    if (!processo) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Processo não encontrado' });
    }

    // Verificar status
    if (processo.status === 'concluido' || processo.status === 'arquivado') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Não é possível tramitar um processo concluído ou arquivado' });
    }

    // Buscar usuário e verificar senha
    const user = await User.findByPk(req.user.id, { transaction });
    const senhaValida = await bcrypt.compare(senhaConfirmacao, user.senha);
    
    if (!senhaValida) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Senha incorreta. A assinatura eletrônica requer confirmação da senha' });
    }

    // Verificar permissão - APENAS o usuário atual pode tramitar
    if (processo.usuario_atual_id && processo.usuario_atual_id !== req.user.id) {
      // Exceção para admin e gestor
      if (req.user.tipo !== 'admin' && req.user.tipo !== 'gestor') {
        await transaction.rollback();
        return res.status(403).json({ 
          error: 'Somente o usuário responsável atual pelo processo pode tramitá-lo. Este processo está com outro usuário.' 
        });
      }
    }

    // Se processo está em setor diferente do usuário
    if (processo.setor_atual_id !== user.setorId) {
      if (req.user.tipo !== 'admin' && req.user.tipo !== 'gestor') {
        await transaction.rollback();
        return res.status(403).json({ 
          error: 'Este processo não está no seu setor atual.' 
        });
      }
    }

    // Gerar assinatura digital
    const timestamp = new Date().toISOString();
    const dadosAssinatura = `${processo.id}|${req.user.id}|${user.cpf}|tramite|${destinoSetorId}|${timestamp}`;
    const assinaturaDigital = crypto
      .createHash('sha256')
      .update(dadosAssinatura)
      .digest('hex');

    // Criar tramitação
    await Tramitacao.create({
      processo_id: processo.id,
      tipo_acao: 'tramite',
      despacho,
      origem_usuario_id: req.user.id,
      origem_setor_id: user.setorId,
      destino_setor_id: destinoSetorId,
      destino_usuario_id: destinoUsuarioId || null,
      data_hora: timestamp,
      ip_origem: req.ip || req.connection.remoteAddress,
      assinatura_digital: assinaturaDigital
    }, { transaction });

    // Atualizar processo
    await processo.update({
      status: 'em_analise',
      setor_atual_id: destinoSetorId,
      usuario_atual_id: destinoUsuarioId || null
    }, { transaction });

    await transaction.commit();

    res.json({ 
      message: 'Processo tramitado com sucesso',
      assinatura_digital: assinaturaDigital,
      timestamp,
      tramitado_por: user.nome
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao tramitar processo:', error);
    
    let errorMessage = 'Erro ao tramitar processo';
    if (error.name === 'SequelizeValidationError') {
      errorMessage = `Erro de validação: ${error.errors.map(e => e.message).join(', ')}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ error: errorMessage });
  }
};

const devolverProcesso = async (req, res) => {
  const transaction = await req.tenantDb.transaction();
  
  try {
    const { id } = req.params;
    const { justificativa } = req.body;
    const { Processo, Tramitacao, User } = req.models;

    if (!justificativa || justificativa.trim().length === 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'A justificativa é OBRIGATÓRIA para devolução de processo' 
      });
    }

    if (justificativa.length < 20) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'A justificativa deve ter pelo menos 20 caracteres' 
      });
    }

    const processo = await Processo.findByPk(id, { transaction });
    if (!processo) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Processo não encontrado' });
    }

    // Verificar permissão - APENAS o usuário atual pode devolver
    if (processo.usuario_atual_id && processo.usuario_atual_id !== req.user.id) {
      if (req.user.tipo !== 'admin' && req.user.tipo !== 'gestor') {
        await transaction.rollback();
        return res.status(403).json({ 
          error: 'Somente o usuário responsável atual pode devolver este processo.' 
        });
      }
    }

    const ultimaTramitacao = await Tramitacao.findOne({
      where: { 
        processo_id: processo.id,
        tipo_acao: { [Op.in]: ['tramite', 'devolucao'] }
      },
      order: [['data_hora', 'DESC']],
      transaction
    });

    if (!ultimaTramitacao || !ultimaTramitacao.origem_setor_id) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Não há tramitação anterior válida para devolver este processo' 
      });
    }

    const user = await User.findByPk(req.user.id, { transaction });

    const assinaturaDigital = crypto
      .createHash('sha256')
      .update(`${processo.id}-${req.user.id}-devolucao-${new Date().toISOString()}`)
      .digest('hex');

    await Tramitacao.create({
      processo_id: processo.id,
      tipo_acao: 'devolucao',
      despacho: null,
      justificativa_devolucao: justificativa,
      origem_usuario_id: req.user.id,
      origem_setor_id: user.setorId,
      destino_setor_id: ultimaTramitacao.origem_setor_id,
      destino_usuario_id: ultimaTramitacao.origem_usuario_id,
      ip_origem: req.ip || req.connection.remoteAddress,
      assinatura_digital: assinaturaDigital
    }, { transaction });

    await processo.update({
      status: 'devolvido',
      setor_atual_id: ultimaTramitacao.origem_setor_id,
      usuario_atual_id: ultimaTramitacao.origem_usuario_id
    }, { transaction });

    await transaction.commit();

    res.json({ 
      message: 'Processo devolvido com sucesso',
      setor_devolucao: ultimaTramitacao.origem_setor_id,
      assinatura_digital: assinaturaDigital
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao devolver processo:', error);
    res.status(500).json({ error: 'Erro ao devolver processo' });
  }
};

const concluirProcesso = async (req, res) => {
  const transaction = await req.tenantDb.transaction();
  
  try {
    const { id } = req.params;
    const { despachoFinal } = req.body;
    const { Processo, Tramitacao, User } = req.models;

    if (!despachoFinal || despachoFinal.trim().length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Despacho final é obrigatório' });
    }

    const processo = await Processo.findByPk(id, { transaction });
    if (!processo) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Processo não encontrado' });
    }

    // Verificar permissão - APENAS o usuário atual pode concluir
    if (processo.usuario_atual_id && processo.usuario_atual_id !== req.user.id) {
      if (req.user.tipo !== 'admin' && req.user.tipo !== 'gestor') {
        await transaction.rollback();
        return res.status(403).json({ 
          error: 'Somente o usuário responsável atual pode concluir este processo.' 
        });
      }
    }

    const user = await User.findByPk(req.user.id, { transaction });

    const assinaturaDigital = crypto
      .createHash('sha256')
      .update(`${processo.id}-${req.user.id}-conclusao-${new Date().toISOString()}`)
      .digest('hex');

    await Tramitacao.create({
      processo_id: processo.id,
      tipo_acao: 'conclusao',
      despacho: despachoFinal,
      origem_usuario_id: req.user.id,
      origem_setor_id: user.setorId,
      ip_origem: req.ip || req.connection.remoteAddress,
      assinatura_digital: assinaturaDigital
    }, { transaction });

    await processo.update({
      status: 'concluido',
      data_conclusao: new Date()
    }, { transaction });

    await transaction.commit();

    res.json({ 
      message: 'Processo concluído com sucesso',
      assinatura_digital: assinaturaDigital
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao concluir processo:', error);
    res.status(500).json({ error: 'Erro ao concluir processo' });
  }
};

const listProcessos = async (req, res) => {
  try {
    const { status, prioridade, page = 1, limit = 10, search } = req.query;
    const { Processo, User, Setor } = req.models;

    const where = {};
    
    if (status) where.status = status;
    if (prioridade) where.prioridade = prioridade;

    if (req.user.tipo === 'operacional') {
      where.usuario_atual_id = req.user.id;
    }

    if (search) {
      where[Op.or] = [
        { numero: { [Op.iLike]: `%${search}%` } },
        { assunto: { [Op.iLike]: `%${search}%` } },
        { interessado_nome: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows: processos } = await Processo.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']],
      subQuery: false,
      include: [
        { model: User, as: 'usuarioAtual', attributes: ['id', 'nome', 'email'] },
        { model: Setor, as: 'setorAtual', attributes: ['id', 'nome', 'sigla'] },
        { model: User, as: 'criadoPor', attributes: ['id', 'nome', 'email'] }
      ]
    });

    res.json({
      processos,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar processos:', error);
    res.status(500).json({ error: 'Erro ao listar processos' });
  }
};

// ─── Dashboard — stats + listas resumidas ────────────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    const { Processo, User, Setor } = req.models;
    const userId  = req.user.id;
    const setorId = req.user.setorId || req.user.setor_id;

    const agora = new Date();
    const inicioDia = new Date(agora); inicioDia.setHours(0, 0, 0, 0);
    const limite48h = new Date(agora - 48 * 60 * 60 * 1000);

    const includeBasico = [
      { model: Setor, as: 'setorAtual', attributes: ['id', 'nome', 'sigla'] },
      { model: User, as: 'usuarioAtual', attributes: ['id', 'nome'] }
    ];

    // ── Minha Caixa: processos no setor do usuário (não concluídos/arquivados)
    const whereMinhasCaixa = {
      status: { [Op.notIn]: ['concluido', 'arquivado'] },
      ...(setorId ? { setor_atual_id: setorId } : { usuario_atual_id: userId })
    };

    const [
      minhaCaixaCount,
      minhaCaixaLista,
      novosHojeCount,
      pendentes48hCount,
      concluidosCount,
      urgentesLista
    ] = await Promise.all([
      // 1. total minha caixa
      Processo.count({ where: whereMinhasCaixa }),

      // 2. últimos 5 da minha caixa
      Processo.findAll({
        where: whereMinhasCaixa,
        limit: 5,
        order: [['created_at', 'DESC']],
        include: includeBasico
      }),

      // 3. novos hoje (todos visíveis ao usuário)
      Processo.count({
        where: { created_at: { [Op.gte]: inicioDia } }
      }),

      // 4. pendentes > 48h (não concluídos/arquivados)
      Processo.count({
        where: {
          data_abertura: { [Op.lte]: limite48h },
          status: { [Op.notIn]: ['concluido', 'arquivado'] }
        }
      }),

      // 5. concluídos (total)
      Processo.count({ where: { status: 'concluido' } }),

      // 6. urgentes (prioridade=urgente, não concluídos, últimos 5)
      Processo.findAll({
        where: {
          prioridade: 'urgente',
          status: { [Op.notIn]: ['concluido', 'arquivado'] }
        },
        limit: 5,
        order: [['data_abertura', 'ASC']],
        include: includeBasico
      })
    ]);

    res.json({
      stats: {
        minhaCaixa:   minhaCaixaCount,
        novosHoje:    novosHojeCount,
        pendentes48h: pendentes48hCount,
        concluidos:   concluidosCount
      },
      minhaCaixaLista,
      urgentesLista
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
  }
};

const getProcessoById = async (req, res) => {
  try {
    const { id } = req.params;
    const { Processo, User, Setor, Tramitacao, Secretaria } = req.models;

    const processo = await Processo.findByPk(id, {
      include: [
        { model: User, as: 'usuarioAtual', attributes: ['id', 'nome', 'email'] },
        { model: Setor, as: 'setorAtual', attributes: ['id', 'nome', 'sigla'] },
        { model: User, as: 'criadoPor', attributes: ['id', 'nome', 'email'] },
        {
          model: Tramitacao,
          as: 'tramitacoes',
          order: [['data_hora', 'DESC']],
          include: [
            { model: User, as: 'origemUsuario', attributes: ['id', 'nome'] },
            { model: User, as: 'destinoUsuario', attributes: ['id', 'nome'] },
            {
              model: Setor, as: 'origemSetor', attributes: ['id', 'nome', 'sigla'],
              include: [{ model: Secretaria, as: 'secretaria', attributes: ['id', 'nome', 'sigla'] }]
            },
            { model: Setor, as: 'destinoSetor', attributes: ['id', 'nome', 'sigla'] }
          ]
        }
        // Documentos/anexos serão implementados futuramente
      ]
    });

    if (!processo) {
      return res.status(404).json({ error: 'Processo não encontrado' });
    }

    res.json({ processo });
  } catch (error) {
    console.error('Erro ao buscar processo:', error);
    res.status(500).json({ error: 'Erro ao buscar processo' });
  }
};

const listProcessosEnviados = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const { Processo, Tramitacao, User, Setor, Secretaria } = req.models;

    // Buscar tramitações feitas pelo usuário (exceto abertura)
    const tramitacoes = await Tramitacao.findAll({
      where: {
        origem_usuario_id: req.user.id,
        tipo_acao: ['tramite', 'devolucao'] // Não incluir abertura e conclusão
      },
      include: [
        {
          model: Processo,
          as: 'processo',
          where: status ? { status } : {},
          include: [
            { model: Setor, as: 'setorAtual', include: [{ model: Secretaria, as: 'secretaria' }] },
            { model: User, as: 'usuarioAtual', attributes: ['id', 'nome', 'email'] }
          ]
        },
        { model: Setor, as: 'destinoSetor', include: [{ model: Secretaria, as: 'secretaria' }] },
        { model: User, as: 'destinoUsuario', attributes: ['id', 'nome', 'email'] }
      ],
      order: [['data_hora', 'DESC']],
      limit: parseInt(limit)
    });

    // Remover duplicatas (mesmo processo tramitado várias vezes)
    const processosMap = new Map();
    tramitacoes.forEach(tram => {
      if (tram.processo && !processosMap.has(tram.processo.id)) {
        processosMap.set(tram.processo.id, {
          processo: tram.processo,
          ultimaTramitacao: tram
        });
      }
    });

    const processos = Array.from(processosMap.values()).map(item => ({
      ...item.processo.toJSON(),
      destinatario: item.ultimaTramitacao.destinoSetor?.secretaria?.nome || 
                    item.ultimaTramitacao.destinoSetor?.nome || 'Destino não identificado',
      destinatarioSetor: item.ultimaTramitacao.destinoSetor?.nome,
      destinatarioUsuario: item.ultimaTramitacao.destinoUsuario?.nome,
      dataEnvio: item.ultimaTramitacao.data_hora,
      tipoTramitacao: item.ultimaTramitacao.tipo_acao
    })).sort((a, b) => a.assunto.localeCompare(b.assunto, 'pt-BR'));

    res.json({
      processos,
      total: processos.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Erro ao listar processos enviados:', error);
    res.status(500).json({ error: 'Erro ao listar processos enviados' });
  }
};

// ── BUSCA PÚBLICA COM FILTROS MÚLTIPLOS ─────────────────────────────────────
const buscarProcessosPublico = async (req, res) => {
  try {
    const { Processo, Tramitacao, Setor, User, Secretaria, Did } = req.models;
    const { q, secretaria, credor, numero_did, descricao } = req.query;

    const include = [
      {
        model: Setor,
        as: 'setorAtual',
        required: !!secretaria,
        attributes: ['id', 'nome', 'sigla'],
        include: [
          {
            model: Secretaria,
            as: 'secretaria',
            attributes: ['id', 'nome', 'sigla'],
            ...(secretaria ? { where: { nome: { [Op.iLike]: `%${secretaria}%` } } } : {})
          }
        ]
      },
      {
        model: Did,
        as: 'did',
        required: !!(numero_did && numero_did.trim()),
        attributes: ['id', 'numero_did'],
        ...(numero_did && numero_did.trim() ? { where: { numero_did: { [Op.iLike]: `%${numero_did.trim()}%` } } } : {})
      },
      {
        model: Tramitacao,
        as: 'tramitacoes',
        attributes: ['id', 'tipo_acao', 'data_hora', 'despacho'],
        separate: true,
        order: [['data_hora', 'DESC']],
        include: [
          { model: Setor, as: 'origemSetor', attributes: ['id', 'nome', 'sigla'] },
          { model: Setor, as: 'destinoSetor', attributes: ['id', 'nome', 'sigla'] },
          { model: User, as: 'origemUsuario', attributes: ['id', 'nome'] }
        ]
      }
    ];

    const whereConditions = [];

    // Filtro texto livre (número, assunto, interessado)
    if (q && q.trim()) {
      const termo = q.trim();
      whereConditions.push({
        [Op.or]: [
          { numero: { [Op.iLike]: `%${termo}%` } },
          { assunto: { [Op.iLike]: `%${termo}%` } },
          { interessado_nome: { [Op.iLike]: `%${termo}%` } }
        ]
      });
    }

    // Filtro por credor / interessado
    if (credor && credor.trim()) {
      whereConditions.push({
        [Op.or]: [
          { interessado_nome: { [Op.iLike]: `%${credor.trim()}%` } },
          { interessado_cpf_cnpj: { [Op.iLike]: `%${credor.trim()}%` } }
        ]
      });
    }

    // Filtro por descrição / assunto
    if (descricao && descricao.trim()) {
      whereConditions.push({ assunto: { [Op.iLike]: `%${descricao.trim()}%` } });
    }

    const where = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};

    const processos = await Processo.findAll({
      where,
      include,
      order: [['created_at', 'DESC']],
      limit: 50
    });

    res.json({ processos, total: processos.length });
  } catch (error) {
    console.error('Erro na busca pública com filtros:', error);
    res.status(500).json({ error: 'Erro ao buscar processos' });
  }
};

const consultarProcessoPublico = async (req, res) => {
  try {
    const { numero } = req.params;
    const { Processo, Tramitacao, Setor, User, Secretaria } = req.models;
    const termo = numero.trim();

    console.log('Buscando processo público:', termo);

    const include = [
      {
        model: Setor,
        as: 'setorAtual',
        attributes: ['id', 'nome', 'sigla'],
        include: [
          { model: Secretaria, as: 'secretaria', attributes: ['id', 'nome', 'sigla'] }
        ]
      },
      {
        model: Tramitacao,
        as: 'tramitacoes',
        attributes: ['id', 'tipo_acao', 'data_hora', 'despacho'],
        separate: true,
        order: [['data_hora', 'DESC']],
        include: [
          { model: Setor, as: 'origemSetor', attributes: ['id', 'nome', 'sigla'] },
          { model: Setor, as: 'destinoSetor', attributes: ['id', 'nome', 'sigla'] },
          { model: User, as: 'origemUsuario', attributes: ['id', 'nome', 'cpf'] }
        ]
      }
    ];

    // Extrai apenas dígitos do termo para comparação normalizada
    const apenasDigitos = termo.replace(/[^0-9]/g, '');

    // 1) Match exato
    let processo = await Processo.findOne({ where: { numero: termo }, include });

    // 2) ILIKE direto (cobre buscas por assunto / interessado)
    if (!processo) {
      processo = await Processo.findOne({
        where: {
          [Op.or]: [
            { numero: { [Op.iLike]: `%${termo}%` } },
            { assunto: { [Op.iLike]: `%${termo}%` } },
            { interessado_nome: { [Op.iLike]: `%${termo}%` } }
          ]
        },
        include
      });
    }

    // 3) Comparação por dígitos: remove pontuação e compara números (ex: Proc.20260000028 = Proc.2026.0000028)
    if (!processo && apenasDigitos.length >= 4) {
      processo = await Processo.findOne({
        where: Sequelize.where(
          Sequelize.fn('REGEXP_REPLACE', Sequelize.col('numero'), '[^0-9]', '', 'g'),
          { [Op.iLike]: `%${apenasDigitos}%` }
        ),
        include
      });
    }

    if (!processo) {
      console.log('Processo não encontrado:', numero);
      return res.status(404).json({ error: 'Processo não encontrado' });
    }

    console.log('Processo encontrado:', processo.numero);
    res.json(processo);
  } catch (error) {
    console.error('Erro ao consultar processo:', error);
    res.status(500).json({ error: 'Erro ao consultar processo' });
  }
};

// ── DELETE PROCESSO (somente admin) ─────────────────────────────────────────
const deleteProcesso = async (req, res) => {
  // Verificação já feita na rota via authorize(), mas checamos novamente por segurança
  if (req.user?.tipo !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem excluir processos' });
  }

  const transaction = await req.tenantDb.transaction();
  try {
    const { Processo, Tramitacao, Documento, Did } = req.models;
    const { id } = req.params;

    const processo = await Processo.findByPk(id, { transaction });
    if (!processo) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Processo não encontrado' });
    }

    // Remove DID vinculado (se existir)
    if (Did) {
      await Did.destroy({ where: { processo_id: id }, transaction });
    }

    // Remove tramitações
    if (Tramitacao) {
      await Tramitacao.destroy({ where: { processo_id: id }, transaction });
    }

    // Remove documentos
    if (Documento) {
      await Documento.destroy({ where: { processo_id: id }, transaction });
    }

    // Remove o processo
    await processo.destroy({ transaction });

    await transaction.commit();
    console.log(`[deleteProcesso] Processo ${processo.numero} excluído por uid=${req.user.id}`);
    res.json({ success: true, numero: processo.numero });
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao excluir processo:', error);
    res.status(500).json({ error: 'Erro ao excluir processo' });
  }
};

module.exports = {
  createProcesso,
  listProcessos,
  getDashboardStats,
  getProcessoById,
  tramitarProcesso,
  devolverProcesso,
  concluirProcesso,
  listProcessosEnviados,
  buscarProcessosPublico,
  consultarProcessoPublico,
  deleteProcesso
};
