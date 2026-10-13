// ─────────────────────────────────────────────────────────────────────────────
//  LIXEIRA — registros excluídos de cada tela
//
//  Excluir no sistema nunca apaga: o registro fica na tabela de origem com status
//  de excluído e a tabela registros_excluidos guarda quem excluiu e quando.
//  Administradores veem os excluídos (tela "Excluídos") e só eles apagam de vez.
//
//  Para levar a lixeira a outra tela: (1) a exclusão da tela marca o status e
//  chama registrarExclusao; (2) adicionar a entidade em ENTIDADES abaixo; (3) pôr
//  <BotaoExcluidos entidade="..."> na tela.
// ─────────────────────────────────────────────────────────────────────────────
const { Op } = require('sequelize');

// colunas: o que aparece na tela Excluídos (tipo: 'data' | 'moeda' formata no cliente)
// descricao: rótulo curto do registro (log e mensagens)
// antesDeApagar: remove dependentes que só existem por causa do registro
const ENTIDADES = {
  licitacoes: {
    titulo: 'Licitações',
    model: 'Licitacao',
    statusExcluido: ['EXCLUÍDO'],
    colunas: [
      { campo: 'numero_licitacao', rotulo: 'Nº licitação' },
      { campo: 'numero_processo',  rotulo: 'Nº processo' },
      { campo: 'modalidade',       rotulo: 'Modalidade' },
      { campo: 'objeto',           rotulo: 'Objeto', largo: true },
      { campo: 'secretaria',       rotulo: 'Secretaria' },
      { campo: 'data_abertura',    rotulo: 'Abertura', tipo: 'data' },
      { campo: 'valor_estimado',   rotulo: 'Valor estimado', tipo: 'moeda' },
    ],
    descricao: (r) => `Licitação ${r.numero_licitacao}`,
  },

  credores: {
    titulo: 'Credores',
    model: 'Credor',
    statusExcluido: ['EXCLUÍDO'],
    colunas: [
      { campo: 'tipo',          rotulo: 'Tipo', valor: (r) => (r.tipo === 'Jurídica' ? 'PJ' : 'PF') },
      { campo: 'razao_social',  rotulo: 'Razão social / Nome', largo: true },
      { campo: 'nome_fantasia', rotulo: 'Nome fantasia' },
      { campo: 'cnpj_cpf',      rotulo: 'CNPJ / CPF' },
      { campo: 'cidade',        rotulo: 'Cidade/UF', valor: (r) => (r.cidade ? `${r.cidade}${r.uf ? '/' + r.uf : ''}` : '') },
      { campo: 'telefone',      rotulo: 'Telefone', valor: (r) => r.telefone || r.celular || '' },
    ],
    descricao: (r) => `Credor ${r.razao_social} (${r.cnpj_cpf})`,
  },

  itens: {
    titulo: 'Itens',
    model: 'ContratoItem',
    statusExcluido: ['EXCLUÍDO'],
    colunas: [
      { campo: 'codigo',         rotulo: 'Código' },
      { campo: 'descricao',      rotulo: 'Descrição', largo: true },
      { campo: 'categoria',      rotulo: 'Categoria' },
      { campo: 'unidade_medida', rotulo: 'Unidade' },
      { campo: 'classificacao',  rotulo: 'Classificação' },
      { campo: 'catmat_serv',    rotulo: 'CATMAT/CATSERV' },
    ],
    descricao: (r) => `Item ${r.codigo || ''} ${r.descricao}`.trim(),
  },

  contratos: {
    titulo: 'Contratos',
    model: 'Contrato',
    statusExcluido: ['EXCLUÍDO'],
    include: (m) => [{ model: m.Credor, as: 'credor', attributes: ['razao_social', 'cnpj_cpf'] }],
    colunas: [
      { campo: 'tipo_contrato',   rotulo: 'Tipo' },
      { campo: 'numero_contrato', rotulo: 'Nº contrato' },
      { campo: 'objeto',          rotulo: 'Objeto', largo: true },
      { campo: 'credor',          rotulo: 'Credor', valor: (r) => r.credor?.razao_social || '' },
      { campo: 'secretaria',      rotulo: 'Secretaria' },
      { campo: 'vigencia_fim',    rotulo: 'Fim da vigência', tipo: 'data' },
      { campo: 'valor',           rotulo: 'Valor', tipo: 'moeda' },
    ],
    descricao: (r) => `Contrato ${r.numero_contrato}`,
    antesDeApagar: (m, ids, transaction) =>
      m.ContratoItemVinculo.destroy({ where: { contrato_id: ids }, transaction }),
  },

  ordens: {
    titulo: 'Ordens de Serviço/Compra',
    model: 'ContratoOrdem',
    statusExcluido: ['EXCLUÍDA'],
    include: (m) => [{ model: m.Contrato, as: 'contrato', attributes: ['numero_contrato'] }],
    colunas: [
      { campo: 'numero',       rotulo: 'Número' },
      { campo: 'tipo',         rotulo: 'Tipo', valor: (r) => (r.tipo === 'COMPRA' ? 'Compra' : 'Serviço') },
      { campo: 'contrato',     rotulo: 'Contrato', valor: (r) => r.contrato?.numero_contrato || '' },
      { campo: 'objeto',       rotulo: 'Objeto', largo: true },
      { campo: 'secretaria',   rotulo: 'Secretaria' },
      { campo: 'data_emissao', rotulo: 'Emissão', tipo: 'data' },
      { campo: 'valor_total',  rotulo: 'Valor', tipo: 'moeda' },
    ],
    descricao: (r) => `Ordem ${r.numero}`,
    antesDeApagar: (m, ids, transaction) =>
      m.ContratoOrdemItem.destroy({ where: { ordem_id: ids }, transaction }),
  },
};

