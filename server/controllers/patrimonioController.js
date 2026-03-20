const { Op } = require('sequelize');

// ─────────────────────────────────────────────────────────────────────────────
// Gerar próximo número de tombamento  (ex: 2026000001)
// ─────────────────────────────────────────────────────────────────────────────
const gerarNumeroTombamento = async (PatBem, ano) => {
  const anoStr = String(ano || new Date().getFullYear());
  const ultimo = await PatBem.findOne({
    where: { numero_tombamento: { [Op.like]: `${anoStr}%` } },
    order: [['numero_tombamento', 'DESC']]
  });
  if (ultimo) {
    const seq = parseInt(ultimo.numero_tombamento.slice(-6), 10) + 1;
    return `${anoStr}${String(seq).padStart(6, '0')}`;
  }
  return `${anoStr}000001`;
};

// Gerar número de termo de responsabilidade  (ex: TR-2026-000001)
const gerarNumeroTermo = async (PatResponsabilidade, ano) => {
  const anoStr = String(ano || new Date().getFullYear());
  const qtd = await PatResponsabilidade.count({ where: { numero_termo: { [Op.like]: `TR-${anoStr}%` } } });
  return `TR-${anoStr}-${String(qtd + 1).padStart(6, '0')}`;
};

// ═══════════════════════════════════════════════════════════════════════════
// GRUPOS
// ═══════════════════════════════════════════════════════════════════════════
const listarGrupos = async (req, res) => {
  try {
    const models = req.models;
    const grupos = await models.PatGrupo.findAll({
      where: { ativo: true },
      order: [['codigo', 'ASC']]
    });
    res.json({ success: true, grupos });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const criarGrupo = async (req, res) => {
  try {
    const models = req.models;
    const grupo = await models.PatGrupo.create(req.body);
    res.status(201).json({ success: true, grupo });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const atualizarGrupo = async (req, res) => {
  try {
    const models = req.models;
    const grupo = await models.PatGrupo.findByPk(req.params.id);
    if (!grupo) return res.status(404).json({ error: 'Grupo não encontrado' });
    await grupo.update(req.body);
    res.json({ success: true, grupo });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// BENS
// ═══════════════════════════════════════════════════════════════════════════
const listarBens = async (req, res) => {
  try {
    const models = req.models;
    const { status, grupo_id, secretaria_id, setor_id, q, page = 1, limit = 50 } = req.query;

    const where = {};
    if (status) where.status = status;
    else where.status = { [Op.in]: ['ATIVO', 'CEDIDO', 'TRANSFERIDO'] };
    if (grupo_id)      where.grupo_id      = grupo_id;
    if (secretaria_id) where.secretaria_id = secretaria_id;
    if (setor_id)      where.setor_id      = setor_id;
    if (q) {
      where[Op.or] = [
        { numero_tombamento: { [Op.iLike]: `%${q}%` } },
        { descricao:         { [Op.iLike]: `%${q}%` } },
        { marca:             { [Op.iLike]: `%${q}%` } },
        { numero_serie:      { [Op.iLike]: `%${q}%` } },
        { placa:             { [Op.iLike]: `%${q}%` } }
      ];
    }

    const { count, rows } = await models.PatBem.findAndCountAll({
      where,
      include: [
        { model: models.PatGrupo,    as: 'grupo',      attributes: ['id', 'codigo', 'nome'] },
        { model: models.Secretaria,  as: 'secretaria', attributes: ['id', 'nome', 'sigla'] },
        { model: models.Setor,       as: 'setor',       attributes: ['id', 'nome', 'sigla'] },
        { model: models.User,        as: 'responsavel', attributes: ['id', 'nome'] }
      ],
      order: [['numero_tombamento', 'ASC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({ success: true, bens: rows, total: count, pages: Math.ceil(count / limit) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const buscarBem = async (req, res) => {
  try {
    const models = req.models;
    const bem = await models.PatBem.findByPk(req.params.id, {
      include: [
        { model: models.PatGrupo,           as: 'grupo' },
        { model: models.Secretaria,         as: 'secretaria' },
        { model: models.Setor,              as: 'setor' },
        { model: models.User,               as: 'responsavel', attributes: ['id', 'nome'] },
        { model: models.PatResponsabilidade, as: 'responsabilidades',
          include: [
            { model: models.Secretaria, as: 'secretaria', attributes: ['id', 'nome', 'sigla'] },
            { model: models.Setor,      as: 'setor',      attributes: ['id', 'nome', 'sigla'] }
          ],
          order: [['data_inicio', 'DESC']]
        },
        { model: models.PatMovimentacao, as: 'movimentacoes',
          include: [
            { model: models.Secretaria, as: 'secretariaOrigem',  attributes: ['id', 'sigla', 'nome'] },
            { model: models.Secretaria, as: 'secretariaDestino', attributes: ['id', 'sigla', 'nome'] },
            { model: models.Setor,      as: 'setorOrigem',       attributes: ['id', 'sigla', 'nome'] },
            { model: models.Setor,      as: 'setorDestino',      attributes: ['id', 'sigla', 'nome'] }
          ],
          order: [['data_movimentacao', 'DESC']]
        }
      ]
    });
    if (!bem) return res.status(404).json({ error: 'Bem não encontrado' });
    res.json({ success: true, bem });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const registrarBem = async (req, res) => {
  try {
    const models = req.models;
    const {
      grupo_id, descricao, especificacao_tecnica, marca, modelo, numero_serie, cor,
      numero_nota_fiscal, serie_nf, chave_nfe, data_nota_fiscal,
      cnpj_fornecedor, nome_fornecedor, numero_empenho, numero_contrato, numero_processo,
      data_aquisicao, valor_aquisicao, vida_util_anos, taxa_depreciacao, valor_residual,
      estado_conservacao, secretaria_id, setor_id, responsavel_id,
      nome_responsavel, cargo_responsavel, matricula_responsavel,
      local_fisico, sala, placa, renavam, observacoes,
      numero_tombamento_manual, ano_tombamento
    } = req.body;

    if (!descricao || !data_aquisicao || !valor_aquisicao) {
      return res.status(400).json({ error: 'Descrição, data de aquisição e valor são obrigatórios' });
    }

    const ano = parseInt(ano_tombamento) || new Date(data_aquisicao).getFullYear();
    const numero_tombamento = numero_tombamento_manual || await gerarNumeroTombamento(models.PatBem, ano);

    // Herdar vida útil / taxa do grupo se não informados
    let vua = vida_util_anos;
    let taxa = taxa_depreciacao;
    if (grupo_id && (!vua || !taxa)) {
      const grupo = await models.PatGrupo.findByPk(grupo_id);
      if (grupo) { vua = vua || grupo.vida_util_anos; taxa = taxa || grupo.taxa_depreciacao; }
    }

    const bem = await models.PatBem.create({
      numero_tombamento, grupo_id, descricao, especificacao_tecnica, marca, modelo,
      numero_serie, cor, numero_nota_fiscal, serie_nf, chave_nfe, data_nota_fiscal,
      cnpj_fornecedor, nome_fornecedor, numero_empenho, numero_contrato, numero_processo,
      data_aquisicao, valor_aquisicao,
      vida_util_anos: vua, taxa_depreciacao: taxa, valor_residual,
      estado_conservacao: estado_conservacao || 'BOM',
      status: 'ATIVO',
      secretaria_id, setor_id, responsavel_id,
      local_fisico, sala, placa, renavam, observacoes,
      usuario_cadastro_id: req.user?.id
    });

    // Movimentação de ENTRADA
    await models.PatMovimentacao.create({
      bem_id: bem.id, tipo: 'ENTRADA',
      secretaria_destino_id: secretaria_id,
      setor_destino_id: setor_id,
      data_movimentacao: data_aquisicao,
      numero_documento: numero_nota_fiscal,
      justificativa: `Registro inicial – Tombamento ${numero_tombamento}`,
      usuario_id: req.user?.id
    });

    // Termo de guarda e responsabilidade inicial
    if (nome_responsavel && secretaria_id) {
      await models.PatResponsabilidade.create({
        numero_termo: await gerarNumeroTermo(models.PatResponsabilidade, ano),
        bem_id: bem.id,
        secretaria_id, setor_id, responsavel_id,
        nome_responsavel, cargo_responsavel, matricula_responsavel,
        data_inicio: data_aquisicao,
        status: 'VIGENTE',
        usuario_id: req.user?.id
      });
    }

    res.status(201).json({
      success: true, bem,
      message: `Bem tombado com sucesso! Tombamento nº ${numero_tombamento}`
    });
  } catch (e) {
    console.error('Erro ao registrar bem:', e);
    res.status(500).json({ error: e.message });
  }
};

const atualizarBem = async (req, res) => {
  try {
    const models = req.models;
    const bem = await models.PatBem.findByPk(req.params.id);
    if (!bem) return res.status(404).json({ error: 'Bem não encontrado' });
    const { numero_tombamento, ...dados } = req.body; // tombamento é imutável
    await bem.update(dados);
    res.json({ success: true, bem });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ─── Transferência entre setores/secretarias ──────────────────────────────
const transferirBem = async (req, res) => {
  try {
    const models = req.models;
    const { id } = req.params;
    const {
      secretaria_destino_id, setor_destino_id, responsavel_destino_id,
      nome_responsavel_destino, cargo_responsavel_destino, matricula_responsavel_destino,
      data_transferencia, justificativa, numero_documento, local_fisico, sala, observacoes
    } = req.body;

    if (!secretaria_destino_id || !data_transferencia || !nome_responsavel_destino) {
      return res.status(400).json({ error: 'Secretaria destino, data e nome do responsável são obrigatórios' });
    }

    const bem = await models.PatBem.findByPk(id);
    if (!bem) return res.status(404).json({ error: 'Bem não encontrado' });
    if (bem.status === 'BAIXADO') return res.status(400).json({ error: 'Bem baixado não pode ser transferido' });

    // Encerrar termo vigente
    await models.PatResponsabilidade.update(
      { status: 'ENCERRADO', data_fim: data_transferencia },
      { where: { bem_id: id, status: 'VIGENTE' } }
    );

    // Registrar movimentação
    await models.PatMovimentacao.create({
      bem_id: id, tipo: 'TRANSFERENCIA',
      secretaria_origem_id: bem.secretaria_id,
      setor_origem_id:      bem.setor_id,
      responsavel_origem_id: bem.responsavel_id,
      secretaria_destino_id, setor_destino_id, responsavel_destino_id,
      data_movimentacao: data_transferencia,
      numero_documento, justificativa, observacoes,
      usuario_id: req.user?.id
    });

    // Novo Termo de Responsabilidade
    const ano = new Date(data_transferencia).getFullYear();
    await models.PatResponsabilidade.create({
      numero_termo: await gerarNumeroTermo(models.PatResponsabilidade, ano),
      bem_id: id,
      secretaria_id: secretaria_destino_id, setor_id: setor_destino_id,
      responsavel_id: responsavel_destino_id,
      nome_responsavel: nome_responsavel_destino,
      cargo_responsavel: cargo_responsavel_destino,
      matricula_responsavel: matricula_responsavel_destino,
      data_inicio: data_transferencia,
      status: 'VIGENTE',
      usuario_id: req.user?.id
    });

    // Atualizar bem
    await bem.update({
      secretaria_id: secretaria_destino_id,
      setor_id:      setor_destino_id,
      responsavel_id: responsavel_destino_id,
      status: 'ATIVO',
      local_fisico: local_fisico || bem.local_fisico,
      sala: sala || bem.sala
    });

    res.json({ success: true, message: 'Transferência realizada. Novo Termo de Responsabilidade gerado.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ─── Baixa de bem ─────────────────────────────────────────────────────────
const baixarBem = async (req, res) => {
  try {
    const models = req.models;
    const { id } = req.params;
    const {
      motivo, numero_processo, numero_resolucao, data_baixa,
      valor_estimado_residual, descricao_ocorrencia, autorizado_por, observacoes
    } = req.body;

    if (!motivo || !data_baixa) {
      return res.status(400).json({ error: 'Motivo e data da baixa são obrigatórios' });
    }

    const bem = await models.PatBem.findByPk(id);
    if (!bem) return res.status(404).json({ error: 'Bem não encontrado' });
    if (bem.status === 'BAIXADO') return res.status(400).json({ error: 'Bem já foi baixado' });

    // Encerrar termo vigente
    await models.PatResponsabilidade.update(
      { status: 'ENCERRADO', data_fim: data_baixa },
      { where: { bem_id: id, status: 'VIGENTE' } }
    );

    const baixa = await models.PatBaixa.create({
      bem_id: id, motivo, numero_processo, numero_resolucao, data_baixa,
      valor_estimado_residual, descricao_ocorrencia, autorizado_por,
      usuario_id: req.user?.id, observacoes
    });

    await models.PatMovimentacao.create({
      bem_id: id, tipo: 'BAIXA',
      secretaria_origem_id: bem.secretaria_id,
      setor_origem_id:      bem.setor_id,
      data_movimentacao:    data_baixa,
      justificativa: `Baixa por ${motivo}${descricao_ocorrencia ? ` – ${descricao_ocorrencia}` : ''}`,
      numero_documento: numero_processo,
      usuario_id: req.user?.id
    });

    await bem.update({ status: 'BAIXADO', ativo: false });

    res.json({ success: true, baixa, message: 'Bem baixado com sucesso.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD / KPIs
// ═══════════════════════════════════════════════════════════════════════════
const getDashboard = async (req, res) => {
  try {
    const models = req.models;
    const sq = models.PatBem.sequelize;

    const [ativos, baixados, cedidos, extraviados, valorTotal,
           porGrupo, ultimosTombamentos, transferencias30] = await Promise.all([
      models.PatBem.count({ where: { status: 'ATIVO' } }),
      models.PatBem.count({ where: { status: 'BAIXADO' } }),
      models.PatBem.count({ where: { status: 'CEDIDO' } }),
      models.PatBem.count({ where: { status: 'EXTRAVIADO' } }),
      models.PatBem.sum('valor_aquisicao', { where: { status: { [Op.in]: ['ATIVO', 'CEDIDO'] } } }),
      models.PatBem.findAll({
        where: { status: { [Op.in]: ['ATIVO', 'CEDIDO'] } },
        attributes: [
          'grupo_id',
          [sq.fn('COUNT', sq.col('PatBem.id')), 'total'],
          [sq.fn('SUM',   sq.col('valor_aquisicao')),  'valor']
        ],
        include: [{ model: models.PatGrupo, as: 'grupo', attributes: ['id', 'codigo', 'nome'] }],
        group: ['grupo_id', 'grupo.id', 'grupo.codigo', 'grupo.nome'],
        raw: false
      }),
      models.PatBem.findAll({
        where: { status: { [Op.in]: ['ATIVO', 'CEDIDO'] } },
        order: [['created_at', 'DESC']],
        limit: 10,
        include: [
          { model: models.PatGrupo,   as: 'grupo',      attributes: ['codigo', 'nome'] },
          { model: models.Secretaria, as: 'secretaria', attributes: ['sigla'] }
        ]
      }),
      models.PatMovimentacao.count({
        where: {
          tipo: 'TRANSFERENCIA',
          data_movimentacao: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }
        }
      })
    ]);

    res.json({
      success: true,
      kpis: { ativos, baixados, cedidos, extraviados, valorTotal: valorTotal || 0 },
      porGrupo,
      ultimosTombamentos,
      transferencias30dias: transferencias30
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSABILIDADES
// ═══════════════════════════════════════════════════════════════════════════
const listarResponsabilidades = async (req, res) => {
  try {
    const models = req.models;
    const { bem_id, status } = req.query;
    const where = {};
    if (bem_id) where.bem_id = bem_id;
    if (status) where.status = status;
    const responsabilidades = await models.PatResponsabilidade.findAll({
      where,
      include: [
        { model: models.PatBem,     as: 'bem',       attributes: ['id', 'numero_tombamento', 'descricao'] },
        { model: models.Secretaria, as: 'secretaria', attributes: ['id', 'nome', 'sigla'] },
        { model: models.Setor,      as: 'setor',      attributes: ['id', 'nome', 'sigla'] }
      ],
      order: [['data_inicio', 'DESC']]
    });
    res.json({ success: true, responsabilidades });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// INVENTÁRIO
// ═══════════════════════════════════════════════════════════════════════════
const listarInventarios = async (req, res) => {
  try {
    const models = req.models;
    const inventarios = await models.PatInventario.findAll({
      include: [
        { model: models.User,       as: 'responsavel', attributes: ['id', 'nome'] },
        { model: models.Secretaria, as: 'secretaria',  attributes: ['id', 'nome', 'sigla'] }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, inventarios });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const criarInventario = async (req, res) => {
  try {
    const models = req.models;
    const { ano, secretaria_id, observacoes } = req.body;
    const anoExercicio = parseInt(ano) || new Date().getFullYear();
    const seq = (await models.PatInventario.count({ where: { ano_exercicio: anoExercicio } })) + 1;
    const numero = `INV-PAT-${anoExercicio}-${String(seq).padStart(4, '0')}`;

    const whereBens = { status: { [Op.in]: ['ATIVO', 'CEDIDO'] } };
    if (secretaria_id) whereBens.secretaria_id = secretaria_id;
    const bens = await models.PatBem.findAll({ where: whereBens, attributes: ['id', 'numero_tombamento'] });

    const inventario = await models.PatInventario.create({
      numero, ano_exercicio: anoExercicio, status: 'EM_ANDAMENTO',
      data_inicio: new Date().toISOString().split('T')[0],
      responsavel_id: req.user?.id, secretaria_id,
      total_bens: bens.length, total_conferidos: 0, total_divergencias: 0,
      observacoes, usuario_id: req.user?.id
    });

    if (bens.length > 0) {
      await models.PatInventarioItem.bulkCreate(
        bens.map(b => ({ inventario_id: inventario.id, bem_id: b.id, numero_tombamento: b.numero_tombamento }))
      );
    }

    res.status(201).json({
      success: true, inventario,
      message: `Inventário ${numero} criado com ${bens.length} bens.`
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const buscarInventario = async (req, res) => {
  try {
    const models = req.models;
    const inventario = await models.PatInventario.findByPk(req.params.id, {
      include: [
        { model: models.User,       as: 'responsavel', attributes: ['id', 'nome'] },
        { model: models.Secretaria, as: 'secretaria',  attributes: ['id', 'nome', 'sigla'] },
        { model: models.PatInventarioItem, as: 'itens',
          include: [{
            model: models.PatBem, as: 'bem',
            include: [
              { model: models.PatGrupo,   as: 'grupo',      attributes: ['codigo', 'nome'] },
              { model: models.Secretaria, as: 'secretaria', attributes: ['sigla'] },
              { model: models.Setor,      as: 'setor',       attributes: ['sigla'] }
            ]
          }]
        }
      ]
    });
    if (!inventario) return res.status(404).json({ error: 'Inventário não encontrado' });
    res.json({ success: true, inventario });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const conferirItemInventario = async (req, res) => {
  try {
    const models = req.models;
    const { id, item_id } = req.params;
    const { encontrado, local_encontrado, estado_conservacao_encontrado, observacoes } = req.body;

    const inventario = await models.PatInventario.findByPk(id);
    if (!inventario || inventario.status !== 'EM_ANDAMENTO') {
      return res.status(400).json({ error: 'Inventário não está em andamento' });
    }
    const item = await models.PatInventarioItem.findOne({ where: { id: item_id, inventario_id: id } });
    if (!item) return res.status(404).json({ error: 'Item não encontrado no inventário' });

    await item.update({
      encontrado, local_encontrado, estado_conservacao_encontrado, observacoes,
      conferido_por_id: req.user?.id, conferido_em: new Date()
    });

    const [totalConferidos, totalDivergencias] = await Promise.all([
      models.PatInventarioItem.count({ where: { inventario_id: id, encontrado: { [Op.ne]: null } } }),
      models.PatInventarioItem.count({ where: { inventario_id: id, encontrado: false } })
    ]);
    await inventario.update({ total_conferidos: totalConferidos, total_divergencias: totalDivergencias });

    res.json({ success: true, item });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const concluirInventario = async (req, res) => {
  try {
    const models = req.models;
    const inventario = await models.PatInventario.findByPk(req.params.id);
    if (!inventario) return res.status(404).json({ error: 'Inventário não encontrado' });
    if (inventario.status !== 'EM_ANDAMENTO') return res.status(400).json({ error: 'Inventário não está em andamento' });
    await inventario.update({ status: 'CONCLUIDO', data_conclusao: new Date().toISOString().split('T')[0] });
    res.json({ success: true, message: 'Inventário patrimonial concluído.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// RELATÓRIO
// ═══════════════════════════════════════════════════════════════════════════
const getRelatorio = async (req, res) => {
  try {
    const models = req.models;
    const { secretaria_id, grupo_id, status = 'ATIVO', formato } = req.query;
    const where = {};
    if (status)        where.status        = status;
    if (secretaria_id) where.secretaria_id = secretaria_id;
    if (grupo_id)      where.grupo_id      = grupo_id;

    const bens = await models.PatBem.findAll({
      where,
      include: [
        { model: models.PatGrupo,   as: 'grupo',      attributes: ['codigo', 'nome'] },
        { model: models.Secretaria, as: 'secretaria', attributes: ['sigla', 'nome'] },
        { model: models.Setor,      as: 'setor',       attributes: ['sigla', 'nome'] }
      ],
      order: [['numero_tombamento', 'ASC']]
    });

    if (formato === 'csv') {
      const hdr = 'Tombamento;Descrição;Grupo;Secretaria;Setor;Local;Marca;Modelo;Nº Série;Estado;Valor Aquisição;Data Aquisição;Status\n';
      const rows = bens.map(b =>
        [b.numero_tombamento, b.descricao, b.grupo?.nome || '', b.secretaria?.nome || '',
         b.setor?.nome || '', b.local_fisico || '', b.marca || '', b.modelo || '',
         b.numero_serie || '', b.estado_conservacao,
         parseFloat(b.valor_aquisicao).toFixed(2).replace('.', ','),
         b.data_aquisicao, b.status].join(';')
      ).join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=patrimonio.csv');
      return res.send('\uFEFF' + hdr + rows);
    }

    res.json({ success: true, bens, total: bens.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const proximoTombamento = async (req, res) => {
  try {
    const models = req.models;
    const ano = parseInt(req.query.ano) || new Date().getFullYear();
    const numero = await gerarNumeroTombamento(models.PatBem, ano);
    res.json({ success: true, numero_tombamento: numero });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = {
  listarGrupos, criarGrupo, atualizarGrupo,
  listarBens, buscarBem, registrarBem, atualizarBem,
  transferirBem, baixarBem,
  getDashboard, listarResponsabilidades,
  listarInventarios, criarInventario, buscarInventario,
  conferirItemInventario, concluirInventario,
  getRelatorio, proximoTombamento
};
