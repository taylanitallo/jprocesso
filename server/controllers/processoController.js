const QRCode = require('qrcode');
const crypto = require('crypto');
const { Op, Sequelize } = require('sequelize');
const { registrarLog } = require('../middleware/activityLogger');
const { getScopeSetorInclude, getScopeSecretariaInclude } = require('../utils/scopeFilter');
const { situacaoRecebimento } = require('../utils/recebimento');
const { registrarExclusao } = require('../services/lixeiraService');
const { masterDb } = require('../config/database');
const assinaturaService = require('../services/assinaturaService');
const { AssinaturaError } = assinaturaService;

// ── Assinatura eletrônica avançada dos atos de tramitação ────────────────────
// Todo ato (abertura, trâmite, devolução, conclusão, recebimento) exige senha +
// código do app autenticador e gera registro assinado, com código verificador.

// Norma municipal que regulamenta a assinatura (cadastrada em Legislação)
const fundamentoMunicipal = async (tenant) => {
  if (!tenant?.id) return null;
  const rows = await masterDb.query(
    `SELECT titulo FROM public.legislacoes
      WHERE tenant_id = :tid AND regulamenta_assinatura AND ativo
      ORDER BY data_publicacao DESC NULLS LAST, criado_em DESC LIMIT 1`,
    { replacements: { tid: tenant.id }, type: Sequelize.QueryTypes.SELECT }
  ).catch(() => []);
  return rows[0]?.titulo || null;
};

// 2º fator: código do app (codigoTotp) ou, sem o celular, o código do e-mail (codigoEmail).
// O método usado fica em req para constar na assinatura (assinarTramitacao).
const validarAssinante = async (req, usuario, transaction) => {
  req._metodoAssinatura = await assinaturaService.validarCredenciais({
    db: req.tenantDb, transaction, usuario,
    senha: req.body?.senhaConfirmacao, codigo: req.body?.codigoTotp, codigoEmail: req.body?.codigoEmail,
  });
  return req._metodoAssinatura;
};

const assinarTramitacao = async (req, transaction, processo, tramitacao, signatario) => {
  const row = await assinaturaService.assinarAto({
    db: req.tenantDb, transaction, masterDb, tenant: req.tenant, processo, tramitacao, signatario, req,
    fundamentoMunicipal: await fundamentoMunicipal(req.tenant), metodo: req._metodoAssinatura,
  });
  await tramitacao.update({ assinatura_digital: row.hash_conteudo }, { transaction });
  return { codigo_verificador: row.codigo_verificador, codigo_crc: row.codigo_crc, assinado_em: row.assinado_em };
};

// Erros de assinatura (senha/código) voltam ao cliente com o código para a UI tratar
const responderErroAssinatura = (res, error) =>
  res.status(error.status).json({ error: error.message, codigo: error.codigo });

// ── Protocolo digital: normaliza o bloco protocolo_doc vindo do cliente ───────
// Só campos conhecidos são persistidos — o JSONB nunca recebe payload arbitrário.
const ORIGENS_PROTOCOLO  = ['interno', 'externo'];
const NATUREZAS_PROTOCOLO = ['fluxo_despesa', 'atendimento', 'emissao_documento', 'outros'];

const sanitizarProtocoloDoc = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const texto = (v, max) => (typeof v === 'string' && v.trim()) ? v.trim().slice(0, max) : null;
  const prazo = parseInt(raw.prazo_dias, 10);

  return {
    origem:               ORIGENS_PROTOCOLO.includes(raw.origem) ? raw.origem : 'externo',
    natureza:             NATUREZAS_PROTOCOLO.includes(raw.natureza) ? raw.natureza : 'atendimento',
    orgao_externo:        texto(raw.orgao_externo, 150),
    documento_apresentado: texto(raw.documento_apresentado, 200),
    prazo_dias:           Number.isInteger(prazo) && prazo > 0 && prazo <= 365 ? prazo : null,
    registrado_em:        new Date().toISOString(),
  };
};

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
      tipo_processo,
      protocolo_doc,
      destinoSetorId,
      destinoUsuarioId,
      despachoEncaminhamento
    } = req.body;

    const { Processo, Tramitacao, User, Setor, Secretaria } = req.models;

    const ano = new Date().getFullYear();
    
    const ultimoProcesso = await Processo.findOne({
      where: { ano },
      order: [['sequencial', 'DESC']],
      paranoid: false, // número de processo excluído não é reaproveitado
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

    // Abrir processo não pede assinatura eletrônica; só a tramitação pede. O Protocolo
    // que já sai encaminhado é uma tramitação — esse encaminhamento é assinado.
    const vaiEncaminhar = tipo_processo === 'Protocolo' && destinoSetorId && destinoSetorId !== user.setorId;
    if (vaiEncaminhar) await validarAssinante(req, user, transaction);

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
      protocolo_doc: tipo_processo === 'Protocolo' ? sanitizarProtocoloDoc(protocolo_doc) : null,
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

    // A abertura fica registrada (hash) sem assinatura eletrônica
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
    const assinaturas = [];

    // ── Encaminhamento no ato do protocolo ───────────────────────────────────
    // O balcão de protocolo registra e já encaminha ao setor competente. É uma
    // tramitação: assinada com a senha + código validados acima.
    let encaminhadoPara = null;
    if (vaiEncaminhar) {
      const destinoSetor = await Setor.findByPk(destinoSetorId, {
        include: [{ model: Secretaria, as: 'secretaria' }],
        transaction
      });

      if (!destinoSetor) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Setor de destino não encontrado' });
      }

      const timestampEnc = new Date().toISOString();
      const assinaturaEnc = crypto
        .createHash('sha256')
        .update(`${processo.id}|${req.user.id}|${user.cpf}|protocolo|${destinoSetorId}|${timestampEnc}`)
        .digest('hex');

      const despachoEnc = (despachoEncaminhamento && despachoEncaminhamento.trim().length >= 10)
        ? despachoEncaminhamento.trim()
        : `Protocolo registrado por ${user.nome} e encaminhado a ${destinoSetor.nome} para providências.`;

      const tramEnc = await Tramitacao.create({
        processo_id: processo.id,
        tipo_acao: 'tramite',
        despacho: despachoEnc,
        origem_usuario_id: req.user.id,
        origem_setor_id: user.setorId,
        destino_setor_id: destinoSetorId,
        destino_usuario_id: destinoUsuarioId || null,
        data_hora: timestampEnc,
        ip_origem: req.ip || req.connection.remoteAddress,
        assinatura_digital: assinaturaEnc
      }, { transaction });
      assinaturas.push(await assinarTramitacao(req, transaction, processo, tramEnc, user));

      await processo.update({
        status: 'em_analise',
        setor_atual_id: destinoSetorId,
        usuario_atual_id: destinoUsuarioId || null
      }, { transaction });

      encaminhadoPara = {
        setor: destinoSetor.nome,
        secretaria: destinoSetor.secretaria?.nome || null,
      };
    }

    await transaction.commit();

    await registrarLog(req, {
      acao: 'criar_processo',
      modulo: 'processos',
      descricao: `Processo ${processo.numero} criado — assunto: ${processo.assunto}`
        + (encaminhadoPara ? ` — encaminhado a ${encaminhadoPara.setor}` : ''),
      referencia_id: processo.id,
      referencia_numero: processo.numero
    });

    res.status(201).json({
      message: 'Processo criado com sucesso',
      processo: {
        id: processo.id,
        numero: processo.numero,
        assunto: processo.assunto,
        status: processo.status,
        qrcode: processo.qrcode,
        protocolo_doc: processo.protocolo_doc,
        encaminhado_para: encaminhadoPara,
        assinatura_digital: assinaturaDigital,
        assinaturas
      }
    });
  } catch (error) {
    await transaction.rollback();
    if (error instanceof AssinaturaError) return responderErroAssinatura(res, error);
    console.error('Erro ao criar processo:', error);

    // M-6: nunca vazar error.message/stack ao cliente
    let errorMessage = 'Erro interno do servidor';
    if (error.name === 'SequelizeValidationError') {
      errorMessage = 'Erro de validação nos dados enviados';
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
      errorMessage = 'Referência inválida (setor ou usuário não encontrado)';
    }

    res.status(500).json({ error: errorMessage });
  }
};