const PODEM_VER = ['admin', 'jeos'];
const podeVerExcluidos = (user) => PODEM_VER.includes(user?.tipo);

const config = (entidade) => {
  const c = ENTIDADES[entidade];
  if (!c) {
    const err = new Error('Tela sem lixeira');
    err.status = 404;
    throw err;
  }
  return c;
};

/**
 * Registra quem excluiu. Chamar ANTES de marcar o status de excluído, para guardar o
 * status anterior. (Se a marcação falhar, a linha sobra sem efeito: a tela Excluídos
 * parte do status do registro, não desta tabela.)
 * @param registros instâncias ou objetos com o registro antes da exclusão
 */
async function registrarExclusao(req, entidade, registros, { transaction } = {}) {
  const lista = (Array.isArray(registros) ? registros : [registros]).filter(Boolean);
  if (!lista.length) return;
  const c = config(entidade);
  const { RegistroExcluido, User } = req.models;

  let nome = req.user?.nome || null;
  if (!nome && req.user?.id) {
    const u = await User.findByPk(req.user.id, { attributes: ['nome'], transaction }).catch(() => null);
    nome = u?.nome || null;
  }

  const linhas = lista.map((r) => {
    const obj = typeof r.toJSON === 'function' ? r.toJSON() : r;
    return {
      entidade,
      registro_id: String(obj.id),
      descricao: c.descricao(obj),
      status_anterior: obj.status ?? null,
      excluido_por_id: req.user?.id || null,
      excluido_por_nome: nome,
      excluido_em: new Date(),
    };
  });
  await RegistroExcluido.bulkCreate(linhas, {
    updateOnDuplicate: ['descricao', 'status_anterior', 'excluido_por_id', 'excluido_por_nome', 'excluido_em'],
    transaction,
  });
}

/** Registros excluídos de uma tela, já com quem excluiu e quando */
async function listarExcluidos(req, entidade) {
  const c = config(entidade);
  const m = req.models;
  const Model = m[c.model];

  const registros = await Model.findAll({
    where: { status: { [Op.in]: c.statusExcluido } },
    include: c.include ? c.include(m) : undefined,
  });

  const metas = await m.RegistroExcluido.findAll({ where: { entidade }, raw: true });
  const porId = new Map(metas.map((x) => [x.registro_id, x]));

  const linhas = registros.map((inst) => {
    const r = inst.toJSON();
    const meta = porId.get(String(r.id));
    const valores = {};
    for (const col of c.colunas) {
      const v = col.valor ? col.valor(r) : r[col.campo];
      valores[col.campo] = v === undefined ? null : v;
    }
    return {
      id: r.id,
      valores,
      excluido_em: meta?.excluido_em || null,
      excluido_por_id: meta?.excluido_por_id || null,
      // Exclusões feitas antes da lixeira existir não têm autor registrado
      excluido_por_nome: meta?.excluido_por_nome || null,
    };
  });

  // Mais recentes primeiro; exclusões antigas (sem data) no fim
  linhas.sort((a, b) => new Date(b.excluido_em || 0) - new Date(a.excluido_em || 0));

  return {
    entidade,
    titulo: c.titulo,
    colunas: c.colunas.map(({ campo, rotulo, tipo, largo }) => ({ campo, rotulo, tipo: tipo || null, largo: !!largo })),
    registros: linhas,
  };
}

/**
 * Apaga de vez. Cada registro vai numa transação própria: se um estiver preso a
 * outro dado (ex.: credor de contrato excluído ainda não apagado), os demais seguem.
 * @param ids lista de ids ou 'todos'
 */
async function apagarDefinitivamente(req, entidade, ids) {
  const c = config(entidade);
  const m = req.models;
  const Model = m[c.model];

  const where = { status: { [Op.in]: c.statusExcluido } };
  if (ids !== 'todos') where.id = { [Op.in]: ids };
  const alvos = await Model.findAll({ where, include: c.include ? c.include(m) : undefined });

  const apagados = [];
  const falhas = [];
  for (const inst of alvos) {
    const r = inst.toJSON();
    const t = await req.tenantDb.transaction();
    try {
      if (c.antesDeApagar) await c.antesDeApagar(m, [r.id], t);
      await Model.destroy({ where: { id: r.id }, transaction: t });
      await m.RegistroExcluido.destroy({ where: { entidade, registro_id: String(r.id) }, transaction: t });
      await t.commit();
      apagados.push(c.descricao(r));
    } catch (err) {
      await t.rollback();
      const vinculado = err.name === 'SequelizeForeignKeyConstraintError';
      falhas.push({
        id: r.id,
        descricao: c.descricao(r),
        motivo: vinculado
          ? 'Ainda está ligado a outro registro (apague primeiro o registro que depende dele).'
          : 'Erro ao apagar.',
      });
      if (!vinculado) console.error(`lixeira.apagar ${entidade}#${r.id}:`, err);
    }
  }
  return { apagados, falhas };
}

module.exports = {
  ENTIDADES,
  podeVerExcluidos,
  registrarExclusao,
  listarExcluidos,
  apagarDefinitivamente,
};