const tramitarProcesso = async (req, res) => {
  const transaction = await req.tenantDb.transaction();
  
  try {
    const { id } = req.params;
    const { despacho, destinoSetorId, destinoUsuarioId } = req.body;
    const { Processo, Tramitacao, User } = req.models;

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
    if ((await situacaoRecebimento(req, processo)).bloqueado) {
      await transaction.rollback();
      return res.status(403).json({ error: 'Receba o processo antes de tramitá-lo.' });
    }

    // Buscar usuário e validar a assinatura eletrônica (senha + código do app)
    const user = await User.findByPk(req.user.id, { transaction });
    await validarAssinante(req, user, transaction);

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

    // Operadores só podem tramitar para setores da própria secretaria
    // EXCETO se foram designados explicitamente por um gestor/admin na última tramitação
    if (req.user.tipo === 'operacional' && req.user.secretariaId) {
      const { Setor } = req.models;
      const destinoSetor = await Setor.findByPk(destinoSetorId, { transaction });

      if (!destinoSetor) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Setor de destino não encontrado' });
      }

      if (String(destinoSetor.secretariaId) !== String(req.user.secretariaId)) {
        // Verifica se foi designado por gestor/admin na última tramitação
        const ultimaTramitacao = await Tramitacao.findOne({
          where: { processo_id: processo.id },
          order: [['data_hora', 'DESC']],
          include: [{ model: User, as: 'origemUsuario', attributes: ['tipo'] }],
          transaction
        });

        const foiDesignadoPorGestor =
          ultimaTramitacao?.destino_usuario_id === req.user.id &&
          (ultimaTramitacao?.origemUsuario?.tipo === 'gestor' || ultimaTramitacao?.origemUsuario?.tipo === 'admin');

        if (!foiDesignadoPorGestor) {
          await transaction.rollback();
          return res.status(403).json({
            error: 'Operadores só podem tramitar para setores da sua própria secretaria. Solicite a um gestor para tramitar entre secretarias.'
          });
        }
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
    const tramitacao = await Tramitacao.create({
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
    const assinatura = await assinarTramitacao(req, transaction, processo, tramitacao, user);

    // Atualizar processo
    await processo.update({
      status: 'em_analise',
      setor_atual_id: destinoSetorId,
      usuario_atual_id: destinoUsuarioId || null
    }, { transaction });

    await transaction.commit();

    await registrarLog(req, {
      acao: 'tramitar_processo',
      modulo: 'processos',
      descricao: `Processo tramitado para setor ${destinoSetorId}`,
      referencia_id: processo.id,
      referencia_numero: processo.numero
    });

    res.json({ 
      message: 'Processo tramitado com sucesso',
      assinatura_digital: assinaturaDigital,
      assinatura,
      timestamp,
      tramitado_por: user.nome
    });
  } catch (error) {
    await transaction.rollback();
    if (error instanceof AssinaturaError) return responderErroAssinatura(res, error);
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
    if ((await situacaoRecebimento(req, processo)).bloqueado) {
      await transaction.rollback();
      return res.status(403).json({ error: 'Receba o processo antes de devolvê-lo.' });
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
    await validarAssinante(req, user, transaction);

    const assinaturaDigital = crypto
      .createHash('sha256')
      .update(`${processo.id}-${req.user.id}-devolucao-${new Date().toISOString()}`)
      .digest('hex');

    const tramitacao = await Tramitacao.create({
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
    const assinatura = await assinarTramitacao(req, transaction, processo, tramitacao, user);

    await processo.update({
      status: 'devolvido',
      setor_atual_id: ultimaTramitacao.origem_setor_id,
      usuario_atual_id: ultimaTramitacao.origem_usuario_id
    }, { transaction });

    await transaction.commit();

    await registrarLog(req, {
      acao: 'devolver_processo',
      modulo: 'processos',
      descricao: `Processo devolvido ao setor de origem`,
      referencia_id: processo.id,
      referencia_numero: processo.numero
    });

    res.json({ 
      message: 'Processo devolvido com sucesso',
      setor_devolucao: ultimaTramitacao.origem_setor_id,
      assinatura_digital: assinaturaDigital,
      assinatura
    });
  } catch (error) {
    await transaction.rollback();
    if (error instanceof AssinaturaError) return responderErroAssinatura(res, error);
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
    if ((await situacaoRecebimento(req, processo)).bloqueado) {
      await transaction.rollback();
      return res.status(403).json({ error: 'Receba o processo antes de concluí-lo.' });
    }

    const user = await User.findByPk(req.user.id, { transaction });
    await validarAssinante(req, user, transaction);

    const assinaturaDigital = crypto
      .createHash('sha256')
      .update(`${processo.id}-${req.user.id}-conclusao-${new Date().toISOString()}`)
      .digest('hex');

    const tramitacao = await Tramitacao.create({
      processo_id: processo.id,
      tipo_acao: 'conclusao',
      despacho: despachoFinal,
      origem_usuario_id: req.user.id,
      origem_setor_id: user.setorId,
      ip_origem: req.ip || req.connection.remoteAddress,
      assinatura_digital: assinaturaDigital
    }, { transaction });
    const assinatura = await assinarTramitacao(req, transaction, processo, tramitacao, user);

    await processo.update({
      status: 'concluido',
      data_conclusao: new Date()
    }, { transaction });

    await transaction.commit();

    await registrarLog(req, {
      acao: 'concluir_processo',
      modulo: 'processos',
      descricao: `Processo concluído`,
      referencia_id: processo.id,
      referencia_numero: processo.numero
    });

    res.json({ 
      message: 'Processo concluído com sucesso',
      assinatura_digital: assinaturaDigital,
      assinatura
    });
  } catch (error) {
    await transaction.rollback();
    if (error instanceof AssinaturaError) return responderErroAssinatura(res, error);
    console.error('Erro ao concluir processo:', error);
    res.status(500).json({ error: 'Erro ao concluir processo' });
  }
};

const listProcessos = async (req, res) => {
  try {
    const {
      status, prioridade, tipo,
      secretariaId, setorId: setorIdFiltro, usuarioId,
      page = 1, limit = 10, search,
    } = req.query;
    const { Processo, Tramitacao, User, Setor, Secretaria } = req.models;

    const where = {};

    // Aba Concluídos (?concluidos=1): só encerrados. Caixa de entrada: nunca encerrados.
    const ENCERRADOS = ['concluido', 'arquivado'];
    const abaConcluidos = ['1', 'true'].includes(String(req.query.concluidos));
    if (abaConcluidos) where.status = status && ENCERRADOS.includes(status) ? status : { [Op.in]: ENCERRADOS };
    else               where.status = status && !ENCERRADOS.includes(status) ? status : { [Op.notIn]: ENCERRADOS };
    if (prioridade)     where.prioridade       = prioridade;
    if (tipo)           where.tipo_processo    = tipo;
    if (setorIdFiltro)  where.setor_atual_id   = setorIdFiltro;
    // Atalhos dos cartões do Dashboard (mesmas regras dos números de lá)
    if (req.query.periodo === 'hoje') {
      const inicioDia = new Date(); inicioDia.setHours(0, 0, 0, 0);
      where.created_at = { [Op.gte]: inicioDia };
    }
    if (req.query.parados === '48h') where.data_abertura = { [Op.lte]: new Date(Date.now() - 48 * 60 * 60 * 1000) };
    if (usuarioId)      where.usuario_atual_id = usuarioId;

    // Busca textual: número, assunto, interessado, tipo_processo
    // Secretaria/setor/responsável são resolvidos via JOIN — aqui apenas campos diretos
    const searchCond = search ? {
      [Op.or]: [
        { numero:           { [Op.iLike]: `%${search}%` } },
        { assunto:          { [Op.iLike]: `%${search}%` } },
        { interessado_nome: { [Op.iLike]: `%${search}%` } },
        { tipo_processo:    { [Op.iLike]: `%${search}%` } },
      ],
    } : null;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const tipoUsuario = req.user.tipo;

    // Caixa de entrada: só o que está com o usuário — atribuído a ele, ou no setor dele
    // sem pessoa definida. Quem tramitou deixa de ver (fica em Enviados, se criou).
    // Administrador/gestor podem pedir a visão ampla (?todos=1), limitada pelo escopo.
    const visaoAmpla = ['admin', 'gestor', 'jeos'].includes(tipoUsuario) && ['1', 'true'].includes(String(req.query.todos));
    let accessCond = null;
    if (!visaoAmpla) {
      const userInfo = await User.findByPk(req.user.id, { attributes: ['id', 'setorId'] });
      const sId = userInfo?.setorId || null;
      const orCond = [{ usuario_atual_id: req.user.id }];
      if (sId) orCond.push({ setor_atual_id: sId, usuario_atual_id: null });
      if (abaConcluidos) {
        // Concluídos: os de que o usuário participou — criou, estava com ele ou passou por ele
        orCond.push({ criado_por_id: req.user.id });
        if (sId) orCond.push({ setor_atual_id: sId });
        orCond.push({ id: { [Op.in]: req.tenantDb.literal(
          `(SELECT processo_id FROM tramitacoes WHERE origem_usuario_id = ${req.tenantDb.escape(req.user.id)} OR destino_usuario_id = ${req.tenantDb.escape(req.user.id)})`
        ) } });
      }
      accessCond = { [Op.or]: orCond };
    }

    // Combina search + access sem sobrescrever um ao outro
    if (searchCond && accessCond) {
      where[Op.and] = [searchCond, accessCond];
    } else if (searchCond) {
      Object.assign(where, searchCond);
    } else if (accessCond) {
      Object.assign(where, accessCond);
    }

    // Scope de secretaria via setor: param explícito tem prioridade; caso contrário usa escopo da permissão
    let scopeInclude = {}
    if (secretariaId) {
      scopeInclude = { where: { secretariaId }, required: true }
    } else if (visaoAmpla) {
      // Caixa pessoal já é restrita; na visão ampla vale o escopo de secretaria da permissão
      scopeInclude = await getScopeSetorInclude(req, 'processos', 'ver')
    }

    // Include Setor + Secretaria aninhada (com filtro opcional por secretaria)
    const setorInclude = {
      model: Setor,
      as: 'setorAtual',
      attributes: ['id', 'nome', 'sigla'],
      ...scopeInclude,
      include: [{ model: Secretaria, as: 'secretaria', attributes: ['id', 'nome', 'sigla'] }],
    };

    // ── 1. COUNT separado (evita quirks de findAndCountAll + separate:true) ──
    const countOptions = { where };
    if (scopeInclude.where) {
      countOptions.include = [{
        model: Setor, as: 'setorAtual', required: true,
        ...scopeInclude, attributes: [],
      }];
    }
    const total = await Processo.count(countOptions);

    // ── 2. Busca as linhas ─────────────────────────────────────────────────
    const processos = await Processo.findAll({
      where,
      limit:  parseInt(limit),
      offset,
      order:  [['updated_at', 'DESC']],
      include: [
        { model: User, as: 'usuarioAtual', attributes: ['id', 'nome'], required: false },
        setorInclude,
        { model: User, as: 'criadoPor',    attributes: ['id', 'nome'], required: false },
      ],
    });

    // ── 3. Última tramitação por processo (query própria, sem separate:true) ─
    const tramMap = {};
    if (processos.length > 0) {
      const ids = processos.map(p => p.id);
      const trams = await Tramitacao.findAll({
        where:      { processo_id: { [Op.in]: ids } },
        attributes: ['id', 'tipo_acao', 'data_hora', 'despacho', 'processo_id'],
        order:      [['data_hora', 'DESC']],
        include: [
          { model: Setor, as: 'origemSetor',   attributes: ['id', 'nome', 'sigla'] },
          { model: Setor, as: 'destinoSetor',  attributes: ['id', 'nome', 'sigla'] },
          { model: User,  as: 'origemUsuario', attributes: ['id', 'nome'] },
        ],
      });
      trams.forEach(t => { if (!tramMap[t.processo_id]) tramMap[t.processo_id] = t; });
    }

    // ── 4. Monta resposta estruturada sem vazar PII ────────────────────────
    const PII = ['interessado_cpf_cnpj', 'interessado_email', 'interessado_telefone'];
    const resultado = processos.map(p => {
      const obj = p.toJSON();
      PII.forEach(k => delete obj[k]);

      const ut = tramMap[p.id] ? tramMap[p.id].toJSON() : null;

      return {
        ...obj,
        secretariaAtual:  obj.setorAtual?.secretaria || null,
        setorAtual:       obj.setorAtual
          ? { id: obj.setorAtual.id, nome: obj.setorAtual.nome, sigla: obj.setorAtual.sigla }
          : null,
        responsavelAtual: obj.usuarioAtual
          ? { id: obj.usuarioAtual.id, nome: obj.usuarioAtual.nome }
          : null,
        ultimaTramitacao: ut
          ? {
              id:       ut.id,
              data:     ut.data_hora,
              tipo:     ut.tipo_acao,
              despacho: ut.despacho,
              origem:   ut.origemSetor  || null,
              destino:  ut.destinoSetor || null,
              usuario:  ut.origemUsuario || null,
            }
          : null,
        tramitacoes:  undefined,
        usuarioAtual: undefined,
      };
    });

    res.json({
      processos: resultado,
      pagination: {
        total:      total,
        page:       parseInt(page),
        limit:      parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
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
    const userId = req.user.id;

    // Busca setorId sempre do banco (não depende do token)
    const userInfo = await User.findByPk(userId, { attributes: ['id', 'setorId', 'secretariaId', 'tipo'] });
    const setorId = userInfo?.setorId || null;

    const agora = new Date();
    const inicioDia = new Date(agora); inicioDia.setHours(0, 0, 0, 0);
    const limite48h = new Date(agora - 48 * 60 * 60 * 1000);

    const includeBasico = [
      { model: Setor, as: 'setorAtual', attributes: ['id', 'nome', 'sigla'] },
      { model: User, as: 'usuarioAtual', attributes: ['id', 'nome'] }
    ];

    // ── Filtro de visibilidade por tipo de usuário ────────────────────────────
    // operacional: apenas processos no seu setor OU destinados diretamente a ele
    // gestor: todos os processos da sua secretaria
    // admin: todos os processos

    const orConditions = [{ usuario_atual_id: userId }];
    // Mesma regra da caixa de entrada: no setor só o que não está atribuído a outra pessoa
    if (setorId) orConditions.push({ setor_atual_id: setorId, usuario_atual_id: null });

    const whereMinhasCaixa = {
      status: { [Op.notIn]: ['concluido', 'arquivado'] },
      [Op.or]: orConditions
    };

    // Include com filtro de secretaria para gestor
    const includeComSecretaria = userInfo?.secretariaId
      ? [
          { model: Setor, as: 'setorAtual', attributes: ['id', 'nome', 'sigla'], where: { secretariaId: userInfo.secretariaId }, required: true },
          { model: User, as: 'usuarioAtual', attributes: ['id', 'nome'] }
        ]
      : includeBasico;

    // Where base para cada tipo de usuário (usado em Novos Hoje, 48h, Concluídos, Urgentes)
    const whereVisivel =
      userInfo?.tipo === 'operacional'
        ? { [Op.or]: orConditions }
        : userInfo?.tipo === 'gestor' && userInfo?.secretariaId
          ? {}  // filtro aplicado via include (setorAtual.secretariaId)
          : {}; // admin: sem filtro

    const includeVisivelSemStatus =
      userInfo?.tipo === 'gestor' && userInfo?.secretariaId
        ? includeComSecretaria
        : includeBasico;

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

      // 3. novos hoje — respeitando visibilidade do usuário
      Processo.count({
        where: { ...whereVisivel, created_at: { [Op.gte]: inicioDia } },
        include: userInfo?.tipo === 'gestor' && userInfo?.secretariaId
          ? [{ model: Setor, as: 'setorAtual', where: { secretariaId: userInfo.secretariaId }, required: true }]
          : []
      }),

      // 4. pendentes > 48h — respeitando visibilidade do usuário
      Processo.count({
        where: {
          ...whereVisivel,
          data_abertura: { [Op.lte]: limite48h },
          status: { [Op.notIn]: ['concluido', 'arquivado'] }
        },
        include: userInfo?.tipo === 'gestor' && userInfo?.secretariaId
          ? [{ model: Setor, as: 'setorAtual', where: { secretariaId: userInfo.secretariaId }, required: true }]
          : []
      }),

      // 5. concluídos (finalizados: concluído ou arquivado, como a aba Concluídos)
      Processo.count({
        where: { ...whereVisivel, status: { [Op.in]: ['concluido', 'arquivado'] } },
        include: userInfo?.tipo === 'gestor' && userInfo?.secretariaId
          ? [{ model: Setor, as: 'setorAtual', where: { secretariaId: userInfo.secretariaId }, required: true }]
          : []
      }),

      // 6. urgentes — respeitando visibilidade do usuário
      Processo.findAll({
        where: {
          ...whereVisivel,
          prioridade: 'urgente',
          status: { [Op.notIn]: ['concluido', 'arquivado'] }
        },
        limit: 5,
        order: [['data_abertura', 'ASC']],
        include: includeVisivelSemStatus
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
    const { Processo, User, Setor, Tramitacao, Secretaria, Documento } = req.models;

    const processo = await Processo.findByPk(id, {
      include: [
        { model: User, as: 'usuarioAtual', attributes: ['id', 'nome', 'email'] },
        { model: Setor, as: 'setorAtual', attributes: ['id', 'nome', 'sigla', 'secretariaId'] },
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
        },
        {
          model: Documento,
          as: 'documentos',
          include: [{ model: User, as: 'uploadPor', attributes: ['id', 'nome'] }],
          order: [['ordem', 'ASC'], ['data_upload', 'ASC']],
          separate: true
        }
      ]
    });

    if (!processo) {
      return res.status(404).json({ error: 'Processo não encontrado' });
    }

    // Ainda não recebido pelo destino: só o necessário para identificar o
    // processo e quem enviou — conteúdo, documentos e histórico após receber
    const recebimento = await situacaoRecebimento(req, processo);
    if (recebimento.bloqueado) {
      const p = processo.toJSON();
      const envio = p.tramitacoes.find(t => t.id === recebimento.ultima.id);
      return res.json({
        processo: {
          id: p.id, numero: p.numero, assunto: p.assunto, tipo_processo: p.tipo_processo,
          status: p.status, prioridade: p.prioridade, data_abertura: p.data_abertura, created_at: p.created_at,
          setor_atual_id: p.setor_atual_id, usuario_atual_id: p.usuario_atual_id,
          setorAtual: p.setorAtual, usuarioAtual: p.usuarioAtual ? { id: p.usuarioAtual.id, nome: p.usuarioAtual.nome } : null,
          aguardando_recebimento: true,
          pode_receber: recebimento.podeReceber,
          envio: envio ? {
            tipo_acao: envio.tipo_acao, data_hora: envio.data_hora,
            despacho: envio.despacho, justificativa_devolucao: envio.justificativa_devolucao,
            origemUsuario: envio.origemUsuario, origemSetor: envio.origemSetor,
            destinoUsuario: envio.destinoUsuario, destinoSetor: envio.destinoSetor,
          } : null,
        },
      });
    }

    // Tarja de assinatura eletrônica de cada ato (tramitações antigas não têm)
    const obj = processo.toJSON();
    const assinaturas = await assinaturaService.listarPorProcesso(req.tenantDb, processo.id).catch(() => []);
    const porTramitacao = new Map(assinaturas.map(a => [a.tramitacao_id, a]));
    (obj.tramitacoes || []).forEach(t => { t.assinatura_eletronica = porTramitacao.get(t.id) || null; });

    res.json({ processo: obj });
  } catch (error) {
    console.error('Erro ao buscar processo:', error);
    res.status(500).json({ error: 'Erro ao buscar processo' });
  }
};

const listProcessosEnviados = async (req, res) => {
  try {
    const {
      status, search, tipo, prioridade,
      secretariaId, setorId, usuarioId,
      page = 1, limit = 50,
    } = req.query;
    const { Processo, Tramitacao, User, Setor, Secretaria } = req.models;

    // Enviados: só processos que o usuário INICIOU e que agora estão com outra pessoa/setor
    // (quem só participou vê o processo na caixa de entrada enquanto estiver com ele)
    const eu = await User.findByPk(req.user.id, { attributes: ['setorId'] });
    const processoWhere = {
      criado_por_id: req.user.id,
      // Encerrados ficam na aba Concluídos
      status: status && !['concluido', 'arquivado'].includes(status) ? status : { [Op.notIn]: ['concluido', 'arquivado'] },
      [Op.not]: [{ [Op.or]: [
        { usuario_atual_id: req.user.id },
        ...(eu?.setorId ? [{ setor_atual_id: eu.setorId, usuario_atual_id: null }] : []),
      ] }],
    };
    if (tipo)       processoWhere.tipo_processo    = tipo;
    if (prioridade) processoWhere.prioridade       = prioridade;
    if (setorId)    processoWhere.setor_atual_id   = setorId;
    if (usuarioId)  processoWhere.usuario_atual_id = usuarioId;
    if (search) {
      processoWhere[Op.or] = [
        { numero:           { [Op.iLike]: `%${search}%` } },
        { assunto:          { [Op.iLike]: `%${search}%` } },
        { interessado_nome: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const setorAtualInclude = {
      model: Setor,
      as: 'setorAtual',
      required: !!secretariaId,
      ...(secretariaId ? { where: { secretariaId } } : {}),
      include: [{ model: Secretaria, as: 'secretaria' }],
    };

    const tramitacoes = await Tramitacao.findAll({
      where: {
        origem_usuario_id: req.user.id,
        tipo_acao: { [Op.in]: ['tramite', 'devolucao'] },
      },
      include: [
        {
          model: Processo,
          as: 'processo',
          where: processoWhere,
          required: true,
          include: [
            setorAtualInclude,
            { model: User, as: 'usuarioAtual', attributes: ['id', 'nome', 'email'] },
          ],
        },
        { model: Setor, as: 'destinoSetor', include: [{ model: Secretaria, as: 'secretaria' }] },
        { model: User, as: 'destinoUsuario', attributes: ['id', 'nome', 'email'] },
      ],
      order: [['data_hora', 'DESC']],
      limit: parseInt(limit),
    });

    // Remover duplicatas (mesmo processo tramitado várias vezes — manter tramitação mais recente)
    const processosMap = new Map();
    tramitacoes.forEach(tram => {
      if (tram.processo && !processosMap.has(tram.processo.id)) {
        processosMap.set(tram.processo.id, { processo: tram.processo, ultimaTramitacao: tram });
      }
    });

    // Destino = onde o processo está agora (pode já ter passado por outros setores)
    const processos = Array.from(processosMap.values()).map(item => ({
      ...item.processo.toJSON(),
      destinatario: item.processo.setorAtual?.secretaria?.nome || item.processo.setorAtual?.nome ||
                    item.ultimaTramitacao.destinoSetor?.secretaria?.nome ||
                    item.ultimaTramitacao.destinoSetor?.nome || 'Destino não identificado',
      destinatarioSetor:   item.processo.setorAtual?.nome || item.ultimaTramitacao.destinoSetor?.nome,
      destinatarioUsuario: item.processo.usuarioAtual?.nome || item.ultimaTramitacao.destinoUsuario?.nome,
      dataEnvio:           item.ultimaTramitacao.data_hora,
      tipoTramitacao:      item.ultimaTramitacao.tipo_acao,
    })).sort((a, b) => new Date(b.dataEnvio) - new Date(a.dataEnvio));

    // Ainda não recebido pelo destino (última movimentação do processo é trâmite/devolução)
    if (processos.length) {
      const ultimas = await Tramitacao.findAll({
        where: { processo_id: { [Op.in]: processos.map(p => p.id) } },
        attributes: ['processo_id', 'tipo_acao', 'data_hora'],
        order: [['data_hora', 'DESC']],
        raw: true,
      });
      const ultimaPor = {};
      ultimas.forEach(t => { if (!ultimaPor[t.processo_id]) ultimaPor[t.processo_id] = t.tipo_acao; });
      processos.forEach(p => {
        p.aguardandoRecebimento = p.status !== 'concluido' && ['tramite', 'devolucao'].includes(ultimaPor[p.id]);
      });
    }

    res.json({ processos, total: processos.length, page: parseInt(page), limit: parseInt(limit) });
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

    // M-5: remover PII antes de enviar para endpoint público
    const PII = ['interessado_cpf_cnpj', 'interessado_email', 'interessado_telefone'];
    const result = processos.map(p => { const o = p.toJSON(); PII.forEach(k => delete o[k]); return o; });

    res.json({ processos: result, total: result.length });
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
          { model: User, as: 'origemUsuario', attributes: ['id', 'nome'] }
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

    // M-5: remover PII antes de enviar para endpoint público
    const PII = ['interessado_cpf_cnpj', 'interessado_email', 'interessado_telefone'];
    const obj = processo.toJSON();
    PII.forEach(k => delete obj[k]);

    console.log('Processo encontrado:', processo.numero);
    res.json(obj);
  } catch (error) {
    console.error('Erro ao consultar processo:', error);
    res.status(500).json({ error: 'Erro ao consultar processo' });
  }
};

// ── Reorganizar processo: muda tipo_processo (move a "pasta" no arquivo) ──────
const moverProcessoTipo = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo_processo } = req.body;
    const { Processo } = req.models;

    const TIPOS_VALIDOS = ['Did', 'Despacho', 'Pauta', 'Protocolo', 'Requisição', 'Geral'];
    if (tipo_processo !== null && !TIPOS_VALIDOS.includes(tipo_processo)) {
      return res.status(400).json({ error: 'Tipo de processo inválido' });
    }

    const processo = await Processo.findByPk(id, { attributes: ['id', 'status'] });
    if (!processo) return res.status(404).json({ error: 'Processo não encontrado' });
    if (processo.status !== 'concluido') {
      return res.status(400).json({ error: 'Apenas processos concluídos podem ser reorganizados no arquivo' });
    }

    await processo.update({ tipo_processo: tipo_processo || null });
    res.json({ message: 'Processo reorganizado com sucesso' });
  } catch (error) {
    console.error('Erro ao reorganizar processo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ── Arquivo: processos concluídos com documentos organizados hierarquicamente ──
const getArquivoProcessos = async (req, res) => {
  try {
    const { Processo, User, Setor, Secretaria, Documento } = req.models;
    const tipoUsuario = req.user.tipo;

    // Filtro de visibilidade (mesmo critério do listProcessos)
    const setorInclude = {
      model: Setor,
      as: 'setorAtual',
      attributes: [],
      required: false,
    };

    // Para gestor, restringe à secretaria dele (via setor criador)
    const criadoPorInclude = {
      model: User,
      as: 'criadoPor',
      attributes: ['id', 'nome', 'secretariaId'],
      required: false,
      include: [{
        model: Secretaria,
        as: 'secretaria',
        attributes: ['id', 'nome', 'sigla'],
        ...(await getScopeSecretariaInclude(req, 'processos', 'ver')),
      }],
    };

    const processos = await Processo.findAll({
      where: { status: 'concluido' },
      attributes: ['id', 'numero', 'ano', 'sequencial', 'assunto', 'tipo_processo', 'data_conclusao'],
      order: [['ano', 'DESC'], ['sequencial', 'ASC']],
      include: [
        criadoPorInclude,
        {
          model: Documento,
          as: 'documentos',
          attributes: ['id', 'nome_arquivo', 'tamanho_bytes', 'tipo_mime', 'data_upload'],
          separate: true,
          order: [['data_upload', 'ASC']],
        },
      ],
    });

    const resultado = processos.map(p => ({
      id:           p.id,
      numero:       p.numero,
      ano:          p.ano,
      assunto:      p.assunto,
      tipo_processo: p.tipo_processo || 'Geral',
      secretaria:   p.criadoPor?.secretaria
        ? { id: p.criadoPor.secretaria.id, nome: p.criadoPor.secretaria.nome, sigla: p.criadoPor.secretaria.sigla }
        : null,
      documentos:   (p.documentos || []).map(d => ({
        id:            d.id,
        nome_arquivo:  d.nome_arquivo,
        tamanho_bytes: d.tamanho_bytes,
        tipo_mime:     d.tipo_mime,
        data_upload:   d.data_upload,
      })),
    }));

    res.json({ processos: resultado });
  } catch (error) {
    console.error('Erro ao carregar arquivo:', error);
    res.status(500).json({ error: 'Erro ao carregar arquivo de processos' });
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
    const {
      Processo, Tramitacao, Documento, Did, ContratoOrdem,
      AlmoxarifadoItem, AlmoxarifadoMovimentacao, AlmoxLote
    } = req.models;
    const { id } = req.params;

    const processo = await Processo.findByPk(id, { transaction });
    if (!processo) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Processo não encontrado' });
    }

    // O que a exclusão desfez em outros módulos — se houver, ela não pode ser
    // restaurada (não há como refazer com segurança as saídas e a ordem)
    const desfeitos = [];

    // Exclui o DID vinculado (se existir) — antes, desfaz tudo que ele gerou no
    // almoxarifado e libera a Ordem de Compra vinculada.
    if (Did) {
      const did = await Did.findOne({ where: { processo_id: id }, transaction });

      if (did) {
        // 1) Reverte saídas de material que este DID gerou no almoxarifado
        //    (consumo próprio, registrado por número de referência "DID-{numero}").
        if (AlmoxarifadoMovimentacao && AlmoxarifadoItem) {
          const docRef = `DID-${did.numero_did}`;
          const movs = await AlmoxarifadoMovimentacao.findAll({
            where: { documento_referencia: docRef, tipo: 'SAIDA' },
            transaction
          });
          for (const mov of movs) {
            const item = await AlmoxarifadoItem.findByPk(mov.item_id, { transaction });
            if (item) {
              await item.update(
                { estoque_atual: Math.max(0, parseFloat(item.estoque_atual) + parseFloat(mov.quantidade)) },
                { transaction }
              );
            }
            await mov.destroy({ transaction });
          }
          if (movs.length) desfeitos.push('as saídas de material do almoxarifado foram estornadas');
        }

        // 2) Se a Ordem de Compra vinculada não estiver em uso por outro DID,
        //    libera o status e zera os lotes de entrada recebidos por causa dela.
        if (did.ordem_compra_id && ContratoOrdem) {
          const outroVinculo = await Did.count({
            where: { ordem_compra_id: did.ordem_compra_id, id: { [Op.ne]: did.id } },
            transaction
          });
          if (outroVinculo === 0) {
            const [liberadas] = await ContratoOrdem.update(
              { status: 'EMITIDA' },
              { where: { id: did.ordem_compra_id, status: 'ATENDIDA' }, transaction }
            );
            if (liberadas) desfeitos.push('a ordem de compra vinculada voltou a ficar disponível');

            if (AlmoxLote && AlmoxarifadoItem) {
              const lotes = await AlmoxLote.findAll({
                where: { ordem_id: did.ordem_compra_id, ativo: true },
                transaction
              });
              for (const lote of lotes) {
                const item = await AlmoxarifadoItem.findByPk(lote.item_id, { transaction });
                if (item) {
                  await item.update(
                    { estoque_atual: Math.max(0, parseFloat(item.estoque_atual) - parseFloat(lote.quantidade_atual)) },
                    { transaction }
                  );
                }
                await lote.update({ quantidade_atual: 0, ativo: false }, { transaction });
              }
              if (lotes.length) desfeitos.push('os lotes recebidos pela ordem foram zerados no estoque');
            }
          }
        }
      }

    }

    // Nada é apagado: processo, DID, tramitações e documentos vão juntos para os
    // Excluídos com o mesmo deleted_at — é por ele que a restauração os traz de volta
    const agora = new Date();
    await registrarExclusao(req, 'processos', processo, {
      transaction,
      restauravel: desfeitos.length === 0,
      motivoBloqueio: `Ao excluir, ${desfeitos.join('; ')}. Por isso o processo não pode ser restaurado.`,
    });
    for (const Model of [Did, Tramitacao, Documento].filter(Boolean)) {
      await Model.update({ deleted_at: agora }, { where: { processo_id: id }, transaction });
    }
    await Processo.update({ deleted_at: agora }, { where: { id }, transaction });

    await transaction.commit();
    await registrarLog(req, {
      acao: 'excluir_processo',
      modulo: 'processos',
      descricao: `Processo ${processo.numero} excluído`,
      referencia_id: processo.id,
      referencia_numero: processo.numero,
    });
    res.json({ success: true, numero: processo.numero });
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao excluir processo:', error);
    res.status(500).json({ error: 'Erro ao excluir processo' });
  }
};

const salvarDespachoDoc = async (req, res) => {
  try {
    const { id } = req.params;
    const { Processo } = req.models;
    const {
      tipo_despacho, numero, ementa, referencia, titulo_outro,
      para, cargo_emissor, portaria_nomeacao, setor_emissor, secretaria_emissora,
      data_despacho, assunto, texto, nome_assinante,
    } = req.body;

    const processo = await Processo.findByPk(id);
    if (!processo) return res.status(404).json({ error: 'Processo não encontrado' });

    const doc = {
      tipo_despacho:      tipo_despacho      || '',
      numero:             numero             || '',
      ementa:             ementa             || '',
      referencia:         referencia         || '',
      titulo_outro:       titulo_outro       || '',
      para:               para               || '',
      cargo_emissor:      cargo_emissor      || '',
      portaria_nomeacao:  portaria_nomeacao  || '',
      setor_emissor:      setor_emissor      || '',
      secretaria_emissora:secretaria_emissora|| '',
      data_despacho:      data_despacho      || null,
      assunto:            assunto            || '',
      texto:              texto              || '',
      nome_assinante:     nome_assinante     || '',
    };
    processo.despacho_doc = doc;
    processo.changed('despacho_doc', true);
    await processo.save();

    res.json({ despacho_doc: doc });
  } catch (err) {
    console.error('Erro ao salvar despacho doc:', err);
    res.status(500).json({ error: err.message });
  }
};

const receberProcesso = async (req, res) => {
  const transaction = await req.tenantDb.transaction();
  try {
    const { id } = req.params;
    const { Processo, Tramitacao, User } = req.models;
    const usuarioId = req.user.id;

    const processo = await Processo.findByPk(id, { transaction });
    if (!processo) { await transaction.rollback(); return res.status(404).json({ error: 'Processo não encontrado' }); }
    if (processo.status === 'concluido') { await transaction.rollback(); return res.status(400).json({ error: 'Processo já concluído.' }); }

    const user = await User.findByPk(usuarioId, { transaction });

    // Verifica se o usuário é o destinatário (está no setor atual ou é o usuário atual)
    const isDestinatario =
      processo.usuario_atual_id === usuarioId ||
      (processo.usuario_atual_id === null && processo.setor_atual_id === user?.setorId);

    if (!isDestinatario) {
      await transaction.rollback();
      return res.status(403).json({ error: 'Você não é o destinatário deste processo.' });
    }

    // Verifica se a última ação requer recebimento
    const ultimaTramitacao = await Tramitacao.findOne({
      where: { processo_id: id },
      order: [['data_hora', 'DESC']],
      transaction,
    });

    if (!ultimaTramitacao || !['tramite', 'devolucao'].includes(ultimaTramitacao.tipo_acao)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Este processo não requer recebimento no momento.' });
    }

    // Recebimento é só a confirmação (sem senha nem assinatura eletrônica); fica no
    // histórico com quem recebeu, quando e de onde. Assinatura só na tramitação.
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const assinaturaDigital = crypto.createHash('sha256')
      .update(`${processo.numero}-recebimento-${usuarioId}-${Date.now()}`)
      .digest('hex');

    await Tramitacao.create({
      processo_id: id,
      tipo_acao: 'recebimento',
      origem_usuario_id: usuarioId,
      origem_setor_id: processo.setor_atual_id,
      destino_setor_id: processo.setor_atual_id,
      destino_usuario_id: usuarioId,
      despacho: `Processo recebido por ${user?.nome || 'usuário'}`,
      data_hora: new Date(),
      ip_origem: ip,
      assinatura_digital: assinaturaDigital,
    }, { transaction });

    // Se o processo estava apenas no setor (sem usuário), atribui ao receptor
    if (!processo.usuario_atual_id) {
      processo.usuario_atual_id = usuarioId;
      await processo.save({ transaction });
    }

    await transaction.commit();
    res.json({ message: 'Processo recebido com sucesso!' });
  } catch (err) {
    await transaction.rollback();
    console.error('Erro ao receber processo:', err);
    res.status(500).json({ error: 'Erro ao receber processo' });
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
  receberProcesso,
  listProcessosEnviados,
  getArquivoProcessos,
  moverProcessoTipo,
  buscarProcessosPublico,
  consultarProcessoPublico,
  deleteProcesso,
  salvarDespachoDoc,
  // Assinatura eletrônica de atos — reaproveitada pelas etapas do DID
  validarAssinante,
  assinarTramitacao,
  responderErroAssinatura,
};
